#!/usr/bin/env python3
"""
Extracts and cleans the exact photorealistic studio-rendered Heirloom Tomatoes
directly from the PRD Mockup images (02-hero-timer.png, 03-grid-timer.png, 04-card-front.png)
so that the web/mobile app renders the exact mockup tomatoes rather than synthetic 3D primitives.
"""

import colorsys
import math
import os
import random
import subprocess

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT_DIR = os.path.join(ROOT, "assets", "tomatoes")
os.makedirs(OUT_DIR, exist_ok=True)


def read_ppm(path):
    p = subprocess.run(["convert", path, "ppm:-"], capture_output=True, check=True)
    data = p.stdout
    idx = data.index(b"\n255\n") + 5
    header = data[:idx].decode("ascii", errors="ignore").splitlines()
    dims = [line for line in header if not line.startswith("#") and " " in line][0]
    w, h = map(int, dims.split())
    return w, h, bytearray(data[idx:])


def write_png(w, h, rgb_bytes, out_path):
    header = f"P6\n{w} {h}\n255\n".encode("ascii")
    subprocess.run(
        ["convert", "ppm:-", out_path],
        input=header + bytes(rgb_bytes),
        check=True,
    )


def crop_rgb(w, h, rgb, x0, y0, x1, y1):
    cw = x1 - x0
    ch = y1 - y0
    out = bytearray(cw * ch * 3)
    for y in range(ch):
        src_start = ((y0 + y) * w + x0) * 3
        dst_start = y * cw * 3
        out[dst_start : dst_start + cw * 3] = rgb[src_start : src_start + cw * 3]
    return cw, ch, out


def clean_hero_equatorial_numbers(w, h, rgb):
    """
    Removes only the painted white equatorial numbers (130 140 150 160 170) and tick marks
    above the seam in 02-hero-timer.png by sampling the 30th-percentile (clean crimson skin)
    within a small window along the equatorial curve. Preserves 100% of studio lighting and edges.
    """
    src = bytearray(rgb)
    # First find seam_y(x) for each column x in 170..598
    seam_ys = {}
    for x in range(170, 599):
        best_y = 834
        min_r = 999
        for y in range(795, 842):
            i = (y * w + x) * 3
            r, g, b = src[i], src[i + 1], src[i + 2]
            if abs(r - 233) + abs(g - 232) + abs(b - 226) > 60 and r < min_r:
                min_r = r
                best_y = y
        if min_r < 110:
            seam_ys[x] = best_y

    # Smooth seam_ys with a moving average so it forms a smooth curve
    raw_sy = dict(seam_ys)
    for x in list(seam_ys.keys()):
        vals = [raw_sy[nx] for nx in range(x - 8, x + 9) if nx in raw_sy]
        seam_ys[x] = int(round(sum(vals) / len(vals)))

    # Identify only the white tick/number pixels strictly above seam_ys[x] and inside the tomato silhouette
    tick_mask = set()
    for x in range(168, 600):
        if x not in seam_ys:
            seam_ys[x] = 801 if x < 300 else 802
        sy = seam_ys[x]
        # Near the left/right edges (x < 186 or x > 580) there are only short ticks (within 26px of seam), no tall numbers
        top_offset = -26 if (x < 186 or x > 580) else -68
        for offset_y in range(top_offset, -2):
            y = sy + offset_y
            i = (y * w + x) * 3
            r, g, b = src[i], src[i + 1], src[i + 2]
            if r <= g + 22:
                continue
            g_vals = []
            for dx in range(-18, 19):
                nx = x + dx
                if nx in seam_ys:
                    ny = seam_ys[nx] + offset_y
                    ni = (ny * w + nx) * 3
                    if src[ni] > src[ni + 1] + 22:
                        g_vals.append(src[ni + 1])
            if len(g_vals) >= 4:
                g_vals.sort()
                med_g = g_vals[len(g_vals) // 3]
                if g > med_g + 3 or b > med_g + 3:
                    tick_mask.add((x, y))

    # Solve 2D Laplace equation with strict Neumann boundary so background pixels are never sampled
    inpaint_laplace_box(
        w, h, rgb, 168, 742, 600, 832,
        lambda x, y, r, g, b: (x, y) in tick_mask,
        iterations=200,
        forbid_bg=True
    )

    # Smooth & straighten the center seam opening (dy in -28..+5.5) and left/right silhouette edges
    smooth_hero_center_opening_and_edges(w, h, rgb)


def fit_seam_y(x):
    u = (x - 385.0) / 215.0
    return 834.8 + 0.5 * u - 18.2 * (u ** 2) - 15.2 * (u ** 4)


def sample_bilinear(w, h, buf, fx, fy):
    x0 = max(0, min(w - 2, int(math.floor(fx))))
    y0 = max(0, min(h - 2, int(math.floor(fy))))
    tx = fx - x0
    ty = fy - y0
    out = [0.0, 0.0, 0.0]
    for c in range(3):
        v00 = buf[(y0 * w + x0) * 3 + c]
        v10 = buf[(y0 * w + (x0 + 1)) * 3 + c]
        v01 = buf[((y0 + 1) * w + x0) * 3 + c]
        v11 = buf[((y0 + 1) * w + (x0 + 1)) * 3 + c]
        out[c] = (
            (1.0 - tx) * (1.0 - ty) * v00
            + tx * (1.0 - ty) * v10
            + (1.0 - tx) * ty * v01
            + tx * ty * v11
        )
    return out


def smooth_hero_center_opening_and_edges(w, h, rgb):
    """
    Eliminates all periodic tick-root bumps and Laplace-inpainted number blotches
    along the equatorial band above the center seam opening while keeping the natural
    outer silhouette edges 100% untouched and crisp.
    """
    left_edge = {}
    right_edge = {}
    for y in range(650, 980):
        for x in range(140, 385):
            i = (y * w + x) * 3
            if rgb[i] - max(rgb[i + 1], rgb[i + 2]) >= 22:
                left_edge[y] = x
                break
        for x in range(630, 385, -1):
            i = (y * w + x) * 3
            if rgb[i] - max(rgb[i + 1], rgb[i + 2]) >= 22:
                right_edge[y] = x
                break

    src = bytearray(rgb)
    pass1 = bytearray(rgb)
    for y in range(730, 845):
        lx = left_edge.get(y, 170)
        rx = right_edge.get(y, 598)
        for x in range(lx + 4, rx - 3):
            sy = fit_seam_y(x)
            dy = y - sy
            if -64.0 <= dy <= 3.0:
                samples = []
                for dx in range(-20, 21, 2):
                    nx = max(lx + 5, min(rx - 5, x + dx))
                    ny = fit_seam_y(nx) + dy
                    s_rgb = sample_bilinear(w, h, src, nx, ny)
                    if s_rgb[0] - s_rgb[1] > 32:
                        samples.append(s_rgb)
                if samples:
                    samples.sort(key=lambda t: t[1] + 0.5 * t[0])
                    lo = max(0, int(len(samples) * 0.34))
                    hi = max(lo + 1, int(len(samples) * 0.64))
                    sub = samples[lo:hi]
                    i = (y * w + x) * 3
                    for c in range(3):
                        pass1[i + c] = int(round(sum(p[c] for p in sub) / len(sub)))

    rng = random.Random(108)
    for y in range(730, 845):
        lx = left_edge.get(y, 170)
        rx = right_edge.get(y, 598)
        for x in range(lx + 4, rx - 3):
            sy = fit_seam_y(x)
            dy = y - sy
            if -64.0 <= dy <= 3.0:
                if dy < -44.0:
                    blend = 0.5 * (1.0 - math.cos(math.pi * (dy - (-64.0)) / 20.0))
                elif dy > 1.0:
                    blend = 0.5 * (1.0 + math.cos(math.pi * (dy - 1.0) / 2.0))
                else:
                    blend = 1.0
                # Taper blend smoothly near left/right silhouette edges so the natural rim is untouched
                edge_dist = min(x - (lx + 3), (rx - 3) - x)
                if edge_dist < 10:
                    blend *= 0.5 * (1.0 - math.cos(math.pi * max(0.0, edge_dist) / 10.0))
                acc = [0.0, 0.0, 0.0]
                wsum = 0.0
                for dx in range(-14, 15, 2):
                    nx = max(lx + 5, min(rx - 5, x + dx))
                    ny = fit_seam_y(nx) + dy
                    wt = math.exp(-(dx * dx) / (2.0 * 8.0 * 8.0))
                    s_rgb = sample_bilinear(w, h, pass1, nx, ny)
                    for c in range(3):
                        acc[c] += wt * s_rgb[c]
                    wsum += wt
                i = (y * w + x) * 3
                grain = rng.uniform(-1.1, 1.1)
                for c in range(3):
                    smoothed = acc[c] / wsum + (grain * 0.8 if c == 0 else grain * 0.45)
                    rgb[i + c] = max(0, min(255, int(round((1.0 - blend) * src[i + c] + blend * smoothed))))


def feather_background_to_canvas_bg(w, h, rgb, target_bg=(231, 232, 226), margin=54):
    """
    Smoothly blends the outer margin of the sprite (and any un-shadowed studio background)
    into the exact page background color target_bg = (231, 232, 226) (#E7E8E2) so that
    no square border or shading boundary edge line is ever visible around the tomato.
    """
    cx, cy = w * 0.48, h * 0.46
    for y in range(h):
        for x in range(w):
            i = (y * w + x) * 3
            r, g, b = rgb[i], rgb[i + 1], rgb[i + 2]
            # Never feather actual colored tomato skin
            if (r - max(g, b)) > 18:
                continue
            # Never feather grey tomato body (grey tomato body has r < 216 everywhere outside the bottom-right shadow)
            if r < 216 and g < 216 and (x < w * 0.82 and y < h * 0.86):
                continue

            # Normalize bright un-shadowed studio background noise to exact target_bg
            if r >= 227 and g >= 227 and b >= 221:
                r = int(round(0.75 * target_bg[0] + 0.25 * r))
                g = int(round(0.75 * target_bg[1] + 0.25 * g))
                b = int(round(0.75 * target_bg[2] + 0.25 * b))

            dist = min(x, w - 1 - x, y, h - 1 - y)
            if dist < margin:
                t = dist / float(margin)
                smooth_t = 0.5 * (1.0 - math.cos(math.pi * t))
                r = int(round(target_bg[0] * (1.0 - smooth_t) + r * smooth_t))
                g = int(round(target_bg[1] * (1.0 - smooth_t) + g * smooth_t))
                b = int(round(target_bg[2] * (1.0 - smooth_t) + b * smooth_t))

            rgb[i], rgb[i + 1], rgb[i + 2] = r, g, b


def inpaint_laplace_box(w, h, rgb, x0, y0, x1, y1, mask_fn, iterations=140, forbid_bg=False):
    orig = bytearray(rgb)

    def is_valid_skin(px, py):
        if not forbid_bg or (176 <= px <= 590):
            return True
        idx = (py * w + px) * 3
        r, g, b = orig[idx], orig[idx + 1], orig[idx + 2]
        # Exclude light warm-grey background (#E9E8E2) and outer anti-aliased halo near left/right edges
        return not (r > 155 and g > 140 and (r - g) < 32)

    mask = [[False] * w for _ in range(h)]
    for y in range(y0, y1):
        for x in range(x0, x1):
            i = (y * w + x) * 3
            if is_valid_skin(x, y) and mask_fn(x, y, rgb[i], rgb[i + 1], rgb[i + 2]):
                mask[y][x] = True

    dilated = [row[:] for row in mask]
    for _ in range(2):
        nxt = [row[:] for row in dilated]
        for y in range(y0, y1):
            for x in range(x0, x1):
                if dilated[y][x]:
                    for dy in (-1, 0, 1):
                        for dx in (-1, 0, 1):
                            ny, nx = y + dy, x + dx
                            if 0 <= ny < h and 0 <= nx < w and is_valid_skin(nx, ny):
                                nxt[ny][nx] = True
        dilated = nxt

    buf = [float(b) for b in rgb]
    # Initialize masked pixels from nearest valid interior skin pixel above or below
    for x in range(x0, x1):
        y = y0
        while y < y1:
            if dilated[y][x]:
                y_start = y - 1
                while y < y1 and dilated[y][x]:
                    y += 1
                y_end = y
                top_valid = y_start >= 0 and is_valid_skin(x, y_start)
                bot_valid = y_end < h and is_valid_skin(x, y_end)
                i_top = (max(0, y_start) * w + x) * 3
                i_bot = (min(h - 1, y_end) * w + x) * 3
                span = max(1, y_end - y_start)
                for ky in range(y_start + 1, y_end):
                    t = (ky - y_start) / span
                    ik = (ky * w + x) * 3
                    for c in range(3):
                        if top_valid and bot_valid:
                            buf[ik + c] = buf[i_top + c] * (1.0 - t) + buf[i_bot + c] * t
                        elif bot_valid:
                            buf[ik + c] = buf[i_bot + c]
                        elif top_valid:
                            buf[ik + c] = buf[i_top + c]
            else:
                y += 1

    for _ in range(iterations):
        for y in range(y0, y1):
            for x in range(x0, x1):
                if not dilated[y][x]:
                    continue
                i = (y * w + x) * 3
                neighbors = []
                if is_valid_skin(x - 1, y) or dilated[y][x - 1]:
                    neighbors.append((0.30, (y * w + (x - 1)) * 3))
                if is_valid_skin(x + 1, y) or dilated[y][x + 1]:
                    neighbors.append((0.30, (y * w + (x + 1)) * 3))
                if is_valid_skin(x, y - 1) or dilated[y - 1][x]:
                    neighbors.append((0.20, ((y - 1) * w + x) * 3))
                if is_valid_skin(x, y + 1) or dilated[y + 1][x]:
                    neighbors.append((0.20, ((y + 1) * w + x) * 3))
                if not neighbors:
                    continue
                w_sum = sum(wt for wt, _ in neighbors)
                for c in range(3):
                    buf[i + c] = sum(wt * buf[ni + c] for wt, ni in neighbors) / w_sum

    rng = random.Random(42)
    for y in range(y0, y1):
        for x in range(x0, x1):
            if dilated[y][x]:
                i = (y * w + x) * 3
                grain = rng.uniform(-1.0, 1.0)
                for c in range(3):
                    val = int(round(buf[i + c] + grain))
                    rgb[i + c] = max(0, min(255, val))


def recolor_tomato_patch(w, h, src_rgb, target_hue_deg, sat_scale=1.0, val_scale=1.0, grey_mode=False):
    out = bytearray(src_rgb)
    target_h = (target_hue_deg % 360.0) / 360.0
    for y in range(h):
        for x in range(w):
            i = (y * w + x) * 3
            r, g, b = src_rgb[i], src_rgb[i + 1], src_rgb[i + 2]
            redness = r - max(g, b)
            if grey_mode:
                if redness <= 5:
                    continue
                weight = min(1.0, (redness - 5.0) / 14.0)
                rf, gf, bf = r / 255.0, g / 255.0, b / 255.0
                lum = 0.42 * rf + 0.32 * gf + 0.26 * bf
                grey_v = min(0.92, pow(lum, 0.78) * 1.18 * val_scale)
                nr, ng, nb = grey_v, grey_v, grey_v * 0.99
            else:
                if redness <= 6:
                    continue
                weight = min(1.0, (redness - 6.0) / 22.0)
                rf, gf, bf = r / 255.0, g / 255.0, b / 255.0
                hh, ss, vv = colorsys.rgb_to_hsv(rf, gf, bf)
                ns = min(1.0, ss * sat_scale)
                nv = min(1.0, pow(vv, 0.96) * val_scale)
                nr, ng, nb = colorsys.hsv_to_rgb(target_h, ns, nv)

            out[i] = int(round((1.0 - weight) * r + weight * (nr * 255.0)))
            out[i + 1] = int(round((1.0 - weight) * g + weight * (ng * 255.0)))
            out[i + 2] = int(round((1.0 - weight) * b + weight * (nb * 255.0)))
    return out


_REF_SPHERE_CACHE = None


def get_reference_silver_sphere():
    """
    Loads and softly filters the studio satin-silver sphere from
    docs/mockup-images/silver-sphere-ref.png (center=(261.0, 134.0), radius=87.0)
    so the tomato inherits the exact metallic tonal curve and reflections of the reference photo.
    """
    global _REF_SPHERE_CACHE
    if _REF_SPHERE_CACHE is not None:
        return _REF_SPHERE_CACHE
    ref_path = os.path.join(ROOT, "docs", "mockup-images", "silver-sphere-ref.png")
    rw, rh, rrgb = read_ppm(ref_path)
    # Build luminance grid (0..1) and apply 12 passes of 5x5 Gaussian smoothing for a flawless, liquid-satin polish
    lum = [[0.0] * rw for _ in range(rh)]
    for y in range(rh):
        for x in range(rw):
            i = (y * rw + x) * 3
            lum[y][x] = (0.299 * rrgb[i] + 0.587 * rrgb[i + 1] + 0.114 * rrgb[i + 2]) / 255.0
    for _ in range(12):
        nxt = [row[:] for row in lum]
        for y in range(2, rh - 2):
            for x in range(2, rw - 2):
                acc, wsum = 0.0, 0.0
                for dy in (-2, -1, 0, 1, 2):
                    for dx in (-2, -1, 0, 1, 2):
                        wt = math.exp(-(dx * dx + dy * dy) / 3.5)
                        acc += wt * lum[y + dy][x + dx]
                        wsum += wt
                nxt[y][x] = acc / wsum
        lum = nxt
    _REF_SPHERE_CACHE = (rw, rh, lum)
    return _REF_SPHERE_CACHE


def sample_ref_sphere_metal(nx, ny):
    rw, rh, lum = get_reference_silver_sphere()
    cx_s, cy_s, r_s = 261.0, 134.0, 86.0
    rho = math.sqrt(nx * nx + ny * ny)
    if rho > 0.96:
        scale = 0.96 / rho
        nx *= scale
        ny *= scale
    fx = max(0.0, min(rw - 2.001, cx_s + nx * r_s))
    fy = max(0.0, min(rh - 2.001, cy_s + ny * r_s))
    x0 = int(math.floor(fx))
    y0 = int(math.floor(fy))
    tx = fx - x0
    ty = fy - y0
    v00 = lum[y0][x0]
    v10 = lum[y0][x0 + 1]
    v01 = lum[y0 + 1][x0]
    v11 = lum[y0 + 1][x0 + 1]
    return (
        (1.0 - tx) * (1.0 - ty) * v00
        + tx * (1.0 - ty) * v10
        + (1.0 - tx) * ty * v01
        + tx * ty * v11
    )


def recolor_silver_metallic(w, h, src_rgb, is_hero=False):
    """
    Transforms the studio-lit heirloom tomato into a satin-polished Silver Metallic
    tomato matching docs/mockup-images/silver-sphere-ref.png:
    1. 100% natural, studio-anti-aliased 360-degree outer edges using Green-channel
       absorption (capturing even the darkest shadowed bottom rim cleanly).
    2. Contour-aware spherical environment reflection sampled directly from the
       reference silver sphere (bright upper dome reflection, soft mid-silver studio
       horizon core, and bright tabletop bounce on the lower belly & sides).
    3. Subtle heirloom 3D lobe & stem calyx sculpting with zero artificial stripe artifacts.
    """
    out = bytearray(src_rgb)
    rg_grid = [[0.0] * w for _ in range(h)]
    min_x, max_x = w, 0
    min_y, max_y = h, 0

    for y in range(h):
        for x in range(w):
            i = (y * w + x) * 3
            r, g, b = src_rgb[i], src_rgb[i + 1], src_rgb[i + 2]
            rg = float(r - max(g, b))
            rg_grid[y][x] = rg
            is_tomato_core = (rg >= 18.0) or (rg >= 8.0 and g < 65)
            if is_tomato_core:
                if x < min_x:
                    min_x = x
                if x > max_x:
                    max_x = x
                if y < min_y:
                    min_y = y
                if y > max_y:
                    max_y = y

    cx = 0.5 * (min_x + max_x)
    rx = max(1.0, 0.5 * (max_x - min_x))
    span_y = max(1.0, float(max_y - min_y))
    cy_body = min_y + 0.54 * span_y
    ry_body = max(1.0, 0.46 * span_y)

    alpha_grid = [[0.0] * w for _ in range(h)]
    bg_rgb_grid = [[None] * w for _ in range(h)]
    u_raw = [[None] * w for _ in range(h)]

    for y in range(h):
        y0 = max(0, y - 6)
        y1 = min(h - 1, y + 6)
        for x in range(w):
            i = (y * w + x) * 3
            r, g, b = src_rgb[i], src_rgb[i + 1], src_rgb[i + 2]
            rg = rg_grid[y][x]
            if rg <= 3.5 and g >= 145:
                continue

            x0 = max(0, x - 6)
            x1 = min(w - 1, x + 6)
            loc_max_rg = rg
            min_in_g = float(g)
            bg_r, bg_g, bg_b, bg_cnt = 0.0, 0.0, 0.0, 0
            best_outside_g = -1.0
            best_outside_rgb = None

            for ny in range(y0, y1 + 1):
                row_rg = rg_grid[ny]
                for nx in range(x0, x1 + 1):
                    v_rg = row_rg[nx]
                    if v_rg > loc_max_rg:
                        loc_max_rg = v_rg
                    ni = (ny * w + nx) * 3
                    nr_p, ng_p, nb_p = src_rgb[ni], src_rgb[ni + 1], src_rgb[ni + 2]
                    if (v_rg >= 12.0 or (v_rg >= 7.0 and ng_p < 60)) and ng_p < min_in_g:
                        min_in_g = float(ng_p)
                    if v_rg <= 4.5 and ng_p >= 135:
                        bg_r += nr_p
                        bg_g += ng_p
                        bg_b += nb_p
                        bg_cnt += 1
                    if v_rg <= 8.0 and ng_p > best_outside_g:
                        best_outside_g = float(ng_p)
                        lum_out = 0.32 * nr_p + 0.43 * ng_p + 0.25 * nb_p
                        best_outside_rgb = (lum_out, lum_out, lum_out * 0.985)

            if loc_max_rg < 14.0 and not (rg >= 6.0 and g < 85):
                continue

            if bg_cnt > 0:
                cur_bg = (bg_r / bg_cnt, bg_g / bg_cnt, bg_b / bg_cnt)
            elif best_outside_rgb is not None and best_outside_g >= 115:
                cur_bg = best_outside_rgb
            else:
                cur_bg = (231.0, 232.0, 226.0)
                alpha_grid[y][x] = 1.0
                bg_rgb_grid[y][x] = cur_bg
                is_pointer = is_hero and (314 <= x <= 348) and (298 <= y <= 336) and (r > 135 and g > 95)
                if not is_pointer:
                    u_raw[y][x] = max(0.0, min(1.0, ((r / 255.0) - 0.08) / 0.48))
                continue

            bg_rgb_grid[y][x] = cur_bg
            denom_g = max(25.0, cur_bg[1] - (min_in_g + 3.0))
            alpha_g = min(1.0, max(0.0, (cur_bg[1] - g) / denom_g))
            hi_rg = max(14.0, 0.78 * loc_max_rg)
            alpha_rg = min(1.0, max(0.0, (rg - 3.5) / (hi_rg - 3.5)))
            alpha = max(alpha_g, alpha_rg)
            alpha_grid[y][x] = alpha

            is_pointer = is_hero and (314 <= x <= 348) and (298 <= y <= 336) and (r > 135 and g > 95)
            if alpha >= 0.72 and not is_pointer:
                u_raw[y][x] = max(0.0, min(1.0, ((r / 255.0) - 0.08) / 0.48))

    # Measure row left/right bounds and column top/bottom bounds for contour-following reflection mapping
    row_left = {}
    row_right = {}
    for y in range(h):
        xs = [x for x in range(w) if alpha_grid[y][x] >= 0.35]
        if xs:
            row_left[y] = float(xs[0])
            row_right[y] = float(xs[-1])

    col_top = {}
    col_bot = {}
    for x in range(w):
        ys = [y for y in range(h) if alpha_grid[y][x] >= 0.35]
        if ys:
            col_top[x] = float(ys[0])
            col_bot[x] = float(ys[-1])

    # Smooth row_left/row_right and col_top/col_bot so the coordinate field is C-infinity smooth
    for _ in range(4):
        rl_c, rr_c = dict(row_left), dict(row_right)
        for y in list(row_left.keys()):
            vals_l = [rl_c[ny] for ny in range(y - 5, y + 6) if ny in rl_c]
            vals_r = [rr_c[ny] for ny in range(y - 5, y + 6) if ny in rr_c]
            row_left[y] = sum(vals_l) / len(vals_l)
            row_right[y] = sum(vals_r) / len(vals_r)
        ct_c, cb_c = dict(col_top), dict(col_bot)
        for x in list(col_top.keys()):
            vals_t = [ct_c[nx] for nx in range(x - 6, x + 7) if nx in ct_c]
            vals_b = [cb_c[nx] for nx in range(x - 6, x + 7) if nx in cb_c]
            col_top[x] = sum(vals_t) / len(vals_t)
            col_bot[x] = sum(vals_b) / len(vals_b)

    for _ in range(5):
        nxt_u = [row[:] for row in u_raw]
        for y in range(1, h - 1):
            for x in range(1, w - 1):
                if u_raw[y][x] is None and alpha_grid[y][x] > 0.0:
                    acc, cnt = 0.0, 0
                    for dy in (-1, 0, 1):
                        for dx in (-1, 0, 1):
                            un = u_raw[y + dy][x + dx]
                            if un is not None:
                                acc += un
                                cnt += 1
                    if cnt > 0:
                        nxt_u[y][x] = acc / cnt
        u_raw = nxt_u

    u_crisp = [row[:] for row in u_raw]
    for _ in range(3):
        nxt_c = [row[:] for row in u_crisp]
        for y in range(2, h - 2):
            for x in range(2, w - 2):
                u0 = u_crisp[y][x]
                if u0 is None:
                    continue
                acc, wsum = 0.0, 0.0
                for dy in (-2, -1, 0, 1, 2):
                    for dx in (-2, -1, 0, 1, 2):
                        un = u_crisp[y + dy][x + dx]
                        if un is not None:
                            diff = abs(un - u0)
                            wt = math.exp(-((diff / 0.06) ** 2)) * math.exp(-(dx * dx + dy * dy) / 3.5)
                            acc += wt * un
                            wsum += wt
                if wsum > 0:
                    nxt_c[y][x] = acc / wsum
        u_crisp = nxt_c

    rng = random.Random(77)
    for y in range(h):
        for x in range(w):
            i = (y * w + x) * 3
            r, g, b = src_rgb[i], src_rgb[i + 1], src_rgb[i + 2]

            alpha = alpha_grid[y][x]
            if alpha <= 0.0 and not (is_hero and 314 <= x <= 348 and 298 <= y <= 336):
                continue

            nx_ell = (x - cx) / rx
            ny_top = (y - min_y) / span_y
            by_ell = (y - cy_body) / ry_body

            # Blend global elliptical coordinates with local contour coordinates so the
            # spherical reflection wraps naturally around the tomato's organic silhouette
            if y in row_left and (row_right[y] - row_left[y]) > 20.0:
                nx_cnt = 2.0 * (x - row_left[y]) / (row_right[y] - row_left[y]) - 1.0
                bx = 0.45 * nx_ell + 0.55 * nx_cnt
            else:
                bx = nx_ell

            if x in col_top and (col_bot[x] - col_top[x]) > 20.0:
                ny_cnt = 2.0 * (y - col_top[x]) / (col_bot[x] - col_top[x]) - 1.0
                by = 0.52 * by_ell + 0.48 * ny_cnt
            else:
                by = by_ell

            # 1. Sample exact studio reflection map from docs/mockup-images/silver-sphere-ref.png
            ref_env = sample_ref_sphere_metal(bx, by)

            # 2. Blend subtle heirloom 3D lobe & surface normal relief from the studio photo
            u_c = u_crisp[y][x] if u_crisp[y][x] is not None else 0.5
            lobe_relief = (u_c - 0.52) * 0.032

            # 3. Clean 360-degree metallic rim definition against the #E7E8E2 (0.906) canvas background
            rho_local = math.sqrt(min(1.25, bx * bx + by * by))
            rim_t = 0.0
            if rho_local > 0.74:
                rim_t = min(1.0, (rho_local - 0.74) / 0.26) ** 1.45

            # 4. Ultra-fine pixel-level satin micro-grain (zero sine-wave stripes!)
            satin_noise = rng.uniform(-0.0025, 0.0025)

            # Calyx / stem crown sculpting at top
            d_calyx = math.sqrt((nx_ell / 0.56) ** 2 + ((ny_top - 0.12) / 0.14) ** 2)
            if d_calyx <= 0.72:
                w_calyx = 1.0
            elif d_calyx >= 1.15:
                w_calyx = 0.0
            else:
                w_calyx = 0.5 * (1.0 + math.cos(math.pi * (d_calyx - 0.72) / (1.15 - 0.72)))

            # Equatorial seam line on Hero tomato
            seam_darken = 1.0
            if is_hero:
                seam_y_here = fit_seam_y(x + 54) - 536.0
                dy_seam = y - seam_y_here
                if -4.0 <= dy_seam <= 5.5:
                    seam_t = math.exp(-((dy_seam - 0.8) / 2.1) ** 2)
                    seam_darken = 1.0 - 0.34 * seam_t

            raw_body = ref_env + lobe_relief + satin_noise
            # Soft, polished lower-contrast silver curve: darkest core ~0.50 (RGB ~128), brightest dome ~0.975 (RGB ~249)
            polished_body = 0.50 + 0.475 * max(0.0, min(1.0, (raw_body - 0.35) / 0.64))
            # Pull outer grazing rim gently toward crisp satin silver (0.745 / RGB ~190) so top-right shoulder never vanishes into #E7E8E2
            if polished_body > 0.755 and rim_t > 0.0:
                polished_body = (1.0 - 0.58 * rim_t) * polished_body + (0.58 * rim_t) * 0.755
            body_metal = polished_body * seam_darken

            calyx_metal = 0.53 + 0.35 * (u_c ** 0.82) + 0.07 * max(0.0, ref_env - 0.75) + satin_noise
            metal_v = w_calyx * calyx_metal + (1.0 - w_calyx) * body_metal
            metal_v = max(0.47, min(0.978, metal_v))

            if is_hero and (314 <= x <= 348) and (298 <= y <= 336) and (r > 130 and g > 75):
                whiteness = min(1.0, max(0.0, (g - 75.0) / 140.0))
                silver_bg = metal_v * 255.0
                anthracite = 62.0
                val = (1.0 - whiteness) * silver_bg + whiteness * anthracite
                out[i] = max(0, min(255, int(round(val * 0.996))))
                out[i + 1] = max(0, min(255, int(round(val * 0.998))))
                out[i + 2] = max(0, min(255, int(round(val * 1.002))))
                continue

            mr = metal_v * 0.996 * 255.0
            mg = metal_v * 0.998 * 255.0
            mb = min(255.0, metal_v * 1.003 * 255.0)

            bg_r, bg_g, bg_b = bg_rgb_grid[y][x]
            out[i] = max(0, min(255, int(round((1.0 - alpha) * bg_r + alpha * mr))))
            out[i + 1] = max(0, min(255, int(round((1.0 - alpha) * bg_g + alpha * mg))))
            out[i + 2] = max(0, min(255, int(round((1.0 - alpha) * bg_b + alpha * mb))))

    return out


def render_shiny_mini_tomato(w, h, mini_grey_rgb, mode="silver", hue_deg=0.0, sat_val=0.82, val_scale=1.0):
    """
    Renders a clean, glossy 58x58 small tomato icon for Today's Card using the
    artifact-free `mini_grey` silhouette template:
    - Zero horizontal strips or JPEG blocks
    - Zero pink/red outer halo or stem gap
    - Smooth C-infinity dome shading (zero bottom-right dark crescent ridge)
    - Just ONE crisp, shiny specular highlight on the upper-left cheek!
    """
    out = bytearray(w * h * 3)
    cx, cy = 29.0, 33.5
    rx, ry = 23.5, 19.5
    target_h = (hue_deg % 360.0) / 360.0

    for y in range(h):
        for x in range(w):
            i = (y * w + x) * 3
            r, g, b = mini_grey_rgb[i], mini_grey_rgb[i + 1], mini_grey_rgb[i + 2]
            lum = (r + g + b) / 3.0

            alpha = max(0.0, min(1.0, (251.0 - lum) / (251.0 - 142.0)))
            if alpha <= 0.005:
                out[i], out[i + 1], out[i + 2] = 255, 255, 255
                continue

            if mode == "grey":
                fg_r, fg_g, fg_b = 140.0, 140.0, 142.0
            else:
                nx = (x - cx) / rx
                ny = (y - cy) / ry
                inv_norm = 1.0 / math.sqrt(1.0 + 0.90 * (nx * nx + ny * ny))
                nnx = -0.95 * nx * inv_norm
                nny = -0.95 * ny * inv_norm
                nnz = 1.0 * inv_norm

                n_dot_l = max(0.0, -0.44 * nnx - 0.42 * nny + 0.794 * nnz)
                n_dot_fill = max(0.0, 0.32 * nnx + 0.28 * nny + 0.50 * nnz)
                dx_h = nx - (-0.32)
                dy_h = ny - (-0.28)
                stem_mask = max(0.0, min(1.0, (y - 17.5) / 3.5))
                one_highlight = (
                    0.40 * math.exp(-0.5 * ((dx_h / 0.24) ** 2 + (dy_h / 0.20) ** 2))
                    + 0.24 * math.exp(-0.5 * ((dx_h / 0.11) ** 2 + (dy_h / 0.09) ** 2))
                ) * stem_mask

                if mode == "silver":
                    r2_mini = nx * nx + ny * ny
                    fresnel_mini = 0.08 * min(1.0, r2_mini)
                    core_dip_mini = 0.22 * math.exp(-0.5 * (((nx + 0.05) / 0.42) ** 2 + ((ny - 0.08) / 0.30) ** 2))
                    dome_mini = 0.20 * math.exp(-0.5 * (((nx - 0.04) / 0.52) ** 2 + ((ny + 0.34) / 0.38) ** 2))
                    metal_v = min(0.985, max(0.46, 0.72 + dome_mini + fresnel_mini - core_dip_mini + 0.22 * one_highlight))
                    fg_r = metal_v * 0.996 * 255.0
                    fg_g = metal_v * 0.998 * 255.0
                    fg_b = min(1.0, metal_v * 1.003) * 255.0
                else:
                    base_v = min(1.0, (0.50 + 0.44 * (n_dot_l ** 0.88) + 0.05 * n_dot_fill) * val_scale)
                    cr, cg, cb = colorsys.hsv_to_rgb(target_h, sat_val, base_v)
                    spec = one_highlight * 0.62
                    fg_r = min(1.0, cr + spec * (1.0 - cr * 0.45)) * 255.0
                    fg_g = min(1.0, cg + spec * 0.88) * 255.0
                    fg_b = min(1.0, cb + spec * 0.85) * 255.0

            out[i] = max(0, min(255, int(round((1.0 - alpha) * 255.0 + alpha * fg_r))))
            out[i + 1] = max(0, min(255, int(round((1.0 - alpha) * 255.0 + alpha * fg_g))))
            out[i + 2] = max(0, min(255, int(round((1.0 - alpha) * 255.0 + alpha * fg_b))))

    return out


# ============================================================================
# 1. EXTRACT & CLEAN HERO TOMATO FROM 02-hero-timer.png
# ============================================================================
if __name__ == "__main__":
    print("Extracting photorealistic Hero Tomato from 02-hero-timer.png...")
    w2, h2, rgb2 = read_ppm(os.path.join(ROOT, "docs/mockup-images/02-hero-timer.png"))
    clean_hero_equatorial_numbers(w2, h2, rgb2)

    # Expanded 700x600 crop (x=54..754, y=536..1136) so the entire soft cast shadow is preserved and feathered to #E7E8E2
    HERO_X0, HERO_Y0, HERO_X1, HERO_Y1 = 54, 536, 754, 1136
    hw, hh, hero_crimson = crop_rgb(w2, h2, rgb2, HERO_X0, HERO_Y0, HERO_X1, HERO_Y1)
    feather_background_to_canvas_bg(hw, hh, hero_crimson, target_bg=(231, 232, 226), margin=58)

    write_png(hw, hh, hero_crimson, os.path.join(OUT_DIR, "hero-tomato-0.png"))
    write_png(hw, hh, recolor_tomato_patch(hw, hh, hero_crimson, 16.0, 0.80, 1.24), os.path.join(OUT_DIR, "hero-tomato-1.png"))
    write_png(hw, hh, recolor_tomato_patch(hw, hh, hero_crimson, 346.0, 0.88, 0.92), os.path.join(OUT_DIR, "hero-tomato-2.png"))
    write_png(hw, hh, recolor_tomato_patch(hw, hh, hero_crimson, 9.0, 0.78, 1.32), os.path.join(OUT_DIR, "hero-tomato-3.png"))
    write_png(hw, hh, recolor_tomato_patch(hw, hh, hero_crimson, 24.0, 0.84, 1.30), os.path.join(OUT_DIR, "hero-tomato-4.png"))
    write_png(hw, hh, recolor_tomato_patch(hw, hh, hero_crimson, 354.0, 0.85, 1.10), os.path.join(OUT_DIR, "hero-tomato-5.png"))
    write_png(hw, hh, recolor_tomato_patch(hw, hh, hero_crimson, 0.0, 0.0, 1.05, grey_mode=True), os.path.join(OUT_DIR, "hero-tomato-grey.png"))
    write_png(hw, hh, recolor_silver_metallic(hw, hh, hero_crimson, is_hero=True), os.path.join(OUT_DIR, "hero-tomato-silver.png"))

    # ============================================================================
    # 2. EXTRACT & CLEAN GRID TOMATOES FROM 03-grid-timer.png
    # ============================================================================
    print("Extracting photorealistic Grid Tomatoes from 03-grid-timer.png...")
    w3, h3, rgb3 = read_ppm(os.path.join(ROOT, "docs/mockup-images/03-grid-timer.png"))

    inpaint_laplace_box(
        w3, h3, rgb3, 80, 312, 300, 432,
        lambda x, y, r, g, b: g > 48 or (r - g) < 55,
        iterations=180
    )
    gw0, gh0, grid_crimson = crop_rgb(w3, h3, rgb3, 32, 216, 356, 516)
    feather_background_to_canvas_bg(gw0, gh0, grid_crimson, target_bg=(231, 232, 226), margin=26)
    write_png(gw0, gh0, grid_crimson, os.path.join(OUT_DIR, "grid-tomato-0.png"))

    inpaint_laplace_box(
        w3, h3, rgb3, 468, 312, 688, 432,
        lambda x, y, r, g, b: g > 92 or b > 65,
        iterations=180
    )
    gw1, gh1, grid_terracotta = crop_rgb(w3, h3, rgb3, 420, 216, 744, 516)
    feather_background_to_canvas_bg(gw1, gh1, grid_terracotta, target_bg=(231, 232, 226), margin=26)
    write_png(gw1, gh1, grid_terracotta, os.path.join(OUT_DIR, "grid-tomato-1.png"))

    inpaint_laplace_box(
        w3, h3, rgb3, 475, 935, 675, 988,
        lambda x, y, r, g, b: r > 164,
        iterations=180
    )
    gwg, ghg, grid_grey = crop_rgb(w3, h3, rgb3, 420, 785, 744, 1085)
    feather_background_to_canvas_bg(gwg, ghg, grid_grey, target_bg=(231, 232, 226), margin=26)
    write_png(gwg, ghg, grid_grey, os.path.join(OUT_DIR, "grid-tomato-grey.png"))

    write_png(gw0, gh0, recolor_tomato_patch(gw0, gh0, grid_crimson, 346.0, 0.88, 0.92), os.path.join(OUT_DIR, "grid-tomato-2.png"))
    write_png(gw0, gh0, recolor_tomato_patch(gw0, gh0, grid_crimson, 9.0, 0.78, 1.32), os.path.join(OUT_DIR, "grid-tomato-3.png"))
    write_png(gw0, gh0, recolor_tomato_patch(gw0, gh0, grid_crimson, 24.0, 0.84, 1.30), os.path.join(OUT_DIR, "grid-tomato-4.png"))
    write_png(gw0, gh0, recolor_tomato_patch(gw0, gh0, grid_crimson, 354.0, 0.85, 1.10), os.path.join(OUT_DIR, "grid-tomato-5.png"))
    write_png(gw0, gh0, recolor_silver_metallic(gw0, gh0, grid_crimson), os.path.join(OUT_DIR, "grid-tomato-silver.png"))

    # ============================================================================
    # 3. EXTRACT MINI CARD TOMATOES FROM 04-card-front.png
    # ============================================================================
    print("Extracting photorealistic Card Mini-Tomatoes from 04-card-front.png...")
    w4, h4, rgb4 = read_ppm(os.path.join(ROOT, "docs/mockup-images/04-card-front.png"))

    # Use the clean grey mini-tomato silhouette from Row 03 (y=614..672) so there are zero JPEG strips or red edge halos
    mw, mh, mini_grey = crop_rgb(w4, h4, rgb4, 605, 614, 663, 672)
    write_png(mw, mh, render_shiny_mini_tomato(mw, mh, mini_grey, mode="grey"), os.path.join(OUT_DIR, "mini-tomato-grey.png"))
    write_png(mw, mh, render_shiny_mini_tomato(mw, mh, mini_grey, mode="color", hue_deg=356.0, sat_val=0.84, val_scale=0.76), os.path.join(OUT_DIR, "mini-tomato-0.png"))
    write_png(mw, mh, render_shiny_mini_tomato(mw, mh, mini_grey, mode="color", hue_deg=14.0, sat_val=0.72, val_scale=0.88), os.path.join(OUT_DIR, "mini-tomato-1.png"))
    write_png(mw, mh, render_shiny_mini_tomato(mw, mh, mini_grey, mode="color", hue_deg=346.0, sat_val=0.78, val_scale=0.68), os.path.join(OUT_DIR, "mini-tomato-2.png"))
    write_png(mw, mh, render_shiny_mini_tomato(mw, mh, mini_grey, mode="color", hue_deg=9.0, sat_val=0.70, val_scale=0.94), os.path.join(OUT_DIR, "mini-tomato-3.png"))
    write_png(mw, mh, render_shiny_mini_tomato(mw, mh, mini_grey, mode="color", hue_deg=24.0, sat_val=0.76, val_scale=0.92), os.path.join(OUT_DIR, "mini-tomato-4.png"))
    write_png(mw, mh, render_shiny_mini_tomato(mw, mh, mini_grey, mode="color", hue_deg=354.0, sat_val=0.76, val_scale=0.82), os.path.join(OUT_DIR, "mini-tomato-5.png"))
    write_png(mw, mh, render_shiny_mini_tomato(mw, mh, mini_grey, mode="silver"), os.path.join(OUT_DIR, "mini-tomato-silver.png"))

    # ============================================================================
    # 4. EXTRACT HOMEPAGE TOMATO (01-home-page.png) & JOURNAL PHOTOS (05-card-back.png)
    # ============================================================================
    print("Extracting Homepage Tomato (01-home-page.png) & Back-of-Card Photos (05-card-back.png)...")
    w1, h1, rgb1 = read_ppm(os.path.join(ROOT, "docs/mockup-images/01-home-page.png"))
    hmw, hmh, home_tomato = crop_rgb(w1, h1, rgb1, 54, 710, 754, 1310)
    feather_background_to_canvas_bg(hmw, hmh, home_tomato, target_bg=(231, 232, 226), margin=58)
    write_png(hmw, hmh, home_tomato, os.path.join(OUT_DIR, "home-tomato.png"))

    photos_dir = os.path.join(ROOT, "assets", "photos")
    os.makedirs(photos_dir, exist_ok=True)
    w5, h5, rgb5 = read_ppm(os.path.join(ROOT, "docs/mockup-images/05-card-back.png"))
    pw1, ph1, photo_poodle = crop_rgb(w5, h5, rgb5, 118, 690, 374, 1038)
    pw2, ph2, photo_desk = crop_rgb(w5, h5, rgb5, 394, 690, 650, 1038)
    write_png(pw1, ph1, photo_poodle, os.path.join(photos_dir, "sample-poodle.jpg"))
    write_png(pw2, ph2, photo_desk, os.path.join(photos_dir, "sample-desk.jpg"))

    print("Done!")

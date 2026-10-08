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
    Eliminates all periodic tick-root bumps along the center seam opening and straightens
    the left/right outer silhouette edges where the center opening meets the edge of the tomato.
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
    for y in range(765, 845):
        lx = left_edge.get(y, 170)
        rx = right_edge.get(y, 598)
        for x in range(lx + 1, rx):
            sy = fit_seam_y(x)
            dy = y - sy
            if -28.0 <= dy <= 5.5:
                samples = []
                for dx in range(-18, 19, 2):
                    nx = max(lx + 4, min(rx - 4, x + dx))
                    ny = fit_seam_y(nx) + dy
                    s_rgb = sample_bilinear(w, h, src, nx, ny)
                    if s_rgb[0] - s_rgb[1] > 35:
                        samples.append(s_rgb)
                if samples:
                    samples.sort(key=lambda t: t[1] + 0.5 * t[0])
                    lo = max(0, int(len(samples) * 0.15))
                    hi = max(lo + 1, int(len(samples) * 0.45))
                    sub = samples[lo:hi]
                    i = (y * w + x) * 3
                    for c in range(3):
                        pass1[i + c] = int(round(sum(p[c] for p in sub) / len(sub)))

    for y in range(765, 845):
        lx = left_edge.get(y, 170)
        rx = right_edge.get(y, 598)
        for x in range(lx + 1, rx):
            sy = fit_seam_y(x)
            dy = y - sy
            if -28.0 <= dy <= 5.5:
                if dy < -14.0:
                    blend = 0.5 * (1.0 - math.cos(math.pi * (dy - (-28.0)) / 14.0))
                elif dy > 3.0:
                    blend = 0.5 * (1.0 + math.cos(math.pi * (dy - 3.0) / 2.5))
                else:
                    blend = 1.0
                acc = [0.0, 0.0, 0.0]
                wsum = 0.0
                for dx in range(-14, 15, 2):
                    nx = max(lx + 4, min(rx - 4, x + dx))
                    ny = fit_seam_y(nx) + dy
                    wt = math.exp(-(dx * dx) / (2.0 * 8.0 * 8.0))
                    s_rgb = sample_bilinear(w, h, pass1, nx, ny)
                    for c in range(3):
                        acc[c] += wt * s_rgb[c]
                    wsum += wt
                i = (y * w + x) * 3
                for c in range(3):
                    smoothed = acc[c] / wsum
                    rgb[i + c] = int(round((1.0 - blend) * src[i + c] + blend * smoothed))

    # Remove JPEG ringing line just inside left/right silhouette rim (within 11px of edge)
    rim_src = bytearray(rgb)
    for y in range(700, 865):
        lx = left_edge.get(y)
        if lx:
            i_in = (y * w + (lx + 12)) * 3
            i_out = (y * w + (lx + 1)) * 3
            for dx in range(2, 12):
                t = (dx - 1) / 11.0
                i = (y * w + (lx + dx)) * 3
                for c in range(3):
                    lin = rim_src[i_out + c] * (1.0 - t) + rim_src[i_in + c] * t
                    rgb[i + c] = int(round(0.65 * lin + 0.35 * rim_src[i + c]))
        rx = right_edge.get(y)
        if rx:
            i_in = (y * w + (rx - 12)) * 3
            i_out = (y * w + (rx - 1)) * 3
            for dx in range(2, 12):
                t = (dx - 1) / 11.0
                i = (y * w + (rx - dx)) * 3
                for c in range(3):
                    lin = rim_src[i_out + c] * (1.0 - t) + rim_src[i_in + c] * t
                    rgb[i + c] = int(round(0.65 * lin + 0.35 * rim_src[i + c]))

    # Straighten the outer silhouette columns at the left (x=166..170) and right (x=597..601) ends of the center opening
    for x_cols, x_ref in [([166, 167, 168, 169, 170], 171), ([601, 600, 599, 598, 597], 596)]:
        y_top, y_bot = 785, 809
        for idx_col, x in enumerate(x_cols):
            i_top = (y_top * w + x) * 3
            i_bot = (y_bot * w + x) * 3
            for y in range(y_top + 1, y_bot):
                t = (y - y_top) / (y_bot - y_top)
                i = (y * w + x) * 3
                i_in = (y * w + x_ref) * 3
                i_in_top = (y_top * w + x_ref) * 3
                i_in_bot = (y_bot * w + x_ref) * 3
                for c in range(3):
                    base = rgb[i_top + c] * (1.0 - t) + rgb[i_bot + c] * t
                    in_base = rgb[i_in_top + c] * (1.0 - t) + rgb[i_in_bot + c] * t
                    delta = rgb[i_in + c] - in_base
                    tomato_weight = 0.85 if idx_col >= 2 else (0.35 if idx_col == 1 else 0.0)
                    val = int(round(base + tomato_weight * delta))
                    rgb[i + c] = max(0, min(255, val))


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
            if redness <= 12:
                continue
            weight = min(1.0, (redness - 12.0) / 28.0)
            rf, gf, bf = r / 255.0, g / 255.0, b / 255.0
            hh, ss, vv = colorsys.rgb_to_hsv(rf, gf, bf)
            if grey_mode:
                lum = 0.42 * rf + 0.32 * gf + 0.26 * bf
                grey_v = min(0.92, pow(lum, 0.78) * 1.18 * val_scale)
                nr, ng, nb = grey_v, grey_v, grey_v * 0.99
            else:
                ns = min(1.0, ss * sat_scale)
                nv = min(1.0, pow(vv, 0.96) * val_scale)
                nr, ng, nb = colorsys.hsv_to_rgb(target_h, ns, nv)

            out[i] = int(round((1.0 - weight) * r + weight * (nr * 255.0)))
            out[i + 1] = int(round((1.0 - weight) * g + weight * (ng * 255.0)))
            out[i + 2] = int(round((1.0 - weight) * b + weight * (nb * 255.0)))
    return out


def recolor_silver_metallic(w, h, src_rgb, is_hero=False):
    """
    Transforms the studio-lit heirloom tomato into a minimalistic, sculptural
    Satin Silver Metallic tomato (anodized aluminum / brushed platinum-silver finish)
    for the completed / ended timer state.
    Uses a 2D silhouette-aware studio smoothing pass on the illumination field so
    the metallic skin is silky-smooth anodized aluminum with zero JPEG grain.
    """
    out = bytearray(src_rgb)
    cx_norm = w * 0.48
    cy_norm = h * 0.44

    # 1. Build raw studio illumination field u_raw[y][x] for tomato body pixels
    u_raw = [[None] * w for _ in range(h)]
    spec_raw = [[0.0] * w for _ in range(h)]
    body_weight = [[0.0] * w for _ in range(h)]

    for y in range(h):
        for x in range(w):
            i = (y * w + x) * 3
            r, g, b = src_rgb[i], src_rgb[i + 1], src_rgb[i + 2]
            if r > 172 and g > 168 and b > 162 and (r - g) < 22:
                continue
            redness = r - max(g, b)
            if redness > 5:
                rf, gf = r / 255.0, g / 255.0
                body_weight[y][x] = min(1.0, (redness - 5.0) / 18.0)
                u_raw[y][x] = max(0.0, min(1.0, (rf - 0.12) / 0.53))
                spec_raw[y][x] = min(1.0, max(0.0, gf - 0.10) / 0.24)

    # 2. Smooth u_raw with a silhouette-aware 2-pass studio kernel (eliminates JPEG grain & rim streaks
    #    while preserving the sharp dark equatorial seam groove around y ~ 290..308 on Hero)
    u_smooth = [row[:] for row in u_raw]
    for _ in range(2):
        nxt = [row[:] for row in u_smooth]
        for y in range(2, h - 2):
            for x in range(2, w - 2):
                u0 = u_smooth[y][x]
                if u0 is None:
                    continue
                acc = 0.0
                wsum = 0.0
                for dy in range(-2, 3):
                    for dx in range(-2, 3):
                        un = u_smooth[y + dy][x + dx]
                        if un is None:
                            continue
                        # Edge-stopping bilateral weight so the dark center seam stays razor-sharp
                        diff = abs(un - u0)
                        if diff > 0.16:
                            continue
                        wt = (0.18 - diff)
                        acc += wt * un
                        wsum += wt
                if wsum > 0:
                    nxt[y][x] = acc / wsum
        u_smooth = nxt

    for y in range(h):
        for x in range(w):
            i = (y * w + x) * 3
            r, g, b = src_rgb[i], src_rgb[i + 1], src_rgb[i + 2]
            rf, gf, bf = r / 255.0, g / 255.0, b / 255.0

            # Center pointer triangle (▲) on Hero tomato: render as crisp dark anthracite to match the silver dial scale
            if is_hero and (314 <= x <= 348) and (298 <= y <= 336):
                if r > 135 and g > 95:
                    # Smooth blend based on how white the triangle pixel is
                    whiteness = min(1.0, max(0.0, (g - 85.0) / 135.0))
                    u = u_smooth[y][x] if u_smooth[y][x] is not None else 0.62
                    silver_bg = (0.24 + 0.60 * (u ** 0.78)) * 255.0
                    anthracite = 36.0
                    val = int(round((1.0 - whiteness) * silver_bg + whiteness * anthracite))
                    out[i] = max(0, min(255, int(round(val * 0.96))))
                    out[i + 1] = max(0, min(255, val))
                    out[i + 2] = max(0, min(255, int(round(val * 1.05))))
                    continue

            if r > 172 and g > 168 and b > 162 and (r - g) < 22:
                continue

            w_body = body_weight[y][x]
            greenness = g - max(r, b)

            if w_body > 0.0 and u_smooth[y][x] is not None:
                u = u_smooth[y][x]
                dx_k = (x - (cx_norm - w * 0.11)) / (w * 0.28)
                dy_k = (y - (cy_norm - h * 0.10)) / (h * 0.26)
                key_sheen = 0.14 * math.exp(-0.5 * (dx_k * dx_k + dy_k * dy_k))

                silver_base = 0.23 + 0.61 * (u ** 0.78)
                spec_lobe = (
                    0.15 * (max(0.0, (u - 0.38) / 0.62) ** 2.0)
                    + 0.18 * spec_raw[y][x]
                    + key_sheen * u
                )
                metal_v = max(0.18, min(0.985, silver_base + spec_lobe))

                nr = min(1.0, metal_v * 0.976)
                ng = min(1.0, metal_v * 0.992)
                nb = min(1.0, metal_v * 1.024)

                out[i] = int(round((1.0 - w_body) * r + w_body * (nr * 255.0)))
                out[i + 1] = int(round((1.0 - w_body) * g + w_body * (ng * 255.0)))
                out[i + 2] = int(round((1.0 - w_body) * b + w_body * (nb * 255.0)))
            elif y < h * 0.48 and (greenness > 2 or (g >= r and r < 145)):
                stem_w = min(1.0, max(0.0, (g - r + 14.0) / 20.0))
                lum = 0.35 * rf + 0.50 * gf + 0.15 * bf
                u_s = max(0.0, min(1.0, (lum - 0.06) / 0.45))
                pewter_v = min(0.92, 0.24 + 0.64 * (u_s ** 0.80))
                nr = pewter_v * 0.975
                ng = pewter_v * 0.992
                nb = min(1.0, pewter_v * 1.025)
                out[i] = int(round((1.0 - stem_w) * r + stem_w * (nr * 255.0)))
                out[i + 1] = int(round((1.0 - stem_w) * g + stem_w * (ng * 255.0)))
                out[i + 2] = int(round((1.0 - stem_w) * b + stem_w * (nb * 255.0)))

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

    # Exact 58x58 crops centered on Row 01 (y=372..430), Row 02 (y=493..551), Row 03 (y=614..672)
    mw, mh, mini_0 = crop_rgb(w4, h4, rgb4, 605, 372, 663, 430)
    write_png(mw, mh, mini_0, os.path.join(OUT_DIR, "mini-tomato-0.png"))

    _, _, mini_1 = crop_rgb(w4, h4, rgb4, 605, 493, 663, 551)
    write_png(mw, mh, mini_1, os.path.join(OUT_DIR, "mini-tomato-1.png"))

    _, _, mini_grey = crop_rgb(w4, h4, rgb4, 605, 614, 663, 672)
    write_png(mw, mh, mini_grey, os.path.join(OUT_DIR, "mini-tomato-grey.png"))

    write_png(mw, mh, recolor_tomato_patch(mw, mh, mini_0, 346.0, 0.88, 0.92), os.path.join(OUT_DIR, "mini-tomato-2.png"))
    write_png(mw, mh, recolor_tomato_patch(mw, mh, mini_0, 9.0, 0.78, 1.32), os.path.join(OUT_DIR, "mini-tomato-3.png"))
    write_png(mw, mh, recolor_tomato_patch(mw, mh, mini_0, 24.0, 0.84, 1.30), os.path.join(OUT_DIR, "mini-tomato-4.png"))
    write_png(mw, mh, recolor_tomato_patch(mw, mh, mini_0, 354.0, 0.85, 1.10), os.path.join(OUT_DIR, "mini-tomato-5.png"))
    write_png(mw, mh, recolor_silver_metallic(mw, mh, mini_0), os.path.join(OUT_DIR, "mini-tomato-silver.png"))

    print("Done!")

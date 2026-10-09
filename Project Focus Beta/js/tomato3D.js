/**
 * Tomato3DRenderer — Photorealistic Studio Heirloom Tomato Renderer
 *
 * Uses the exact studio-lit sculpted Heirloom Tomato assets from the PRD Mockups
 * (02-hero-timer.png, 03-grid-timer.png, 04-card-front.png) combined with an exact
 * sub-pixel equatorial seam curve and per-digit 3D cylindrical projection so that:
 * - Ticks and numbers follow the exact equatorial seam curve of the tomato from edge to edge.
 * - Numbers wrap around the 3D curvature character-by-character with realistic studio shading
 *   (brighter on the key-lit left cheek, shaded on the right shadow side) and clip naturally
 *   at the physical silhouette horizon instead of fading out unnaturally.
 */

export const HEIRLOOM_PALETTE = {
  0: {
    name: 'Deep Crimson',
    hex: '#8B1E24',
    heroImg: 'assets/tomatoes/hero-tomato-0.png?v=20261009_v21',
    gridImg: 'assets/tomatoes/grid-tomato-0.png?v=20261009_v21',
    miniImg: 'assets/tomatoes/mini-tomato-0.png?v=20261009_v21',
  },
  1: {
    name: 'Warm Terracotta',
    hex: '#C84B31',
    heroImg: 'assets/tomatoes/hero-tomato-1.png?v=20261009_v21',
    gridImg: 'assets/tomatoes/grid-tomato-1.png?v=20261009_v21',
    miniImg: 'assets/tomatoes/mini-tomato-1.png?v=20261009_v21',
  },
  2: {
    name: 'Rich Dark Burgundy',
    hex: '#5E192A',
    heroImg: 'assets/tomatoes/hero-tomato-2.png?v=20261009_v21',
    gridImg: 'assets/tomatoes/grid-tomato-2.png?v=20261009_v21',
    miniImg: 'assets/tomatoes/mini-tomato-2.png?v=20261009_v21',
  },
  3: {
    name: 'Sun-Ripened Coral',
    hex: '#D96B52',
    heroImg: 'assets/tomatoes/hero-tomato-3.png?v=20261009_v21',
    gridImg: 'assets/tomatoes/grid-tomato-3.png?v=20261009_v21',
    miniImg: 'assets/tomatoes/mini-tomato-3.png?v=20261009_v21',
  },
  4: {
    name: 'Golden Persimmon',
    hex: '#C96A2B',
    heroImg: 'assets/tomatoes/hero-tomato-4.png?v=20261009_v21',
    gridImg: 'assets/tomatoes/grid-tomato-4.png?v=20261009_v21',
    miniImg: 'assets/tomatoes/mini-tomato-4.png?v=20261009_v21',
  },
  5: {
    name: 'Spiced Garnet',
    hex: '#9E2A3B',
    heroImg: 'assets/tomatoes/hero-tomato-5.png?v=20261009_v21',
    gridImg: 'assets/tomatoes/grid-tomato-5.png?v=20261009_v21',
    miniImg: 'assets/tomatoes/mini-tomato-5.png?v=20261009_v21',
  },
  completed: {
    name: 'Satin Silver Metallic',
    hex: '#C2C7CE',
    heroImg: 'assets/tomatoes/hero-tomato-silver.png?v=20261009_v21',
    gridImg: 'assets/tomatoes/grid-tomato-silver.png?v=20261009_v21',
    miniImg: 'assets/tomatoes/mini-tomato-silver.png?v=20261009_v21',
  },
  unassigned: {
    name: 'Matte Neutral Grey',
    hex: '#8E8D8A',
    heroImg: 'assets/tomatoes/hero-tomato-grey.png?v=20261009_v21',
    gridImg: 'assets/tomatoes/grid-tomato-grey.png?v=20261009_v21',
    miniImg: 'assets/tomatoes/mini-tomato-grey.png?v=20261009_v21',
  },
};

/**
 * Exact sub-pixel equatorial seam curve y(x) measured directly from the dark seam groove
 * in 02-hero-timer.png (in local tomato coordinates where center x = 250.5, R_eq = 215.5).
 * Follows the exact smooth analytical polynomial fit to the dark center opening
 * without hooking or curving backwards at the left/right edges.
 */
export function getTomatoSeamY(x) {
  const cx = 250.5;
  const rx = 215.5;
  const u = Math.max(-1.0, Math.min(1.0, (x - cx) / rx));
  return 258.8 + 0.5 * u - 18.2 * (u * u) - 15.2 * (u * u * u * u);
}

/**
 * Tangent slope dy/dx of the equatorial seam at horizontal coordinate x.
 */
export function getTomatoSeamSlope(x) {
  const eps = 1.5;
  return (getTomatoSeamY(x + eps) - getTomatoSeamY(x - eps)) / (2.0 * eps);
}

export class HeroTomato3DView {
  constructor(container) {
    this.container = container;
    this.currentAngleDegrees = 900.0; // 150 minutes (02:30)
    this.quadrantIndex = 0;
    this.isAssigned = true;
    this.isCompleted = false;
    this.silverBlend = 0.0;
    this.targetSilverBlend = 0.0;
    this._silverAnimFrame = null;
    this._silverAnimLastTs = 0;
    this.images = new Map();

    // Expanded 700 x 600 coordinate space (crop x=54..754, y=536..1136) so the entire soft shadow fits with zero border line
    this.baseW = 700;
    this.baseH = 600;
    this.offsetX = 80; // 134 - 54
    this.offsetY = 40; // 576 - 536

    this.canvas = document.createElement('canvas');
    this.canvas.width = this.baseW * 2;
    this.canvas.height = this.baseH * 2;
    this.canvas.style.width = '100%';
    this.canvas.style.height = '100%';
    this.canvas.style.objectFit = 'contain';
    this.ctx = this.canvas.getContext('2d');

    this.container.innerHTML = '';
    this.container.appendChild(this.canvas);

    // Build the 2x Retina 2D Odometer Texture Ribbon (0..180 min) and the 3D Tomato Equatorial Surface Mesh
    this._buildOdometerTextureStrip();
    this._buildTomato3DMesh();
    this._preloadImages();
  }

  /**
   * Renders the unrolled flat 2D Odometer Texture Ribbon (0..180 minutes + ticks) at 2x Retina resolution
   * so it can be UV-projected onto the 3D curved surface mesh of the tomato.
   */
  _buildOdometerTextureStrip() {
    this.pxPerMin = 24; // 24 Retina pixels per minute on the unrolled cylinder ribbon
    this.stripW = 190 * this.pxPerMin; // Covers -5..185 minutes
    this.stripH = 160; // 2x Retina height of the equatorial odometer band

    const stripCanvas = document.createElement('canvas');
    stripCanvas.width = this.stripW;
    stripCanvas.height = this.stripH;
    const sctx = stripCanvas.getContext('2d');

    sctx.clearRect(0, 0, this.stripW, this.stripH);
    sctx.strokeStyle = '#FFFFFF';
    sctx.fillStyle = '#FFFFFF';
    sctx.lineCap = 'round';
    sctx.textAlign = 'center';
    sctx.textBaseline = 'bottom';
    sctx.font = '500 41px -apple-system, BlinkMacSystemFont, "SF Pro Display", "Inter", sans-serif';

    const yBot = this.stripH - 10; // 5.0px above the equatorial seam in 1x coordinates

    for (let m = 0; m <= 180; m++) {
      const ux = (m + 5) * this.pxPerMin;
      const isMajor10 = m % 10 === 0;
      const isMedium5 = m % 5 === 0 && !isMajor10;

      const tickLen = isMajor10 ? 35.0 : isMedium5 ? 26.0 : 21.0;
      sctx.lineWidth = isMajor10 ? 3.7 : isMedium5 ? 2.9 : 2.4;

      sctx.beginPath();
      sctx.moveTo(ux, yBot);
      sctx.lineTo(ux, yBot - tickLen);
      sctx.stroke();

      if (isMajor10) {
        sctx.fillText(String(m), ux, this.stripH - 53);
      }
    }

    const imgData = sctx.getImageData(0, 0, this.stripW, this.stripH).data;
    this.stripAlpha = new Uint8Array(this.stripW * this.stripH);
    for (let i = 0; i < this.stripAlpha.length; i++) {
      this.stripAlpha[i] = imgData[i * 4 + 3];
    }
  }

  /**
   * Builds the 3D Surface Mesh of the Tomato's Equatorial Band (x: 35..467, y: 140..266 in local 1x coords).
   * Each vertex/pixel on the 3D mesh stores its 3D cylindrical azimuth angle thetaDeg, meridian height sv,
   * horizontal perspective derivative du_dsx, and 3D directional studio key-light shading (pr, pg, pb).
   */
  _buildTomato3DMesh() {
    this.bandX0 = 32;
    this.bandY0 = 140;
    this.bandW1x = 438;
    this.bandH1x = 126;
    this.bandW = this.bandW1x * 2; // 876 Retina px
    this.bandH = this.bandH1x * 2; // 252 Retina px

    this.bandCanvas = document.createElement('canvas');
    this.bandCanvas.width = this.bandW;
    this.bandCanvas.height = this.bandH;
    this.bandCtx = this.bandCanvas.getContext('2d');
    this.bandImageData = this.bandCtx.createImageData(this.bandW, this.bandH);

    const cx = 250.5;
    const R_eq = 215.5;
    const degPerMin = 3.0;

    const pixelIndices = [];
    const thetaDegs = [];
    const svs = [];
    const duDsxs = [];
    const prs = [];
    const pgs = [];
    const pbs = [];
    const silverPRs = [];
    const silverPGs = [];
    const silverPBs = [];
    const baseAlphas = [];

    for (let by = 0; by < this.bandH; by++) {
      const ly = this.bandY0 + by * 0.5;
      for (let bx = 0; bx < this.bandW; bx++) {
        const lx = this.bandX0 + bx * 0.5;
        const u = (lx - cx) / R_eq;
        const absU = Math.abs(u);
        if (absU >= 0.996) continue;

        const seamY = getTomatoSeamY(lx);
        const vRaw = seamY - ly;
        if (vRaw < 0 || vRaw >= 78.0) continue;

        // Perspective-camera horizon mapping so +-25 min (+-75 deg, including full 2-digit numbers up to +-78.5 deg)
        // sits completely inside the full-opacity tomato surface (absU <= 0.968) with zero cut-off digits
        const sinPersp = 0.978 * u;
        const cosPersp = Math.sqrt(Math.max(0.055, 1.0 - sinPersp * sinPersp));
        const thetaBaseDeg = ((Math.asin(sinPersp) * 180.0) / Math.PI) * 1.118;

        // Smoothly relax the sharp u^4 cut-lip term as height rises from the seam ticks into the upper-dome numbers
        const tLat = Math.max(0.0, Math.min(1.0, (vRaw - 15.0) / 28.0));
        const sLat = tLat * tLat * (3.0 - 2.0 * tLat);
        const u2 = u * u;
        const u4 = u2 * u2;
        const yLatBase = seamY + 8.6 * sLat * u4;

        const v = (yLatBase - ly) / (0.90 + 0.10 * cosPersp);
        if (v < 0 || v >= 78.5) continue;

        const sv = (this.stripH - 1) - v * 2.0;
        if (sv < 0 || sv >= this.stripH - 1) continue;

        // Bounded inward meridian tilt outside asin() so digits at the visual curve edge never shear or clip at the top
        const meridianTiltDeg = -0.62 * u * ((v - 5.0) / 35.0);
        const thetaDeg = thetaBaseDeg + meridianTiltDeg;

        // Horizontal UV derivative du/dbx for 4x supersampled anti-aliasing on perspective-foreshortened side numbers
        const dThetaDu = ((0.978 * 1.118 * 180.0) / Math.PI) / cosPersp;
        const duDsx = ((dThetaDu / R_eq) / degPerMin) * this.pxPerMin * 0.5;

        // 3D studio key-light shading on the tomato surface normal N = (sinPersp, 0.18, cosPersp)
        const light = Math.max(0.48, Math.min(1.02, 0.86 - 0.34 * sinPersp + 0.08 * cosPersp));
        const pr = Math.round(246 * light);
        const pg = Math.round(202 * light);
        const pb = Math.round(198 * light);

        // On the Satin Silver Metallic tomato, etched dark anthracite-charcoal markings provide crisp minimalistic contrast
        const sLight = Math.max(0.55, Math.min(1.0, 0.90 - 0.25 * sinPersp));
        const spr = Math.round(32 * sLight);
        const spg = Math.round(34 * sLight);
        const spb = Math.round(38 * sLight);

        const rimFade = absU > 0.974 ? (0.996 - absU) / (0.996 - 0.974) : 1.0;
        const baseAlpha = 0.88 * Math.max(0.0, Math.min(1.0, rimFade));

        pixelIndices.push((by * this.bandW + bx) * 4);
        thetaDegs.push(thetaDeg);
        svs.push(sv);
        duDsxs.push(duDsx);
        prs.push(pr);
        pgs.push(pg);
        pbs.push(pb);
        silverPRs.push(spr);
        silverPGs.push(spg);
        silverPBs.push(spb);
        baseAlphas.push(baseAlpha);
      }
    }

    this.meshCount = pixelIndices.length;
    this.meshPixelIdx = new Int32Array(pixelIndices);
    this.meshThetaDeg = new Float32Array(thetaDegs);
    this.meshSV = new Float32Array(svs);
    this.meshDuDsx = new Float32Array(duDsxs);
    this.meshPR = new Uint8Array(prs);
    this.meshPG = new Uint8Array(pgs);
    this.meshPB = new Uint8Array(pbs);
    this.meshSilverPR = new Uint8Array(silverPRs);
    this.meshSilverPG = new Uint8Array(silverPGs);
    this.meshSilverPB = new Uint8Array(silverPBs);
    this.meshBaseAlpha = new Float32Array(baseAlphas);
  }

  _preloadImages() {
    const keys = [0, 1, 2, 3, 4, 5, 'completed', 'unassigned'];
    keys.forEach((k) => {
      const entry = HEIRLOOM_PALETTE[k];
      if (!entry) return;
      const img = new Image();
      img.src = entry.heroImg;
      img.onload = () => {
        this.images.set(k, img);
        this.render();
      };
    });
  }

  updateOdometer(angleDegrees, quadrantIndex = 0, isAssigned = true, isCompleted = false) {
    this.currentAngleDegrees = angleDegrees;
    this.quadrantIndex = quadrantIndex;
    this.isAssigned = isAssigned;
    this.isCompleted = Boolean(isCompleted);
    this.targetSilverBlend = this.isCompleted ? 1.0 : 0.0;

    if (Math.abs(this.targetSilverBlend - this.silverBlend) > 0.004) {
      this._startSilverTransition();
    } else {
      this.silverBlend = this.targetSilverBlend;
      this.render();
    }
  }

  _startSilverTransition() {
    if (this._silverAnimFrame) {
      this.render();
      return;
    }
    this._silverAnimLastTs = performance.now();
    const step = (now) => {
      const dt = Math.min(0.06, Math.max(0.008, (now - this._silverAnimLastTs) / 1000.0));
      this._silverAnimLastTs = now;
      const speed = 2.05; // ~490ms full smooth transition
      if (this.silverBlend < this.targetSilverBlend) {
        this.silverBlend = Math.min(this.targetSilverBlend, this.silverBlend + dt * speed);
      } else {
        this.silverBlend = Math.max(this.targetSilverBlend, this.silverBlend - dt * speed);
      }
      this.render();
      if (Math.abs(this.targetSilverBlend - this.silverBlend) > 0.004) {
        this._silverAnimFrame = requestAnimationFrame(step);
      } else {
        this.silverBlend = this.targetSilverBlend;
        this._silverAnimFrame = null;
        this.render();
      }
    };
    this._silverAnimFrame = requestAnimationFrame(step);
  }

  resize() {
    this.render();
  }

  /**
   * Computes realistic 3D studio-lit paint color for a marking at cylindrical angle thetaRad (-PI/2 .. +PI/2).
   * In 02-hero-timer.png, the studio key light is on the top-left (negative sinT),
   * while the right side (positive sinT) turns into soft 3D shadow.
   * This shades the paint brightness physically instead of fading alpha unnaturally!
   */
  _getLitPaintStyle(sinT, cosT, edgeAlpha = 1.0) {
    // Key light factor: 1.0 on left cheek (sinT = -0.7), 0.88 at center (sinT = 0), 0.56 in right shadow (sinT = +0.85)
    const light = Math.max(0.50, Math.min(1.02, 0.86 - 0.32 * sinT + 0.08 * cosT));
    const r = Math.round(246 * light);
    const g = Math.round(202 * light);
    const b = Math.round(198 * light);
    const alpha = 0.86 * Math.max(0.0, Math.min(1.0, edgeAlpha));
    return `rgba(${r}, ${g}, ${b}, ${alpha.toFixed(3)})`;
  }

  render() {
    if (!this.ctx) return;
    const ctx = this.ctx;
    const scale = 2; // 2x Retina canvas
    ctx.save();
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    ctx.scale(scale, scale);

    // Smooth cosine-eased blend factor [0..1] between active heirloom color and Satin Silver Metallic
    const sBlend = 0.5 * (1.0 - Math.cos(Math.PI * Math.max(0.0, Math.min(1.0, this.silverBlend))));

    // Draw base Heirloom Tomato (or Matte Neutral Grey when unassigned)
    const key = this.isAssigned ? (this.quadrantIndex ?? 0) : 'unassigned';
    const img = this.images.get(key) || this.images.get(0);
    if (img && img.complete && sBlend < 0.999) {
      ctx.globalAlpha = 1.0;
      ctx.drawImage(img, 0, 0, this.baseW, this.baseH);
    }

    // Smoothly cross-dissolve into Satin Silver Metallic Tomato when completed/ended
    if (sBlend > 0.001) {
      const silverImg = this.images.get('completed');
      if (silverImg && silverImg.complete) {
        ctx.globalAlpha = sBlend;
        ctx.drawImage(silverImg, 0, 0, this.baseW, this.baseH);
      }
    }
    ctx.restore();

    // Project the 2D Odometer Texture Strip onto the 3D Tomato Surface Mesh with 4x horizontal supersampling
    const currentMinutes = this.currentAngleDegrees / 6.0;
    const degPerMin = 3.0;
    const pxPerMin = this.pxPerMin;
    const stripW = this.stripW;
    const stripAlpha = this.stripAlpha;
    const data = this.bandImageData.data;

    // Clear previous frame's alpha channel in the band buffer
    for (let i = 3; i < data.length; i += 4) {
      data[i] = 0;
    }

    const invBlend = 1.0 - sBlend;
    const numberZoneBottomSV = this.stripH - 38;
    const count = this.meshCount;
    for (let n = 0; n < count; n++) {
      const thetaDeg = this.meshThetaDeg[n];
      const mVal = currentMinutes + thetaDeg / degPerMin;
      const uCenter = (mVal + 5.0) * pxPerMin;
      if (uCenter < 1.0 || uCenter >= stripW - 2.0) continue;

      const sv = this.meshSV[n];

      // Ensure every number label (0, 10, 20, ..., 180) is ALWAYS shown as a complete whole number
      // and never sliced in half at the tomato edge (e.g. '10' must never have its '1' clipped into '0')
      let wholeCharVisibility = 1.0;
      if (sv < numberZoneBottomSV) {
        const nearestLabelMin = Math.round(mVal * 0.1) * 10.0;
        const labelCenterTheta = Math.abs((nearestLabelMin - currentMinutes) * degPerMin);
        if (labelCenterTheta > 78.2) continue;
        if (labelCenterTheta > 75.8) {
          wholeCharVisibility = (78.2 - labelCenterTheta) / (78.2 - 75.8);
        }
      }

      const iy = sv | 0;
      const fy = sv - iy;
      const row0 = iy * stripW;
      const row1 = row0 + stripW;
      const du = this.meshDuDsx[n];

      // 4x horizontal supersampling across (-0.375, -0.125, +0.125, +0.375)
      let alphaSum = 0.0;
      for (let s = -0.375; s <= 0.375; s += 0.25) {
        const uS = uCenter + s * du;
        const ix = uS | 0;
        const fx = uS - ix;
        const a00 = stripAlpha[row0 + ix];
        const a10 = stripAlpha[row0 + ix + 1];
        const a01 = stripAlpha[row1 + ix];
        const a11 = stripAlpha[row1 + ix + 1];
        alphaSum +=
          (1.0 - fx) * (1.0 - fy) * a00 +
          fx * (1.0 - fy) * a10 +
          (1.0 - fx) * fy * a01 +
          fx * fy * a11;
      }

      if (alphaSum <= 2.0) continue;
      const alphaTex = alphaSum * (0.25 / 255.0) * wholeCharVisibility;
      const outIdx = this.meshPixelIdx[n];
      data[outIdx] = (this.meshPR[n] * invBlend + this.meshSilverPR[n] * sBlend) | 0;
      data[outIdx + 1] = (this.meshPG[n] * invBlend + this.meshSilverPG[n] * sBlend) | 0;
      data[outIdx + 2] = (this.meshPB[n] * invBlend + this.meshSilverPB[n] * sBlend) | 0;
      data[outIdx + 3] = Math.round(alphaTex * this.meshBaseAlpha[n] * 255.0);
    }

    this.bandCtx.putImageData(this.bandImageData, 0, 0);
    ctx.drawImage(
      this.bandCanvas,
      (this.offsetX + this.bandX0) * scale,
      (this.offsetY + this.bandY0) * scale
    );
  }
}

export class GridTomatoRenderer {
  getDataURL(paletteKey) {
    if (paletteKey === 'unassigned' || paletteKey === 'unassignedDark' || paletteKey === 'unassignedLight') {
      return HEIRLOOM_PALETTE.unassigned.gridImg;
    }
    const entry = HEIRLOOM_PALETTE[paletteKey] || HEIRLOOM_PALETTE[0];
    return entry.gridImg;
  }

  getMiniDataURL(paletteKey) {
    if (paletteKey === null || paletteKey === undefined || paletteKey === 'unassigned') {
      return HEIRLOOM_PALETTE.unassigned.miniImg;
    }
    const entry = HEIRLOOM_PALETTE[paletteKey] || HEIRLOOM_PALETTE[0];
    return entry.miniImg;
  }
}

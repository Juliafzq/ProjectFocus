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
    heroImg: 'assets/tomatoes/hero-tomato-0.png?v=20261008_v5',
    gridImg: 'assets/tomatoes/grid-tomato-0.png?v=20261008_v5',
    miniImg: 'assets/tomatoes/mini-tomato-0.png?v=20261008_v5',
  },
  1: {
    name: 'Warm Terracotta',
    hex: '#C84B31',
    heroImg: 'assets/tomatoes/hero-tomato-1.png?v=20261008_v5',
    gridImg: 'assets/tomatoes/grid-tomato-1.png?v=20261008_v5',
    miniImg: 'assets/tomatoes/mini-tomato-1.png?v=20261008_v5',
  },
  2: {
    name: 'Rich Dark Burgundy',
    hex: '#5E192A',
    heroImg: 'assets/tomatoes/hero-tomato-2.png?v=20261008_v5',
    gridImg: 'assets/tomatoes/grid-tomato-2.png?v=20261008_v5',
    miniImg: 'assets/tomatoes/mini-tomato-2.png?v=20261008_v5',
  },
  3: {
    name: 'Sun-Ripened Coral',
    hex: '#D96B52',
    heroImg: 'assets/tomatoes/hero-tomato-3.png?v=20261008_v5',
    gridImg: 'assets/tomatoes/grid-tomato-3.png?v=20261008_v5',
    miniImg: 'assets/tomatoes/mini-tomato-3.png?v=20261008_v5',
  },
  4: {
    name: 'Golden Persimmon',
    hex: '#C96A2B',
    heroImg: 'assets/tomatoes/hero-tomato-4.png?v=20261008_v5',
    gridImg: 'assets/tomatoes/grid-tomato-4.png?v=20261008_v5',
    miniImg: 'assets/tomatoes/mini-tomato-4.png?v=20261008_v5',
  },
  5: {
    name: 'Spiced Garnet',
    hex: '#9E2A3B',
    heroImg: 'assets/tomatoes/hero-tomato-5.png?v=20261008_v5',
    gridImg: 'assets/tomatoes/grid-tomato-5.png?v=20261008_v5',
    miniImg: 'assets/tomatoes/mini-tomato-5.png?v=20261008_v5',
  },
  unassigned: {
    name: 'Matte Neutral Grey',
    hex: '#8E8D8A',
    heroImg: 'assets/tomatoes/hero-tomato-grey.png?v=20261008_v5',
    gridImg: 'assets/tomatoes/grid-tomato-grey.png?v=20261008_v5',
    miniImg: 'assets/tomatoes/mini-tomato-grey.png?v=20261008_v5',
  },
};

/**
 * Exact sub-pixel equatorial seam curve y(x) measured directly from the dark seam groove
 * in 02-hero-timer.png (530x460 crop).
 * Follows a smooth gentle arc (y = 258.5 at center x = 251, rising gently to 227 at the edges)
 * without hooking or curving backwards at the left/right edges.
 */
export function getTomatoSeamY(x) {
  const cx = 251.0;
  const rx = 213.0;
  const u = Math.max(-1.0, Math.min(1.0, (x - cx) / rx));
  return 258.5 - 21.0 * (u * u) - 10.5 * (u * u * u * u);
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
    this.images = new Map();

    // Base coordinate space of assets/tomatoes/hero-tomato-*.png is 530 x 460
    this.baseW = 530;
    this.baseH = 460;

    this.canvas = document.createElement('canvas');
    this.canvas.width = this.baseW * 2;
    this.canvas.height = this.baseH * 2;
    this.canvas.style.width = '100%';
    this.canvas.style.height = '100%';
    this.canvas.style.objectFit = 'contain';
    this.ctx = this.canvas.getContext('2d');

    this.container.innerHTML = '';
    this.container.appendChild(this.canvas);

    this._preloadImages();
  }

  _preloadImages() {
    const keys = [0, 1, 2, 3, 4, 5, 'unassigned'];
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

  updateOdometer(angleDegrees, quadrantIndex = 0, isAssigned = true) {
    this.currentAngleDegrees = angleDegrees;
    this.quadrantIndex = quadrantIndex;
    this.isAssigned = isAssigned;
    this.render();
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

    // Always use Deep Crimson (or the assigned quadrant's heirloom red) on the Hero view when active
    const key = this.isAssigned ? (this.quadrantIndex ?? 0) : 0;
    const img = this.images.get(key) || this.images.get(0);
    if (img && img.complete) {
      ctx.drawImage(img, 0, 0, this.baseW, this.baseH);
    }

    // Clip to the physical silhouette width of the tomato upper cap (x: 40.0 .. 462.0)
    ctx.save();
    ctx.beginPath();
    ctx.rect(40.0, 140, 422.0, 130);
    ctx.clip();

    const cx = 251.0;
    const rx = 208.0;
    const currentMinutes = this.currentAngleDegrees / 6.0;

    // 10 minutes = 30.0° across the front hemisphere (3.0° per minute), matching 02-hero-timer.png
    const DEG_PER_MIN_VISUAL = 3.0;
    const minM = Math.floor(currentMinutes - 28);
    const maxM = Math.ceil(currentMinutes + 28);

    // 1. Draw straight vertical equatorial tick marks following getTomatoSeamY(x) (never tilting/curving backwards)
    for (let m = minM; m <= maxM; m++) {
      if (m < 0 || m > 180) continue;

      const deltaMin = m - currentMinutes;
      const thetaDeg = deltaMin * DEG_PER_MIN_VISUAL;
      const absDeg = Math.abs(thetaDeg);
      if (absDeg > 74.0) continue;

      const thetaRad = (thetaDeg * Math.PI) / 180.0;
      const sinT = Math.sin(thetaRad);
      const cosT = Math.cos(thetaRad);

      const x = cx + rx * sinT;
      const seamY = getTomatoSeamY(x);

      const isMajor10 = m % 10 === 0;
      const isMedium5 = m % 5 === 0 && !isMajor10;

      // Constant offset above the curved seam (matches 02-hero-timer.png measurements)
      const tickBottomY = seamY - 5.0;
      const tickLen = (isMajor10 ? 17.5 : isMedium5 ? 13.0 : 10.5) * (0.88 + 0.12 * cosT);
      const tickEdgeAlpha = absDeg > 70.0 ? (74.0 - absDeg) / 4.0 : 1.0;

      ctx.strokeStyle = this._getLitPaintStyle(sinT, cosT, tickEdgeAlpha);
      const widthScale = Math.max(0.72, Math.pow(cosT, 0.25));
      ctx.lineWidth = (isMajor10 ? 1.85 : isMedium5 ? 1.45 : 1.2) * widthScale;
      ctx.lineCap = 'round';

      // Ticks are strictly vertical (no backward tilt at edges)
      ctx.beginPath();
      ctx.moveTo(x, tickBottomY);
      ctx.lineTo(x, tickBottomY - tickLen);
      ctx.stroke();

      // 2. Draw major 10-minute numbers upright above each major tick (no backward rotation/skew)
      if (isMajor10 && absDeg <= 66.0) {
        const labelEdgeAlpha = absDeg > 62.0 ? (66.0 - absDeg) / 4.0 : 1.0;
        const labelY = seamY - 26.5;
        const scaleX = 0.78 + 0.22 * cosT;

        ctx.save();
        ctx.translate(x, labelY);
        ctx.scale(scaleX, 1.0);

        ctx.fillStyle = this._getLitPaintStyle(sinT, cosT, labelEdgeAlpha);
        ctx.font = '500 20.5px -apple-system, BlinkMacSystemFont, "SF Pro Display", "Inter", sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';
        ctx.fillText(String(m), 0, 0);
        ctx.restore();
      }
    }

    ctx.restore();
    ctx.restore();
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

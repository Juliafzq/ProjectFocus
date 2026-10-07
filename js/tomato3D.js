/**
 * Tomato3DRenderer — Photorealistic Studio Heirloom Tomato Renderer
 *
 * Uses the exact studio-lit sculpted Heirloom Tomato assets from the PRD Mockups
 * (02-hero-timer.png, 03-grid-timer.png, 04-card-front.png) combined with a
 * high-DPI curved equatorial odometer shader canvas so that:
 * - Hero Tomato looks 100% identical to 02-hero-timer.png (with rotating curved ticks
 *   and numbers 0..180 across 3 turns above the recessed seam and white ▲ pointer).
 * - 6-Tomato Grid uses the exact photorealistic studio-lit tomatoes in 6 heirloom shades
 *   plus Matte Neutral Grey when unassigned.
 * - Card Front uses the exact photorealistic miniature heirloom tomatoes.
 */

export const HEIRLOOM_PALETTE = {
  0: {
    name: 'Deep Crimson',
    hex: '#8B1E24',
    heroImg: 'assets/tomatoes/hero-tomato-0.png',
    gridImg: 'assets/tomatoes/grid-tomato-0.png',
    miniImg: 'assets/tomatoes/mini-tomato-0.png',
  },
  1: {
    name: 'Warm Terracotta',
    hex: '#C84B31',
    heroImg: 'assets/tomatoes/hero-tomato-1.png',
    gridImg: 'assets/tomatoes/grid-tomato-1.png',
    miniImg: 'assets/tomatoes/mini-tomato-1.png',
  },
  2: {
    name: 'Rich Dark Burgundy',
    hex: '#5E192A',
    heroImg: 'assets/tomatoes/hero-tomato-2.png',
    gridImg: 'assets/tomatoes/grid-tomato-2.png',
    miniImg: 'assets/tomatoes/mini-tomato-2.png',
  },
  3: {
    name: 'Sun-Ripened Coral',
    hex: '#D96B52',
    heroImg: 'assets/tomatoes/hero-tomato-3.png',
    gridImg: 'assets/tomatoes/grid-tomato-3.png',
    miniImg: 'assets/tomatoes/mini-tomato-3.png',
  },
  4: {
    name: 'Golden Persimmon',
    hex: '#C96A2B',
    heroImg: 'assets/tomatoes/hero-tomato-4.png',
    gridImg: 'assets/tomatoes/grid-tomato-4.png',
    miniImg: 'assets/tomatoes/mini-tomato-4.png',
  },
  5: {
    name: 'Spiced Garnet',
    hex: '#9E2A3B',
    heroImg: 'assets/tomatoes/hero-tomato-5.png',
    gridImg: 'assets/tomatoes/grid-tomato-5.png',
    miniImg: 'assets/tomatoes/mini-tomato-5.png',
  },
  unassigned: {
    name: 'Matte Neutral Grey',
    hex: '#8E8D8A',
    heroImg: 'assets/tomatoes/hero-tomato-grey.png',
    gridImg: 'assets/tomatoes/grid-tomato-grey.png',
    miniImg: 'assets/tomatoes/mini-tomato-grey.png',
  },
};

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

  render() {
    if (!this.ctx) return;
    const ctx = this.ctx;
    const scale = 2; // 2x Retina canvas
    ctx.save();
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    ctx.scale(scale, scale);

    const key = this.isAssigned ? (this.quadrantIndex ?? 0) : 'unassigned';
    const img = this.images.get(key) || this.images.get(0);
    if (img && img.complete) {
      ctx.drawImage(img, 0, 0, this.baseW, this.baseH);
    }

    // Draw curved 3-turn equatorial tick marks & odometer numbers right above the seam
    // In the 530x460 crop of 02-hero-timer.png:
    // - Tomato horizontal center is cx = 250, equatorial radius rx = 208
    // - The dark equatorial seam curves gently from y=236 at the sides to y=256 at center
    const cx = 250.0;
    const rx = 208.0;
    const currentMinutes = this.currentAngleDegrees / 6.0;

    const minM = Math.floor(currentMinutes - 27);
    const maxM = Math.ceil(currentMinutes + 27);

    for (let m = minM; m <= maxM; m++) {
      if (m < 0 || m > 180) continue;

      const deltaMin = m - currentMinutes;
      // 10 minutes = 27.5° of cylindrical longitude across the front face (matching 130 140 150 160 170 in 02-hero-timer.png)
      const thetaDeg = deltaMin * 2.75;
      if (Math.abs(thetaDeg) > 78.0) continue;

      const thetaRad = (thetaDeg * Math.PI) / 180.0;
      const sinT = Math.sin(thetaRad);
      const cosT = Math.cos(thetaRad);

      const x = cx + rx * sinT;
      // Seam curve: y = 234 + 22 * cos(theta)
      const seamY = 234.0 + 22.0 * cosT;
      const tickBottomY = seamY - 5.5;

      const isMajor10 = m % 10 === 0;
      const isMedium5 = m % 5 === 0 && !isMajor10;

      const tickLen = (isMajor10 ? 17.5 : isMedium5 ? 13.5 : 10.5) * (0.82 + 0.18 * cosT);
      // Slight inward normal tilt toward tomato crown
      const tiltX = -sinT * 2.2;

      // Soft perspective fade near left/right silhouette edges
      const alpha = Math.max(0.12, Math.pow(cosT, 1.35) * 0.78);

      ctx.strokeStyle = `rgba(235, 214, 210, ${alpha})`;
      ctx.lineWidth = isMajor10 ? 1.85 : isMedium5 ? 1.45 : 1.15;
      ctx.lineCap = 'round';

      ctx.beginPath();
      ctx.moveTo(x, tickBottomY);
      ctx.lineTo(x + tiltX, tickBottomY - tickLen);
      ctx.stroke();

      if (isMajor10) {
        ctx.save();
        ctx.translate(x + tiltX * 1.4, tickBottomY - tickLen - 5.5);
        // Perspective horizontal compression on curved sides + subtle arc rotation
        ctx.rotate(sinT * 0.08);
        ctx.scale(Math.max(0.68, Math.pow(cosT, 0.45)), 1.0);
        ctx.fillStyle = `rgba(236, 216, 212, ${alpha * 1.05})`;
        ctx.font = '500 20px -apple-system, BlinkMacSystemFont, "SF Pro Display", "Inter", sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';
        ctx.fillText(String(m), 0, 0);
        ctx.restore();
      }
    }

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

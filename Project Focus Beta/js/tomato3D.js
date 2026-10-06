/**
 * Tomato3DRenderer — Interactive Three.js 3D Sculpted Heirloom Tomato Renderer
 *
 * Matches UI Mockups 02-hero-timer.png and 03-grid-timer.png with:
 * - Monochromatic matte molded heirloom body + 5-leaf calyx crown + central stem
 *   (matching the exact Braun/Teenage Engineering monochrome aesthetic in the mockups).
 * - Hero Mode: Split upper rotating cap + lower base separated by a dark recessed equatorial seam,
 *   with a dynamic high-DPI shader/canvas texture that renders the 3-turn odometer scale
 *   (e.g., 130  140  150  160  170 at 150 minutes / 02:30) and a crisp white ▲ pointer below the seam.
 * - Grid Mode: Smooth sculpted 3D heirloom tomato rendered in its quadrant's heirloom red shade
 *   (when assigned) or Matte Neutral Gray (when unassigned).
 */

import * as THREE from '../vendor/three.module.js';

export const HEIRLOOM_PALETTE = {
  0: {
    name: 'Deep Crimson',
    hex: '#8B1E24',
    baseColor: 0x7a181d,
    highlightColor: 0x9e282e,
  },
  1: {
    name: 'Warm Terracotta',
    hex: '#C84B31',
    baseColor: 0xa64b2a,
    highlightColor: 0xc8623d,
  },
  2: {
    name: 'Rich Dark Burgundy',
    hex: '#5E192A',
    baseColor: 0x5e192a,
    highlightColor: 0x7c263b,
  },
  3: {
    name: 'Sun-Ripened Coral',
    hex: '#D96B52',
    baseColor: 0xc95940,
    highlightColor: 0xe0755c,
  },
  unassignedDark: {
    name: 'Matte Charcoal Gray',
    hex: '#6E6E6E',
    baseColor: 0x5d5e5e,
    highlightColor: 0x787979,
  },
  unassignedLight: {
    name: 'Matte Warm Gray',
    hex: '#9A9996',
    baseColor: 0x8d8e8f,
    highlightColor: 0xa7a8a9,
  },
};

/**
 * Deforms a sphere geometry into a realistic sculpted heirloom tomato profile:
 * - Slightly oblate spheroid
 * - Concave dimple at the top crown and bottom base
 * - Subtle 6-lobe heirloom ribbing around the upper shoulder
 */
function deformTomatoPoint(x, y, z) {
  const rXZ = Math.sqrt(x * x + z * z);
  const theta = Math.atan2(z, x);

  // Subtle 6-lobe organic heirloom contour
  const lobeFactor = 1.0 + 0.022 * Math.cos(6.0 * theta) * Math.pow(Math.min(rXZ, 1.0), 1.4);

  // Plump horizontal belly
  let nx = x * 1.16 * lobeFactor;
  let nz = z * 1.16 * lobeFactor;
  let ny = y * 0.88;

  // Crown depression at top (where stem & calyx sit)
  if (y > 0.45 && rXZ < 0.65) {
    const crownDepth = Math.pow((0.65 - rXZ) / 0.65, 2.0) * 0.16 * ((y - 0.45) / 0.55);
    ny -= crownDepth;
  }

  // Flat stable tabletop base at bottom
  if (y < -0.65 && rXZ < 0.55) {
    const baseFlatten = Math.pow((0.55 - rXZ) / 0.55, 1.8) * 0.09;
    ny += baseFlatten;
  }

  return new THREE.Vector3(nx, ny, nz);
}

/**
 * Builds the molded monochrome 5-sepal calyx star + curved central pedicel stem
 * sitting in the top crown depression, matching the exact sculptural silhouette in the mockups.
 */
function createCalyxAndStemGroup(material) {
  const group = new THREE.Group();

  // Central sculpted stem
  const stemGeo = new THREE.CylinderGeometry(0.055, 0.095, 0.24, 24, 8);
  const stemPos = stemGeo.attributes.position;
  for (let i = 0; i < stemPos.count; i++) {
    const sy = stemPos.getY(i);
    const bend = Math.pow((sy + 0.12) / 0.24, 2.0) * 0.015;
    stemPos.setX(i, stemPos.getX(i) + bend);
  }
  stemGeo.computeVertexNormals();
  const stemMesh = new THREE.Mesh(stemGeo, material);
  stemMesh.position.set(0, 0.83, 0.02);
  group.add(stemMesh);

  // Rounded stem tip cap
  const tipGeo = new THREE.SphereGeometry(0.056, 20, 12);
  tipGeo.scale(1.0, 0.55, 1.0);
  const tipMesh = new THREE.Mesh(tipGeo, material);
  tipMesh.position.set(0.015, 0.945, 0.02);
  group.add(tipMesh);

  // 5 sculpted organic calyx leaves radiating from stem base
  const numLeaves = 5;
  const leafAngles = [0.15, 1.38, 2.65, 3.92, 5.15];
  for (let i = 0; i < numLeaves; i++) {
    const angle = leafAngles[i];
    const leafGeo = new THREE.BoxGeometry(0.46, 0.055, 0.13, 20, 4, 8);
    const pos = leafGeo.attributes.position;
    for (let j = 0; j < pos.count; j++) {
      let lx = pos.getX(j) + 0.23; // 0 at stem center -> 0.46 at tip
      let ly = pos.getY(j);
      let lz = pos.getZ(j);

      const t = Math.max(0, Math.min(1, lx / 0.46));
      // Taper width to a sculpted point at tip
      const widthScale = Math.sin(Math.pow(t, 0.65) * Math.PI) * (1.0 - 0.15 * t);
      lz *= widthScale;
      // Arch slightly upward near center, then hug the tomato shoulder, with a slight upward lip at tip
      const archY = Math.sin(t * Math.PI) * 0.045 - t * t * 0.065 + Math.pow(t, 4) * 0.025;
      ly = ly * (1.0 - 0.5 * t) + archY;

      pos.setXYZ(j, lx, ly, lz);
    }
    leafGeo.computeVertexNormals();
    const leafMesh = new THREE.Mesh(leafGeo, material);
    leafMesh.position.set(0, 0.725, 0);
    leafMesh.rotation.y = angle;
    group.add(leafMesh);
  }

  return group;
}

export class HeroTomato3DView {
  constructor(container) {
    this.container = container;
    this.currentAngleDegrees = 900.0; // Default 150 minutes (02:30) -> 900°
    this.quadrantIndex = 0;
    this.isAssigned = true;

    this._initScene();
    this._buildHeroTomatoMesh();
    this.updateOdometer(this.currentAngleDegrees, this.quadrantIndex, this.isAssigned);
  }

  _initScene() {
    const width = this.container.clientWidth || 340;
    const height = this.container.clientHeight || 310;

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(28, width / height, 0.1, 50);
    // Slight elevated angle matching 02-hero-timer.png
    this.camera.position.set(0, 0.52, 4.95);
    this.camera.lookAt(0, -0.03, 0);

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 2, 2));
    this.renderer.setSize(width, height);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;

    this.container.innerHTML = '';
    this.container.appendChild(this.renderer.domElement);

    // Studio softbox lighting matching mockup 02-hero-timer.png (top-left key light, warm fill, rim)
    const ambient = new THREE.AmbientLight(0xfff8f0, 1.35);
    this.scene.add(ambient);

    const keyLight = new THREE.DirectionalLight(0xfffdf9, 1.95);
    keyLight.position.set(-2.2, 3.4, 3.2);
    this.scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0xeae6df, 0.65);
    fillLight.position.set(2.8, -1.2, 2.0);
    this.scene.add(fillLight);

    const rimLight = new THREE.DirectionalLight(0xffffff, 0.35);
    rimLight.position.set(0.0, 2.5, -2.5);
    this.scene.add(rimLight);
  }

  _buildHeroTomatoMesh() {
    this.rootGroup = new THREE.Group();
    this.scene.add(this.rootGroup);

    // High-DPI canvas for the upper cap (includes matte tomato skin + equatorial tick marks & numbers)
    this.capCanvas = document.createElement('canvas');
    this.capCanvas.width = 2048;
    this.capCanvas.height = 1024;
    this.capCtx = this.capCanvas.getContext('2d');

    this.capTexture = new THREE.CanvasTexture(this.capCanvas);
    this.capTexture.colorSpace = THREE.SRGBColorSpace;
    this.capTexture.wrapS = THREE.RepeatWrapping;
    this.capTexture.wrapT = THREE.ClampToEdgeWrapping;
    this.capTexture.anisotropy = 8;

    this.capMaterial = new THREE.MeshStandardMaterial({
      map: this.capTexture,
      roughness: 0.72,
      metalness: 0.04,
    });

    this.solidMaterial = new THREE.MeshStandardMaterial({
      color: 0x7a181d,
      roughness: 0.72,
      metalness: 0.04,
    });

    // Base Canvas for lower hemisphere (includes matte skin + crisp white ▲ triangle pointer)
    this.baseCanvas = document.createElement('canvas');
    this.baseCanvas.width = 2048;
    this.baseCanvas.height = 512;
    this.baseCtx = this.baseCanvas.getContext('2d');

    this.baseTexture = new THREE.CanvasTexture(this.baseCanvas);
    this.baseTexture.colorSpace = THREE.SRGBColorSpace;
    this.baseTexture.wrapS = THREE.RepeatWrapping;
    this.baseTexture.wrapT = THREE.ClampToEdgeWrapping;
    this.baseTexture.anisotropy = 8;

    this.baseMaterial = new THREE.MeshStandardMaterial({
      map: this.baseTexture,
      roughness: 0.74,
      metalness: 0.04,
    });

    // Seam split angle: phiSplit = 0.56 * PI (slightly below equator, matching 02-hero-timer.png)
    const phiSplit = 0.56 * Math.PI;

    // 1. Upper Rotating Cap Hemisphere (phi: 0 -> phiSplit - 0.012)
    const upperGeo = new THREE.SphereGeometry(1.0, 96, 64, 0, Math.PI * 2, 0, phiSplit - 0.012);
    const uPos = upperGeo.attributes.position;
    for (let i = 0; i < uPos.count; i++) {
      const p = deformTomatoPoint(uPos.getX(i), uPos.getY(i), uPos.getZ(i));
      uPos.setXYZ(i, p.x, p.y, p.z);
    }
    upperGeo.computeVertexNormals();

    this.upperCapGroup = new THREE.Group();
    const upperMesh = new THREE.Mesh(upperGeo, this.capMaterial);
    // Align UV u=0.5 with front camera (+Z axis)
    upperMesh.rotation.y = -Math.PI / 2;
    this.upperCapGroup.add(upperMesh);

    // Add monochrome stem & calyx to upper cap so they rotate together when wound!
    this.calyxGroup = createCalyxAndStemGroup(this.solidMaterial);
    this.upperCapGroup.add(this.calyxGroup);
    this.rootGroup.add(this.upperCapGroup);

    // 2. Dark Recessed Mechanical Seam Ring between Upper Cap and Lower Base
    const seamY = Math.cos(phiSplit) * 0.88;
    const seamRadius = Math.sin(phiSplit) * 1.12;
    const seamGeo = new THREE.CylinderGeometry(seamRadius, seamRadius, 0.045, 72);
    const seamMat = new THREE.MeshBasicMaterial({ color: 0x220507 });
    const seamMesh = new THREE.Mesh(seamGeo, seamMat);
    seamMesh.position.y = seamY;
    this.rootGroup.add(seamMesh);

    // 3. Lower Stationary Base Hemisphere (phi: phiSplit + 0.012 -> PI)
    const lowerGeo = new THREE.SphereGeometry(
      1.0,
      96,
      48,
      0,
      Math.PI * 2,
      phiSplit + 0.012,
      Math.PI - (phiSplit + 0.012)
    );
    const lPos = lowerGeo.attributes.position;
    for (let i = 0; i < lPos.count; i++) {
      const p = deformTomatoPoint(lPos.getX(i), lPos.getY(i), lPos.getZ(i));
      lPos.setXYZ(i, p.x, p.y, p.z);
    }
    lowerGeo.computeVertexNormals();
    const lowerMesh = new THREE.Mesh(lowerGeo, this.baseMaterial);
    lowerMesh.rotation.y = -Math.PI / 2;
    this.rootGroup.add(lowerMesh);
  }

  /**
   * Redraws the high-DPI equatorial odometer band on the upper cap & pointer on lower base
   * so that the active turn's numbers (0..60, 65..120, or 125..180) appear crisply above the seam.
   */
  updateOdometer(angleDegrees, quadrantIndex = 0, isAssigned = true) {
    this.currentAngleDegrees = angleDegrees;
    this.quadrantIndex = quadrantIndex;
    this.isAssigned = isAssigned;

    const palette = isAssigned
      ? HEIRLOOM_PALETTE[quadrantIndex] || HEIRLOOM_PALETTE[0]
      : HEIRLOOM_PALETTE.unassignedDark;

    this.solidMaterial.color.setHex(palette.baseColor);

    const ctx = this.capCtx;
    const W = this.capCanvas.width;
    const H = this.capCanvas.height;

    // Fill matte heirloom tomato skin with subtle vertical shading gradient
    const grad = ctx.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0.0, palette.hex);
    grad.addColorStop(0.75, palette.hex);
    grad.addColorStop(1.0, '#581015');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);

    // Subtle organic grain texture
    ctx.fillStyle = 'rgba(255, 255, 255, 0.02)';
    for (let i = 0; i < 600; i++) {
      const gx = (i * 197) % W;
      const gy = (i * 353) % H;
      ctx.fillRect(gx, gy, 3, 3);
    }

    // Current minutes from angleDegrees (6° = 1 minute)
    const currentMinutes = angleDegrees / 6.0;

    // Draw equatorial tick marks and numbers around the bottom edge of the upper cap.
    // The front center of the mesh faces +Z, which corresponds to u = 0.5 (x = W * 0.5).
    // Around the visible front hemisphere (-90° to +90° from front center),
    // 6° of rotation = 1 minute on the dial.
    const centerU = 0.5;
    const pixelsPerDegree = W / 360.0;

    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';

    // Render ticks for relative minute offsets from -28 to +28 around currentMinutes
    const minMinuteFloor = Math.floor(currentMinutes - 28);
    const maxMinuteCeil = Math.ceil(currentMinutes + 28);

    for (let m = minMinuteFloor; m <= maxMinuteCeil; m++) {
      if (m < 0 || m > 180) continue;

      // Offset in minutes from current pointer position:
      // In Mockup 02-hero-timer.png: 130  140  150  160  170 reads left-to-right!
      // So smaller minutes (130, 140) are to the LEFT of center (negative X offset),
      // and larger minutes (160, 170) are to the RIGHT of center (positive X offset).
      const deltaMinutes = m - currentMinutes;
      // Scale angular spacing slightly (3.6° per minute on the visible front curve) so
      // 130, 140, 150, 160, 170 span the exact width of the tomato front as in 02-hero-timer.png!
      const visualDegOffset = deltaMinutes * 3.35;
      if (Math.abs(visualDegOffset) > 85) continue;

      const x = W * centerU + visualDegOffset * pixelsPerDegree;

      const isMajor10 = m % 10 === 0;
      const isMedium5 = m % 5 === 0 && !isMajor10;

      // Fade opacity gently near extreme left/right silhouette edges
      const edgeFade = Math.max(0.15, 1.0 - Math.pow(Math.abs(visualDegOffset) / 82.0, 2.2));

      ctx.strokeStyle = `rgba(245, 240, 235, ${0.88 * edgeFade})`;
      ctx.lineWidth = isMajor10 ? 4.2 : isMedium5 ? 3.4 : 2.4;

      const tickBottomY = H - 14;
      const tickHeight = isMajor10 ? 58 : isMedium5 ? 46 : 36;

      ctx.beginPath();
      ctx.moveTo(x, tickBottomY);
      ctx.lineTo(x, tickBottomY - tickHeight);
      ctx.stroke();

      if (isMajor10) {
        ctx.fillStyle = `rgba(248, 244, 240, ${0.92 * edgeFade})`;
        ctx.font = '600 50px -apple-system, BlinkMacSystemFont, "Inter", sans-serif';
        ctx.fillText(String(m), x, tickBottomY - tickHeight - 14);
      }
    }
    ctx.restore();

    this.capTexture.needsUpdate = true;

    // Draw lower base texture with the crisp white upward triangle pointer ▲ at u = 0.5
    const bCtx = this.baseCtx;
    const bW = this.baseCanvas.width;
    const bH = this.baseCanvas.height;

    const baseGrad = bCtx.createLinearGradient(0, 0, 0, bH);
    baseGrad.addColorStop(0.0, palette.hex);
    baseGrad.addColorStop(0.85, '#551015');
    baseGrad.addColorStop(1.0, '#38090c');
    bCtx.fillStyle = baseGrad;
    bCtx.fillRect(0, 0, bW, bH);

    // Crisp white ▲ pointer centered right below the seam
    const px = bW * 0.5;
    const pyTop = 26;
    const triHalfW = 19;
    const triHeight = 46;

    bCtx.fillStyle = '#EAE6DF';
    bCtx.beginPath();
    bCtx.moveTo(px, pyTop);
    bCtx.lineTo(px - triHalfW, pyTop + triHeight);
    bCtx.lineTo(px + triHalfW, pyTop + triHeight);
    bCtx.closePath();
    bCtx.fill();

    this.baseTexture.needsUpdate = true;

    // Subtle physical rotation of the 3D calyx & stem lobes so the crown turns as you wind!
    if (this.calyxGroup) {
      this.calyxGroup.rotation.y = (angleDegrees * Math.PI) / 180.0;
    }

    this.render();
  }

  resize() {
    if (!this.container || !this.renderer) return;
    const width = this.container.clientWidth || 340;
    const height = this.container.clientHeight || 310;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
    this.render();
  }

  render() {
    if (this.renderer && this.scene && this.camera) {
      this.renderer.render(this.scene, this.camera);
    }
  }
}

/**
 * Renders the 4-Quadrant Sculpted 3D Tomatoes for Mockup 03-grid-timer.png.
 * Uses a single shared offscreen renderer to generate crisp 2x Retina 3D renders
 * for each quadrant's tomato state, keeping GPU usage light and 60fps rock-solid.
 */
export class GridTomatoRenderer {
  constructor() {
    this.size = 380;
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(27, 1.08, 0.1, 50);
    this.camera.position.set(0, 0.48, 4.85);
    this.camera.lookAt(0, -0.02, 0);

    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      preserveDrawingBuffer: true,
    });
    this.renderer.setSize(this.size, Math.round(this.size / 1.08));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;

    const ambient = new THREE.AmbientLight(0xfff9f2, 1.4);
    this.scene.add(ambient);

    const keyLight = new THREE.DirectionalLight(0xffffff, 2.0);
    keyLight.position.set(-2.3, 3.2, 3.0);
    this.scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0xeae6df, 0.65);
    fillLight.position.set(2.5, -1.5, 2.0);
    this.scene.add(fillLight);

    this.material = new THREE.MeshStandardMaterial({
      color: 0x7a181d,
      roughness: 0.7,
      metalness: 0.04,
    });

    const bodyGeo = new THREE.SphereGeometry(1.0, 80, 64);
    const pos = bodyGeo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const p = deformTomatoPoint(pos.getX(i), pos.getY(i), pos.getZ(i));
      pos.setXYZ(i, p.x, p.y, p.z);
    }
    bodyGeo.computeVertexNormals();

    this.tomatoGroup = new THREE.Group();
    const bodyMesh = new THREE.Mesh(bodyGeo, this.material);
    this.tomatoGroup.add(bodyMesh);

    const calyx = createCalyxAndStemGroup(this.material);
    this.tomatoGroup.add(calyx);
    this.scene.add(this.tomatoGroup);

    this.cache = new Map();
  }

  getDataURL(paletteKey) {
    if (this.cache.has(paletteKey)) {
      return this.cache.get(paletteKey);
    }
    const palette = HEIRLOOM_PALETTE[paletteKey] || HEIRLOOM_PALETTE[0];
    this.material.color.setHex(palette.baseColor);
    this.renderer.render(this.scene, this.camera);
    const url = this.renderer.domElement.toDataURL('image/png');
    this.cache.set(paletteKey, url);
    return url;
  }
}

/**
 * SensoryEngine — Synchronized Haptics + Web Audio API Foley Engine for Fable / Flow Phase 1 Beta.
 *
 * Synthesizes authentic organic physical sounds with zero external network dependencies:
 * - playDialRatchetNotch(isWindingUp): Crisp mechanical gear detent click (higher pitch winding up, slightly lower unwinding).
 * - playMechanicalTick(): Subtle muted clockwork escapement tick.
 * - playCompletionChime(): Warm resonant ceramic/wood singing chime when a Pomodoro reaches 00:00.
 * - playPencilStrikethrough(isErasing): Textured graphite-on-cotton-cardstock scratch sound.
 * - playCardFlipSwoosh(): Soft 300gsm cardstock air turn + tabletop snap.
 *
 * Strictly suppresses all audio when `isSilentMode === true` while preserving haptic pulses.
 */

export class SensoryEngine {
  constructor() {
    this.isSilentMode = false;
    this.audioCtx = null;
    this.onHapticPulse = null; // Optional callback for UI haptic indicator pill
  }

  _ensureContext() {
    if (this.isSilentMode) return null;
    if (!this.audioCtx && typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        this.audioCtx = new AudioCtx();
      }
    }
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume().catch(() => {});
    }
    return this.audioCtx;
  }

  _triggerHaptic(label, durationMs = 12) {
    if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
      try {
        navigator.vibrate(durationMs);
      } catch (_) {}
    }
    if (typeof this.onHapticPulse === 'function') {
      this.onHapticPulse(label);
    }
  }

  /**
   * 1-minute (6°) mechanical ratchet notch click + crisp transient haptic.
   */
  playDialRatchetNotch(isWindingUp = true) {
    this._triggerHaptic(
      isWindingUp ? 'Haptic: Ratchet Wind (+1m)' : 'Haptic: Ratchet Unwind (-1m)',
      10
    );
    const ctx = this._ensureContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'triangle';
    const baseFreq = isWindingUp ? 980 : 780;
    osc.frequency.setValueAtTime(baseFreq, now);
    osc.frequency.exponentialRampToValueAtTime(210, now + 0.022);

    gain.gain.setValueAtTime(0.28, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.024);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.026);
  }

  /**
   * Subtle clockwork escapement tick while a timer is actively running.
   */
  playMechanicalTick() {
    const ctx = this._ensureContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(1450, now);
    osc.frequency.exponentialRampToValueAtTime(420, now + 0.008);

    gain.gain.setValueAtTime(0.05, now);
    gain.gain.exponentialRampToValueAtTime(0.0005, now + 0.009);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.01);
  }

  /**
   * Authentic physical mechanical Pomodoro kitchen timer ending bell ("k-DING!").
   * Models the physical escapement release clapper + steel hammer strike + inharmonic
   * hemispherical brass/chrome bell modes (Rayleigh/Chladni modal ratios with natural
   * doublet acoustic beating and frequency-dependent metallic decay).
   */
  playCompletionChime() {
    this._triggerHaptic('Haptic: Pomodoro Bell Ring', [18, 35, 45]);
    const ctx = this._ensureContext();
    if (!ctx) return;

    const now = ctx.currentTime;

    const triggerBellStrike = (strikeTime, velocity) => {
      // 1. Physical metallic hammer-on-brass impact impulse (short filtered burst)
      const clickDur = 0.018;
      const bufLen = Math.max(1, Math.floor(ctx.sampleRate * clickDur));
      const clickBuf = ctx.createBuffer(1, bufLen, ctx.sampleRate);
      const ch = clickBuf.getChannelData(0);
      for (let i = 0; i < bufLen; i++) {
        const env = Math.exp(-i / (bufLen * 0.22));
        ch[i] = (Math.random() * 2 - 1) * env;
      }
      const noise = ctx.createBufferSource();
      noise.buffer = clickBuf;

      const bp = ctx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.setValueAtTime(3850, strikeTime);
      bp.Q.setValueAtTime(3.2, strikeTime);

      const clickGain = ctx.createGain();
      clickGain.gain.setValueAtTime(0.38 * velocity, strikeTime);
      clickGain.gain.exponentialRampToValueAtTime(0.001, strikeTime + clickDur);

      noise.connect(bp);
      bp.connect(clickGain);
      clickGain.connect(ctx.destination);
      noise.start(strikeTime);

      // 2. Inharmonic spun-brass Pomodoro bell modal partials (fundamental D6 ~ 1174.6 Hz)
      //    Includes closely spaced doublet modes (1174.6/1177.1 Hz and 2349.2/2355.0 Hz)
      //    that produce the unmistakable acoustic "shimmer/wah-wah" of a real metal bell!
      const partials = [
        { freq: 587.3, amp: 0.11, decay: 2.35 },   // Sub-hum resonance
        { freq: 1174.6, amp: 0.34, decay: 2.15 },  // Primary strike tone (Mode A)
        { freq: 1177.1, amp: 0.24, decay: 2.05 },  // Primary strike doublet (2.5 Hz acoustic beat)
        { freq: 1421.3, amp: 0.15, decay: 1.05 },  // Minor-third tierce bell mode (1.21x)
        { freq: 1773.8, amp: 0.12, decay: 0.72 },  // Quint mode (1.51x)
        { freq: 2349.2, amp: 0.22, decay: 0.88 },  // Nominal upper ring (2.00x Mode A)
        { freq: 2355.0, amp: 0.14, decay: 0.82 },  // Nominal upper ring (2.005x Mode B)
        { freq: 3242.0, amp: 0.13, decay: 0.34 },  // Super-quint metallic clang (2.76x)
        { freq: 4534.0, amp: 0.09, decay: 0.14 },  // Initial hammer-ping overtone (3.86x)
        { freq: 5920.0, amp: 0.05, decay: 0.065 }, // Crisp metallic transient edge (5.04x)
      ];

      partials.forEach((p) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(p.freq, strikeTime);

        const peak = Math.max(0.002, p.amp * velocity);
        gain.gain.setValueAtTime(0.0005, strikeTime);
        gain.gain.linearRampToValueAtTime(peak, strikeTime + 0.0025);
        gain.gain.exponentialRampToValueAtTime(0.0004, strikeTime + p.decay);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(strikeTime);
        osc.stop(strikeTime + p.decay + 0.02);
      });
    };

    // Mechanical Pomodoro bell double-clapper action:
    // Quick escapement release grace tap ("k-") followed 52ms later by the full bell ring ("-DING!")
    triggerBellStrike(now, 0.32);
    triggerBellStrike(now + 0.052, 1.0);
  }

  /**
   * Textured graphite pencil strikethrough (or erase) across 300gsm cotton cardstock.
   */
  playPencilStrikethrough(isErasing = false) {
    this._triggerHaptic(
      isErasing ? 'Haptic: Erase Strikethrough' : 'Haptic: Graphite Strikethrough',
      18
    );
    const ctx = this._ensureContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const duration = 0.19;
    const bufferSize = Math.floor(ctx.sampleRate * duration);
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < bufferSize; i++) {
      const env = Math.sin((i / bufferSize) * Math.PI);
      const grain = (Math.random() * 2 - 1) * (0.6 + 0.4 * Math.sin(i * 0.08));
      data[i] = grain * env * 0.25;
    }

    const noise = ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(isErasing ? 950 : 1650, now);
    filter.Q.setValueAtTime(1.8, now);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.32, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + duration);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    noise.start(now);
  }

  /**
   * 300gsm cardstock flip whoosh + subtle tabletop settle snap.
   */
  playCardFlipSwoosh() {
    this._triggerHaptic('Haptic: 180° Card Flip', 15);
    const ctx = this._ensureContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const duration = 0.22;
    const bufferSize = Math.floor(ctx.sampleRate * duration);
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < bufferSize; i++) {
      const env = Math.sin((i / bufferSize) * Math.PI);
      data[i] = (Math.random() * 2 - 1) * env * 0.18;
    }

    const noise = ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(900, now);
    filter.frequency.exponentialRampToValueAtTime(280, now + duration);

    noise.connect(filter);
    filter.connect(ctx.destination);
    noise.start(now);
  }

  /**
   * Crisp cardstock riffle tick when scrolling or selecting dates in the Card Stack / Calendar.
   */
  playStackRiffleTick() {
    this._triggerHaptic('Haptic: Card Stack Riffle Tick', 8);
    const ctx = this._ensureContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const duration = 0.032;
    const bufLen = Math.max(1, Math.floor(ctx.sampleRate * duration));
    const buf = ctx.createBuffer(1, bufLen, ctx.sampleRate);
    const ch = buf.getChannelData(0);
    for (let i = 0; i < bufLen; i++) {
      ch[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufLen * 0.28)) * 0.24;
    }

    const noise = ctx.createBufferSource();
    noise.buffer = buf;

    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.setValueAtTime(1280, now);
    bp.Q.setValueAtTime(2.1, now);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.26, now);
    gain.gain.exponentialRampToValueAtTime(0.002, now + duration);

    noise.connect(bp);
    bp.connect(gain);
    gain.connect(ctx.destination);
    noise.start(now);
  }

  /**
   * Soft paper crumple / discard audio + double-tap haptic when permanently deleting via Trash Can.
   */
  playTrashDelete() {
    this._triggerHaptic('Haptic: Permanent Card Discard', [14, 24, 18]);
    const ctx = this._ensureContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const duration = 0.16;
    const bufLen = Math.max(1, Math.floor(ctx.sampleRate * duration));
    const buf = ctx.createBuffer(1, bufLen, ctx.sampleRate);
    const ch = buf.getChannelData(0);
    for (let i = 0; i < bufLen; i++) {
      const env = Math.sin((i / bufLen) * Math.PI) * Math.exp(-i / (bufLen * 0.6));
      ch[i] = (Math.random() * 2 - 1) * env * 0.22;
    }

    const noise = ctx.createBufferSource();
    noise.buffer = buf;

    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.setValueAtTime(820, now);
    bp.frequency.exponentialRampToValueAtTime(360, now + duration);
    bp.Q.setValueAtTime(1.4, now);

    noise.connect(bp);
    bp.connect(ctx.destination);
    noise.start(now);
  }
}

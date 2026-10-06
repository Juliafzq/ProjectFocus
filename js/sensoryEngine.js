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
   * 5-minute (30°) mechanical ratchet notch click + crisp transient haptic.
   */
  playDialRatchetNotch(isWindingUp = true) {
    this._triggerHaptic(
      isWindingUp ? 'Haptic: Ratchet Wind (+5m)' : 'Haptic: Ratchet Unwind (-5m)',
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
   * Soft organic completion chime when a Pomodoro timer reaches 00:00 or is ended.
   */
  playCompletionChime() {
    this._triggerHaptic('Haptic: Completion Chime', [25, 40, 60]);
    const ctx = this._ensureContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const freqs = [528, 792, 1056]; // Warm harmonic fifth + octave
    freqs.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + idx * 0.04);

      gain.gain.setValueAtTime(0.001, now + idx * 0.04);
      gain.gain.linearRampToValueAtTime(0.18 / (idx + 1), now + idx * 0.04 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0008, now + 1.35);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + idx * 0.04);
      osc.stop(now + 1.4);
    });
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
}

/**
 * OdometerDialPhysics — Pure math & state machine for the 3-Turn Bidirectional
 * Heirloom Tomato Odometer Dial (0..180 minutes, 5-minute / 30° ratchet notches).
 *
 * Rules from PRD v4 & Mockup 02-hero-timer.png:
 * - Dragging Right -> Left (negative deltaX) winds the timer UP (+5 min per 30° notch, max 180 min).
 * - Dragging Left -> Right (positive deltaX) unwinds the timer DOWN (-5 min per 30° notch, min 0 min).
 * - Turn 1: 0..60 min (angle 0..360°)
 * - Turn 2: 65..120 min (angle 360..720°)
 * - Turn 3: 125..180 min (angle 720..1080°)
 * - Readout formats as HH:MM when >= 60 min (e.g. 150 min -> "02:30", 45 min -> "00:45" in grid or MM:SS when ticking < 60m).
 */

export class OdometerDialPhysics {
  static DEGREES_PER_MINUTE = 6.0;
  static MINUTES_PER_NOTCH = 5;
  static DEGREES_PER_NOTCH = 30.0;
  static MAX_TURNS = 3;
  static MAX_MINUTES = 180;
  static MAX_ANGLE_DEGREES = 1080.0;
  static PIXELS_PER_DEGREE = 1.6; // 48px horizontal drag = 30° (1 notch = 5 minutes)

  /**
   * Convert horizontal drag delta (pixels) from a starting angle into a new clamped angle & notch info.
   * Right -> Left drag (deltaX < 0) increases angle/minutes.
   * Left -> Right drag (deltaX > 0) decreases angle/minutes.
   */
  static computeDragUpdate(startAngleDegrees, translationX, lastNotchIndex) {
    const deltaDegrees = -translationX / OdometerDialPhysics.PIXELS_PER_DEGREE;
    const rawAngle = Math.min(
      Math.max(startAngleDegrees + deltaDegrees, 0.0),
      OdometerDialPhysics.MAX_ANGLE_DEGREES
    );
    const currentNotchIndex = Math.round(rawAngle / OdometerDialPhysics.DEGREES_PER_NOTCH);
    const crossedNotch = currentNotchIndex !== lastNotchIndex;
    const snappedMinutes = Math.min(
      Math.max(currentNotchIndex * OdometerDialPhysics.MINUTES_PER_NOTCH, 0),
      OdometerDialPhysics.MAX_MINUTES
    );
    const turnIndex = OdometerDialPhysics.turnIndex(rawAngle);

    return {
      rawAngleDegrees: rawAngle,
      snappedAngleDegrees: currentNotchIndex * OdometerDialPhysics.DEGREES_PER_NOTCH,
      notchIndex: currentNotchIndex,
      crossedNotch,
      snappedMinutes,
      turnIndex,
    };
  }

  /**
   * Snap any continuous angle (0..1080°) to the nearest 30° (5-minute) notch.
   */
  static snapAngleToNotch(angleDegrees) {
    const clamped = Math.min(
      Math.max(angleDegrees, 0.0),
      OdometerDialPhysics.MAX_ANGLE_DEGREES
    );
    const notch = Math.round(clamped / OdometerDialPhysics.DEGREES_PER_NOTCH);
    const snappedAngle = notch * OdometerDialPhysics.DEGREES_PER_NOTCH;
    const minutes = notch * OdometerDialPhysics.MINUTES_PER_NOTCH;
    return { snappedAngle, minutes, notch };
  }

  /**
   * Determine active turn index (0 for Turn 1 [0..60m], 1 for Turn 2 [60..120m], 2 for Turn 3 [120..180m]).
   */
  static turnIndex(angleDegrees) {
    if (angleDegrees <= 360.0) return 0;
    if (angleDegrees <= 720.0) return 1;
    return 2;
  }

  /**
   * Convert remaining seconds to total continuous angle in degrees (0..1080°).
   */
  static secondsToAngleDegrees(seconds) {
    const clampedSeconds = Math.min(
      Math.max(seconds, 0),
      OdometerDialPhysics.MAX_MINUTES * 60
    );
    return (clampedSeconds / 60.0) * OdometerDialPhysics.DEGREES_PER_MINUTE;
  }

  /**
   * Format readout to match Mockups 02-hero-timer.png ("02:30" for 150 min) and 03-grid-timer.png ("00:45" for 45 min).
   * - When exact whole minutes are displayed (or >= 60 minutes), mockup shows HH:MM (e.g., 150 min -> 02:30, 45 min -> 00:45).
   * - When actively ticking with non-zero seconds remaining, we also provide a live seconds indicator or HH:MM / MM:SS option.
   */
  static formatMockupReadout(totalSeconds, mode = 'mockup_hhmm') {
    const clamped = Math.max(0, Math.floor(totalSeconds));
    const totalMinutes = Math.floor(clamped / 60);
    const remSeconds = clamped % 60;

    if (mode === 'mockup_hhmm') {
      // If exact minute boundary or >= 60 minutes, format as HH:MM (02:30 = 2h 30m, 00:45 = 0h 45m)
      if (remSeconds === 0 || totalMinutes >= 60) {
        const hours = Math.floor(totalMinutes / 60);
        const mins = totalMinutes % 60;
        return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
      }
      // Sub-hour actively ticking with seconds: show MM:SS so user sees live second-by-second countdown
      return `${String(totalMinutes).padStart(2, '0')}:${String(remSeconds).padStart(2, '0')}`;
    }

    const hours = Math.floor(totalMinutes / 60);
    const mins = totalMinutes % 60;
    return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(remSeconds).padStart(2, '0')}`;
  }

  /**
   * Compute the visible 10-minute odometer labels around the current minute value
   * (e.g., at 150 minutes -> [130, 140, 150, 160, 170] as shown in 02-hero-timer.png).
   */
  static getVisibleEquatorialLabels(currentMinutes) {
    const centerTen = Math.round(currentMinutes / 10) * 10;
    const offsets = [-20, -10, 0, 10, 20];
    return offsets.map((offset) => {
      const val = centerTen + offset;
      return Math.max(0, Math.min(180, val));
    });
  }
}

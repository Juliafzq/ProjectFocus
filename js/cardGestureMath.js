/**
 * CardGestureMath & LogicalDayService
 *
 * Implements the strict directional pixel math rules from PRD v4:
 * 1. Left -> Right drag (deltaX > +15 px, |deltaY| < |deltaX| * tan(25°)) on a task row
 *    is a Graphite Pencil Strikethrough (or erase if already completed).
 * 2. Right -> Left drag (deltaX < -40 px, |deltaY| < |deltaX| * tan(35°)) on the card
 *    is a 180° Card Flip gesture.
 * 3. LogicalDayService: Day boundary rolls over at 5:00 AM local time, not midnight.
 */

export class CardGestureMath {
  static STRIKETHROUGH_MIN_DELTA_X = 15.0;
  static STRIKETHROUGH_MAX_ANGLE_DEGREES = 25.0;

  static FLIP_MAX_DELTA_X = -40.0;
  static FLIP_MIN_POSITIVE_DELTA_X = 40.0;
  static FLIP_MAX_ANGLE_DEGREES = 35.0;

  /**
   * Classify a drag vector (deltaX, deltaY) on the card or task row.
   * @param {number} deltaX - endX - startX in pixels
   * @param {number} deltaY - endY - startY in pixels
   * @param {boolean} isOnTaskRow - whether the drag started on a task row
   * @returns {'strikethrough' | 'flipCard' | 'none'}
   */
  static classifyGesture(deltaX, deltaY, isOnTaskRow = true) {
    // 1. Check Left -> Right Pencil Strikethrough (deltaX > +15 px, angle within ±25°)
    if (isOnTaskRow && deltaX > CardGestureMath.STRIKETHROUGH_MIN_DELTA_X) {
      const maxAllowedY =
        Math.abs(deltaX) *
        Math.tan((CardGestureMath.STRIKETHROUGH_MAX_ANGLE_DEGREES * Math.PI) / 180.0);
      if (Math.abs(deltaY) <= maxAllowedY) {
        return 'strikethrough';
      }
    }

    // 2. Check Card Flip:
    // - Right -> Left (deltaX < -24 px) always flips the card (even if started on a task row).
    // - Left -> Right (deltaX > +24 px) ALSO flips the card when not striking through a task row
    //   (e.g. on card header, whitespace, or anywhere on the Back of the Card), allowing effortless two-way card flipping!
    const effectiveFlipThreshold = 24.0;
    const isRightToLeftFlip = deltaX <= -effectiveFlipThreshold;
    const isLeftToRightFlip = !isOnTaskRow && deltaX >= effectiveFlipThreshold;
    if (isRightToLeftFlip || isLeftToRightFlip) {
      const maxAllowedY = Math.abs(deltaX) * 1.05; // ~46° natural thumb/finger arc cone
      if (Math.abs(deltaY) <= maxAllowedY) {
        return 'flipCard';
      }
    }

    return 'none';
  }

  /**
   * Compute normalized horizontal progress (0.0 -> 1.0) for live graphite pencil stroke drawing
   * during a Left -> Right drag across a task row.
   */
  static strikethroughProgress(deltaX, deltaY, rowWidth) {
    if (deltaX <= CardGestureMath.STRIKETHROUGH_MIN_DELTA_X) return 0.0;
    const maxAllowedY =
      Math.abs(deltaX) *
      Math.tan((CardGestureMath.STRIKETHROUGH_MAX_ANGLE_DEGREES * Math.PI) / 180.0);
    if (Math.abs(deltaY) > maxAllowedY) return 0.0;
    const effectiveWidth = Math.max(rowWidth * 0.55, 60.0);
    return Math.min(Math.max(deltaX / effectiveWidth, 0.0), 1.0);
  }
}

export class LogicalDayService {
  static ROLLOVER_HOUR = 5; // 5:00 AM local time boundary

  /**
   * Compute the logical day Date (midnight-normalized) for any timestamp.
   * Any timestamp before 05:00:00 local time belongs to the previous calendar day.
   */
  static logicalDate(forDate = new Date()) {
    const d = new Date(forDate.getTime());
    d.setHours(d.getHours() - LogicalDayService.ROLLOVER_HOUR);
    return new Date(d.getFullYear(), d.getMonth(), d.getDate());
  }

  /**
   * Format date as uppercase stamped card header matching Mockup 04-card-front.png:
   * e.g., "TUESDAY — OCT 06"
   */
  static formatCardHeader(date = new Date()) {
    const weekdays = [
      'SUNDAY',
      'MONDAY',
      'TUESDAY',
      'WEDNESDAY',
      'THURSDAY',
      'FRIDAY',
      'SATURDAY',
    ];
    const months = [
      'JAN',
      'FEB',
      'MAR',
      'APR',
      'MAY',
      'JUN',
      'JUL',
      'AUG',
      'SEP',
      'OCT',
      'NOV',
      'DEC',
    ];
    const weekday = weekdays[date.getDay()];
    const month = months[date.getMonth()];
    const day = String(date.getDate()).padStart(2, '0');
    return `${weekday} — ${month} ${day}`;
  }
}

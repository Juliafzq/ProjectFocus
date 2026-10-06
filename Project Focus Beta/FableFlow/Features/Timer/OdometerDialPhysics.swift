import Foundation
import CoreGraphics

/// Pure math and physics engine for the Bidirectional 180-Minute "3-Turn Odometer" Dial (PRD §6.#2.B):
/// - 1 full 360° rotation = 60 minutes (12 clicks of 5 minutes, spaced 30° apart).
/// - Maximum 3 full turns = 1080° = 180 minutes (3 hours).
/// - Dragging Right -> Left (`deltaX < 0`) winds the countdown UP in 5-minute (30°) steps.
/// - Dragging Left -> Right (`deltaX > 0`) unwinds/decrements the countdown DOWN in 5-minute (30°) steps.
/// - In Count-Up Stopwatch Mode, advances angle forward by +6° (1 minute notch) per elapsed minute.
public enum OdometerDialPhysics {
    public static let degreesPerFiveMinuteNotch: Double = 30.0
    public static let minutesPerNotch: Int = 5
    public static let secondsPerNotch: Int = 300
    public static let degreesPerFullTurn: Double = 360.0
    public static let minutesPerFullTurn: Int = 60
    public static let maxTurns: Int = 3
    public static let maxCumulativeAngleDegrees: Double = 1080.0
    public static let maxDurationMinutes: Int = 180
    public static let maxDurationSeconds: Int = 180 * 60
    public static let horizontalPointsPerNotch: CGFloat = 24.0

    public struct DialUpdateResult: Equatable, Sendable {
        public let snappedAngleDegrees: Double
        public let durationSeconds: Int
        public let durationMinutes: Int
        public let activeTurnIndex: Int // 0 (0-60m), 1 (65-120m), 2 (125-180m)
        public let notchesCrossed: Int
        public let isWindingUp: Bool
    }

    /// Converts a horizontal finger drag delta (`deltaX`: negative = Right-to-Left wind up, positive = Left-to-Right unwind)
    /// into a snapped 30° / 5-minute odometer state.
    public static func applyHorizontalDrag(
        initialAngleDegrees: Double,
        translationX: CGFloat
    ) -> DialUpdateResult {
        // Right -> Left (translationX < 0) increases angle; Left -> Right (translationX > 0) decreases angle.
        let deltaNotches = Double(-translationX / horizontalPointsPerNotch)
        let rawAngle = initialAngleDegrees + (deltaNotches * degreesPerFiveMinuteNotch)
        let clampedAngle = min(max(rawAngle, 0.0), maxCumulativeAngleDegrees)

        let previousNotchIndex = Int(round(min(max(initialAngleDegrees, 0.0), maxCumulativeAngleDegrees) / degreesPerFiveMinuteNotch))
        let newNotchIndex = Int(round(clampedAngle / degreesPerFiveMinuteNotch))
        let snappedAngle = Double(newNotchIndex) * degreesPerFiveMinuteNotch
        let minutes = newNotchIndex * minutesPerNotch
        let seconds = minutes * 60
        let turnIndex = turnIndex(forMinutes: minutes)

        return DialUpdateResult(
            snappedAngleDegrees: snappedAngle,
            durationSeconds: seconds,
            durationMinutes: minutes,
            activeTurnIndex: turnIndex,
            notchesCrossed: abs(newNotchIndex - previousNotchIndex),
            isWindingUp: newNotchIndex > previousNotchIndex
        )
    }

    public static func angleDegrees(forCountdownSeconds seconds: Double) -> Double {
        let clamped = min(max(seconds, 0.0), Double(maxDurationSeconds))
        return (clamped / Double(maxDurationSeconds)) * maxCumulativeAngleDegrees
    }

    /// In Count-Up Stopwatch Mode, advances forward at 1 minute notch (+6°) per elapsed minute.
    public static func forwardAngleDegrees(forStopwatchElapsedSeconds elapsedSeconds: Double) -> Double {
        let elapsedMinutes = max(0.0, elapsedSeconds) / 60.0
        return elapsedMinutes * 6.0
    }

    /// Returns 0 for Turn 1 (0–60 mins), 1 for Turn 2 (65–120 mins), 2 for Turn 3 (125–180 mins).
    public static func turnIndex(forMinutes minutes: Int) -> Int {
        if minutes <= 60 {
            return 0
        } else if minutes <= 120 {
            return 1
        } else {
            return 2
        }
    }

    /// Returns the 5 painted equatorial numbers visible across the front of the 3D tomato sphere
    /// around the center white pointer triangle (`▲`), matching Mockup p. 11 (`[130, 140, 150, 160, 170]` at 150 mins).
    public static func visibleEquatorialLabels(forCumulativeAngleDegrees angleDegrees: Double) -> [Int] {
        let clampedAngle = min(max(angleDegrees, 0.0), maxCumulativeAngleDegrees)
        let centerMinutes = Int(round((clampedAngle / degreesPerFiveMinuteNotch))) * minutesPerNotch
        let roundedTen = Int(round(Double(centerMinutes) / 10.0)) * 10
        let offsets = [-20, -10, 0, 10, 20]
        return offsets.map { offset in
            min(max(roundedTen + offset, 0), maxDurationMinutes)
        }
    }
}

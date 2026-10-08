import Foundation
import SwiftData

public enum TimerMode: String, Codable, Sendable {
    case countdown
    case stopwatch
}

public enum TimerRunState: String, Codable, Sendable {
    case idle
    case running
    case paused
    case completed // Satin Silver Metallic state (prevents accidental clearing on End; button becomes Reset)
}

@Model
public final class TomatoTimerSlot {
    public static let maxCountdownSeconds: Int = 180 * 60 // 180 minutes (3 full turns of 60m)
    public static let notchStepSeconds: Int = 5 * 60      // 5 minutes per 30° notch

    public var id: UUID = UUID()
    public var quadrantIndex: Int = 0 // 0: Top-Left, 1: Top-Right, 2: Bottom-Left, 3: Bottom-Right
    public var assignedTaskID: UUID? = nil
    public var assignedTaskNumber: Int? = nil
    public var customTitle: String? = nil
    public var modeRawValue: String = TimerMode.countdown.rawValue
    public var runStateRawValue: String = TimerRunState.idle.rawValue
    public var configuredDurationSeconds: Int = 0
    public var targetEndDate: Date? = nil
    public var anchorStartDate: Date? = nil
    public var pausedRemainingOrElapsedSeconds: Double = 0

    public init(
        id: UUID = UUID(),
        quadrantIndex: Int,
        assignedTaskID: UUID? = nil,
        assignedTaskNumber: Int? = nil,
        customTitle: String? = nil,
        mode: TimerMode = .countdown,
        runState: TimerRunState = .idle,
        configuredDurationSeconds: Int = 0
    ) {
        self.id = id
        self.quadrantIndex = min(max(quadrantIndex, 0), 3)
        self.assignedTaskID = assignedTaskID
        self.assignedTaskNumber = assignedTaskNumber
        self.customTitle = customTitle
        self.modeRawValue = mode.rawValue
        self.runStateRawValue = runState.rawValue
        self.configuredDurationSeconds = min(max(configuredDurationSeconds, 0), Self.maxCountdownSeconds)
        self.pausedRemainingOrElapsedSeconds = Double(self.configuredDurationSeconds)
    }

    public var mode: TimerMode {
        get { TimerMode(rawValue: modeRawValue) ?? .countdown }
        set { modeRawValue = newValue.rawValue }
    }

    public var runState: TimerRunState {
        get { TimerRunState(rawValue: runStateRawValue) ?? .idle }
        set { runStateRawValue = newValue.rawValue }
    }

    public var isAssigned: Bool {
        let trimmed = (customTitle ?? "").trimmingCharacters(in: .whitespacesAndNewlines)
        return !trimmed.isEmpty || assignedTaskID != nil
    }

    public var displayTitleUppercase: String {
        let trimmed = (customTitle ?? "").trimmingCharacters(in: .whitespacesAndNewlines)
        return trimmed.isEmpty ? "TAP TO ASSIGN" : trimmed.uppercased()
    }

    public var heroSubtitleLabel: String {
        let trimmed = (customTitle ?? "").trimmingCharacters(in: .whitespacesAndNewlines).uppercased()
        if let number = assignedTaskNumber {
            return String(format: "%02d / %@", number, trimmed.isEmpty ? "UNTITLED" : trimmed)
        }
        return trimmed.isEmpty ? "UNASSIGNED" : trimmed
    }

    /// Computes live remaining (Countdown) or elapsed (Stopwatch) seconds at `referenceDate`.
    public func currentSeconds(at referenceDate: Date = .now) -> Double {
        switch mode {
        case .countdown:
            if runState == .running, let targetEndDate {
                return max(0, targetEndDate.timeIntervalSince(referenceDate))
            }
            return max(0, pausedRemainingOrElapsedSeconds)
        case .stopwatch:
            if runState == .running, let anchorStartDate {
                return max(0, referenceDate.timeIntervalSince(anchorStartDate))
            }
            return max(0, pausedRemainingOrElapsedSeconds)
        }
    }

    /// Formats readout matching Mockup p. 11 & p. 12 (`02:30` for 2h 30m / 150m when >= 60m at exact minute mark, or `MM:SS` under 60m).
    public func formattedReadout(at referenceDate: Date = .now) -> String {
        let totalSeconds = Int(ceil(currentSeconds(at: referenceDate)))
        let totalMinutes = totalSeconds / 60
        let remSeconds = totalSeconds % 60
        if mode == .countdown && totalMinutes >= 60 && remSeconds == 0 {
            let hours = totalMinutes / 60
            let mins = totalMinutes % 60
            return String(format: "%02d:%02d", hours, mins)
        }
        return String(format: "%02d:%02d", totalMinutes, remSeconds)
    }
}

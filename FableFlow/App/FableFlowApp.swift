import SwiftUI
import SwiftData

@main
struct FableFlowApp: App {
    @Environment(\.scenePhase) private var scenePhase

    @State private var logicalDayService: LogicalDayService
    @State private var sensoryEngine: SensoryEngine
    @State private var toastCenter: ToastNotificationCenter
    @State private var timerCoordinator: TimerCoordinator
    @State private var cardRepository: DailyCardRepository

    private let persistenceContainer: PersistenceContainer

    init() {
        let persistence = PersistenceContainer.shared
        self.persistenceContainer = persistence

        let dayService = LogicalDayService()
        let sensory = SensoryEngine()
        let toast = ToastNotificationCenter()
        let context = persistence.mainContext

        let cardRepo = DailyCardRepository(
            modelContext: context,
            logicalDayService: dayService,
            sensoryEngine: sensory,
            toastCenter: toast
        )
        let timerCoord = TimerCoordinator(
            modelContext: context,
            sensoryEngine: sensory,
            notificationScheduler: TimerCompletionNotificationScheduler()
        )

        _logicalDayService = State(initialValue: dayService)
        _sensoryEngine = State(initialValue: sensory)
        _toastCenter = State(initialValue: toast)
        _cardRepository = State(initialValue: cardRepo)
        _timerCoordinator = State(initialValue: timerCoord)
    }

    var body: some Scene {
        WindowGroup {
            PhaseOneWorkspaceView(
                cardRepository: cardRepository,
                timerCoordinator: timerCoordinator,
                logicalDayService: logicalDayService,
                sensoryEngine: sensoryEngine,
                toastCenter: toastCenter
            )
            .modelContainer(persistenceContainer.container)
            .onChange(of: scenePhase) { _, newPhase in
                if newPhase == .active {
                    logicalDayService.refreshLogicalDayIfNeeded()
                    sensoryEngine.prepareHardwareEngines()
                    timerCoordinator.reconcileWallClockTimestamps(at: .now)
                }
            }
        }
    }
}

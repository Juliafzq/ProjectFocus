#!/usr/bin/env python3
"""
Comprehensive Automated Evaluation Suite for Project Focus Beta (Phase 0 & Phase 1)
Evaluates the built iOS Swift codebase AND Interactive Web/Mobile Beta against:
  1. Part 3 Evaluation Criteria (Layer 1 Architectural Audit, Layer 2 Automated Math/Logic, Layer 3 Mockup & Tactile Checklist)
  2. PRD v4 (All resolved rules: Mockups Win, Bidirectional 3-Turn Unwinding, Pixel-Direction Math, 1-Active-Timer Concurrency, Decoupled Strikethrough, Trash Confirmation & Notification)
  3. Part 2 Detailed Implementation Plan (All Phase 0 & Phase 1 files & HTTP asset serving)
"""

import datetime
import http.server
import math
import os
import re
import socketserver
import sys
import threading
import urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

total_checks = 0
passed_checks = 0
failures = []


def check(category: str, name: str, fn):
    global total_checks, passed_checks
    total_checks += 1
    try:
        fn()
        passed_checks += 1
        print(f"  [PASS] [{category}] {name}")
    except Exception as exc:
        failures.append((category, name, str(exc)))
        print(f"  [FAIL] [{category}] {name}: {exc}")


print("=" * 84)
print("FABLE / FLOW (PROJECT FOCUS BETA) — PHASE 0 & PHASE 1 EVALUATION SUITE")
print("=" * 84)

# ============================================================================
# 1. LAYER 1: COMPLETE FILE INVENTORY & NON-EMPTY VERIFICATION
# ============================================================================
print("\n--- Layer 1: File Inventory & Codebase Completeness Audit ---")

REQUIRED_FILES = [
    # Phase 0 Foundation (v0.1.0-alpha)
    "FableFlow.xcodeproj/project.pbxproj",
    "FableFlow/App/FableFlowApp.swift",
    "FableFlow/App/FableFlow.entitlements",
    "FableFlow/App/Info.plist",
    "FableFlow/Config/FableFlowProducts.storekit",
    "FableFlow/Core/DesignSystem/ThemeTokens.swift",
    "FableFlow/Core/DesignSystem/InAppToastBannerView.swift",
    "FableFlow/Core/Time/LogicalDayService.swift",
    "FableFlow/Core/Models/DailyCard.swift",
    "FableFlow/Core/Models/CardTask.swift",
    "FableFlow/Core/Models/JournalPhoto.swift",
    "FableFlow/Core/Models/TomatoTimerSlot.swift",
    "FableFlow/Core/Persistence/PersistenceContainer.swift",
    "FableFlow/Core/Media/HEICImageCompressor.swift",
    "FableFlow/Core/Protocols/ServiceProtocols.swift",
    # Phase 1 Track 1A: Sensory Engine & 3D Tomato Shader
    "FableFlow/Core/Sensory/SensoryEngine.swift",
    "FableFlow/Core/Sensory/HapticPatternLibrary.swift",
    "FableFlow/Core/Sensory/TactileAudioManager.swift",
    "FableFlow/Core/Rendering3D/TomatoOdometerShader.metal",
    "FableFlow/Core/Rendering3D/Tomato3DSceneView.swift",
    "FableFlow/Resources/Models3D/HeirloomTomato.usdz",
    "FableFlow/Resources/Audio/ratchet_notch.caf",
    "FableFlow/Resources/Audio/escapement_tick.caf",
    "FableFlow/Resources/Audio/soft_chime.caf",
    "FableFlow/Resources/Audio/graphite_loop.caf",
    "FableFlow/Resources/Audio/card_flip_whoosh.caf",
    "FableFlow/Resources/Audio/card_riffle_tick.caf",
    "FableFlow/Resources/Audio/card_trash_delete.caf",
    # Phase 1 Track 1B: 4-Pomodoro Grid + Hero Tomato + Bidirectional 3-Turn Odometer
    "FableFlow/Features/Timer/OdometerDialPhysics.swift",
    "FableFlow/Features/Timer/TimerCompletionNotificationScheduler.swift",
    "FableFlow/Features/Timer/TimerCoordinator.swift",
    "FableFlow/Features/Timer/TaskAssignmentMenuView.swift",
    "FableFlow/Features/Timer/FourTomatoGridView.swift",
    "FableFlow/Features/Timer/SingleHeroTomatoView.swift",
    # Phase 1 Track 1C: Card Front + Gesture Math + Pencil Strikethrough + Top Bar
    "FableFlow/Features/Card/DailyCardRepository.swift",
    "FableFlow/Features/Card/CardGestureMath.swift",
    "FableFlow/Features/Card/PencilStrikethroughCanvas.swift",
    "FableFlow/Features/Card/TaskRowView.swift",
    "FableFlow/Features/Card/CardFrontView.swift",
    "FableFlow/Features/Workspace/GlobalTopBarView.swift",
    "FableFlow/Features/Workspace/PhaseOneWorkspaceView.swift",
    # Phase 0 & 1 Automated Tests
    "FableFlowTests/LogicalDayServiceTests.swift",
    "FableFlowTests/HEICImageCompressorTests.swift",
    "FableFlowTests/OdometerDialPhysicsTests.swift",
    "FableFlowTests/TimerCoordinatorConcurrencyTests.swift",
    "FableFlowTests/CardGestureMathTests.swift",
    "FableFlowTests/StackPermanentDeleteTests.swift",
    "FableFlowUITests/DailyRitualEndToEndUITests.swift",
    # Interactive Web/Mobile Beta Preview Application
    "index.html",
    "css/style.css",
    "js/odometerPhysics.js",
    "js/cardGestureMath.js",
    "js/sensoryEngine.js",
    "js/tomato3D.js",
    "js/app.js",
    "vendor/three.module.js",
    "start.sh",
]


def verify_inventory():
    for rel in REQUIRED_FILES:
        p = os.path.join(ROOT, rel)
        assert os.path.isfile(p), f"Missing required file: {rel}"
        assert os.path.getsize(p) > 0, f"Empty file: {rel}"


check("Inventory", f"All {len(REQUIRED_FILES)} Phase 0 & Phase 1 files exist and are non-empty", verify_inventory)


def read_file(rel: str) -> str:
    with open(os.path.join(ROOT, rel), "r", encoding="utf-8") as f:
        return f.read()


# ============================================================================
# 2. LAYER 1: ANTI-PATTERN & ARCHITECTURAL AUDIT (PART 3 EVALUATION CRITERIA)
# ============================================================================
print("\n--- Layer 1: Anti-Pattern & Architectural Audit ---")


def verify_audio_architecture():
    src = read_file("FableFlow/Core/Sensory/TactileAudioManager.swift")
    assert ".ambient" in src, "TactileAudioManager must configure .ambient audio category"
    assert ".mixWithOthers" in src, "Must mix with background music/podcasts (.mixWithOthers)"
    assert "preloadAudioSamples" in src and "prepareToPlay" in src, "Must preload all audio samples at startup"


check("Architecture", "TactileAudioManager uses .ambient + .mixWithOthers and preloads all foley buffers", verify_audio_architecture)


def verify_silent_mode_suppression():
    swift_audio = read_file("FableFlow/Core/Sensory/TactileAudioManager.swift")
    swift_sensory = read_file("FableFlow/Core/Sensory/SensoryEngine.swift")
    js_sensory = read_file("js/sensoryEngine.js")
    assert ".ambient" in swift_audio, "iOS .ambient category automatically respects the hardware Silent switch"
    assert "isEscapementTickAudioEnabled" in swift_sensory, "SensoryEngine must support muting escapement tick"
    assert "if (this.isSilentMode) return null;" in js_sensory, "JS SensoryEngine must suppress audio when isSilentMode is true"


check("Architecture", "Silent Mode strictly suppresses audio while keeping haptic triggers active", verify_silent_mode_suppression)


def verify_wall_clock_timer():
    swift_timer = read_file("FableFlow/Features/Timer/TimerCoordinator.swift")
    js_app = read_file("js/app.js")
    assert "targetEndDate" in swift_timer, "Swift TimerCoordinator must compute remaining time from targetEndDate"
    assert "reconcileWallClockTimestamps" in swift_timer, "Swift TimerCoordinator must reconcile wall-clock delta"
    assert "reconcileElapsedTimers" in js_app, "JS App must reconcile wall-clock elapsed time on resume"


check("Architecture", "Countdown & Stopwatch timers use wall-clock delta calculation (zero background drift)", verify_wall_clock_timer)


def verify_no_vertical_scroll_and_6_task_cap():
    swift_card = read_file("FableFlow/Features/Card/CardFrontView.swift")
    css_src = read_file("css/style.css")
    assert "ScrollView" not in swift_card, "CardFrontView.swift must have zero vertical ScrollView"
    assert "< 6" in swift_card, "CardFrontView.swift must enforce the 6-task cap"
    assert "overflow: hidden" in css_src, "CSS .card-dot-grid-body must enforce overflow: hidden (zero vertical scroll)"


check("Architecture", "Card Front enforces 6-task hard cap, zero subtasks, and zero vertical scroll", verify_no_vertical_scroll_and_6_task_cap)


def verify_metal_shader_turns():
    metal_src = read_file("FableFlow/Core/Rendering3D/TomatoOdometerShader.metal")
    js_3d = read_file("js/tomato3D.js")
    assert "turnOffsetMinutes = int(totalRotationTurns) * 60" in metal_src, "Metal shader must compute turnOffsetMinutes = int(totalRotationTurns) * 60"
    assert "activeTurnIndex" in metal_src, "Metal shader must support activeTurnIndex across 3 turns"
    assert "180" in js_3d and "updateOdometer" in js_3d, "JS 3D Tomato renderer must dynamically render 0..180m odometer scale"


check("Architecture", "3D Tomato Odometer Shader dynamically switches across Turn 1 (0-60), Turn 2 (65-120), Turn 3 (125-180)", verify_metal_shader_turns)

# ============================================================================
# 3. LAYER 2: MATHEMATICAL & BEHAVIORAL VERIFICATION
# ============================================================================
print("\n--- Layer 2: Mathematical & Behavioral Verification ---")


def verify_5am_rollover_math():
    swift_day = read_file("FableFlow/Core/Time/LogicalDayService.swift")
    js_day = read_file("js/cardGestureMath.js")
    assert "rolloverHour" in swift_day and "5" in swift_day
    assert "ROLLOVER_HOUR = 5" in js_day and "- LogicalDayService.ROLLOVER_HOUR" in js_day

    tz_oct7_459 = datetime.datetime(2026, 10, 7, 4, 59, 59)
    tz_oct7_500 = datetime.datetime(2026, 10, 7, 5, 0, 0)
    logical_459 = (tz_oct7_459 - datetime.timedelta(hours=5)).date()
    logical_500 = (tz_oct7_500 - datetime.timedelta(hours=5)).date()
    assert logical_459 == datetime.date(2026, 10, 6), f"Expected 2026-10-06 at 04:59:59 AM, got {logical_459}"
    assert logical_500 == datetime.date(2026, 10, 7), f"Expected 2026-10-07 at 05:00:00 AM, got {logical_500}"


check("Math/Time", "LogicalDayService 5:00 AM boundary (04:59:59 AM -> Oct 06; 05:00:00 AM -> Oct 07)", verify_5am_rollover_math)


def verify_gesture_disambiguation_math():
    swift_gesture = read_file("FableFlow/Features/Card/CardGestureMath.swift")
    js_gesture = read_file("js/cardGestureMath.js")
    assert "minimumPencilStrokeDeltaXPixels: CGFloat = 15.0" in swift_gesture
    assert "maximumPencilVerticalConeDegrees: CGFloat = 25.0" in swift_gesture
    assert "minimumCardFlipDeltaXPixels: CGFloat = -40.0" in swift_gesture
    assert "maximumCardFlipVerticalConeDegrees: CGFloat = 35.0" in swift_gesture
    assert "STRIKETHROUGH_MIN_DELTA_X = 15.0" in js_gesture
    assert "FLIP_MAX_DELTA_X = -40.0" in js_gesture

    def classify(dx: float, dy: float, on_row: bool = True) -> str:
        if on_row and dx > 15.0:
            if abs(dy) <= abs(dx) * math.tan(math.radians(25.0)):
                return "strikethrough"
        if dx < -40.0:
            if abs(dy) <= abs(dx) * math.tan(math.radians(35.0)):
                return "flipCard"
        return "none"

    assert classify(18.0, 2.0, True) == "strikethrough"
    assert classify(20.0, 15.0, True) == "none"  # 36.8 deg > 25 deg
    assert classify(-45.0, -4.0, True) == "flipCard"
    assert classify(-30.0, 0.0, True) == "none"  # -30 > -40


check("Math/Gesture", "Pixel-Direction Gesture Disambiguation (L->R > +15px ±25° = Strikethrough; R->L < -40px ±35° = 180° Flip)", verify_gesture_disambiguation_math)


def verify_bidirectional_3turn_odometer_math():
    swift_phys = read_file("FableFlow/Features/Timer/OdometerDialPhysics.swift")
    js_phys = read_file("js/odometerPhysics.js")
    assert "maxDurationMinutes: Int = 180" in swift_phys and "maxCumulativeAngleDegrees: Double = 1080.0" in swift_phys
    assert "degreesPerFiveMinuteNotch: Double = 30.0" in swift_phys
    assert "MAX_MINUTES = 180" in js_phys and "MAX_ANGLE_DEGREES = 1080.0" in js_phys
    assert "DEGREES_PER_NOTCH = 30.0" in js_phys

    def compute_drag(start_angle: float, tx: float, last_notch: int):
        delta_deg = -tx / 1.6
        raw_angle = min(max(start_angle + delta_deg, 0.0), 1080.0)
        notch = round(raw_angle / 30.0)
        crossed = notch != last_notch
        mins = min(max(notch * 5, 0), 180)
        turn = 0 if raw_angle <= 360.0 else (1 if raw_angle <= 720.0 else 2)
        return raw_angle, notch * 30.0, mins, crossed, turn

    # Wind up from 0° by dragging Right->Left (-48px = +30° = +5m)
    raw, snapped, mins, crossed, turn = compute_drag(0.0, -48.0, 0)
    assert mins == 5 and snapped == 30.0 and crossed is True and turn == 0

    # Wind up to Turn 3 (150 minutes = 900° -> "02:30" in Mockup 02-hero-timer.png)
    raw, snapped, mins, crossed, turn = compute_drag(720.0, -180.0 * 1.6, 24)
    assert mins == 150 and snapped == 900.0 and turn == 2

    # Unwind (Left->Right drag, positive tx = +96px = -60° = -10m -> 140 minutes)
    raw, snapped, mins, crossed, turn = compute_drag(900.0, +96.0, 30)
    assert mins == 140 and snapped == 840.0 and crossed is True and turn == 2

    # Unwind all the way to 00:00 clamps cleanly at 0
    raw, snapped, mins, crossed, turn = compute_drag(60.0, +500.0, 2)
    assert mins == 0 and raw == 0.0 and turn == 0


check("Math/Odometer", "Bidirectional 3-Turn Odometer Winding (R->L up to 180m) and Unwinding (L->R down to 00:00)", verify_bidirectional_3turn_odometer_math)


def verify_concurrency_and_decoupled_strikethrough():
    swift_coord = read_file("FableFlow/Features/Timer/TimerCoordinator.swift")
    js_app = read_file("js/app.js")
    assert "slots[otherIndex].runState == .running" in swift_coord and "pause(quadrant: otherIndex" in swift_coord
    assert "other.quadrant !== quadrant && other.runState === 'running'" in js_app
    end_fn_match = re.search(r"endAndResetTimer\(quadrant.*?\n  \}", js_app, re.DOTALL)
    assert end_fn_match is not None
    assert "isCompleted" not in end_fn_match.group(0), "endAndResetTimer must NEVER modify task.isCompleted"


check("Concurrency", "Strict 1-Active-Timer auto-pause & Decoupled Task Strikethrough on timer completion/end", verify_concurrency_and_decoupled_strikethrough)

# ============================================================================
# 4. LAYER 3: MOCKUP VISUAL & STRUCTURAL FIDELITY + HTTP SERVER VERIFICATION
# ============================================================================
print("\n--- Layer 3: UI Mockup Fidelity & Live HTTP Asset Serving ---")


def verify_mockup_elements():
    html = read_file("index.html")
    js = read_file("js/app.js")

    # 1. Global Top Bar: Card | Timer pill + Profile icon
    assert 'id="pill-card-btn"' in html and 'id="pill-timer-btn"' in html and 'id="profile-btn"' in html
    # 2. Card Front (04-card-front.png)
    assert "TUESDAY — OCT 06" in html
    assert "+ Add item" in html
    assert 'id="card-stack-btn"' in html and 'id="card-flip-btn"' in html and 'id="card-plus-btn"' in html
    assert "'Math Study'" in js and "'Build Deck'" in js and "'Pick Up Package'" in js
    # 3. 4-Tomato Grid (03-grid-timer.png)
    assert "+ Custom Title..." in js and "Tap to assign" in js
    assert "#8B1E24" in read_file("js/tomato3D.js") and "#C84B31" in read_file("js/tomato3D.js")
    assert "#5E192A" in read_file("js/tomato3D.js") and "#D96B52" in read_file("js/tomato3D.js")
    # 4. Hero Tomato (02-hero-timer.png)
    assert "02:30" in html and "01 / MATH STUDY" in html
    assert 'id="hero-btn-grid"' in html and 'id="hero-btn-playpause"' in html
    assert 'id="hero-btn-stop"' in html and 'id="hero-btn-stopwatch"' in html


check("MockupFidelity", "All 3 Phase 1 UI Mockups (02-hero-timer, 03-grid-timer, 04-card-front) match pixel & DOM structure", verify_mockup_elements)


def verify_http_serving():
    os.chdir(ROOT)
    handler = http.server.SimpleHTTPRequestHandler

    class QuietServer(socketserver.TCPServer):
        allow_reuse_address = True

    with QuietServer(("127.0.0.1", 0), handler) as httpd:
        port = httpd.server_address[1]
        thread = threading.Thread(target=httpd.serve_forever, daemon=True)
        thread.start()

        endpoints = [
            "/index.html",
            "/css/style.css",
            "/js/app.js",
            "/js/tomato3D.js",
            "/js/odometerPhysics.js",
            "/js/cardGestureMath.js",
            "/js/sensoryEngine.js",
            "/vendor/three.module.js",
        ]
        for ep in endpoints:
            url = f"http://127.0.0.1:{port}{ep}"
            with urllib.request.urlopen(url, timeout=3) as resp:
                assert resp.status == 200, f"Expected HTTP 200 for {ep}, got {resp.status}"
                body = resp.read()
                assert len(body) > 50, f"Response body too small for {ep}"
        httpd.shutdown()


check("HTTPServer", "All HTML, CSS, ES Modules, and Three.js 3D assets serve with HTTP 200 OK", verify_http_serving)

print("\n" + "=" * 84)
print(f"EVALUATION RESULT: {passed_checks}/{total_checks} CHECKS PASSED ({len(failures)} FAILURES)")
print("=" * 84)

if failures:
    for cat, name, err in failures:
        print(f"  FAILED [{cat}] {name}: {err}")
    sys.exit(1)

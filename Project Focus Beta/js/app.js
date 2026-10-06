/**
 * Fable / Flow — Phase 1 Beta ("Core Tactile Loop") Application Controller
 *
 * Implements:
 * 1. Global Top Bar: Centered `Card | Timer` segmented pill + top-right `[Profile]` icon.
 * 2. Screen 1 — Front of Today's Card (Mockup 04-card-front.png):
 *    - Stamped "TUESDAY — OCT 06" header + divider
 *    - 22px dot-grid 300gsm cotton cardstock
 *    - Up to 6 flat numbered tasks (01..06), zero subtasks, zero vertical scroll
 *    - Interactive Left -> Right (deltaX > +15px, ±25°) textured graphite pencil strikethrough & erase canvas
 *    - Interactive Right -> Left (deltaX < -40px, ±35°) 180° card flip gesture
 *    - Right-aligned miniature 3D heirloom tomato icon on each row (colored in quadrant's heirloom red when assigned, matte gray when unassigned)
 *    - "+ Add item" inline row when < 6 tasks exist
 *    - 3 bottom bar icons: [Stack] [Flip] [+]
 * 3. Screen 2 — 4-Pomodoro 2x2 Grid View (Mockup 03-grid-timer.png):
 *    - Balanced 2x2 grid with thin crosshairs (+)
 *    - 4 distinct Heirloom Red shades when assigned vs. Matte Neutral Gray ("Tap to assign") when unassigned
 *    - Task Assignment Dropdown ("+ Custom Title... v" in black header + Today's Card tasks in white rows)
 *    - Inline Play/Pause and End/Reset buttons below each assigned tomato
 *    - Strict 1-Active-Timer concurrency + Decoupled task strikethrough
 * 4. Screen 3 — Single Big Hero Tomato View (Mockup 02-hero-timer.png):
 *    - Huge bold left-aligned readout ("02:30") + uppercase task subtitle ("01 / MATH STUDY")
 *    - Interactive 3D Sculpted Heirloom Tomato with bidirectional 3-turn odometer dial
 *      (Right -> Left drag winds UP in 5m/30° notches to 180m; Left -> Right drag unwinds DOWN to 0m)
 *    - 4 bottom bar icons: [2x2 Grid] [Play/Pause] [End/Reset] [Stopwatch Toggle]
 */

import { OdometerDialPhysics } from './odometerPhysics.js';
import { CardGestureMath, LogicalDayService } from './cardGestureMath.js';
import { SensoryEngine } from './sensoryEngine.js';
import { HeroTomato3DView, GridTomatoRenderer, HEIRLOOM_PALETTE } from './tomato3D.js';

const STORAGE_KEY = 'fable_flow_phase1_beta_v1';

export class FableFlowApp {
  constructor() {
    this.sensory = new SensoryEngine();
    this.sensory.onHapticPulse = (msg) => this.showTelemetryToast(msg);

    this.state = this.loadInitialState();
    this.hero3D = null;
    this.gridRenderer = null;
    this.tickInterval = null;

    this.initDOM();
    this.init3DRenderers();
    this.bindGlobalEvents();
    this.startWallClockTicker();
    this.renderAll();
  }

  getDefaultState() {
    return {
      activePillar: 'card', // 'card' | 'timer'
      timerSubMode: 'hero', // 'grid' | 'hero'
      selectedQuadrant: 0,
      openDropdownQuadrant: 2, // Mockup 03-grid-timer.png shows dropdown on Quadrant 2 initially
      isCardFlipped: false,
      cardHeaderDate: 'TUESDAY — OCT 06',
      tasks: [
        {
          id: 'task-1',
          orderIndex: 1,
          title: 'Math Study',
          isCompleted: false,
          assignedQuadrant: 0,
        },
        {
          id: 'task-2',
          orderIndex: 2,
          title: 'Build Deck',
          isCompleted: true, // Crossed out in Mockup 04-card-front.png!
          assignedQuadrant: 1,
        },
        {
          id: 'task-3',
          orderIndex: 3,
          title: 'Pick Up Package',
          isCompleted: false,
          assignedQuadrant: null,
        },
      ],
      timers: [
        {
          quadrant: 0,
          assignedTaskId: 'task-1',
          assignedTaskOrder: 1,
          customTitle: 'Math Study',
          mode: 'countdown', // 'countdown' | 'stopwatch'
          runState: 'running', // 'idle' | 'running' | 'paused'
          configuredMinutes: 150, // 02:30 (150 minutes) on Turn 3!
          remainingSeconds: 150 * 60,
          angleDegrees: 150 * 6.0, // 900°
          lastTickTimestamp: Date.now(),
        },
        {
          quadrant: 1,
          assignedTaskId: 'task-2',
          assignedTaskOrder: 2,
          customTitle: 'Build Deck',
          mode: 'countdown',
          runState: 'paused',
          configuredMinutes: 45, // 00:45 (45 minutes) on Turn 1!
          remainingSeconds: 45 * 60,
          angleDegrees: 45 * 6.0, // 270°
          lastTickTimestamp: null,
        },
        {
          quadrant: 2,
          assignedTaskId: null,
          assignedTaskOrder: null,
          customTitle: null,
          mode: 'countdown',
          runState: 'idle',
          configuredMinutes: 0,
          remainingSeconds: 0,
          angleDegrees: 0,
          lastTickTimestamp: null,
        },
        {
          quadrant: 3,
          assignedTaskId: null,
          assignedTaskOrder: null,
          customTitle: null,
          mode: 'countdown',
          runState: 'idle',
          configuredMinutes: 0,
          remainingSeconds: 0,
          angleDegrees: 0,
          lastTickTimestamp: null,
        },
      ],
    };
  }

  loadInitialState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && Array.isArray(parsed.tasks) && Array.isArray(parsed.timers)) {
          // Reconcile any elapsed time while tab was closed
          this.reconcileElapsedTimers(parsed);
          return parsed;
        }
      }
    } catch (_) {}
    return this.getDefaultState();
  }

  saveState() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state));
    } catch (_) {}
  }

  resetToMockupDefault() {
    localStorage.removeItem(STORAGE_KEY);
    this.state = this.getDefaultState();
    this.saveState();
    this.renderAll();
    this.showNotificationBanner('Restored exact UI Mockup default state (Tuesday — Oct 06).');
  }

  reconcileElapsedTimers(stateObj) {
    const now = Date.now();
    for (const slot of stateObj.timers) {
      if (slot.runState === 'running' && slot.lastTickTimestamp) {
        const elapsedSec = Math.floor((now - slot.lastTickTimestamp) / 1000);
        if (elapsedSec > 0) {
          if (slot.mode === 'countdown') {
            slot.remainingSeconds = Math.max(0, slot.remainingSeconds - elapsedSec);
            slot.angleDegrees = OdometerDialPhysics.secondsToAngleDegrees(slot.remainingSeconds);
            if (slot.remainingSeconds === 0) {
              slot.runState = 'idle';
              slot.lastTickTimestamp = null;
            } else {
              slot.lastTickTimestamp = now;
            }
          } else {
            slot.remainingSeconds += elapsedSec;
            slot.angleDegrees = (slot.angleDegrees + elapsedSec * 0.5) % 1080;
            slot.lastTickTimestamp = now;
          }
        }
      }
    }
  }

  initDOM() {
    this.els = {
      pillCardBtn: document.getElementById('pill-card-btn'),
      pillTimerBtn: document.getElementById('pill-timer-btn'),
      profileBtn: document.getElementById('profile-btn'),

      cardScreen: document.getElementById('screen-card'),
      gridScreen: document.getElementById('screen-grid'),
      heroScreen: document.getElementById('screen-hero'),

      card3DWrapper: document.getElementById('daily-card-3d'),
      cardDateHeader: document.getElementById('card-date-header'),
      taskListContainer: document.getElementById('task-list-container'),
      addItemRow: document.getElementById('add-item-row'),
      cardStackBtn: document.getElementById('card-stack-btn'),
      cardFlipBtn: document.getElementById('card-flip-btn'),
      cardPlusBtn: document.getElementById('card-plus-btn'),
      cardBackReturnBtn: document.getElementById('card-back-return-btn'),

      gridQuadrants: [
        document.getElementById('grid-quad-0'),
        document.getElementById('grid-quad-1'),
        document.getElementById('grid-quad-2'),
        document.getElementById('grid-quad-3'),
      ],

      heroReadout: document.getElementById('hero-readout'),
      heroSubtitle: document.getElementById('hero-subtitle'),
      heroTomatoStage: document.getElementById('hero-tomato-stage'),
      heroBtnGrid: document.getElementById('hero-btn-grid'),
      heroBtnPlayPause: document.getElementById('hero-btn-playpause'),
      heroBtnStop: document.getElementById('hero-btn-stop'),
      heroBtnStopwatch: document.getElementById('hero-btn-stopwatch'),

      toastPill: document.getElementById('telemetry-toast'),
      notificationBanner: document.getElementById('notification-banner'),

      // Quick Demo / Evaluation Toolbar Controls
      demoBtnCard: document.getElementById('demo-view-card'),
      demoBtnGrid: document.getElementById('demo-view-grid'),
      demoBtnHero: document.getElementById('demo-view-hero'),
      demoBtnSilent: document.getElementById('demo-toggle-silent'),
      demoBtnReset: document.getElementById('demo-reset-state'),

      // Modal for adding/editing task or custom timer title
      modalOverlay: document.getElementById('modal-overlay'),
      modalTitle: document.getElementById('modal-title'),
      modalInput: document.getElementById('modal-input'),
      modalCancel: document.getElementById('modal-cancel'),
      modalConfirm: document.getElementById('modal-confirm'),
      // Confirmation modal for permanent trash deletion
      deleteModalOverlay: document.getElementById('delete-modal-overlay'),
      deleteModalCancel: document.getElementById('delete-modal-cancel'),
      deleteModalConfirm: document.getElementById('delete-modal-confirm'),
    };
  }

  init3DRenderers() {
    this.gridRenderer = new GridTomatoRenderer();
    this.hero3D = new HeroTomato3DView(this.els.heroTomatoStage);
    window.addEventListener('resize', () => {
      if (this.hero3D) this.hero3D.resize();
    });
  }

  bindGlobalEvents() {
    // 1. Top Segmented Pill: Card | Timer
    this.els.pillCardBtn.addEventListener('click', () => {
      this.state.activePillar = 'card';
      this.saveState();
      this.renderAll();
    });

    this.els.pillTimerBtn.addEventListener('click', () => {
      this.state.activePillar = 'timer';
      this.saveState();
      this.renderAll();
    });

    this.els.profileBtn.addEventListener('click', () => {
      this.showNotificationBanner('Profile & Settings Sheet (Phase 1 Beta Preview — Local-First Mode Active)');
    });

    // 2. Card Bottom Action Bar: [Stack] [Flip] [+]
    this.els.cardStackBtn.addEventListener('click', () => {
      this.showNotificationBanner('Past Cards Stack & Calendar Archive unlocks in Phase 3.');
    });

    this.els.cardFlipBtn.addEventListener('click', () => {
      this.triggerCardFlip();
    });

    if (this.els.cardBackReturnBtn) {
      this.els.cardBackReturnBtn.addEventListener('click', () => {
        this.triggerCardFlip();
      });
    }

    this.els.cardPlusBtn.addEventListener('click', () => {
      this.openAddTaskModal();
    });

    this.els.addItemRow.addEventListener('click', () => {
      this.openAddTaskModal();
    });

    // 3. Card Surface Right -> Left Flip Gesture Detector (deltaX < -40px, ±35°)
    this.bindCardSurfaceFlipGesture();

    // 4. Hero Tomato 3D Dial Horizontal Drag Gesture (Right->Left winds up, Left->Right unwinds)
    this.bindHeroDialDragGesture();

    // 5. Hero Bottom Bar Controls: [2x2 Grid] [Play/Pause] [End/Stop] [Stopwatch]
    this.els.heroBtnGrid.addEventListener('click', () => {
      this.state.timerSubMode = 'grid';
      this.saveState();
      this.renderAll();
    });

    this.els.heroBtnPlayPause.addEventListener('click', () => {
      this.togglePlayPause(this.state.selectedQuadrant);
    });

    this.els.heroBtnStop.addEventListener('click', () => {
      this.endAndResetTimer(this.state.selectedQuadrant, false);
    });

    this.els.heroBtnStopwatch.addEventListener('click', () => {
      this.toggleStopwatchMode(this.state.selectedQuadrant);
    });

    //Click on Hero Subtitle opens task assignment for that tomato
    this.els.heroSubtitle.addEventListener('click', () => {
      this.state.timerSubMode = 'grid';
      this.state.openDropdownQuadrant = this.state.selectedQuadrant;
      this.saveState();
      this.renderAll();
    });

    // 6. Demo / Evaluation Sidebar Buttons
    if (this.els.demoBtnCard) {
      this.els.demoBtnCard.addEventListener('click', () => {
        this.state.activePillar = 'card';
        this.state.isCardFlipped = false;
        this.saveState();
        this.renderAll();
      });
    }
    if (this.els.demoBtnGrid) {
      this.els.demoBtnGrid.addEventListener('click', () => {
        this.state.activePillar = 'timer';
        this.state.timerSubMode = 'grid';
        this.saveState();
        this.renderAll();
      });
    }
    if (this.els.demoBtnHero) {
      this.els.demoBtnHero.addEventListener('click', () => {
        this.state.activePillar = 'timer';
        this.state.timerSubMode = 'hero';
        this.saveState();
        this.renderAll();
      });
    }
    if (this.els.demoBtnSilent) {
      this.els.demoBtnSilent.addEventListener('click', () => {
        this.sensory.isSilentMode = !this.sensory.isSilentMode;
        this.els.demoBtnSilent.textContent = this.sensory.isSilentMode
          ? '🔇 Silent Mode: ON'
          : '🔊 Foley Audio: ON';
        this.els.demoBtnSilent.classList.toggle('active-pill', this.sensory.isSilentMode);
        this.showTelemetryToast(
          this.sensory.isSilentMode
            ? 'Silent Mode enabled (Audio muted, Haptics active)'
            : 'Tactile Foley Audio enabled'
        );
      });
    }
    if (this.els.demoBtnReset) {
      this.els.demoBtnReset.addEventListener('click', () => {
        this.resetToMockupDefault();
      });
    }
  }

  // =========================================================================
  // CARD GESTURE DISAMBIGUATION:
  // - Left -> Right (deltaX > +15px, ±25°) on a task row = Graphite Strikethrough
  // - Right -> Left (deltaX < -40px, ±35°) on card = 180° Card Flip
  // =========================================================================

  bindCardSurfaceFlipGesture() {
    let startX = null;
    let startY = null;

    const onPointerDown = (e) => {
      // Let task row handle its own pointer tracking, or track card-wide right->left
      startX = e.clientX;
      startY = e.clientY;
    };

    const onPointerUp = (e) => {
      if (startX === null || startY === null) return;
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      startX = null;
      startY = null;

      const classification = CardGestureMath.classifyGesture(dx, dy, false);
      if (classification === 'flipCard') {
        this.triggerCardFlip();
      }
    };

    this.els.card3DWrapper.addEventListener('pointerdown', onPointerDown);
    this.els.card3DWrapper.addEventListener('pointerup', onPointerUp);
  }

  triggerCardFlip() {
    this.state.isCardFlipped = !this.state.isCardFlipped;
    this.sensory.playCardFlipSwoosh();
    this.saveState();
    this.renderCardScreen();
  }

  // =========================================================================
  // HERO TOMATO 3D ODOMETER DIAL DRAG (Bidirectional 3-Turn Winding)
  // =========================================================================

  bindHeroDialDragGesture() {
    const stage = this.els.heroTomatoStage;
    let isDragging = false;
    let dragStartX = 0;
    let dragStartAngle = 0;
    let lastNotchIndex = 0;

    stage.addEventListener('pointerdown', (e) => {
      const slot = this.state.timers[this.state.selectedQuadrant];
      if (!slot || slot.mode === 'stopwatch') return;

      isDragging = true;
      dragStartX = e.clientX;
      dragStartAngle = slot.angleDegrees;
      lastNotchIndex = Math.round(dragStartAngle / OdometerDialPhysics.DEGREES_PER_NOTCH);
      stage.setPointerCapture(e.pointerId);
    });

    stage.addEventListener('pointermove', (e) => {
      if (!isDragging) return;
      const slot = this.state.timers[this.state.selectedQuadrant];
      if (!slot || slot.mode === 'stopwatch') return;

      const translationX = e.clientX - dragStartX;
      const update = OdometerDialPhysics.computeDragUpdate(
        dragStartAngle,
        translationX,
        lastNotchIndex
      );

      if (update.crossedNotch) {
        const isWindingUp = update.notchIndex > lastNotchIndex;
        lastNotchIndex = update.notchIndex;
        this.sensory.playDialRatchetNotch(isWindingUp);
      }

      slot.angleDegrees = update.rawAngleDegrees;
      slot.configuredMinutes = update.snappedMinutes;
      slot.remainingSeconds = update.snappedMinutes * 60;

      // Update live readout and 3D equatorial odometer shader/canvas
      this.els.heroReadout.textContent = OdometerDialPhysics.formatMockupReadout(
        slot.remainingSeconds
      );
      this.hero3D.updateOdometer(
        slot.angleDegrees,
        slot.quadrant,
        Boolean(slot.assignedTaskId || slot.customTitle)
      );
    });

    const endDrag = (e) => {
      if (!isDragging) return;
      isDragging = false;
      try {
        stage.releasePointerCapture(e.pointerId);
      } catch (_) {}

      const slot = this.state.timers[this.state.selectedQuadrant];
      if (!slot || slot.mode === 'stopwatch') return;

      // Snap crisply to nearest 5-minute (30°) notch
      const snapped = OdometerDialPhysics.snapAngleToNotch(slot.angleDegrees);
      slot.angleDegrees = snapped.snappedAngle;
      slot.configuredMinutes = snapped.minutes;
      slot.remainingSeconds = snapped.minutes * 60;

      if (slot.remainingSeconds === 0 && slot.runState === 'running') {
        slot.runState = 'idle';
        slot.lastTickTimestamp = null;
      }

      this.saveState();
      this.renderHeroScreen();
    };

    stage.addEventListener('pointerup', endDrag);
    stage.addEventListener('pointercancel', endDrag);
  }

  // =========================================================================
  // TIMER COORDINATOR LOGIC (1-Active-Timer Rule + Decoupled Strikethrough)
  // =========================================================================

  startWallClockTicker() {
    if (this.tickInterval) clearInterval(this.tickInterval);
    this.tickInterval = setInterval(() => {
      let anyUpdated = false;
      const now = Date.now();

      for (const slot of this.state.timers) {
        if (slot.runState !== 'running') continue;

        if (slot.mode === 'countdown') {
          if (slot.remainingSeconds > 0) {
            slot.remainingSeconds = Math.max(0, slot.remainingSeconds - 1);
            slot.angleDegrees = OdometerDialPhysics.secondsToAngleDegrees(slot.remainingSeconds);
            slot.lastTickTimestamp = now;
            anyUpdated = true;

            if (slot.remainingSeconds === 0) {
              // Completed! Fire soft chime, reset to 00:00, DO NOT cross out task on card!
              this.endAndResetTimer(slot.quadrant, true);
              this.showNotificationBanner(
                `Pomodoro completed for "${(slot.customTitle || 'Timer').toUpperCase()}"! Dial reset to 00:00.`
              );
            }
          }
        } else {
          // Stopwatch mode: count up & rotate cap forward
          slot.remainingSeconds += 1;
          slot.angleDegrees = (slot.angleDegrees + 6.0) % 1080.0;
          slot.lastTickTimestamp = now;
          anyUpdated = true;
        }
      }

      if (anyUpdated) {
        this.saveState();
        if (this.state.activePillar === 'timer') {
          if (this.state.timerSubMode === 'hero') {
            this.renderHeroScreen();
          } else {
            this.renderGridScreen();
          }
        }
      }
    }, 1000);
  }

  /**
   * Enforces the strict 1-Active-Timer Concurrency Rule:
   * Starting any timer automatically pauses any other running timer in the 2x2 grid.
   */
  togglePlayPause(quadrant) {
    const slot = this.state.timers[quadrant];
    if (!slot) return;

    if (slot.runState === 'running') {
      slot.runState = 'paused';
      slot.lastTickTimestamp = null;
      this.sensory.playMechanicalTick();
    } else {
      // Auto-pause all other running timers
      for (const other of this.state.timers) {
        if (other.quadrant !== quadrant && other.runState === 'running') {
          other.runState = 'paused';
          other.lastTickTimestamp = null;
        }
      }

      if (slot.mode === 'countdown' && slot.remainingSeconds <= 0) {
        slot.configuredMinutes = 25;
        slot.remainingSeconds = 25 * 60;
        slot.angleDegrees = 25 * 6.0;
      }

      slot.runState = 'running';
      slot.lastTickTimestamp = Date.now();
      this.sensory.playMechanicalTick();
    }

    this.saveState();
    this.renderAll();
  }

  /**
   * Ends a timer, plays the soft completion chime, and resets the dial to 00:00.
   * Decoupled Strikethrough Rule: Ending or completing a timer NEVER crosses out the task on Today's Card!
   */
  endAndResetTimer(quadrant, completedNaturally = false) {
    const slot = this.state.timers[quadrant];
    if (!slot) return;

    slot.runState = 'idle';
    slot.remainingSeconds = 0;
    slot.configuredMinutes = 0;
    slot.angleDegrees = 0.0;
    slot.lastTickTimestamp = null;

    this.sensory.playCompletionChime();
    if (!completedNaturally) {
      this.showTelemetryToast('Timer ended & reset to 00:00 (Card task untouched)');
    }

    this.saveState();
    this.renderAll();
  }

  toggleStopwatchMode(quadrant) {
    const slot = this.state.timers[quadrant];
    if (!slot) return;

    slot.runState = 'idle';
    slot.lastTickTimestamp = null;
    if (slot.mode === 'countdown') {
      slot.mode = 'stopwatch';
      slot.remainingSeconds = 0;
      slot.angleDegrees = 0;
      this.showTelemetryToast('Stopwatch Mode (Count-Up) active');
    } else {
      slot.mode = 'countdown';
      slot.configuredMinutes = 25;
      slot.remainingSeconds = 25 * 60;
      slot.angleDegrees = 25 * 6.0;
      this.showTelemetryToast('Countdown Mode active');
    }
    this.sensory.playDialRatchetNotch(true);
    this.saveState();
    this.renderAll();
  }

  assignTaskToQuadrant(quadrant, task) {
    const slot = this.state.timers[quadrant];
    if (!slot) return;

    // Clear previous quadrant assignment if this task was on another quadrant
    for (const t of this.state.tasks) {
      if (t.assignedQuadrant === quadrant) {
        t.assignedQuadrant = null;
      }
    }

    task.assignedQuadrant = quadrant;
    slot.assignedTaskId = task.id;
    slot.assignedTaskOrder = task.orderIndex;
    slot.customTitle = task.title;
    if (slot.remainingSeconds === 0 && slot.mode === 'countdown') {
      slot.configuredMinutes = 25;
      slot.remainingSeconds = 25 * 60;
      slot.angleDegrees = 25 * 6.0;
    }

    this.state.openDropdownQuadrant = null;
    this.sensory.playDialRatchetNotch(true);
    this.saveState();
    this.renderAll();
  }

  assignCustomTitleToQuadrant(quadrant, customTitle) {
    const slot = this.state.timers[quadrant];
    if (!slot || !customTitle.trim()) return;

    for (const t of this.state.tasks) {
      if (t.assignedQuadrant === quadrant) {
        t.assignedQuadrant = null;
      }
    }

    slot.assignedTaskId = null;
    slot.assignedTaskOrder = null;
    slot.customTitle = customTitle.trim();
    if (slot.remainingSeconds === 0 && slot.mode === 'countdown') {
      slot.configuredMinutes = 25;
      slot.remainingSeconds = 25 * 60;
      slot.angleDegrees = 25 * 6.0;
    }

    this.state.openDropdownQuadrant = null;
    this.sensory.playDialRatchetNotch(true);
    this.saveState();
    this.renderAll();
  }

  clearQuadrantAssignment(quadrant) {
    const slot = this.state.timers[quadrant];
    if (!slot) return;

    for (const t of this.state.tasks) {
      if (t.assignedQuadrant === quadrant) {
        t.assignedQuadrant = null;
      }
    }

    slot.assignedTaskId = null;
    slot.assignedTaskOrder = null;
    slot.customTitle = null;
    slot.runState = 'idle';
    slot.remainingSeconds = 0;
    slot.configuredMinutes = 0;
    slot.angleDegrees = 0;
    slot.lastTickTimestamp = null;

    this.state.openDropdownQuadrant = null;
    this.saveState();
    this.renderAll();
  }

  /**
   * Tap on a task's right-side tomato icon on Today's Card:
   * Assigns that task to its linked quadrant (or first available quadrant) and jumps to Hero Timer!
   */
  openTaskInTimer(task) {
    let targetQuad = task.assignedQuadrant;
    if (targetQuad === null || targetQuad === undefined) {
      const freeSlot = this.state.timers.find(
        (s) => !s.assignedTaskId && !s.customTitle
      );
      targetQuad = freeSlot ? freeSlot.quadrant : 0;
      this.assignTaskToQuadrant(targetQuad, task);
    }

    this.state.selectedQuadrant = targetQuad;
    this.state.activePillar = 'timer';
    this.state.timerSubMode = 'hero';
    this.sensory.playDialRatchetNotch(true);
    this.saveState();
    this.renderAll();
  }

  // =========================================================================
  // RENDERING: ALL 3 MOCKUP SCREENS
  // =========================================================================

  renderAll() {
    // Update Top Segmented Pill (`Card | Timer`)
    const isCard = this.state.activePillar === 'card';
    this.els.pillCardBtn.classList.toggle('active', isCard);
    this.els.pillTimerBtn.classList.toggle('active', !isCard);

    this.els.cardScreen.classList.toggle('hidden', !isCard);
    this.els.gridScreen.classList.toggle(
      'hidden',
      isCard || this.state.timerSubMode !== 'grid'
    );
    this.els.heroScreen.classList.toggle(
      'hidden',
      isCard || this.state.timerSubMode !== 'hero'
    );

    // Highlight active screen in Demo Toolbar
    if (this.els.demoBtnCard) {
      this.els.demoBtnCard.classList.toggle('active-pill', isCard);
      this.els.demoBtnGrid.classList.toggle(
        'active-pill',
        !isCard && this.state.timerSubMode === 'grid'
      );
      this.els.demoBtnHero.classList.toggle(
        'active-pill',
        !isCard && this.state.timerSubMode === 'hero'
      );
    }

    if (isCard) {
      this.renderCardScreen();
    } else if (this.state.timerSubMode === 'grid') {
      this.renderGridScreen();
    } else {
      this.renderHeroScreen();
    }
  }

  /**
   * Renders Screen 1: Front of Today's Card (Mockup 04-card-front.png)
   */
  renderCardScreen() {
    this.els.cardDateHeader.textContent = this.state.cardHeaderDate;
    this.els.card3DWrapper.classList.toggle('is-flipped', this.state.isCardFlipped);

    const container = this.els.taskListContainer;
    container.innerHTML = '';

    this.state.tasks.forEach((task, idx) => {
      task.orderIndex = idx + 1;
      const row = document.createElement('div');
      row.className = 'task-row';
      row.dataset.taskId = task.id;

      const numSpan = document.createElement('span');
      numSpan.className = 'task-index';
      numSpan.textContent = String(task.orderIndex).padStart(2, '0');

      const titleSpan = document.createElement('span');
      titleSpan.className = 'task-title';
      titleSpan.textContent = task.title;
      titleSpan.title = 'Drag Left → Right to cross out with graphite pencil, or double-click to edit';
      titleSpan.addEventListener('dblclick', () => this.openEditTaskModal(task));

      // Graphite Pencil Strikethrough Canvas overlaid across index + title (matches Mockup 04-card-front.png)
      const strikeCanvas = document.createElement('canvas');
      strikeCanvas.className = 'pencil-strike-canvas';
      strikeCanvas.width = 480;
      strikeCanvas.height = 64;

      // Right-aligned miniature 3D Heirloom Tomato Button
      const tomatoBtn = document.createElement('button');
      tomatoBtn.className = 'task-tomato-btn';
      tomatoBtn.type = 'button';
      tomatoBtn.setAttribute(
        'aria-label',
        `Start Pomodoro for ${task.title}`
      );
      const quadColor =
        task.assignedQuadrant !== null && task.assignedQuadrant !== undefined
          ? HEIRLOOM_PALETTE[task.assignedQuadrant].hex
          : '#858585';
      tomatoBtn.innerHTML = this.getMiniTomatoSVG(quadColor);
      tomatoBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.openTaskInTimer(task);
      });

      row.appendChild(numSpan);
      row.appendChild(titleSpan);
      row.appendChild(strikeCanvas);
      row.appendChild(tomatoBtn);

      container.appendChild(row);

      // Draw initial graphite pencil stroke if task.isCompleted is true
      requestAnimationFrame(() => {
        this.drawGraphiteStroke(strikeCanvas, task.isCompleted ? 1.0 : 0.0);
      });

      // Bind Left -> Right (deltaX > +15px, ±25°) Graphite Strikethrough Gesture on the row!
      this.bindTaskRowPencilGesture(row, task, strikeCanvas);
    });

    // Show "+ Add item" row only when < 6 tasks exist (strictly 6 tasks max, zero vertical scroll)
    if (this.state.tasks.length < 6) {
      this.els.addItemRow.classList.remove('hidden');
    } else {
      this.els.addItemRow.classList.add('hidden');
    }
  }

  /**
   * Renders a realistic textured graphite pencil stroke on the row's <canvas>,
   * matching the exact grainy charcoal line across "02 Build Deck" in Mockup 04-card-front.png.
   */
  drawGraphiteStroke(canvas, progress) {
    const ctx = canvas.getContext('2d');
    const W = canvas.width;
    const H = canvas.height;
    ctx.clearRect(0, 0, W, H);
    if (progress <= 0.01) return;

    const startX = 4;
    const maxEndX = W * 0.94;
    const currentEndX = startX + (maxEndX - startX) * Math.min(progress, 1.0);
    const centerY = H * 0.52;

    ctx.save();
    // Core graphite line
    ctx.strokeStyle = 'rgba(62, 60, 56, 0.85)';
    ctx.lineWidth = 3.8;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(startX, centerY + 1);
    ctx.quadraticCurveTo(
      (startX + currentEndX) * 0.5,
      centerY - 1.8,
      currentEndX,
      centerY + 0.5
    );
    ctx.stroke();

    // Grainy paper-tooth graphite texture particles along the stroke
    const span = currentEndX - startX;
    const numGrains = Math.floor(span * 1.4);
    ctx.fillStyle = 'rgba(52, 50, 47, 0.42)';
    for (let i = 0; i < numGrains; i++) {
      const t = i / Math.max(1, numGrains);
      const gx = startX + t * span;
      // Deterministic organic jitter so it doesn't flicker
      const jitterY = Math.sin(i * 12.9898) * 2.6 + Math.cos(i * 78.233) * 1.4;
      const taper = t > 0.85 ? (1.0 - t) / 0.15 : 1.0;
      ctx.fillRect(gx, centerY + jitterY * taper - 1, 2.2, 2.0 * taper);
    }
    ctx.restore();
  }

  bindTaskRowPencilGesture(rowEl, task, strikeCanvas) {
    let startX = null;
    let startY = null;
    let isTracking = false;

    rowEl.addEventListener('pointerdown', (e) => {
      if (e.target.closest('.task-tomato-btn')) return;
      startX = e.clientX;
      startY = e.clientY;
      isTracking = true;
      rowEl.setPointerCapture(e.pointerId);
    });

    rowEl.addEventListener('pointermove', (e) => {
      if (!isTracking || startX === null) return;
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;

      // Live preview of Left -> Right graphite stroke
      const progress = CardGestureMath.strikethroughProgress(
        dx,
        dy,
        rowEl.clientWidth || 280
      );
      if (progress > 0) {
        if (!task.isCompleted) {
          this.drawGraphiteStroke(strikeCanvas, progress);
        } else {
          this.drawGraphiteStroke(strikeCanvas, 1.0 - progress * 0.8);
        }
      }
    });

    const finishGesture = (e) => {
      if (!isTracking || startX === null) return;
      isTracking = false;
      try {
        rowEl.releasePointerCapture(e.pointerId);
      } catch (_) {}

      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      startX = null;
      startY = null;

      const gesture = CardGestureMath.classifyGesture(dx, dy, true);
      if (gesture === 'strikethrough') {
        task.isCompleted = !task.isCompleted;
        this.sensory.playPencilStrikethrough(!task.isCompleted);
        this.drawGraphiteStroke(strikeCanvas, task.isCompleted ? 1.0 : 0.0);
        this.saveState();
      } else if (gesture === 'flipCard') {
        this.drawGraphiteStroke(strikeCanvas, task.isCompleted ? 1.0 : 0.0);
        this.triggerCardFlip();
      } else {
        // Restore stroke state
        this.drawGraphiteStroke(strikeCanvas, task.isCompleted ? 1.0 : 0.0);
      }
    };

    rowEl.addEventListener('pointerup', finishGesture);
    rowEl.addEventListener('pointercancel', finishGesture);
  }

  /**
   * Miniature sculpted heirloom tomato SVG with 5-star calyx leaf crown
   * matching the right-hand icons in Mockup 04-card-front.png.
   */
  getMiniTomatoSVG(fillHex) {
    return `
      <svg viewBox="0 0 36 34" width="29" height="27" aria-hidden="true">
        <defs>
          <radialGradient id="tomGrad-${fillHex.replace('#', '')}" cx="35%" cy="32%" r="68%">
            <stop offset="0%" stop-color="${fillHex}" stop-opacity="0.92"/>
            <stop offset="65%" stop-color="${fillHex}" stop-opacity="1"/>
            <stop offset="100%" stop-color="#2A0B0E" stop-opacity="1"/>
          </radialGradient>
        </defs>
        <!-- Plump Heirloom Tomato Body -->
        <ellipse cx="18" cy="19.5" rx="15" ry="12.5" fill="url(#tomGrad-${fillHex.replace('#', '')})" />
        <!-- Crisp White/Cream 5-Point Calyx Crown & Stem -->
        <path d="M18 4.2 L18 9.5 M18 9.2 L11.5 7.2 M18 9.2 L24.5 7.2 M18 9.5 L13.2 12.6 M18 9.5 L22.8 12.6"
              stroke="#FAF9F5" stroke-width="1.55" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
      </svg>
    `;
  }

  /**
   * Renders Screen 2: 4-Pomodoro 2x2 Grid View (Mockup 03-grid-timer.png)
   */
  renderGridScreen() {
    this.state.timers.forEach((slot, qIdx) => {
      const quadEl = this.els.gridQuadrants[qIdx];
      if (!quadEl) return;

      const isAssigned = Boolean(slot.assignedTaskId || slot.customTitle);
      const paletteKey = isAssigned
        ? qIdx
        : qIdx === 2
        ? 'unassignedDark'
        : 'unassignedLight';
      const imgDataUrl = this.gridRenderer.getDataURL(paletteKey);

      const readoutText = OdometerDialPhysics.formatMockupReadout(
        slot.remainingSeconds
      );
      const titleText = (slot.customTitle || '').toUpperCase();
      const isDropdownOpen = this.state.openDropdownQuadrant === qIdx;

      quadEl.innerHTML = '';

      // 3D Tomato Stage Container
      const tomatoWrap = document.createElement('div');
      tomatoWrap.className = 'grid-tomato-wrap';

      const img = document.createElement('img');
      img.className = 'grid-tomato-img';
      img.src = imgDataUrl;
      img.alt = isAssigned ? `${titleText} Tomato Timer` : 'Unassigned Tomato Timer';
      tomatoWrap.appendChild(img);

      // Overlay inside Tomato Body
      const overlay = document.createElement('div');
      overlay.className = 'grid-tomato-overlay';

      if (isAssigned) {
        const titleEl = document.createElement('div');
        titleEl.className = 'grid-tomato-title';
        titleEl.textContent = titleText;
        titleEl.title = 'Tap title to reassign task, Tap tomato body to open Hero dial';
        titleEl.addEventListener('click', (e) => {
          e.stopPropagation();
          this.state.openDropdownQuadrant =
            this.state.openDropdownQuadrant === qIdx ? null : qIdx;
          this.renderGridScreen();
        });

        const timeEl = document.createElement('div');
        timeEl.className = 'grid-tomato-time';
        timeEl.textContent = readoutText;

        overlay.appendChild(titleEl);
        overlay.appendChild(timeEl);

        // Clicking an assigned tomato opens the Single Big Hero Tomato View!
        tomatoWrap.addEventListener('click', () => {
          this.state.selectedQuadrant = qIdx;
          this.state.timerSubMode = 'hero';
          this.saveState();
          this.renderAll();
        });
      } else {
        if (!isDropdownOpen) {
          const tapLabel = document.createElement('div');
          tapLabel.className = 'grid-tap-to-assign';
          tapLabel.textContent = 'Tap to assign';
          overlay.appendChild(tapLabel);
        }

        tomatoWrap.addEventListener('click', (e) => {
          e.stopPropagation();
          this.state.openDropdownQuadrant =
            this.state.openDropdownQuadrant === qIdx ? null : qIdx;
          this.renderGridScreen();
        });
      }

      tomatoWrap.appendChild(overlay);

      // Floating Task Assignment Dropdown (matches Mockup 03-grid-timer.png!)
      if (isDropdownOpen) {
        const dropdown = this.buildTaskDropdownDOM(qIdx, isAssigned);
        tomatoWrap.appendChild(dropdown);
      }

      quadEl.appendChild(tomatoWrap);

      // Inline Play/Pause + Stop/End Controls below Assigned Tomatoes (matches Mockup 03-grid-timer.png)
      const controlsRow = document.createElement('div');
      controlsRow.className = 'grid-controls-row';

      if (isAssigned) {
        const playPauseBtn = document.createElement('button');
        playPauseBtn.type = 'button';
        playPauseBtn.className = 'grid-ctrl-btn';
        playPauseBtn.setAttribute(
          'aria-label',
          slot.runState === 'running' ? 'Pause Timer' : 'Start Timer'
        );
        playPauseBtn.innerHTML =
          slot.runState === 'running'
            ? `<svg width="24" height="28" viewBox="0 0 24 28"><rect x="3" y="2" width="6.5" height="24" rx="1.5" fill="#0F0F0F"/><rect x="14.5" y="2" width="6.5" height="24" rx="1.5" fill="#0F0F0F"/></svg>`
            : `<svg width="24" height="28" viewBox="0 0 24 28"><path d="M4 2.5 L22 14 L4 25.5 Z" fill="#0F0F0F" stroke="#0F0F0F" stroke-width="1.5" stroke-linejoin="round"/></svg>`;
        playPauseBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          this.togglePlayPause(qIdx);
        });

        const stopBtn = document.createElement('button');
        stopBtn.type = 'button';
        stopBtn.className = 'grid-ctrl-btn';
        stopBtn.setAttribute('aria-label', 'End and Reset Timer');
        stopBtn.innerHTML = `<svg width="24" height="24" viewBox="0 0 24 24"><rect x="2" y="2" width="20" height="20" rx="2.5" fill="#0F0F0F"/></svg>`;
        stopBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          this.endAndResetTimer(qIdx, false);
        });

        controlsRow.appendChild(playPauseBtn);
        controlsRow.appendChild(stopBtn);
      }

      quadEl.appendChild(controlsRow);
    });
  }

  /**
   * Builds the Floating Dark Task Assignment Dropdown shown in Mockup 03-grid-timer.png:
   * - Top row: Solid black (#111111) with white "+ Custom Title... ⌄"
   * - Bottom rows: Crisp white (#FFFFFF) with Today's Card tasks (e.g. "Pick Up Package")
   */
  buildTaskDropdownDOM(quadrant, isAssigned) {
    const menu = document.createElement('div');
    menu.className = 'task-assign-dropdown';
    menu.addEventListener('click', (e) => e.stopPropagation());

    const customBtn = document.createElement('button');
    customBtn.type = 'button';
    customBtn.className = 'dropdown-custom-header';
    customBtn.innerHTML = `
      <span>+ Custom Title...</span>
      <svg width="14" height="9" viewBox="0 0 14 9" fill="none">
        <path d="M1.5 1.5L7 7L12.5 1.5" stroke="#FFFFFF" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
    `;
    customBtn.addEventListener('click', () => {
      this.openCustomTitleModal(quadrant);
    });
    menu.appendChild(customBtn);

    const listBody = document.createElement('div');
    listBody.className = 'dropdown-task-list';

    // Show unassigned tasks first (so "Pick Up Package" is right at the top matching 03-grid-timer.png),
    // followed by other tasks from Today's Card
    const sortedTasks = [...this.state.tasks].sort((a, b) => {
      const aFree = a.assignedQuadrant === null ? 0 : 1;
      const bFree = b.assignedQuadrant === null ? 0 : 1;
      if (aFree !== bFree) return aFree - bFree;
      return a.orderIndex - b.orderIndex;
    });

    sortedTasks.forEach((t) => {
      const itemBtn = document.createElement('button');
      itemBtn.type = 'button';
      itemBtn.className = 'dropdown-task-item';
      itemBtn.textContent = t.title;
      itemBtn.addEventListener('click', () => {
        this.assignTaskToQuadrant(quadrant, t);
      });
      listBody.appendChild(itemBtn);
    });

    if (isAssigned) {
      const clearBtn = document.createElement('button');
      clearBtn.type = 'button';
      clearBtn.className = 'dropdown-task-item dropdown-clear-item';
      clearBtn.textContent = 'Clear Assignment';
      clearBtn.addEventListener('click', () => {
        this.clearQuadrantAssignment(quadrant);
      });
      listBody.appendChild(clearBtn);
    }

    menu.appendChild(listBody);
    return menu;
  }

  /**
   * Renders Screen 3: Single Big Hero Tomato View (Mockup 02-hero-timer.png)
   */
  renderHeroScreen() {
    const slot =
      this.state.timers[this.state.selectedQuadrant] || this.state.timers[0];

    // 1. Huge Tabular Digital Readout ("02:30")
    this.els.heroReadout.textContent = OdometerDialPhysics.formatMockupReadout(
      slot.remainingSeconds
    );

    // 2. Subtitle ("01 / MATH STUDY")
    if (slot.assignedTaskId || slot.customTitle) {
      const orderStr = String(slot.assignedTaskOrder || slot.quadrant + 1).padStart(
        2,
        '0'
      );
      const titleStr = (slot.customTitle || 'FOCUS SESSION').toUpperCase();
      this.els.heroSubtitle.textContent = `${orderStr} / ${titleStr}`;
    } else {
      const orderStr = String(slot.quadrant + 1).padStart(2, '0');
      this.els.heroSubtitle.textContent = `${orderStr} / TAP TO ASSIGN`;
    }

    // 3. Update 3D Sculpted Heirloom Tomato & Equatorial Odometer Shader/Canvas
    const isAssigned = Boolean(slot.assignedTaskId || slot.customTitle);
    if (this.hero3D) {
      this.hero3D.resize();
      this.hero3D.updateOdometer(
        slot.angleDegrees,
        slot.quadrant,
        isAssigned
      );
    }

    // 4. Update Play/Pause icon & Stopwatch icon in Bottom Control Bar
    this.els.heroBtnPlayPause.innerHTML =
      slot.runState === 'running'
        ? `<svg width="36" height="44" viewBox="0 0 36 44"><rect x="4" y="2" width="10" height="40" rx="3" fill="#0F0F0F"/><rect x="22" y="2" width="10" height="40" rx="3" fill="#0F0F0F"/></svg>`
        : `<svg width="36" height="44" viewBox="0 0 36 44"><path d="M6 3 L33 22 L6 41 Z" fill="#0F0F0F" stroke="#0F0F0F" stroke-width="2" stroke-linejoin="round"/></svg>`;

    this.els.heroBtnStopwatch.classList.toggle(
      'stopwatch-active',
      slot.mode === 'stopwatch'
    );
  }

  // =========================================================================
  // MODALS FOR ADDING / EDITING TASKS & CUSTOM TIMER TITLES
  // =========================================================================

  openAddTaskModal() {
    if (this.state.tasks.length >= 6) {
      this.showNotificationBanner('Maximum 6 tasks per Daily Card reached.');
      return;
    }
    this.openInputModal('Add Task to Today’s Card', '', (val) => {
      if (!val.trim()) return;
      const newOrder = this.state.tasks.length + 1;
      this.state.tasks.push({
        id: 'task-' + Date.now(),
        orderIndex: newOrder,
        title: val.trim(),
        isCompleted: false,
        assignedQuadrant: null,
      });
      this.sensory.playMechanicalTick();
      this.saveState();
      this.renderAll();
    });
  }

  openEditTaskModal(task) {
    this.openInputModal(
      `Edit Task ${String(task.orderIndex).padStart(2, '0')} (Leave empty to delete)`,
      task.title,
      (val) => {
        if (!val.trim()) {
          // Confirm permanent deletion with notification banner per PRD v4
          this.confirmPermanentDeleteTask(task);
          return;
        }
        task.title = val.trim();
        for (const s of this.state.timers) {
          if (s.assignedTaskId === task.id) {
            s.customTitle = task.title;
          }
        }
        this.saveState();
        this.renderAll();
      }
    );
  }

  confirmPermanentDeleteTask(task) {
    this.els.deleteModalOverlay.classList.remove('hidden');
    const onCancel = () => {
      this.els.deleteModalOverlay.classList.add('hidden');
      cleanup();
    };
    const onConfirm = () => {
      this.els.deleteModalOverlay.classList.add('hidden');
      cleanup();
      // Remove from card and clear any timer assignment
      this.state.tasks = this.state.tasks.filter((t) => t.id !== task.id);
      this.state.tasks.forEach((t, i) => {
        t.orderIndex = i + 1;
      });
      for (const s of this.state.timers) {
        if (s.assignedTaskId === task.id) {
          s.assignedTaskId = null;
          s.assignedTaskOrder = null;
          s.customTitle = null;
        }
      }
      this.saveState();
      this.renderAll();
      this.showNotificationBanner('Item permanently deleted');
    };
    const cleanup = () => {
      this.els.deleteModalCancel.removeEventListener('click', onCancel);
      this.els.deleteModalConfirm.removeEventListener('click', onConfirm);
    };
    this.els.deleteModalCancel.addEventListener('click', onCancel);
    this.els.deleteModalConfirm.addEventListener('click', onConfirm);
  }

  openCustomTitleModal(quadrant) {
    const current = this.state.timers[quadrant]?.customTitle || '';
    this.openInputModal('Assign Custom Timer Title', current, (val) => {
      if (!val.trim()) return;
      this.assignCustomTitleToQuadrant(quadrant, val.trim());
    });
  }

  openInputModal(title, initialValue, onSave) {
    this.els.modalTitle.textContent = title;
    this.els.modalInput.value = initialValue;
    this.els.modalOverlay.classList.remove('hidden');
    setTimeout(() => this.els.modalInput.focus(), 30);

    const close = () => {
      this.els.modalOverlay.classList.add('hidden');
      cleanup();
    };
    const confirm = () => {
      const val = this.els.modalInput.value;
      close();
      onSave(val);
    };
    const onKey = (e) => {
      if (e.key === 'Enter') confirm();
      if (e.key === 'Escape') close();
    };
    const cleanup = () => {
      this.els.modalCancel.removeEventListener('click', close);
      this.els.modalConfirm.removeEventListener('click', confirm);
      this.els.modalInput.removeEventListener('keydown', onKey);
    };

    this.els.modalCancel.addEventListener('click', close);
    this.els.modalConfirm.addEventListener('click', confirm);
    this.els.modalInput.addEventListener('keydown', onKey);
  }

  showTelemetryToast(msg) {
    if (!this.els.toastPill) return;
    this.els.toastPill.textContent = msg;
    this.els.toastPill.classList.add('visible');
    clearTimeout(this._toastTimer);
    this._toastTimer = setTimeout(() => {
      this.els.toastPill.classList.remove('visible');
    }, 1800);
  }

  showNotificationBanner(msg) {
    if (!this.els.notificationBanner) return;
    this.els.notificationBanner.textContent = msg;
    this.els.notificationBanner.classList.add('visible');
    clearTimeout(this._bannerTimer);
    this._bannerTimer = setTimeout(() => {
      this.els.notificationBanner.classList.remove('visible');
    }, 3200);
  }
}

window.addEventListener('DOMContentLoaded', () => {
  window.fableFlowApp = new FableFlowApp();
});

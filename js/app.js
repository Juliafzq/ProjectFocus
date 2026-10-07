/**
 * Fable / Flow — Phase 1 Beta ("Core Tactile Loop") Application Controller
 *
 * Implements all PRD v4 & User Feedback requirements:
 * 1. Exact Photorealistic Mockup Tomatoes extracted from 02-hero-timer.png, 03-grid-timer.png, 04-card-front.png.
 * 2. 6-Tomato Grid (2x3 layout) matching the 6 tasks on Today's Card.
 * 3. Clicking any lit-up (assigned) tomato unassigns it and returns it to Matte Neutral Grey ("Tap to assign").
 * 4. On the tomato body, only the first few words are shown (`formatShortTomatoTitle`) so text never overflows.
 * 5. In Stopwatch Mode, the tomato turns ON THE MINUTES, NOT SECONDS (`stopwatchSecondsToMinuteAngleDegrees`).
 * 6. Visually exact straight horizontal dry-graphite pencil strikethrough across the center of completed tasks.
 */

import { OdometerDialPhysics } from './odometerPhysics.js';
import { CardGestureMath } from './cardGestureMath.js';
import { SensoryEngine } from './sensoryEngine.js';
import { HeroTomato3DView, GridTomatoRenderer } from './tomato3D.js';

const STORAGE_KEY = 'fable_flow_phase1_beta_v2';
const NUM_GRID_SLOTS = 6;

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
      openDropdownQuadrant: 2, // Mockup 03-grid-timer.png shows dropdown open on Slot 2 initially
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
        {
          quadrant: 4,
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
          quadrant: 5,
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
        if (
          parsed &&
          Array.isArray(parsed.tasks) &&
          Array.isArray(parsed.timers) &&
          parsed.timers.length === NUM_GRID_SLOTS
        ) {
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
    this.showNotificationBanner('Restored UI Mockup default state (Tuesday — Oct 06).');
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
            // Stopwatch turns on the minutes, NOT seconds
            slot.angleDegrees = OdometerDialPhysics.stopwatchSecondsToMinuteAngleDegrees(
              slot.remainingSeconds
            );
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
        document.getElementById('grid-quad-4'),
        document.getElementById('grid-quad-5'),
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

      demoBtnCard: document.getElementById('demo-view-card'),
      demoBtnGrid: document.getElementById('demo-view-grid'),
      demoBtnHero: document.getElementById('demo-view-hero'),
      demoBtnSilent: document.getElementById('demo-toggle-silent'),
      demoBtnReset: document.getElementById('demo-reset-state'),

      modalOverlay: document.getElementById('modal-overlay'),
      modalTitle: document.getElementById('modal-title'),
      modalInput: document.getElementById('modal-input'),
      modalCancel: document.getElementById('modal-cancel'),
      modalConfirm: document.getElementById('modal-confirm'),

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
      this.showNotificationBanner('Profile & Settings Sheet (Phase 1 Beta — Local-First Mode Active)');
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

    // Close open grid dropdown when clicking outside
    document.addEventListener('click', (e) => {
      if (
        this.state.openDropdownQuadrant !== null &&
        !e.target.closest('.task-assign-dropdown') &&
        !e.target.closest('.grid-tomato-wrap')
      ) {
        this.state.openDropdownQuadrant = null;
        if (this.state.activePillar === 'timer' && this.state.timerSubMode === 'grid') {
          this.renderGridScreen();
        }
      }
    });

    // 3. Card Surface Right -> Left Flip Gesture Detector (deltaX < -40px, ±35°)
    this.bindCardSurfaceFlipGesture();

    // 4. Hero Tomato 3D Dial Horizontal Drag Gesture (Right->Left winds up, Left->Right unwinds)
    this.bindHeroDialDragGesture();

    // 5. Hero Bottom Bar Controls: [Grid] [Play/Pause] [End/Stop] [Stopwatch]
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

    this.els.heroSubtitle.addEventListener('click', () => {
      this.state.timerSubMode = 'grid';
      this.state.openDropdownQuadrant = this.state.selectedQuadrant;
      this.saveState();
      this.renderAll();
    });

    // 6. Demo / Evaluation Toolbar Buttons
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

  bindCardSurfaceFlipGesture() {
    let startX = null;
    let startY = null;

    this.els.card3DWrapper.addEventListener('pointerdown', (e) => {
      startX = e.clientX;
      startY = e.clientY;
    });

    this.els.card3DWrapper.addEventListener('pointerup', (e) => {
      if (startX === null || startY === null) return;
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      startX = null;
      startY = null;

      const classification = CardGestureMath.classifyGesture(dx, dy, false);
      if (classification === 'flipCard') {
        this.triggerCardFlip();
      }
    });
  }

  triggerCardFlip() {
    this.state.isCardFlipped = !this.state.isCardFlipped;
    this.sensory.playCardFlipSwoosh();
    this.saveState();
    this.renderCardScreen();
  }

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
  // TIMER COORDINATOR LOGIC (1-Active-Timer + Stopwatch Turns on Minutes)
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
              this.endAndResetTimer(slot.quadrant, true);
              this.showNotificationBanner(
                `Pomodoro completed for "${(slot.customTitle || 'Timer').toUpperCase()}"! Dial reset to 00:00.`
              );
            }
          }
        } else {
          // Stopwatch Mode: count up seconds, but turn the tomato dial ONLY ON THE MINUTES!
          const prevWholeMinutes = Math.floor(slot.remainingSeconds / 60);
          slot.remainingSeconds += 1;
          const newWholeMinutes = Math.floor(slot.remainingSeconds / 60);
          slot.angleDegrees = OdometerDialPhysics.stopwatchSecondsToMinuteAngleDegrees(
            slot.remainingSeconds
          );
          if (newWholeMinutes > prevWholeMinutes) {
            this.sensory.playDialRatchetNotch(true);
          }
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

  togglePlayPause(quadrant) {
    const slot = this.state.timers[quadrant];
    if (!slot) return;

    if (slot.runState === 'running') {
      slot.runState = 'paused';
      slot.lastTickTimestamp = null;
      this.sensory.playMechanicalTick();
    } else {
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
      this.showTelemetryToast('Stopwatch Mode active (Tomato turns on minutes)');
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

    // If this task was already assigned to another quadrant, unassign that old quadrant first
    if (
      task.assignedQuadrant !== null &&
      task.assignedQuadrant !== undefined &&
      task.assignedQuadrant !== quadrant
    ) {
      this.clearQuadrantAssignment(task.assignedQuadrant);
    }

    // Clear any previous task pointing to this quadrant
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

  /**
   * Unassigns a lit-up tomato and returns it immediately to Matte Neutral Grey ("Tap to assign").
   */
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
    this.sensory.playDialRatchetNotch(false);
    this.showTelemetryToast('Tomato unassigned (returned to grey)');
    this.saveState();
    this.renderAll();
  }

  /**
   * Clicking a task's right-side tomato icon on Today's Card:
   * - If the tomato is ALREADY LIT UP (assigned), clicking it UNASSIGNS the tomato (returns it to grey)!
   * - If the tomato is GREY (unassigned), clicking it assigns the task to the next free slot (lighting it up)!
   */
  handleCardTaskTomatoClick(task) {
    if (task.assignedQuadrant !== null && task.assignedQuadrant !== undefined) {
      this.clearQuadrantAssignment(task.assignedQuadrant);
      return;
    }

    const freeSlot = this.state.timers.find(
      (s) => !s.assignedTaskId && !s.customTitle
    );
    const targetQuad = freeSlot ? freeSlot.quadrant : 0;
    this.assignTaskToQuadrant(targetQuad, task);
  }

  // =========================================================================
  // RENDERING: ALL 3 MOCKUP SCREENS
  // =========================================================================

  renderAll() {
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
      titleSpan.title =
        'Drag Left → Right to cross out with graphite pencil, or double-click to edit';
      titleSpan.addEventListener('dblclick', () => this.openEditTaskModal(task));

      // Visually Exact Straight Horizontal Graphite Strikethrough Canvas (2x Retina: 524x32 for 262x16 CSS)
      const strikeCanvas = document.createElement('canvas');
      strikeCanvas.className = 'pencil-strike-canvas';
      strikeCanvas.width = 524;
      strikeCanvas.height = 32;

      // Right-aligned Photorealistic Mini-Tomato Button (extracted from 04-card-front.png)
      const tomatoBtn = document.createElement('button');
      tomatoBtn.className = 'task-tomato-btn';
      tomatoBtn.type = 'button';
      const isLit =
        task.assignedQuadrant !== null && task.assignedQuadrant !== undefined;
      tomatoBtn.title = isLit
        ? 'Click lit-up tomato to unassign (return to grey)'
        : 'Click grey tomato to assign to a Pomodoro timer';

      const miniImg = document.createElement('img');
      miniImg.className = 'task-mini-tomato-img';
      miniImg.src = this.gridRenderer.getMiniDataURL(
        isLit ? task.assignedQuadrant : 'unassigned'
      );
      miniImg.alt = isLit ? 'Assigned Tomato' : 'Unassigned Grey Tomato';
      tomatoBtn.appendChild(miniImg);

      tomatoBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.handleCardTaskTomatoClick(task);
      });

      row.appendChild(numSpan);
      row.appendChild(titleSpan);
      row.appendChild(strikeCanvas);
      row.appendChild(tomatoBtn);

      container.appendChild(row);

      requestAnimationFrame(() => {
        this.drawGraphiteStroke(strikeCanvas, task.isCompleted ? 1.0 : 0.0);
      });

      this.bindTaskRowPencilGesture(row, task, strikeCanvas);
    });

    if (this.state.tasks.length < 6) {
      this.els.addItemRow.classList.remove('hidden');
    } else {
      this.els.addItemRow.classList.add('hidden');
    }
  }

  /**
   * Draws a straight horizontal dry-graphite pencil strikethrough right across the middle
   * of the task row ("02 Build Deck"), matching Mockup 04-card-front.png pixel-for-pixel.
   */
  drawGraphiteStroke(canvas, progress) {
    const ctx = canvas.getContext('2d');
    const W = canvas.width; // 524
    const H = canvas.height; // 32
    ctx.clearRect(0, 0, W, H);
    if (progress <= 0.01) return;

    const startX = 2;
    const maxEndX = W - 6;
    const currentEndX = startX + (maxEndX - startX) * Math.min(progress, 1.0);
    const centerY = H * 0.5; // Dead-center vertically (y = 16)

    ctx.save();

    // 1. Core horizontal graphite shaft (tapers softly in the rightmost 22% like 04-card-front.png)
    const grad = ctx.createLinearGradient(startX, centerY, currentEndX, centerY);
    grad.addColorStop(0.0, 'rgba(65, 63, 60, 0.88)');
    grad.addColorStop(0.68, 'rgba(72, 70, 66, 0.82)');
    grad.addColorStop(0.88, 'rgba(110, 108, 104, 0.58)');
    grad.addColorStop(1.0, 'rgba(150, 148, 144, 0.12)');

    ctx.strokeStyle = grad;
    ctx.lineWidth = 4.6; // ~2.3px at 1x CSS
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(startX, centerY);
    ctx.lineTo(currentEndX, centerY);
    ctx.stroke();

    // 2. Dry charcoal / cotton-paper tooth speckles along the horizontal stroke
    const span = currentEndX - startX;
    const numGrains = Math.floor(span * 1.6);
    for (let i = 0; i < numGrains; i++) {
      const t = i / Math.max(1, numGrains);
      const gx = startX + t * span;
      // Deterministic dry-pencil grain distribution
      const hash1 = Math.sin(i * 12.9898 + 4.1) * 43758.5453;
      const frac1 = hash1 - Math.floor(hash1);
      const hash2 = Math.cos(i * 78.233 + 1.7) * 24634.6345;
      const frac2 = hash2 - Math.floor(hash2);

      const offsetY = (frac1 - 0.5) * 6.8;
      // Fade out grain density near the far-right tail
      const tailFade = t > 0.72 ? (1.0 - (t - 0.72) / 0.28) * 0.85 : 1.0;
      const alpha = (0.22 + 0.36 * frac2) * tailFade;

      ctx.fillStyle = `rgba(58, 56, 53, ${alpha.toFixed(3)})`;
      ctx.fillRect(gx, centerY + offsetY - 0.9, 2.2, 1.8);
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
        this.drawGraphiteStroke(strikeCanvas, task.isCompleted ? 1.0 : 0.0);
      }
    };

    rowEl.addEventListener('pointerup', finishGesture);
    rowEl.addEventListener('pointercancel', finishGesture);
  }

  /**
   * Renders Screen 2: 6-Pomodoro 2x3 Grid View (Mockup 03-grid-timer.png + 6 Tomatoes)
   */
  renderGridScreen() {
    this.state.timers.forEach((slot, qIdx) => {
      const quadEl = this.els.gridQuadrants[qIdx];
      if (!quadEl) return;

      const isAssigned = Boolean(slot.assignedTaskId || slot.customTitle);
      const paletteKey = isAssigned ? qIdx : 'unassigned';
      const imgDataUrl = this.gridRenderer.getDataURL(paletteKey);

      const readoutText = OdometerDialPhysics.formatMockupReadout(
        slot.remainingSeconds
      );
      // Only show first few words on the tomato so text never overflows!
      const shortTitleText = OdometerDialPhysics.formatShortTomatoTitle(
        slot.customTitle || '',
        2,
        13
      );
      const isDropdownOpen = this.state.openDropdownQuadrant === qIdx;

      quadEl.innerHTML = '';

      const tomatoWrap = document.createElement('div');
      tomatoWrap.className = 'grid-tomato-wrap';

      const img = document.createElement('img');
      img.className = 'grid-tomato-img';
      img.src = imgDataUrl;
      img.alt = isAssigned
        ? `${shortTitleText} Tomato Timer`
        : 'Unassigned Tomato Timer';
      tomatoWrap.appendChild(img);

      const overlay = document.createElement('div');
      overlay.className = 'grid-tomato-overlay';

      if (isAssigned) {
        tomatoWrap.title = 'Click lit-up tomato to unassign (return to grey), or click time to open Hero dial';

        const titleEl = document.createElement('div');
        titleEl.className = 'grid-tomato-title';
        titleEl.textContent = shortTitleText;

        const timeEl = document.createElement('div');
        timeEl.className = 'grid-tomato-time';
        timeEl.textContent = readoutText;
        timeEl.title = 'Open Single Hero Tomato Dial';
        // Clicking the digital time readout opens the Single Hero Tomato view
        timeEl.addEventListener('click', (e) => {
          e.stopPropagation();
          this.state.selectedQuadrant = qIdx;
          this.state.timerSubMode = 'hero';
          this.saveState();
          this.renderAll();
        });

        overlay.appendChild(titleEl);
        overlay.appendChild(timeEl);

        // Clicking a lit-up tomato body unassigns the tomato (returns to grey)!
        tomatoWrap.addEventListener('click', (e) => {
          e.stopPropagation();
          this.clearQuadrantAssignment(qIdx);
        });
      } else {
        tomatoWrap.title = 'Tap to assign a task to this tomato';
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

      if (isDropdownOpen) {
        const dropdown = this.buildTaskDropdownDOM(qIdx);
        tomatoWrap.appendChild(dropdown);
      }

      quadEl.appendChild(tomatoWrap);

      // Inline Play/Pause + Stop/End Controls below Assigned Tomatoes
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
            ? `<svg width="20" height="24" viewBox="0 0 24 28"><rect x="3" y="2" width="6.5" height="24" rx="1.5" fill="#0F0F0F"/><rect x="14.5" y="2" width="6.5" height="24" rx="1.5" fill="#0F0F0F"/></svg>`
            : `<svg width="20" height="24" viewBox="0 0 24 28"><path d="M4 2.5 L22 14 L4 25.5 Z" fill="#0F0F0F" stroke="#0F0F0F" stroke-width="1.5" stroke-linejoin="round"/></svg>`;
        playPauseBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          this.togglePlayPause(qIdx);
        });

        const stopBtn = document.createElement('button');
        stopBtn.type = 'button';
        stopBtn.className = 'grid-ctrl-btn';
        stopBtn.setAttribute('aria-label', 'End and Reset Timer');
        stopBtn.innerHTML = `<svg width="20" height="20" viewBox="0 0 24 24"><rect x="2" y="2" width="20" height="20" rx="2.5" fill="#0F0F0F"/></svg>`;
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

  buildTaskDropdownDOM(quadrant) {
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

    menu.appendChild(listBody);
    return menu;
  }

  /**
   * Renders Screen 3: Single Big Hero Tomato View (Mockup 02-hero-timer.png)
   */
  renderHeroScreen() {
    const slot =
      this.state.timers[this.state.selectedQuadrant] || this.state.timers[0];

    this.els.heroReadout.textContent = OdometerDialPhysics.formatMockupReadout(
      slot.remainingSeconds
    );

    if (slot.assignedTaskId || slot.customTitle) {
      const orderStr = String(slot.assignedTaskOrder || slot.quadrant + 1).padStart(
        2,
        '0'
      );
      const shortTitle = OdometerDialPhysics.formatShortTomatoTitle(
        slot.customTitle || 'FOCUS SESSION',
        4,
        22
      );
      this.els.heroSubtitle.textContent = `${orderStr} / ${shortTitle}`;
    } else {
      const orderStr = String(slot.quadrant + 1).padStart(2, '0');
      this.els.heroSubtitle.textContent = `${orderStr} / TAP TO ASSIGN`;
    }

    const isAssigned = Boolean(slot.assignedTaskId || slot.customTitle);
    if (this.hero3D) {
      this.hero3D.updateOdometer(slot.angleDegrees, slot.quadrant, isAssigned);
    }

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

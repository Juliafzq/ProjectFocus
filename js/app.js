/**
 * Fable / Flow — Phase 1 & Phase 2 Complete MVP Application Controller
 *
 * Implements all PRD v4.2, Phase 1 ("Core Tactile Loop") & Phase 2 ("Complete Daily Ritual & Memory Archive") requirements:
 * 1. Minimalist 2-Object Homepage (01-home-page.png): Wide-tracked 'FABLE / FLOW' header, exact 334x222 '06 OCT' mini-card, 3D Tomato.
 * 2. Photorealistic Hero Tomato 3D Dial (02-hero-timer.png) & 6-Tomato 2x3 Grid (03-grid-timer.png):
 *    - 1-minute notch snap, HH:MM:SS when > 60 min, Tap-on-Digits inline time editor (0-180 min / HH:MM).
 *    - Mirror-polished silver metallic completion state (End -> Silver -> Reset ↺).
 *    - Authentic mechanical 2-strike Pomodoro bell ring + WebAudio tactile foley.
 * 3. Dual-Sided Today's Index Card:
 *    - Clean White Front (04-card-front.png) with up to 6 tasks, glossy single-highlight mini tomatoes,
 *      adaptive task font size (24px -> 18px floor) + word/character cap (max 6 words / 36 chars),
 *      and multi-line Left -> Right dry-graphite pencil strikethrough & erase that crosses out EVERY wrapped line.
 *    - Two-way 3D Card Flip gesture (both Right -> Left and Left -> Right swipes flip the card on Front and Back).
 *    - Matte Black Back (05-card-back.png) Evening Reflection Journal with 100% user-authored adaptive
 *      typography (21px -> 13px floor + word/char cap) and 0-2 framed photo slots with client-side <= 1600px compression.
 * 4. Chronological Card Stack Viewer (06-stack-detail.png):
 *    - Horizontal date strip ('OCT 01 02 03 04 (05) 06'), interactive horizontal drag/swipe & wheel/trackpad scrolling
 *      through the stack, cardstock riffle ticks, full retroactive editing of Front & Back, and 4-icon bottom bar.
 * 5. Monthly Calendar Zoom-Out View (07-calendar-view.png) & 5:00 AM Daily Rollover Engine.
 */

import { OdometerDialPhysics } from './odometerPhysics.js?v=20261009_v18';
import { CardGestureMath } from './cardGestureMath.js?v=20261009_v18';
import { SensoryEngine } from './sensoryEngine.js?v=20261009_v18';
import { HeroTomato3DView, GridTomatoRenderer } from './tomato3D.js?v=20261009_v18';

const STORAGE_KEY = 'fable_flow_phase2_mvp_v3';
const NUM_GRID_SLOTS = 6;

const MAX_TASK_WORDS = 18;
const MAX_TASK_CHARS = 110;
const MAX_REFLECTION_WORDS = 95;
const MAX_REFLECTION_CHARS = 520;

export class FableFlowApp {
  constructor() {
    this.sensory = new SensoryEngine();
    // User #2: Keep hardware haptics active without showing debug "Haptic: ..." telemetry toasts
    this.sensory.onHapticPulse = null;

    this.state = this.loadInitialState();
    this.sensory.isSilentMode = Boolean(this.state.isSilentMode);
    this.hero3D = null;
    this.gridRenderer = null;
    this.tickInterval = null;
    this._photoUploadTarget = 'today'; // 'today' | 'stack'
    this._photoReplaceIndex = null;
    this._todayFlipDeg = this.state.isCardFlipped ? -180 : 0;
    this._stackFlipDeg = this.state.isStackCardFlipped ? -180 : 0;
    this._lastStackWheelTime = 0;

    this.initDOM();
    this.init3DRenderers();
    this.bindGlobalEvents();
    this.startWallClockTicker();
    this.renderAll();
    this.initFirstTimeOnboarding();
  }

  getCurrentLogicalDateString(resetHour = 5) {
    const hr = typeof resetHour === 'number' ? resetHour : 5;
    const shifted = new Date(Date.now() - hr * 3600 * 1000);
    const y = shifted.getFullYear();
    const m = String(shifted.getMonth() + 1).padStart(2, '0');
    const d = String(shifted.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  getDefaultArchiveCards() {
    return {};
  }

  getDefaultState() {
    return {
      activePillar: 'card', // 'home' | 'card' | 'timer' | 'stack' | 'calendar'
      timerSubMode: 'grid', // 'grid' | 'hero'
      selectedQuadrant: 0,
      openDropdownQuadrant: null,
      isHeroDropdownOpen: false,
      isCardFlipped: false,
      isStackCardFlipped: false,
      selectedStackDateKey: null,
      cardDateKey: '2026-10-06',
      cardHeaderDate: 'TUESDAY — OCT 06',
      cardShortDate: '06 OCT',
      dailyResetHour: 5,
      isSilentMode: false,
      hasCompletedOnboarding: false,
      seenPageHints: {},
      lastRolloverLogicalDate: this.getCurrentLogicalDateString(5),
      reflectionText: '',
      reflectionPhotos: [],
      archiveCards: this.getDefaultArchiveCards(),
      tasks: [
        {
          id: 'task-1',
          orderIndex: 1,
          title: 'Example Task',
          isCompleted: false,
          assignedQuadrant: null,
        },
      ],
      timers: [
        {
          quadrant: 0,
          assignedTaskId: null,
          assignedTaskOrder: null,
          customTitle: null,
          mode: 'countdown', // 'countdown' | 'stopwatch'
          runState: 'idle', // 'idle' | 'running' | 'paused' | 'completed'
          configuredMinutes: 25,
          remainingSeconds: 25 * 60,
          angleDegrees: 25 * 6.0, // 150°
          lastTickTimestamp: null,
        },
        {
          quadrant: 1,
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
      [
        'fable_flow_phase1_beta_v1',
        'fable_flow_phase1_beta_v2',
        'fable_flow_phase1_beta_v3',
        'fable_flow_phase1_beta_v4',
        'fable_flow_phase2_mvp_v1',
        'fable_flow_phase2_mvp_v2',
      ].forEach((k) => localStorage.removeItem(k));
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (
          parsed &&
          Array.isArray(parsed.tasks) &&
          Array.isArray(parsed.timers) &&
          parsed.timers.length === NUM_GRID_SLOTS
        ) {
          if (!parsed.archiveCards || typeof parsed.archiveCards !== 'object') {
            parsed.archiveCards = this.getDefaultArchiveCards();
          }
          if (typeof parsed.reflectionText !== 'string') {
            parsed.reflectionText = '';
          }
          if (!Array.isArray(parsed.reflectionPhotos)) {
            parsed.reflectionPhotos = [];
          }
          if (!parsed.selectedStackDateKey) {
            parsed.selectedStackDateKey = null;
          }
          if (!parsed.cardShortDate) {
            parsed.cardShortDate = '06 OCT';
          }
          if (!parsed.cardDateKey) {
            parsed.cardDateKey = '2026-10-06';
          }
          if (typeof parsed.dailyResetHour !== 'number') {
            parsed.dailyResetHour = 5;
          }
          parsed.isSilentMode = Boolean(parsed.isSilentMode);
          parsed.hasCompletedOnboarding = Boolean(parsed.hasCompletedOnboarding);
          if (!parsed.seenPageHints || typeof parsed.seenPageHints !== 'object') {
            parsed.seenPageHints = {};
          }
          if (!parsed.lastRolloverLogicalDate) {
            parsed.lastRolloverLogicalDate = this.getCurrentLogicalDateString(
              parsed.dailyResetHour
            );
          }
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
    this._todayFlipDeg = 0;
    this._stackFlipDeg = 0;
    this.saveState();
    this.renderAll();
    this.showNotificationBanner('Restored clean default state with Example Task.');
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
              slot.runState = 'completed';
              slot.lastTickTimestamp = null;
            } else {
              slot.lastTickTimestamp = now;
            }
          } else {
            slot.remainingSeconds += elapsedSec;
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
      homeBrandTitle: document.getElementById('home-brand-title'),
      topSegmentedPill: document.getElementById('top-segmented-pill'),
      pillCardBtn: document.getElementById('pill-card-btn'),
      pillTimerBtn: document.getElementById('pill-timer-btn'),
      profileBtn: document.getElementById('profile-btn'),

      homeScreen: document.getElementById('screen-home'),
      homeMiniCard: document.getElementById('home-mini-card'),
      homeMiniDate: document.getElementById('home-mini-date'),
      homeTomatoBtn: document.getElementById('home-tomato-btn'),

      cardScreen: document.getElementById('screen-card'),
      gridScreen: document.getElementById('screen-grid'),
      heroScreen: document.getElementById('screen-hero'),
      stackScreen: document.getElementById('screen-stack'),
      calendarScreen: document.getElementById('screen-calendar'),

      card3DWrapper: document.getElementById('daily-card-3d'),
      cardDateHeader: document.getElementById('card-date-header'),
      cardBackDateHeader: document.getElementById('card-back-date-header'),
      taskListContainer: document.getElementById('task-list-container'),
      addItemRow: document.getElementById('add-item-row'),
      cardBackReflection: document.getElementById('card-back-reflection'),
      cardBackPhotos: document.getElementById('card-back-photos'),
      journalPhotoFileInput: document.getElementById('journal-photo-file-input'),

      cardStackBtn: document.getElementById('card-stack-btn'),
      cardFlipBtn: document.getElementById('card-flip-btn'),
      cardPlusBtn: document.getElementById('card-plus-btn'),

      gridQuadrants: [
        document.getElementById('grid-quad-0'),
        document.getElementById('grid-quad-1'),
        document.getElementById('grid-quad-2'),
        document.getElementById('grid-quad-3'),
        document.getElementById('grid-quad-4'),
        document.getElementById('grid-quad-5'),
      ],

      heroReadout: document.getElementById('hero-readout'),
      heroTimeEditor: document.getElementById('hero-time-editor'),
      heroTimeInput: document.getElementById('hero-time-input'),
      heroTimeUnitBadge: document.getElementById('hero-time-unit-badge'),
      heroTimeSetBtn: document.getElementById('hero-time-set-btn'),
      heroSubtitle: document.getElementById('hero-subtitle'),
      heroSubtitleDropdownMount: document.getElementById('hero-subtitle-dropdown-mount'),
      heroTomatoStage: document.getElementById('hero-tomato-stage'),
      heroBtnGrid: document.getElementById('hero-btn-grid'),
      heroBtnPlayPause: document.getElementById('hero-btn-playpause'),
      heroBtnStop: document.getElementById('hero-btn-stop'),
      heroBtnStopwatch: document.getElementById('hero-btn-stopwatch'),

      stackDateStrip: document.getElementById('stack-date-strip'),
      stackCarouselStage: document.getElementById('stack-carousel-stage'),
      stackPeekLeft: document.getElementById('stack-peek-left'),
      stackPeekRight: document.getElementById('stack-peek-right'),
      stackCard3D: document.getElementById('stack-card-3d'),
      stackCardDateHeader: document.getElementById('stack-card-date-header'),
      stackCardBackDateHeader: document.getElementById('stack-card-back-date-header'),
      stackTaskListContainer: document.getElementById('stack-task-list-container'),
      stackAddItemRow: document.getElementById('stack-add-item-row'),
      stackCardBackReflection: document.getElementById('stack-card-back-reflection'),
      stackCardBackPhotos: document.getElementById('stack-card-back-photos'),
      stackBtnReturn: document.getElementById('stack-btn-return'),
      stackBtnZoomout: document.getElementById('stack-btn-zoomout'),
      stackBtnFlip: document.getElementById('stack-btn-flip'),
      stackBtnTrash: document.getElementById('stack-btn-trash'),

      calendarMonthsContainer: document.getElementById('calendar-months-container'),
      calendarBtnReturn: document.getElementById('calendar-btn-return'),
      calendarBtnZoomin: document.getElementById('calendar-btn-zoomin'),

      toastPill: document.getElementById('telemetry-toast'),
      notificationBanner: document.getElementById('notification-banner'),

      demoBtnHome: document.getElementById('demo-view-home'),
      demoBtnCard: document.getElementById('demo-view-card'),
      demoBtnBack: document.getElementById('demo-view-back'),
      demoBtnGrid: document.getElementById('demo-view-grid'),
      demoBtnHero: document.getElementById('demo-view-hero'),
      demoBtnStack: document.getElementById('demo-view-stack'),
      demoBtnCalendar: document.getElementById('demo-view-calendar'),
      demoBtnSilent: document.getElementById('demo-toggle-silent'),
      demoBtnReset: document.getElementById('demo-reset-state'),

      modalOverlay: document.getElementById('modal-overlay'),
      modalTitle: document.getElementById('modal-title'),
      modalInput: document.getElementById('modal-input'),
      modalDelete: document.getElementById('modal-delete'),
      modalCancel: document.getElementById('modal-cancel'),
      modalConfirm: document.getElementById('modal-confirm'),

      deleteModalOverlay: document.getElementById('delete-modal-overlay'),
      deleteModalTitle: document.getElementById('delete-modal-title'),
      deleteModalDesc: document.getElementById('delete-modal-desc'),
      deleteModalCancel: document.getElementById('delete-modal-cancel'),
      deleteModalConfirm: document.getElementById('delete-modal-confirm'),

      profileModalOverlay: document.getElementById('profile-modal-overlay'),
      profileOpenHomeBtn: document.getElementById('profile-open-home-btn'),
      profileResetTimeSelect: document.getElementById('profile-reset-time-select'),
      profileToggleAudioBtn: document.getElementById('profile-toggle-audio-btn'),
      profileAudioStateLabel: document.getElementById('profile-audio-state-label'),
      profileSimulate5amBtn: document.getElementById('profile-simulate-5am-btn'),
      profileModalClose: document.getElementById('profile-modal-close'),

      onboardingOverlay: document.getElementById('onboarding-overlay'),
      onboardingDismissBtn: document.getElementById('onboarding-dismiss-btn'),
    };
  }

  init3DRenderers() {
    this.gridRenderer = new GridTomatoRenderer();
    this.hero3D = new HeroTomato3DView(this.els.heroTomatoStage);
    window.addEventListener('resize', () => {
      if (this.hero3D) this.hero3D.resize();
      if (this.state.activePillar === 'card') {
        this.fitUnifiedCardTaskTypography(this.els.taskListContainer, this.els.addItemRow);
        this.adjustReflectionTypography(this.els.cardBackReflection);
      } else if (this.state.activePillar === 'stack') {
        this.fitUnifiedCardTaskTypography(
          this.els.stackTaskListContainer,
          this.els.stackAddItemRow
        );
        this.adjustReflectionTypography(this.els.stackCardBackReflection);
      }
    });
  }

  bindGlobalEvents() {
    // 0. Minimalist 2-Object Homepage (01-home-page.png)
    if (this.els.homeMiniCard) {
      const openTodayCardFromHome = () => {
        this.sensory.playCardFlipSwoosh();
        this.state.activePillar = 'card';
        this.state.isCardFlipped = false;
        this._todayFlipDeg = 0;
        this.saveState();
        this.renderAll();
      };
      this.els.homeMiniCard.addEventListener('click', openTodayCardFromHome);
      this.els.homeMiniCard.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          openTodayCardFromHome();
        }
      });
    }

    if (this.els.homeTomatoBtn) {
      const openTimerFromHome = () => {
        this.sensory.playMechanicalTick();
        this.state.activePillar = 'timer';
        this.saveState();
        this.renderAll();
      };
      this.els.homeTomatoBtn.addEventListener('click', openTimerFromHome);
      this.els.homeTomatoBtn.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          openTimerFromHome();
        }
      });
    }

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

    // Minimal Profile Popover: Home, Reset Time, Sound On/Off
    this.els.profileBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (
        this.els.profileModalOverlay &&
        !this.els.profileModalOverlay.classList.contains('hidden')
      ) {
        this.els.profileModalOverlay.classList.add('hidden');
      } else {
        this.openProfileModal();
      }
    });

    if (this.els.profileModalOverlay) {
      this.els.profileModalOverlay.addEventListener('click', (e) => {
        if (!e.target.closest('.profile-popover-card')) {
          this.els.profileModalOverlay.classList.add('hidden');
        }
      });
    }
    if (this.els.profileModalClose) {
      this.els.profileModalClose.addEventListener('click', () => {
        this.els.profileModalOverlay.classList.add('hidden');
      });
    }
    if (this.els.profileOpenHomeBtn) {
      this.els.profileOpenHomeBtn.addEventListener('click', () => {
        this.els.profileModalOverlay.classList.add('hidden');
        this.state.activePillar = 'home';
        this.saveState();
        this.renderAll();
      });
    }
    if (this.els.profileResetTimeSelect) {
      this.els.profileResetTimeSelect.addEventListener('change', (e) => {
        const hourVal = Math.max(0, Math.min(23, parseInt(e.target.value, 10) || 0));
        this.state.dailyResetHour = hourVal;
        this.state.lastRolloverLogicalDate = this.getCurrentLogicalDateString(hourVal);
        this.saveState();
        const padded = String(hourVal).padStart(2, '0') + ':00';
        this.showTelemetryToast(`Daily reset time: ${padded}`);
      });
    }
    if (this.els.profileToggleAudioBtn) {
      this.els.profileToggleAudioBtn.addEventListener('click', () => {
        this.toggleSilentAudioMode();
        if (this.els.profileAudioStateLabel) {
          this.els.profileAudioStateLabel.textContent = this.sensory.isSilentMode ? 'Off' : 'On';
        }
      });
    }
    if (this.els.profileSimulate5amBtn) {
      this.els.profileSimulate5amBtn.addEventListener('click', () => {
        this.els.profileModalOverlay.classList.add('hidden');
        this.simulateFiveAmRollover();
      });
    }

    // 2. Card Bottom Action Bar: [Stack] [Flip] [+]
    this.els.cardStackBtn.addEventListener('click', () => {
      this.sensory.playStackRiffleTick();
      this.state.activePillar = 'stack';
      this.state.isStackCardFlipped = false;
      this._stackFlipDeg = 0;
      this.saveState();
      this.renderAll();
    });

    this.els.cardFlipBtn.addEventListener('click', () => {
      this.triggerCardFlip(-1);
    });

    this.els.cardPlusBtn.addEventListener('click', () => {
      if (this.state.isCardFlipped) {
        this.triggerPhotoAttachment('today');
      } else {
        this.openAddTaskModal();
      }
    });

    this.els.addItemRow.addEventListener('click', () => {
      if (this._justFinishedCardSwipe) return;
      this.openAddTaskModal();
    });

    // 2b. Matte Black Back of Card — Evening Reflection Journal & Photo Upload
    if (this.els.cardBackReflection) {
      this.els.cardBackReflection.addEventListener('input', () => {
        const clamped = this.clampReflectionInputText(this.els.cardBackReflection.value);
        if (this.els.cardBackReflection.value !== clamped) {
          this.els.cardBackReflection.value = clamped;
          this.showTelemetryToast('Reflection limit reached (keeps text away from card edges)');
        }
        this.state.reflectionText = this.els.cardBackReflection.value;
        this.adjustReflectionTypography(this.els.cardBackReflection);
        this.saveState();
      });
    }

    if (this.els.journalPhotoFileInput) {
      this.els.journalPhotoFileInput.addEventListener('change', async (e) => {
        const file = e.target.files && e.target.files[0];
        if (!file) return;
        try {
          const compressedDataUrl = await this.compressImageFileToDataURL(file, 1600);
          const repIdx = this._photoReplaceIndex;
          this._photoReplaceIndex = null;

          if (this._photoUploadTarget === 'stack') {
            const card = this.getSelectedStackCard();
            if (card) {
              if (!Array.isArray(card.reflectionPhotos)) card.reflectionPhotos = [];
              if (
                typeof repIdx === 'number' &&
                repIdx >= 0 &&
                repIdx < card.reflectionPhotos.length
              ) {
                card.reflectionPhotos[repIdx] = compressedDataUrl;
              } else if (card.reflectionPhotos.length < 2) {
                card.reflectionPhotos.push(compressedDataUrl);
              } else {
                card.reflectionPhotos[1] = compressedDataUrl;
              }
              this.saveState();
              this.renderStackScreen();
              this.showTelemetryToast('Photo updated on archived card');
            }
          } else {
            if (!Array.isArray(this.state.reflectionPhotos)) {
              this.state.reflectionPhotos = [];
            }
            if (
              typeof repIdx === 'number' &&
              repIdx >= 0 &&
              repIdx < this.state.reflectionPhotos.length
            ) {
              this.state.reflectionPhotos[repIdx] = compressedDataUrl;
            } else if (this.state.reflectionPhotos.length < 2) {
              this.state.reflectionPhotos.push(compressedDataUrl);
            } else {
              this.state.reflectionPhotos[1] = compressedDataUrl;
            }
            this.saveState();
            this.renderCardScreen();
            this.showTelemetryToast('Photo updated in Evening Journal');
          }
        } catch (_) {
          this.showNotificationBanner('Could not process selected image file.');
        } finally {
          this.els.journalPhotoFileInput.value = '';
        }
      });
    }

    // Close open grid or hero dropdown when clicking outside
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
      if (
        this.state.isHeroDropdownOpen &&
        !e.target.closest('.hero-subtitle-wrap')
      ) {
        this.state.isHeroDropdownOpen = false;
        if (this.state.activePillar === 'timer' && this.state.timerSubMode === 'hero') {
          this.renderHeroScreen();
        }
      }
    });

    // 3. Bidirectional Card Surface Flip Gesture Detector (flips both ways: Left->Right & Right->Left)
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
      this.handleEndOrResetButton(this.state.selectedQuadrant);
    });

    this.els.heroBtnStopwatch.addEventListener('click', () => {
      this.toggleStopwatchMode(this.state.selectedQuadrant);
    });

    // PM #4: Clicking the task subtitle on the Hero page opens the reassignment dropdown right on the Hero page
    this.els.heroSubtitle.addEventListener('click', (e) => {
      e.stopPropagation();
      this.cancelHeroTimeEditor();
      this.state.isHeroDropdownOpen = !this.state.isHeroDropdownOpen;
      this.saveState();
      this.renderHeroScreen();
    });

    // 5b. Tap-on-Digits Time Entry on Hero Readout (0–180 min or HH:MM)
    this.bindHeroReadoutTimeEntry();

    // 6. Chronological Card Stack Viewer Controls (Mockup 06-stack-detail.png)
    this.bindStackViewerEvents();

    // 7. Monthly Calendar Zoom-Out Controls (Mockup 07-calendar-view.png)
    this.bindCalendarViewerEvents();

    // 8. Demo / Evaluation Toolbar Buttons (All 7 Mockups)
    if (this.els.demoBtnHome) {
      this.els.demoBtnHome.addEventListener('click', () => {
        this.state.activePillar = 'home';
        this.saveState();
        this.renderAll();
      });
    }
    if (this.els.demoBtnCard) {
      this.els.demoBtnCard.addEventListener('click', () => {
        this.state.activePillar = 'card';
        this.state.isCardFlipped = false;
        this._todayFlipDeg = 0;
        this.saveState();
        this.renderAll();
      });
    }
    if (this.els.demoBtnBack) {
      this.els.demoBtnBack.addEventListener('click', () => {
        this.state.activePillar = 'card';
        this.state.isCardFlipped = true;
        this._todayFlipDeg = -180;
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
    if (this.els.demoBtnStack) {
      this.els.demoBtnStack.addEventListener('click', () => {
        this.state.activePillar = 'stack';
        this.state.isStackCardFlipped = false;
        this._stackFlipDeg = 0;
        this.saveState();
        this.renderAll();
      });
    }
    if (this.els.demoBtnCalendar) {
      this.els.demoBtnCalendar.addEventListener('click', () => {
        this.state.activePillar = 'calendar';
        this.saveState();
        this.renderAll();
      });
    }
    if (this.els.demoBtnSilent) {
      this.els.demoBtnSilent.addEventListener('click', () => {
        this.toggleSilentAudioMode();
      });
    }
    if (this.els.demoBtnReset) {
      this.els.demoBtnReset.addEventListener('click', () => {
        this.resetToMockupDefault();
      });
    }
  }

  toggleSilentAudioMode() {
    this.sensory.isSilentMode = !this.sensory.isSilentMode;
    this.state.isSilentMode = this.sensory.isSilentMode;
    this.saveState();
    if (this.els.demoBtnSilent) {
      this.els.demoBtnSilent.textContent = this.sensory.isSilentMode
        ? '🔇 Silent Mode: ON'
        : '🔊 Foley Audio: ON';
      this.els.demoBtnSilent.classList.toggle('active-pill', this.sensory.isSilentMode);
    }
    this.showTelemetryToast(
      this.sensory.isSilentMode ? 'Sound: Off' : 'Sound: On'
    );
  }

  openProfileModal() {
    if (!this.els.profileModalOverlay) return;
    if (this.els.profileAudioStateLabel) {
      this.els.profileAudioStateLabel.textContent = this.sensory.isSilentMode ? 'Off' : 'On';
    }
    if (this.els.profileResetTimeSelect) {
      const hr = typeof this.state.dailyResetHour === 'number' ? this.state.dailyResetHour : 5;
      this.els.profileResetTimeSelect.value = String(hr);
    }
    this.els.profileModalOverlay.classList.remove('hidden');
  }

  simulateFiveAmRollover() {
    const currentKey = this.state.cardDateKey || '2026-10-06';
    const dayMatch = currentKey.match(/^2026-10-(\d{2})$/);
    const currentDayNum = dayMatch ? parseInt(dayMatch[1], 10) : 6;

    this.state.archiveCards[currentKey] = {
      dateKey: currentKey,
      headerDate: this.state.cardHeaderDate,
      shortDate: this.state.cardShortDate,
      monthKey: '2026-10',
      dayNum: currentDayNum,
      tasks: this.state.tasks.map((t, idx) => ({
        id: `${currentKey}-task-${idx + 1}`,
        orderIndex: idx + 1,
        title: t.title,
        isCompleted: Boolean(t.isCompleted),
      })),
      reflectionText: this.state.reflectionText || '',
      reflectionPhotos: Array.isArray(this.state.reflectionPhotos)
        ? [...this.state.reflectionPhotos]
        : [],
    };

    const nextDayNum = Math.min(31, currentDayNum + 1);
    const nextDayPadded = String(nextDayNum).padStart(2, '0');
    const weekdays = [
      'WEDNESDAY',
      'THURSDAY',
      'FRIDAY',
      'SATURDAY',
      'SUNDAY',
      'MONDAY',
      'TUESDAY',
    ];
    const nextWeekday = weekdays[(nextDayNum - 7 + 70) % 7];

    this.state.selectedStackDateKey = currentKey;
    this.state.cardDateKey = `2026-10-${nextDayPadded}`;
    this.state.cardHeaderDate = `${nextWeekday} — OCT ${nextDayPadded}`;
    this.state.cardShortDate = `${nextDayPadded} OCT`;
    this.state.isCardFlipped = false;
    this._todayFlipDeg = 0;
    this.state.tasks = [
      {
        id: 'task-' + Date.now(),
        orderIndex: 1,
        title: 'Morning Focus Priority',
        isCompleted: false,
        assignedQuadrant: null,
      },
    ];
    this.state.reflectionText = '';
    this.state.reflectionPhotos = [];

    this.state.timers.forEach((s, idx) => {
      s.assignedTaskId = null;
      s.assignedTaskOrder = null;
      s.customTitle = null;
      s.runState = 'idle';
      s.mode = 'countdown';
      s.configuredMinutes = idx === 0 ? 25 : 0;
      s.remainingSeconds = idx === 0 ? 25 * 60 : 0;
      s.angleDegrees = idx === 0 ? 150 : 0;
      s.lastTickTimestamp = null;
    });

    this.sensory.playCardFlipSwoosh();
    this.saveState();
    this.renderAll();
    this.showNotificationBanner(
      `5:00 AM Rollover: Archived ${currentKey} to Stack & created fresh card for OCT ${nextDayPadded}.`
    );
  }

  // =========================================================================
  // ADAPTIVE TYPOGRAPHY, WORD/CHAR CAPS & PHOTO COMPRESSION (<= 1600px)
  // =========================================================================

  /**
   * Limits task input to at most MAX_TASK_WORDS (18 words) and MAX_TASK_CHARS (110 chars)
   * so users can enter full task descriptions while keeping card margins clean.
   */
  clampTaskInputText(rawText) {
    let text = String(rawText || '').replace(/\s+/g, ' ');
    const leadingTrimmed = text.trimStart();
    if (leadingTrimmed) {
      const words = leadingTrimmed.split(' ');
      if (words.length > MAX_TASK_WORDS) {
        text = words.slice(0, MAX_TASK_WORDS).join(' ');
      }
    }
    if (text.length > MAX_TASK_CHARS) {
      text = text.slice(0, MAX_TASK_CHARS);
    }
    return text;
  }

  /**
   * Returns the unified baseline task font size (24px).
   * Individual tasks NEVER shrink independently; `fitUnifiedCardTaskTypography()`
   * keeps all items on a card at the exact same unified font size (24px) and only
   * steps down uniformly if the whole vertical card page is filled.
   */
  computeTaskFontSizePx(title, totalTasksCount = 1) {
    return 24;
  }

  /**
   * Unifies the text size of EVERY item on a card (`.task-index`, `.task-title`, and `.add-item-row`)
   * to the exact same font size (`24px` default).
   * Does NOT decrease the font size unless the whole card page is vertically filled
   * (`bodyEl.scrollHeight > bodyEl.clientHeight + 2`). When the whole page is filled,
   * decreases the unified font size uniformly for all items on that card together down to a 16.5px floor.
   */
  fitUnifiedCardTaskTypography(containerEl, addItemEl) {
    if (!containerEl) return 24;
    const bodyEl =
      containerEl.closest('.card-dot-grid-body') ||
      containerEl.closest('.card-body-tasks') ||
      containerEl;
    const indexNodes = Array.from(containerEl.querySelectorAll('.task-index'));
    const titleNodes = Array.from(containerEl.querySelectorAll('.task-title'));
    const rowNodes = Array.from(containerEl.querySelectorAll('.task-row'));

    const applyUnifiedSize = (sizePx, padY) => {
      const sizeStr = `${sizePx}px`;
      indexNodes.forEach((el) => {
        el.style.fontSize = sizeStr;
      });
      titleNodes.forEach((el) => {
        el.style.fontSize = sizeStr;
      });
      if (addItemEl) {
        addItemEl.style.fontSize = sizeStr;
      }
      rowNodes.forEach((row) => {
        row.style.paddingTop = `${padY}px`;
        row.style.paddingBottom = `${padY}px`;
      });
    };

    let unifiedSize = 24.0;
    let unifiedPadY = 9;
    applyUnifiedSize(unifiedSize, unifiedPadY);

    // Only decrease the unified font size if the whole card page is actually filled
    if (bodyEl && bodyEl.clientHeight > 0) {
      while (bodyEl.scrollHeight > bodyEl.clientHeight + 2 && unifiedSize > 16.5) {
        unifiedSize = Math.max(16.5, Number((unifiedSize - 0.5).toFixed(1)));
        unifiedPadY = unifiedSize < 21.5 ? 6 : unifiedSize < 23.0 ? 7 : 8;
        applyUnifiedSize(unifiedSize, unifiedPadY);
      }
    }

    // Re-render every multi-line graphite strikethrough canvas to match the unified layout rects
    rowNodes.forEach((row) => {
      const canvas = row.querySelector('.pencil-strike-canvas');
      const isDone = row.dataset.completed === 'true';
      if (canvas) {
        this.drawGraphiteStroke(canvas, 0.0, isDone ? 1.0 : 0.0);
      }
    });

    return unifiedSize;
  }

  /**
   * Limits Evening Reflection text to MAX_REFLECTION_WORDS and MAX_REFLECTION_CHARS
   * so the reflection stops once the minimum font size floor is reached.
   */
  clampReflectionInputText(rawText) {
    let text = String(rawText || '');
    const words = text.trim().split(/\s+/).filter(Boolean);
    if (words.length > MAX_REFLECTION_WORDS) {
      text = words.slice(0, MAX_REFLECTION_WORDS).join(' ');
    }
    if (text.length > MAX_REFLECTION_CHARS) {
      text = text.slice(0, MAX_REFLECTION_CHARS);
    }
    return text;
  }

  /**
   * Keeps the Evening Reflection font size at a unified 21px unless the whole reflection
   * area is filled (`textareaEl.scrollHeight > textareaEl.clientHeight + 2`), then steps
   * down uniformly to a 13px minimum floor.
   */
  adjustReflectionTypography(textareaEl) {
    if (!textareaEl) return;
    const textLen = (textareaEl.value || '').length;
    let targetSize = 21;
    textareaEl.style.overflowY = 'hidden';
    textareaEl.style.fontSize = `${targetSize}px`;

    if (textareaEl.clientHeight > 0) {
      while (textareaEl.scrollHeight > textareaEl.clientHeight + 2 && targetSize > 13) {
        targetSize = Math.max(13, targetSize - 1);
        textareaEl.style.fontSize = `${targetSize}px`;
      }
    } else if (textLen > 315) {
      targetSize = 13;
      textareaEl.style.fontSize = `${targetSize}px`;
    }
  }

  triggerPhotoAttachment(target = 'today', replaceIndex = null) {
    this._photoUploadTarget = target;
    this._photoReplaceIndex = typeof replaceIndex === 'number' ? replaceIndex : null;
    if (this.els.journalPhotoFileInput) {
      this.els.journalPhotoFileInput.click();
    }
  }

  compressImageFileToDataURL(file, maxDimension = 1600) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(new Error('File read error'));
      reader.onload = () => {
        const img = new Image();
        img.onerror = () => reject(new Error('Image decode error'));
        img.onload = () => {
          let w = img.naturalWidth || img.width;
          let h = img.naturalHeight || img.height;
          if (w > maxDimension || h > maxDimension) {
            if (w >= h) {
              h = Math.round((h * maxDimension) / w);
              w = maxDimension;
            } else {
              w = Math.round((w * maxDimension) / h);
              h = maxDimension;
            }
          }
          const canvas = document.createElement('canvas');
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, w, h);
          resolve(canvas.toDataURL('image/jpeg', 0.86));
        };
        img.src = reader.result;
      };
      reader.readAsDataURL(file);
    });
  }

  /**
   * Bidirectional finger motion to flip BOTH Today's Card (`#daily-card-3d`) and
   * the Stack Card (`#stack-card-3d`) over both ways:
   * - Swiping Right -> Left (dx < -22px) flips the card leftwards (-180°).
   * - Swiping Left -> Right (dx > +22px) flips the card rightwards (+180°).
   * Uses `window`-level pointermove/pointerup/pointercancel listeners so the card
   * NEVER gets stuck mid-rotation even if the pointer leaves the narrowing 3D card!
   */
  bindCardSurfaceFlipGesture() {
    this.bindTwoWayCardFlipOnWrapper(this.els.card3DWrapper, false);
    this.bindTwoWayCardFlipOnWrapper(this.els.stackCard3D, true);
  }

  bindTwoWayCardFlipOnWrapper(wrapper, isStackCard = false) {
    if (!wrapper) return;

    let startX = null;
    let startY = null;
    let activePointerId = null;
    let isDraggingFlip = false;

    const getBaseDeg = () => (isStackCard ? this._stackFlipDeg : this._todayFlipDeg);
    const getIsFlipped = () =>
      isStackCard ? this.state.isStackCardFlipped : this.state.isCardFlipped;

    wrapper.addEventListener('pointerdown', (e) => {
      if (
        e.target.closest('.task-tomato-btn') ||
        e.target.closest('.journal-photo-remove-btn')
      ) {
        return;
      }
      startX = e.clientX;
      startY = e.clientY;
      activePointerId = e.pointerId;
      isDraggingFlip = false;
    });

    const onWindowPointerMove = (e) => {
      if (startX === null || startY === null) return;
      if (activePointerId !== null && e.pointerId !== activePointerId) return;

      const dx = e.clientX - startX;
      const dy = e.clientY - startY;

      if (!isDraggingFlip && Math.abs(dx) > 8 && Math.abs(dx) > Math.abs(dy) * 1.15) {
        isDraggingFlip = true;
        if (document.activeElement && document.activeElement.blur) {
          document.activeElement.blur();
        }
      }

      if (isDraggingFlip) {
        if (e.cancelable) e.preventDefault();
        const tiltOffset = Math.max(-65, Math.min(65, (dx / 180) * 65));
        const liveDeg = getBaseDeg() + tiltOffset;
        wrapper.style.transition = 'none';
        wrapper.style.transform = `rotateY(${liveDeg.toFixed(1)}deg)`;
      }
    };

    const endCardSwipe = (e) => {
      if (startX === null || startY === null) return;
      if (
        activePointerId !== null &&
        e.pointerId !== undefined &&
        e.pointerId !== activePointerId
      ) {
        return;
      }

      const dx = (e.clientX !== undefined ? e.clientX : startX) - startX;
      const dy = (e.clientY !== undefined ? e.clientY : startY) - startY;
      startX = null;
      startY = null;
      activePointerId = null;

      const wasDragging = isDraggingFlip;
      isDraggingFlip = false;
      wrapper.style.transition = '';
      wrapper.style.transform = '';

      if (wasDragging) {
        this._justFinishedCardSwipe = true;
        clearTimeout(this._swipeGuardTimer);
        this._swipeGuardTimer = setTimeout(() => {
          this._justFinishedCardSwipe = false;
        }, 220);
      }

      const classification = CardGestureMath.classifyGesture(dx, dy, false);
      if (
        classification === 'flipCard' ||
        (Math.abs(dx) >= 22 && Math.abs(dx) > Math.abs(dy) * 1.15)
      ) {
        const dir = dx >= 0 ? 1 : -1;
        if (isStackCard) {
          this.triggerStackCardFlip(dir);
        } else {
          this.triggerCardFlip(dir);
        }
      } else {
        this.applyCard3DRotation(wrapper, getIsFlipped(), getBaseDeg());
      }
    };

    window.addEventListener('pointermove', onWindowPointerMove, { passive: false });
    window.addEventListener('pointerup', endCardSwipe);
    window.addEventListener('pointercancel', endCardSwipe);
  }

  applyCard3DRotation(wrapperEl, isFlipped, degValue) {
    if (!wrapperEl) return;
    wrapperEl.classList.toggle('is-flipped', Boolean(isFlipped));
    wrapperEl.style.setProperty('--card-flip-deg', `${degValue}deg`);
    wrapperEl.style.setProperty('--card-front-deg', `${degValue}deg`);
  }

  triggerCardFlip(direction = -1) {
    const step = direction >= 0 ? 180 : -180;
    this._todayFlipDeg += step;
    this.state.isCardFlipped = !this.state.isCardFlipped;
    this.sensory.playCardFlipSwoosh();
    this.saveState();
    this.renderCardScreen();
    this.checkFirstTimePageHint();
  }

  triggerStackCardFlip(direction = -1) {
    const step = direction >= 0 ? 180 : -180;
    this._stackFlipDeg += step;
    this.state.isStackCardFlipped = !this.state.isStackCardFlipped;
    this.sensory.playCardFlipSwoosh();
    this.saveState();
    this.renderStackScreen();
    this.checkFirstTimePageHint();
  }

  // =========================================================================
  // CHRONOLOGICAL CARD STACK VIEWER & CALENDAR ZOOM-OUT (Mockups 06 & 07)
  // =========================================================================

  getSortedArchiveKeys() {
    return Object.keys(this.state.archiveCards || {}).sort();
  }

  getSelectedStackCard() {
    const keys = this.getSortedArchiveKeys();
    if (keys.length === 0) return null;
    if (!this.state.archiveCards[this.state.selectedStackDateKey]) {
      this.state.selectedStackDateKey = keys[keys.length - 1];
    }
    return this.state.archiveCards[this.state.selectedStackDateKey] || null;
  }

  animateStackCardScroll(direction = 1) {
    if (!this.els.stackCarouselStage) return;
    const centerPerspective = this.els.stackCarouselStage.querySelector(
      '.stack-center-perspective'
    );
    if (!centerPerspective) return;

    centerPerspective.classList.remove(
      'anim-slide-next',
      'anim-slide-prev',
      'anim-bounce-next',
      'anim-bounce-prev'
    );
    // Force reflow so rapid consecutive scrolls re-trigger the sliding motion
    void centerPerspective.offsetWidth;
    centerPerspective.classList.add(
      direction >= 0 ? 'anim-slide-next' : 'anim-slide-prev'
    );

    if (this.els.stackDateStrip) {
      const activePill = this.els.stackDateStrip.querySelector('.stack-date-pill.active');
      if (activePill && typeof activePill.scrollIntoView === 'function') {
        activePill.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
      }
    }
  }

  animateStackBoundaryBounce(direction = 1) {
    if (!this.els.stackCarouselStage) return;
    const centerPerspective = this.els.stackCarouselStage.querySelector(
      '.stack-center-perspective'
    );
    if (!centerPerspective) return;

    centerPerspective.classList.remove(
      'anim-slide-next',
      'anim-slide-prev',
      'anim-bounce-next',
      'anim-bounce-prev'
    );
    void centerPerspective.offsetWidth;
    centerPerspective.classList.add(
      direction >= 0 ? 'anim-bounce-next' : 'anim-bounce-prev'
    );
  }

  selectStackDate(dateKey, explicitDirection = null) {
    if (dateKey === this.state.cardDateKey) {
      this.sensory.playStackRiffleTick();
      this.state.activePillar = 'card';
      this.state.isCardFlipped = false;
      this._todayFlipDeg = 0;
      this.saveState();
      this.renderAll();
      return;
    }
    if (!this.state.archiveCards[dateKey]) return;
    if (this.state.selectedStackDateKey === dateKey && this.state.activePillar === 'stack') {
      return;
    }
    const prevKey = this.state.selectedStackDateKey || '';
    const dir =
      explicitDirection !== null
        ? explicitDirection
        : dateKey > prevKey
        ? 1
        : -1;
    const wasOnStack = this.state.activePillar === 'stack';

    this.state.selectedStackDateKey = dateKey;
    this.state.isStackCardFlipped = false;
    this._stackFlipDeg = 0;
    this.sensory.playStackRiffleTick();
    this.saveState();
    this.renderAll();

    if (wasOnStack) {
      this.animateStackCardScroll(dir);
    }
  }

  stepStackCard(direction) {
    const keys = this.getSortedArchiveKeys();
    if (keys.length === 0) return;
    const idx = keys.indexOf(this.state.selectedStackDateKey);
    const nextIdx = Math.max(0, Math.min(keys.length - 1, idx + direction));
    if (nextIdx !== idx) {
      this.selectStackDate(keys[nextIdx], direction);
    } else {
      this.animateStackBoundaryBounce(direction);
    }
  }

  bindStackViewerEvents() {
    if (this.els.stackBtnReturn) {
      this.els.stackBtnReturn.addEventListener('click', () => {
        this.sensory.playCardFlipSwoosh();
        this.state.activePillar = 'card';
        this.saveState();
        this.renderAll();
      });
    }

    if (this.els.stackBtnZoomout) {
      this.els.stackBtnZoomout.addEventListener('click', () => {
        this.sensory.playMechanicalTick();
        this.state.activePillar = 'calendar';
        this.saveState();
        this.renderAll();
      });
    }

    if (this.els.stackBtnFlip) {
      this.els.stackBtnFlip.addEventListener('click', () => {
        this.triggerStackCardFlip(-1);
      });
    }

    if (this.els.stackBtnTrash) {
      this.els.stackBtnTrash.addEventListener('click', () => {
        this.confirmPermanentDeleteArchivedCard();
      });
    }

    if (this.els.stackPeekLeft) {
      this.els.stackPeekLeft.addEventListener('click', () => {
        this.stepStackCard(-1);
      });
    }

    if (this.els.stackPeekRight) {
      this.els.stackPeekRight.addEventListener('click', () => {
        this.stepStackCard(1);
      });
    }

    if (this.els.stackAddItemRow) {
      this.els.stackAddItemRow.addEventListener('click', () => {
        if (this._justFinishedCardSwipe) return;
        this.openAddStackTaskModal();
      });
    }

    if (this.els.stackCardBackReflection) {
      this.els.stackCardBackReflection.addEventListener('input', () => {
        const card = this.getSelectedStackCard();
        if (!card) return;
        const clamped = this.clampReflectionInputText(this.els.stackCardBackReflection.value);
        if (this.els.stackCardBackReflection.value !== clamped) {
          this.els.stackCardBackReflection.value = clamped;
        }
        card.reflectionText = this.els.stackCardBackReflection.value;
        this.adjustReflectionTypography(this.els.stackCardBackReflection);
        this.saveState();
      });
    }

    // 1. Scrub / Drag along the top #stack-date-strip to scroll through dates continuously
    if (this.els.stackDateStrip) {
      let isScrubbingStrip = false;
      const pickDateFromPoint = (clientX, clientY) => {
        const el = document.elementFromPoint(clientX, clientY);
        const pill = el && el.closest ? el.closest('.stack-date-pill') : null;
        if (pill && pill.dataset.dateKey && this.state.archiveCards[pill.dataset.dateKey]) {
          this.selectStackDate(pill.dataset.dateKey);
        }
      };
      this.els.stackDateStrip.addEventListener('pointerdown', (e) => {
        isScrubbingStrip = true;
        pickDateFromPoint(e.clientX, e.clientY);
      });
      this.els.stackDateStrip.addEventListener('pointermove', (e) => {
        if (!isScrubbingStrip) return;
        pickDateFromPoint(e.clientX, e.clientY);
      });
      window.addEventListener('pointerup', () => {
        isScrubbingStrip = false;
      });
    }

    // 2. Interactive Horizontal Drag on peeking side cards or outer carousel stage to scroll through the Stack
    //    (Swiping on #stack-card-3d itself is handled by bindTwoWayCardFlipOnWrapper so it flips effortlessly!)
    if (this.els.stackCarouselStage) {
      let startX = null;
      let startY = null;
      let isDraggingCarousel = false;
      const centerPerspective = this.els.stackCarouselStage.querySelector(
        '.stack-center-perspective'
      );

      this.els.stackCarouselStage.addEventListener('pointerdown', (e) => {
        // If pointerdown is inside #stack-card-3d, let the card flip/pencil gesture handle it
        if (e.target.closest('#stack-card-3d')) return;
        startX = e.clientX;
        startY = e.clientY;
        isDraggingCarousel = false;
      });

      window.addEventListener('pointermove', (e) => {
        if (startX === null || startY === null) return;
        const dx = e.clientX - startX;
        const dy = e.clientY - startY;

        if (!isDraggingCarousel && Math.abs(dx) > 10 && Math.abs(dx) > Math.abs(dy) * 1.15) {
          isDraggingCarousel = true;
        }

        if (isDraggingCarousel && centerPerspective) {
          const offset = Math.max(-110, Math.min(110, dx * 0.55));
          centerPerspective.style.transition = 'none';
          centerPerspective.style.transform = `translateX(${offset.toFixed(1)}px)`;
        }
      });

      const endCarouselDrag = (e) => {
        if (startX === null || startY === null) return;
        const dx = (e.clientX !== undefined ? e.clientX : startX) - startX;
        const dy = (e.clientY !== undefined ? e.clientY : startY) - startY;
        startX = null;
        startY = null;

        if (centerPerspective) {
          centerPerspective.style.transition = '';
          centerPerspective.style.transform = '';
        }

        if (!isDraggingCarousel) return;
        isDraggingCarousel = false;
        this._justFinishedCardSwipe = true;
        clearTimeout(this._swipeGuardTimer);
        this._swipeGuardTimer = setTimeout(() => {
          this._justFinishedCardSwipe = false;
        }, 220);

        if (Math.abs(dx) >= 24 && Math.abs(dx) > Math.abs(dy) * 1.15) {
          if (dx > 0) {
            this.stepStackCard(-1);
          } else {
            this.stepStackCard(1);
          }
        }
      };

      window.addEventListener('pointerup', endCarouselDrag);
      window.addEventListener('pointercancel', endCarouselDrag);
    }

    // 3. Mouse Wheel / Trackpad Scrolling through the Stack + Pinch-to-Zoom Out to Calendar
    if (this.els.stackScreen) {
      this.els.stackScreen.addEventListener(
        'wheel',
        (e) => {
          if (e.ctrlKey && e.deltaY > 0) {
            e.preventDefault();
            this.state.activePillar = 'calendar';
            this.saveState();
            this.renderAll();
            return;
          }

          // Smooth wheel/trackpad scrolling through the chronological stack of cards
          const now = Date.now();
          if (now - this._lastStackWheelTime < 170) return;
          const dominantDelta =
            Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
          if (Math.abs(dominantDelta) > 14) {
            e.preventDefault();
            this._lastStackWheelTime = now;
            this.stepStackCard(dominantDelta > 0 ? 1 : -1);
          }
        },
        { passive: false }
      );
    }
  }

  bindCalendarViewerEvents() {
    if (this.els.calendarBtnReturn) {
      this.els.calendarBtnReturn.addEventListener('click', () => {
        this.sensory.playCardFlipSwoosh();
        this.state.activePillar = 'card';
        this.saveState();
        this.renderAll();
      });
    }

    if (this.els.calendarBtnZoomin) {
      this.els.calendarBtnZoomin.addEventListener('click', () => {
        this.sensory.playMechanicalTick();
        this.state.activePillar = 'stack';
        this.saveState();
        this.renderAll();
      });
    }

    if (this.els.calendarScreen) {
      this.els.calendarScreen.addEventListener(
        'wheel',
        (e) => {
          if (e.ctrlKey && e.deltaY < 0) {
            e.preventDefault();
            this.state.activePillar = 'stack';
            this.saveState();
            this.renderAll();
          }
        },
        { passive: false }
      );
    }
  }

  confirmPermanentDeleteArchivedCard() {
    const card = this.getSelectedStackCard();
    if (!card) {
      this.showNotificationBanner('No archived card remaining to delete.');
      return;
    }

    if (this.els.deleteModalTitle) {
      this.els.deleteModalTitle.textContent = `Permanently delete ${card.shortDate} card?`;
    }
    if (this.els.deleteModalDesc) {
      this.els.deleteModalDesc.textContent =
        'This action cannot be undone. This archived card and its reflection will be permanently removed from your stack.';
    }

    this.els.deleteModalOverlay.classList.remove('hidden');

    const onCancel = () => {
      this.els.deleteModalOverlay.classList.add('hidden');
      cleanup();
    };
    const onConfirm = () => {
      this.els.deleteModalOverlay.classList.add('hidden');
      cleanup();

      const deletedKey = card.dateKey;
      delete this.state.archiveCards[deletedKey];
      const remainingKeys = this.getSortedArchiveKeys();
      this.state.selectedStackDateKey =
        remainingKeys.length > 0 ? remainingKeys[remainingKeys.length - 1] : null;
      this.state.isStackCardFlipped = false;
      this._stackFlipDeg = 0;

      this.sensory.playTrashDelete();
      this.saveState();
      this.renderAll();
      this.showNotificationBanner('Card permanently deleted');
    };
    const cleanup = () => {
      this.els.deleteModalCancel.removeEventListener('click', onCancel);
      this.els.deleteModalConfirm.removeEventListener('click', onConfirm);
    };

    this.els.deleteModalCancel.addEventListener('click', onCancel);
    this.els.deleteModalConfirm.addEventListener('click', onConfirm);
  }

  // =========================================================================
  // HERO TOMATO DIAL DRAG & TAP-ON-DIGITS TIME ENTRY
  // =========================================================================

  bindHeroDialDragGesture() {
    const stage = this.els.heroTomatoStage;
    let isDragging = false;
    let hasDragged = false;
    let dragStartX = 0;
    let dragStartAngle = 0;
    let lastNotchIndex = 0;
    let warnedStopwatchDrag = false;

    stage.addEventListener('pointerdown', (e) => {
      this.closeHeroTimeEditorDOM();
      const slot = this.state.timers[this.state.selectedQuadrant];
      if (!slot) return;

      isDragging = true;
      hasDragged = false;
      warnedStopwatchDrag = false;
      dragStartX = e.clientX;
      dragStartAngle = slot.angleDegrees;
      lastNotchIndex = Math.round(dragStartAngle / OdometerDialPhysics.DEGREES_PER_NOTCH);
      stage.setPointerCapture(e.pointerId);
    });

    stage.addEventListener('pointermove', (e) => {
      if (!isDragging) return;
      const slot = this.state.timers[this.state.selectedQuadrant];
      if (!slot) return;

      const translationX = e.clientX - dragStartX;
      if (!hasDragged && Math.abs(translationX) <= 3) return;
      hasDragged = true;

      if (slot.mode === 'stopwatch') {
        if (!warnedStopwatchDrag && Math.abs(translationX) > 6) {
          warnedStopwatchDrag = true;
          this.showTelemetryToast('Switch to Countdown to set duration');
        }
        return;
      }

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

      if (slot.runState === 'completed') {
        slot.runState = 'idle';
      }
      slot.angleDegrees = update.rawAngleDegrees;
      slot.configuredMinutes = update.snappedMinutes;
      slot.remainingSeconds = update.snappedMinutes * 60;

      const readoutStr = OdometerDialPhysics.formatMockupReadout(
        slot.remainingSeconds
      );
      this.els.heroReadout.textContent = readoutStr;
      this.els.heroReadout.classList.toggle('has-hours', slot.remainingSeconds > 3600);
      this.hero3D.updateOdometer(
        slot.angleDegrees,
        slot.quadrant,
        Boolean(slot.assignedTaskId || slot.customTitle),
        slot.runState === 'completed'
      );
    });

    const endDrag = (e) => {
      if (!isDragging) return;
      isDragging = false;
      try {
        stage.releasePointerCapture(e.pointerId);
      } catch (_) {}

      if (!hasDragged) return;
      hasDragged = false;

      const slot = this.state.timers[this.state.selectedQuadrant];
      if (!slot || slot.mode === 'stopwatch') return;

      const snapped = OdometerDialPhysics.snapAngleToNotch(slot.angleDegrees);
      slot.angleDegrees = snapped.snappedAngle;
      slot.configuredMinutes = snapped.minutes;
      slot.remainingSeconds = snapped.minutes * 60;

      if (snapped.minutes > 0) {
        this.ensureSlotAssignedForActiveTimer(slot.quadrant);
      }

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

  bindHeroReadoutTimeEntry() {
    if (!this.els.heroReadout || !this.els.heroTimeEditor || !this.els.heroTimeInput) return;

    this.els.heroReadout.addEventListener('click', (e) => {
      e.stopPropagation();
      this.openHeroTimeEditor();
    });

    this.els.heroReadout.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        this.openHeroTimeEditor();
      }
    });

    this.els.heroTimeEditor.addEventListener('click', (e) => {
      e.stopPropagation();
    });

    this.els.heroTimeInput.addEventListener('input', () => {
      const rawVal = this.els.heroTimeInput.value;
      if (this.els.heroTimeUnitBadge) {
        this.els.heroTimeUnitBadge.textContent = rawVal.includes(':') ? 'HH:MM' : 'MIN';
      }
      const parsedMins = OdometerDialPhysics.parseTypedTimeInput(rawVal);
      if (parsedMins !== null && this.hero3D) {
        const slot = this.state.timers[this.state.selectedQuadrant] || this.state.timers[0];
        const isAssigned = Boolean(slot.assignedTaskId || slot.customTitle);
        this.hero3D.updateOdometer(
          parsedMins * OdometerDialPhysics.DEGREES_PER_MINUTE,
          slot.quadrant,
          isAssigned,
          false
        );
      }
    });

    this.els.heroTimeInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        this.commitHeroTimeEditor();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        this.cancelHeroTimeEditor();
      }
    });

    if (this.els.heroTimeSetBtn) {
      this.els.heroTimeSetBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.commitHeroTimeEditor();
      });
    }

    const presetButtons = this.els.heroTimeEditor.querySelectorAll('.hero-preset-pill');
    presetButtons.forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const mins = Number(btn.dataset.mins);
        if (Number.isFinite(mins)) {
          this.closeHeroTimeEditorDOM();
          this.setCustomTimerMinutes(this.state.selectedQuadrant, mins);
        }
      });
    });

    document.addEventListener('click', (e) => {
      if (
        this.els.heroTimeEditor &&
        !this.els.heroTimeEditor.classList.contains('hidden') &&
        !e.target.closest('#hero-time-editor') &&
        !e.target.closest('#hero-readout')
      ) {
        this.commitHeroTimeEditor();
      }
    });
  }

  openHeroTimeEditor() {
    const slot = this.state.timers[this.state.selectedQuadrant] || this.state.timers[0];
    if (!slot || !this.els.heroTimeEditor || !this.els.heroTimeInput) return;

    if (slot.mode === 'stopwatch') {
      this.showTelemetryToast('Switch to Countdown to set duration');
      return;
    }

    const currentMinutes = Math.round(slot.remainingSeconds / 60);
    this.els.heroReadout.classList.add('hidden');
    this.els.heroTimeEditor.classList.remove('hidden');
    this.els.heroTimeInput.value = String(currentMinutes);
    if (this.els.heroTimeUnitBadge) {
      this.els.heroTimeUnitBadge.textContent = 'MIN';
    }

    setTimeout(() => {
      this.els.heroTimeInput.focus();
      this.els.heroTimeInput.select();
    }, 20);
  }

  closeHeroTimeEditorDOM() {
    if (!this.els.heroTimeEditor || !this.els.heroReadout) return;
    this.els.heroTimeEditor.classList.add('hidden');
    this.els.heroReadout.classList.remove('hidden');
  }

  commitHeroTimeEditor() {
    if (!this.els.heroTimeEditor || this.els.heroTimeEditor.classList.contains('hidden')) return;
    const rawVal = this.els.heroTimeInput ? this.els.heroTimeInput.value : '';
    const parsedMins = OdometerDialPhysics.parseTypedTimeInput(rawVal);
    this.closeHeroTimeEditorDOM();

    if (parsedMins !== null) {
      this.setCustomTimerMinutes(this.state.selectedQuadrant, parsedMins);
    } else {
      this.renderHeroScreen();
    }
  }

  cancelHeroTimeEditor() {
    if (!this.els.heroTimeEditor || this.els.heroTimeEditor.classList.contains('hidden')) return;
    this.closeHeroTimeEditorDOM();
    this.renderHeroScreen();
  }

  setCustomTimerMinutes(quadrant, minutes) {
    const slot = this.state.timers[quadrant];
    if (!slot) return;

    const clampedMins = Math.max(
      0,
      Math.min(OdometerDialPhysics.MAX_MINUTES, Math.round(Number(minutes) || 0))
    );

    slot.mode = 'countdown';
    slot.runState = 'idle';
    slot.lastTickTimestamp = null;
    slot.configuredMinutes = clampedMins;
    slot.remainingSeconds = clampedMins * 60;
    slot.angleDegrees = clampedMins * OdometerDialPhysics.DEGREES_PER_MINUTE;

    if (clampedMins > 0) {
      this.ensureSlotAssignedForActiveTimer(quadrant);
    }

    this.sensory.playDialRatchetNotch(true);
    this.showTelemetryToast(
      `Timer set to ${clampedMins} min (${OdometerDialPhysics.formatMockupReadout(slot.remainingSeconds)})`
    );
    this.saveState();
    this.renderAll();
  }

  // =========================================================================
  // TIMER COORDINATOR LOGIC (1-Active-Timer + Stopwatch Turns on Minutes)
  // =========================================================================

  ensureSlotAssignedForActiveTimer(quadrant) {
    const slot = this.state.timers[quadrant];
    if (!slot || slot.assignedTaskId || slot.customTitle) return;

    const freeTask = this.state.tasks.find(
      (t) => t.assignedQuadrant === null || t.assignedQuadrant === undefined
    );
    if (freeTask) {
      freeTask.assignedQuadrant = quadrant;
      slot.assignedTaskId = freeTask.id;
      slot.assignedTaskOrder = freeTask.orderIndex;
      slot.customTitle = freeTask.title;
    } else {
      slot.customTitle = 'Focus Session';
    }
  }

  startWallClockTicker() {
    if (this.tickInterval) clearInterval(this.tickInterval);
    this.tickInterval = setInterval(() => {
      // QA #3: Automatically roll over the daily card when the configured dailyResetHour passes
      const currentLogicalDate = this.getCurrentLogicalDateString(this.state.dailyResetHour);
      if (
        this.state.lastRolloverLogicalDate &&
        currentLogicalDate !== this.state.lastRolloverLogicalDate
      ) {
        this.state.lastRolloverLogicalDate = currentLogicalDate;
        this.simulateFiveAmRollover();
        return;
      }

      let anyUpdated = false;
      let anyCompletedTransition = false;
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
              anyCompletedTransition = true;
              this.endTimerToSilver(slot.quadrant, true);
              this.showNotificationBanner(
                `Pomodoro completed for "${(slot.customTitle || 'Timer').toUpperCase()}"! Tap Reset (↺) to reset tomato.`
              );
            }
          }
        } else {
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
          } else if (anyCompletedTransition) {
            this.renderGridScreen();
          } else {
            this.updateGridTimersInPlace();
          }
        }
      }
    }, 1000);
  }

  updateGridTimersInPlace() {
    this.state.timers.forEach((slot, qIdx) => {
      const quadEl = this.els.gridQuadrants[qIdx];
      if (!quadEl) return;
      const timeEl = quadEl.querySelector('.grid-tomato-time');
      if (timeEl) {
        const readoutText = OdometerDialPhysics.formatMockupReadout(
          slot.remainingSeconds
        );
        timeEl.textContent = readoutText;
        timeEl.classList.toggle('has-hours', slot.remainingSeconds > 3600);
      }
    });
  }

  togglePlayPause(quadrant) {
    this.closeHeroTimeEditorDOM();
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

      this.ensureSlotAssignedForActiveTimer(quadrant);

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

  handleEndOrResetButton(quadrant) {
    const slot = this.state.timers[quadrant];
    if (!slot) return;

    if (slot.runState === 'completed') {
      this.resetCompletedTimer(quadrant);
    } else {
      this.endTimerToSilver(quadrant, false);
    }
  }

  endTimerToSilver(quadrant, completedNaturally = false) {
    this.closeHeroTimeEditorDOM();
    const slot = this.state.timers[quadrant];
    if (!slot) return;

    slot._justTransitionedSilver = slot.runState !== 'completed';
    slot.runState = 'completed';
    slot.lastTickTimestamp = null;

    this.sensory.playCompletionChime();
    if (!completedNaturally) {
      this.showTelemetryToast('Timer ended (Silver Metallic) — tap Reset (↺) to reset to 00:00');
    }

    this.saveState();
    this.renderAll();
  }

  resetCompletedTimer(quadrant) {
    this.closeHeroTimeEditorDOM();
    const slot = this.state.timers[quadrant];
    if (!slot) return;

    slot._justTransitionedFromSilver = slot.runState === 'completed';
    slot.runState = 'idle';
    slot.remainingSeconds = 0;
    slot.configuredMinutes = 0;
    slot.angleDegrees = 0.0;
    slot.lastTickTimestamp = null;

    this.sensory.playDialRatchetNotch(false);
    this.showTelemetryToast('Tomato reset to 00:00');

    this.saveState();
    this.renderAll();
  }

  endAndResetTimer(quadrant, completedNaturally = false) {
    this.endTimerToSilver(quadrant, completedNaturally);
  }

  toggleStopwatchMode(quadrant) {
    this.closeHeroTimeEditorDOM();
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

    if (
      task.assignedQuadrant !== null &&
      task.assignedQuadrant !== undefined &&
      task.assignedQuadrant !== quadrant
    ) {
      this.clearQuadrantAssignment(task.assignedQuadrant);
    }

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
    this.state.isHeroDropdownOpen = false;
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
    this.state.isHeroDropdownOpen = false;
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
    this.state.isHeroDropdownOpen = false;
    this.sensory.playDialRatchetNotch(false);
    this.showTelemetryToast('Tomato unassigned (returned to grey)');
    this.saveState();
    this.renderAll();
  }

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

    this.state.selectedQuadrant = targetQuad;
    this.state.activePillar = 'timer';
    this.state.timerSubMode = 'hero';
    this.saveState();
    this.renderAll();
  }

  // =========================================================================
  // RENDERING: ALL 7 MOCKUP SCREENS (01..07)
  // =========================================================================

  renderAll() {
    const pillar = this.state.activePillar;
    const isHome = pillar === 'home';
    const isCard = pillar === 'card';
    const isTimer = pillar === 'timer';
    const isStack = pillar === 'stack';
    const isCalendar = pillar === 'calendar';

    if (this.els.homeBrandTitle && this.els.topSegmentedPill) {
      this.els.homeBrandTitle.classList.toggle('hidden', !isHome);
      this.els.topSegmentedPill.classList.toggle('hidden', isHome);
    }

    const isCardSegmentActive = isCard || isStack || isCalendar;
    this.els.pillCardBtn.classList.toggle('active', isCardSegmentActive);
    this.els.pillTimerBtn.classList.toggle('active', isTimer);

    if (this.els.homeScreen) {
      this.els.homeScreen.classList.toggle('hidden', !isHome);
    }
    this.els.cardScreen.classList.toggle('hidden', !isCard);
    this.els.gridScreen.classList.toggle(
      'hidden',
      !isTimer || this.state.timerSubMode !== 'grid'
    );
    this.els.heroScreen.classList.toggle(
      'hidden',
      !isTimer || this.state.timerSubMode !== 'hero'
    );
    if (this.els.stackScreen) {
      this.els.stackScreen.classList.toggle('hidden', !isStack);
    }
    if (this.els.calendarScreen) {
      this.els.calendarScreen.classList.toggle('hidden', !isCalendar);
    }

    if (this.els.demoBtnHome) {
      this.els.demoBtnHome.classList.toggle('active-pill', isHome);
    }
    if (this.els.demoBtnCard) {
      this.els.demoBtnCard.classList.toggle(
        'active-pill',
        isCard && !this.state.isCardFlipped
      );
    }
    if (this.els.demoBtnBack) {
      this.els.demoBtnBack.classList.toggle(
        'active-pill',
        isCard && Boolean(this.state.isCardFlipped)
      );
    }
    if (this.els.demoBtnGrid) {
      this.els.demoBtnGrid.classList.toggle(
        'active-pill',
        isTimer && this.state.timerSubMode === 'grid'
      );
    }
    if (this.els.demoBtnHero) {
      this.els.demoBtnHero.classList.toggle(
        'active-pill',
        isTimer && this.state.timerSubMode === 'hero'
      );
    }
    if (this.els.demoBtnStack) {
      this.els.demoBtnStack.classList.toggle('active-pill', isStack);
    }
    if (this.els.demoBtnCalendar) {
      this.els.demoBtnCalendar.classList.toggle('active-pill', isCalendar);
    }

    if (isHome) {
      this.renderHomeScreen();
    } else if (isCard) {
      this.renderCardScreen();
    } else if (isTimer) {
      if (this.state.timerSubMode === 'grid') {
        this.renderGridScreen();
      } else {
        this.renderHeroScreen();
      }
    } else if (isStack) {
      this.renderStackScreen();
    } else if (isCalendar) {
      this.renderCalendarScreen();
    }

    this.checkFirstTimePageHint();
  }

  /**
   * Renders Screen 0: Minimalist 2-Object Homepage (Mockup 01-home-page.png)
   */
  renderHomeScreen() {
    if (this.els.homeMiniDate) {
      this.els.homeMiniDate.textContent = this.state.cardShortDate || '06 OCT';
    }
  }

  /**
   * Renders Screen 1: Today's Dual-Sided Card (Front 04-card-front.png & Back 05-card-back.png)
   */
  renderCardScreen() {
    this.els.cardDateHeader.textContent = this.state.cardHeaderDate;
    if (this.els.cardBackDateHeader) {
      this.els.cardBackDateHeader.textContent = this.state.cardHeaderDate;
    }

    if (this.state.isCardFlipped && Math.abs(this._todayFlipDeg % 360) !== 180) {
      this._todayFlipDeg = -180;
    } else if (!this.state.isCardFlipped && Math.abs(this._todayFlipDeg % 360) !== 0) {
      this._todayFlipDeg = 0;
    }
    this.applyCard3DRotation(
      this.els.card3DWrapper,
      this.state.isCardFlipped,
      this._todayFlipDeg
    );

    const container = this.els.taskListContainer;
    container.innerHTML = '';

    const totalTasks = this.state.tasks.length;
    const rowVertPad = 9;

    this.state.tasks.forEach((task, idx) => {
      task.orderIndex = idx + 1;
      const row = document.createElement('div');
      row.className = 'task-row';
      row.dataset.taskId = task.id;
      row.dataset.completed = task.isCompleted ? 'true' : 'false';
      row.style.paddingTop = `${rowVertPad}px`;
      row.style.paddingBottom = `${rowVertPad}px`;

      const fontSizePx = this.computeTaskFontSizePx(task.title, totalTasks);

      const numSpan = document.createElement('span');
      numSpan.className = 'task-index';
      numSpan.style.fontSize = `${fontSizePx}px`;
      numSpan.textContent = String(task.orderIndex).padStart(2, '0');

      const titleWrap = document.createElement('div');
      titleWrap.className = 'task-title-wrap';

      const titleSpan = document.createElement('span');
      titleSpan.className = 'task-title';
      titleSpan.style.fontSize = `${fontSizePx}px`;
      titleSpan.textContent = task.title;
      titleWrap.appendChild(titleSpan);

      const strikeCanvas = document.createElement('canvas');
      strikeCanvas.className = 'pencil-strike-canvas';
      strikeCanvas.width = 720;
      strikeCanvas.height = 120;

      const tomatoBtn = document.createElement('button');
      tomatoBtn.className = 'task-tomato-btn';
      tomatoBtn.type = 'button';
      const isLit =
        task.assignedQuadrant !== null && task.assignedQuadrant !== undefined;
      tomatoBtn.title = isLit
        ? 'Click lit-up tomato to unassign (return to grey)'
        : 'Click grey tomato to light up and open Timer page';

      const miniImg = document.createElement('img');
      miniImg.className = 'task-mini-tomato-img';
      const assignedSlot = isLit ? this.state.timers[task.assignedQuadrant] : null;
      const miniPaletteKey = !isLit
        ? 'unassigned'
        : assignedSlot && assignedSlot.runState === 'completed'
        ? 'completed'
        : task.assignedQuadrant;
      miniImg.src = this.gridRenderer.getMiniDataURL(miniPaletteKey);
      miniImg.alt = isLit ? 'Assigned Tomato' : 'Unassigned Grey Tomato';
      tomatoBtn.appendChild(miniImg);

      tomatoBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.handleCardTaskTomatoClick(task);
      });

      row.appendChild(numSpan);
      row.appendChild(titleWrap);
      row.appendChild(strikeCanvas);
      row.appendChild(tomatoBtn);

      container.appendChild(row);

      this.bindTaskRowPencilGesture(row, task, strikeCanvas, false);
    });

    if (this.state.tasks.length < 6) {
      this.els.addItemRow.classList.remove('hidden');
    } else {
      this.els.addItemRow.classList.add('hidden');
    }

    // Unify font size across all items on Today's Card; only shrink if the whole card page is filled
    this.fitUnifiedCardTaskTypography(container, this.els.addItemRow);
    requestAnimationFrame(() => {
      this.fitUnifiedCardTaskTypography(container, this.els.addItemRow);
    });

    if (this.els.cardBackReflection) {
      if (this.els.cardBackReflection.value !== (this.state.reflectionText || '')) {
        this.els.cardBackReflection.value = this.state.reflectionText || '';
      }
      this.adjustReflectionTypography(this.els.cardBackReflection);
      requestAnimationFrame(() => {
        this.adjustReflectionTypography(this.els.cardBackReflection);
      });
    }

    this.renderPhotoSlotsDOM(
      this.els.cardBackPhotos,
      this.state.reflectionPhotos || [],
      'today'
    );
  }

  renderPhotoSlotsDOM(containerEl, photosArray, targetType) {
    if (!containerEl) return;
    containerEl.innerHTML = '';

    const photos = Array.isArray(photosArray) ? photosArray.slice(0, 2) : [];
    containerEl.classList.toggle('empty-photos', photos.length === 0);

    if (photos.length === 0) {
      const addSlot = document.createElement('div');
      addSlot.className = 'journal-photo-slot';
      addSlot.title = 'Click to attach a photo (compressed client-side to ≤ 1600px)';
      const label = document.createElement('span');
      label.className = 'journal-photo-add-label';
      label.textContent = '+ Attach Photo (up to 2)';
      addSlot.appendChild(label);
      addSlot.addEventListener('click', (e) => {
        e.stopPropagation();
        if (this._justFinishedCardSwipe) return;
        this.triggerPhotoAttachment(targetType);
      });
      containerEl.appendChild(addSlot);
      return;
    }

    photos.forEach((photoSrc, idx) => {
      const slot = document.createElement('div');
      slot.className = 'journal-photo-slot';
      slot.title = 'Tap photo to replace, or tap × to remove';

      const img = document.createElement('img');
      img.className = 'journal-photo-img';
      img.src = photoSrc;
      img.alt = `Evening journal memory photo ${idx + 1}`;
      slot.appendChild(img);

      slot.addEventListener('click', (e) => {
        e.stopPropagation();
        if (this._justFinishedCardSwipe) return;
        this.triggerPhotoAttachment(targetType, idx);
      });

      const removeBtn = document.createElement('button');
      removeBtn.type = 'button';
      removeBtn.className = 'journal-photo-remove-btn';
      removeBtn.setAttribute('aria-label', `Remove photo ${idx + 1}`);
      removeBtn.title = 'Remove photo';
      removeBtn.textContent = '×';
      removeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (targetType === 'stack') {
          const card = this.getSelectedStackCard();
          if (card && Array.isArray(card.reflectionPhotos)) {
            card.reflectionPhotos.splice(idx, 1);
            this.saveState();
            this.renderStackScreen();
          }
        } else {
          this.state.reflectionPhotos.splice(idx, 1);
          this.saveState();
          this.renderCardScreen();
        }
      });
      slot.appendChild(removeBtn);

      containerEl.appendChild(slot);
    });

    if (photos.length === 1) {
      const secondSlot = document.createElement('div');
      secondSlot.className = 'journal-photo-slot';
      secondSlot.title = 'Click to attach a second photo';
      const label = document.createElement('span');
      label.className = 'journal-photo-add-label';
      label.textContent = '+ Add 2nd Photo';
      secondSlot.appendChild(label);
      secondSlot.addEventListener('click', (e) => {
        e.stopPropagation();
        if (this._justFinishedCardSwipe) return;
        this.triggerPhotoAttachment(targetType);
      });
      containerEl.appendChild(secondSlot);
    }
  }

  /**
   * Renders Screen 4: Chronological Card Stack Viewer (Mockup 06-stack-detail.png)
   */
  renderStackScreen() {
    const selectedCard = this.getSelectedStackCard();
    const sortedKeys = this.getSortedArchiveKeys();

    if (this.els.stackDateStrip) {
      this.els.stackDateStrip.innerHTML = '';
      const activeMonth =
        selectedCard && selectedCard.monthKey === '2026-09' ? '2026-09' : '2026-10';

      const monthBtn = document.createElement('button');
      monthBtn.type = 'button';
      monthBtn.className = 'stack-month-label';
      monthBtn.title = 'Tap to switch between SEP and OCT';
      monthBtn.textContent = activeMonth === '2026-09' ? 'SEP' : 'OCT';
      monthBtn.addEventListener('click', () => {
        const targetMonth = activeMonth === '2026-09' ? '2026-10' : '2026-09';
        const candidates = sortedKeys.filter((k) => k.startsWith(`${targetMonth}-`));
        if (candidates.length > 0) {
          this.selectStackDate(candidates[candidates.length - 1]);
        } else if (targetMonth === '2026-10' && this.state.cardDateKey) {
          this.selectStackDate(this.state.cardDateKey);
        }
      });
      this.els.stackDateStrip.appendChild(monthBtn);

      if (activeMonth === '2026-10') {
        const octDays = [1, 2, 3, 4, 5, 6];
        octDays.forEach((d) => {
          const dPadded = String(d).padStart(2, '0');
          const dKey = `2026-10-${dPadded}`;
          const hasCard =
            Boolean(this.state.archiveCards[dKey]) || dKey === this.state.cardDateKey;
          const isSelected = selectedCard && selectedCard.dateKey === dKey;

          const btn = document.createElement('button');
          btn.type = 'button';
          btn.className = 'stack-date-pill';
          if (hasCard) btn.classList.add('has-card');
          if (isSelected) btn.classList.add('active');
          btn.textContent = dPadded;
          btn.dataset.dateKey = dKey;
          btn.addEventListener('click', () => {
            if (dKey === this.state.cardDateKey) {
              this.selectStackDate(dKey);
            } else if (this.state.archiveCards[dKey]) {
              this.selectStackDate(dKey);
            } else {
              this.showTelemetryToast(`No archived card on OCT ${dPadded}`);
            }
          });
          this.els.stackDateStrip.appendChild(btn);
        });
      } else {
        const sepKeys = sortedKeys.filter((k) => k.startsWith('2026-09-'));
        sepKeys.forEach((dKey) => {
          const cardObj = this.state.archiveCards[dKey];
          const dPadded = String(cardObj.dayNum).padStart(2, '0');
          const isSelected = selectedCard && selectedCard.dateKey === dKey;

          const btn = document.createElement('button');
          btn.type = 'button';
          btn.className = 'stack-date-pill has-card';
          if (isSelected) btn.classList.add('active');
          btn.textContent = dPadded;
          btn.dataset.dateKey = dKey;
          btn.addEventListener('click', () => {
            this.selectStackDate(dKey);
          });
          this.els.stackDateStrip.appendChild(btn);
        });
      }
    }

    if (!selectedCard) {
      if (this.els.stackPeekLeft) {
        this.els.stackPeekLeft.classList.add('disabled-peek');
      }
      if (this.els.stackPeekRight) {
        this.els.stackPeekRight.classList.add('disabled-peek');
      }
      if (this.state.isStackCardFlipped && Math.abs(this._stackFlipDeg % 360) !== 180) {
        this._stackFlipDeg = -180;
      } else if (!this.state.isStackCardFlipped && Math.abs(this._stackFlipDeg % 360) !== 0) {
        this._stackFlipDeg = 0;
      }
      this.applyCard3DRotation(
        this.els.stackCard3D,
        this.state.isStackCardFlipped,
        this._stackFlipDeg
      );

      if (this.els.stackCardDateHeader) {
        this.els.stackCardDateHeader.textContent = 'NO ARCHIVED CARDS YET';
      }
      if (this.els.stackCardBackDateHeader) {
        this.els.stackCardBackDateHeader.textContent = 'NO ARCHIVED CARDS YET';
      }
      if (this.els.stackTaskListContainer) {
        this.els.stackTaskListContainer.innerHTML =
          '<div class="stack-empty-hint" style="padding: 24px 30px; font-family: var(--font-serif); font-size: 19px; line-height: 1.45; color: #7C7974;">Past cards appear here automatically after each Daily Reset.</div>';
      }
      if (this.els.stackAddItemRow) {
        this.els.stackAddItemRow.classList.add('hidden');
      }
      if (this.els.stackCardBackReflection) {
        this.els.stackCardBackReflection.value = '';
      }
      if (this.els.stackCardBackPhotos) {
        this.els.stackCardBackPhotos.innerHTML = '';
      }
      return;
    }

    const curIdx = sortedKeys.indexOf(selectedCard.dateKey);
    if (this.els.stackPeekLeft) {
      this.els.stackPeekLeft.classList.toggle('disabled-peek', curIdx <= 0);
    }
    if (this.els.stackPeekRight) {
      this.els.stackPeekRight.classList.toggle(
        'disabled-peek',
        curIdx < 0 || curIdx >= sortedKeys.length - 1
      );
    }

    if (this.state.isStackCardFlipped && Math.abs(this._stackFlipDeg % 360) !== 180) {
      this._stackFlipDeg = -180;
    } else if (!this.state.isStackCardFlipped && Math.abs(this._stackFlipDeg % 360) !== 0) {
      this._stackFlipDeg = 0;
    }
    this.applyCard3DRotation(
      this.els.stackCard3D,
      this.state.isStackCardFlipped,
      this._stackFlipDeg
    );

    this.els.stackCardDateHeader.textContent = selectedCard.headerDate;
    if (this.els.stackCardBackDateHeader) {
      this.els.stackCardBackDateHeader.textContent = selectedCard.headerDate;
    }

    const listEl = this.els.stackTaskListContainer;
    listEl.innerHTML = '';

    const stackTasks = selectedCard.tasks || [];
    const totalTasks = stackTasks.length;
    const rowVertPad = 9;

    stackTasks.forEach((task, idx) => {
      task.orderIndex = idx + 1;
      const row = document.createElement('div');
      row.className = 'task-row';
      row.dataset.taskId = task.id;
      row.dataset.completed = task.isCompleted ? 'true' : 'false';
      row.style.paddingTop = `${rowVertPad}px`;
      row.style.paddingBottom = `${rowVertPad}px`;

      const fontSizePx = this.computeTaskFontSizePx(task.title, totalTasks);

      const numSpan = document.createElement('span');
      numSpan.className = 'task-index';
      numSpan.style.fontSize = `${fontSizePx}px`;
      numSpan.textContent = String(task.orderIndex).padStart(2, '0');

      const titleWrap = document.createElement('div');
      titleWrap.className = 'task-title-wrap';

      const titleSpan = document.createElement('span');
      titleSpan.className = 'task-title';
      titleSpan.style.fontSize = `${fontSizePx}px`;
      titleSpan.textContent = task.title;
      titleWrap.appendChild(titleSpan);

      const strikeCanvas = document.createElement('canvas');
      strikeCanvas.className = 'pencil-strike-canvas';
      strikeCanvas.width = 720;
      strikeCanvas.height = 120;

      row.appendChild(numSpan);
      row.appendChild(titleWrap);
      row.appendChild(strikeCanvas);

      listEl.appendChild(row);

      this.bindTaskRowPencilGesture(row, task, strikeCanvas, true);
    });

    if (this.els.stackAddItemRow) {
      this.els.stackAddItemRow.classList.toggle(
        'hidden',
        stackTasks.length >= 6
      );
    }

    // Unify font size across all items on the Stack Card; only shrink if the whole card page is filled
    this.fitUnifiedCardTaskTypography(listEl, this.els.stackAddItemRow);
    requestAnimationFrame(() => {
      this.fitUnifiedCardTaskTypography(listEl, this.els.stackAddItemRow);
    });

    if (this.els.stackCardBackReflection) {
      if (
        this.els.stackCardBackReflection.value !==
        (selectedCard.reflectionText || '')
      ) {
        this.els.stackCardBackReflection.value = selectedCard.reflectionText || '';
      }
      this.adjustReflectionTypography(this.els.stackCardBackReflection);
      requestAnimationFrame(() => {
        this.adjustReflectionTypography(this.els.stackCardBackReflection);
      });
    }

    this.renderPhotoSlotsDOM(
      this.els.stackCardBackPhotos,
      selectedCard.reflectionPhotos || [],
      'stack'
    );
  }

  /**
   * Renders Screen 5: Monthly Calendar Zoom-Out View (Mockup 07-calendar-view.png)
   * Loads dates from Sept 1, 2026 to Dec 31, 2026 (always showing 2 additional months after the current month).
   */
  renderCalendarScreen() {
    const container = this.els.calendarMonthsContainer;
    if (!container) return;
    container.innerHTML = '';

    const fullMonthNames = [
      'JANUARY',
      'FEBRUARY',
      'MARCH',
      'APRIL',
      'MAY',
      'JUNE',
      'JULY',
      'AUGUST',
      'SEPTEMBER',
      'OCTOBER',
      'NOVEMBER',
      'DECEMBER',
    ];

    // Base range: SEPTEMBER 2026 through DECEMBER 2026, always guaranteeing 2 additional months after current card month
    const activeDateKey = this.state.cardDateKey || '2026-10-06';
    const [curYearStr, curMonthStr] = activeDateKey.split('-');
    const curYear = parseInt(curYearStr, 10) || 2026;
    const curMonthIdx = (parseInt(curMonthStr, 10) || 10) - 1;

    const startTotalMonths = 2026 * 12 + 8; // Sep 2026 (index 8)
    const minEndTotalMonths = 2026 * 12 + 11; // Dec 2026 (index 11)
    const dynamicEndTotalMonths = curYear * 12 + curMonthIdx + 2; // Always +2 months after current month
    const endTotalMonths = Math.max(minEndTotalMonths, dynamicEndTotalMonths);

    const months = [];
    for (let totalM = startTotalMonths; totalM <= endTotalMonths; totalM++) {
      const y = Math.floor(totalM / 12);
      const mIdx = totalM % 12;
      const mNumPadded = String(mIdx + 1).padStart(2, '0');
      const monthKey = `${y}-${mNumPadded}`;
      const title =
        monthKey === '2026-09'
          ? 'SEPTEMBER 2026'
          : monthKey === '2026-10'
          ? 'OCTOBER 2026'
          : `${fullMonthNames[mIdx]} ${y}`;
      const daysInMonth = new Date(y, mIdx + 1, 0).getDate();
      const startDayOfWeek = new Date(y, mIdx, 1).getDay();
      months.push({
        monthKey,
        title,
        daysInMonth,
        startDayOfWeek,
      });
    }

    const weekdays = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

    months.forEach((m) => {
      const block = document.createElement('div');
      block.className = 'cal-month-block';

      const titleEl = document.createElement('h2');
      titleEl.className = 'cal-month-title';
      titleEl.textContent = m.title;
      block.appendChild(titleEl);

      const wkRow = document.createElement('div');
      wkRow.className = 'cal-weekday-row';
      weekdays.forEach((w) => {
        const span = document.createElement('span');
        span.textContent = w;
        wkRow.appendChild(span);
      });
      block.appendChild(wkRow);

      const grid = document.createElement('div');
      grid.className = 'cal-days-grid';

      for (let e = 0; e < m.startDayOfWeek; e++) {
        const empty = document.createElement('div');
        empty.className = 'cal-day-empty';
        grid.appendChild(empty);
      }

      for (let d = 1; d <= m.daysInMonth; d++) {
        const dPadded = String(d).padStart(2, '0');
        const dateKey = `${m.monthKey}-${dPadded}`;
        const hasArchivedCard = Boolean(this.state.archiveCards[dateKey]);
        const isTodayCard = dateKey === activeDateKey;
        const isSelected = dateKey === this.state.selectedStackDateKey;
        const isFutureDate = dateKey > activeDateKey && !hasArchivedCard;

        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'cal-day-btn';
        btn.dataset.dateKey = dateKey;
        btn.textContent = String(d);

        if (hasArchivedCard || isTodayCard) {
          btn.classList.add('has-card');
        }
        if (isTodayCard) {
          btn.classList.add('is-today');
        }
        if (isSelected) {
          btn.classList.add('is-selected');
        }
        if (isFutureDate) {
          btn.classList.add('is-future');
        }

        btn.addEventListener('click', () => {
          if (isTodayCard) {
            this.sensory.playCardFlipSwoosh();
            this.state.activePillar = 'card';
            this.state.isCardFlipped = false;
            this._todayFlipDeg = 0;
            this.saveState();
            this.renderAll();
          } else if (hasArchivedCard) {
            this.sensory.playStackRiffleTick();
            this.state.selectedStackDateKey = dateKey;
            this.state.activePillar = 'stack';
            this.state.isStackCardFlipped = false;
            this._stackFlipDeg = 0;
            this.saveState();
            this.renderAll();
          } else if (isFutureDate) {
            this.showTelemetryToast(`Future date (${dateKey})`);
          } else {
            this.showTelemetryToast(`No archived card for ${dateKey}`);
          }
        });

        grid.appendChild(btn);
      }

      block.appendChild(grid);
      container.appendChild(block);
    });
  }

  /**
   * Computes the horizontal and vertical line segments for every wrapped line of text
   * inside a `.task-row`, ensuring that:
   * 1. Line 1 starts across the `01` task index and crosses out the full first line of text.
   * 2. Line 2 (and any subsequent line) starts at the left edge of `.task-title` and crosses out
   *    that line of text (matching Mockup 06-stack-detail.png).
   * 3. No strikethrough line ever gets too close to the right edge of the card or the mini-tomato icon.
   */
  getTaskRowLineSegments(canvas) {
    const rowEl = canvas.parentElement;
    if (!rowEl) {
      return [{ minX: 24, maxX: 260, centerY: 16 }];
    }

    const rowRect = rowEl.getBoundingClientRect();
    const rowW = Math.max(280, rowRect.width || rowEl.clientWidth || 362);
    const rowH = Math.max(36, rowRect.height || rowEl.clientHeight || 48);

    const numSpan = rowEl.querySelector('.task-index');
    const titleSpan = rowEl.querySelector('.task-title');
    const tomatoBtn = rowEl.querySelector('.task-tomato-btn');

    // Safe right boundary so strikethrough lines NEVER touch the mini-tomato or card edge
    let maxSafeRightX = rowW - 30;
    if (tomatoBtn && tomatoBtn.getBoundingClientRect().width > 0) {
      const tomRect = tomatoBtn.getBoundingClientRect();
      maxSafeRightX = Math.min(maxSafeRightX, tomRect.left - rowRect.left - 16);
    }

    const indexLeftX =
      numSpan && numSpan.getBoundingClientRect().width > 0
        ? Math.max(18, numSpan.getBoundingClientRect().left - rowRect.left - 3)
        : 22;

    if (titleSpan) {
      const clientRects = Array.from(titleSpan.getClientRects()).filter(
        (r) => r.width > 2 && r.height > 4
      );
      if (clientRects.length > 0) {
        return clientRects.map((r, lineIdx) => {
          const lineStartX =
            lineIdx === 0
              ? indexLeftX
              : Math.max(58, r.left - rowRect.left - 3);
          const rawEndX = r.right - rowRect.left + 14;
          const lineEndX = Math.max(
            lineStartX + 36,
            Math.min(maxSafeRightX, rawEndX)
          );
          const lineCenterY = (r.top + r.bottom) * 0.5 - rowRect.top;
          return {
            minX: lineStartX,
            maxX: lineEndX,
            centerY: lineCenterY,
          };
        });
      }
    }

    // Fallback when called before layout rects are populated
    return [{ minX: indexLeftX, maxX: maxSafeRightX, centerY: rowH * 0.5 }];
  }

  /**
   * Draws a straight horizontal dry-graphite pencil strikethrough across EVERY wrapped line
   * of a task item between normalized [startProgress, endProgress].
   */
  drawGraphiteStroke(canvas, startProgress = 0.0, endProgress = 0.0) {
    const rowEl = canvas.parentElement;
    const cssW = Math.max(280, (rowEl && rowEl.clientWidth) || 362);
    const cssH = Math.max(36, (rowEl && rowEl.clientHeight) || 48);

    const dpr = 2;
    const targetW = Math.round(cssW * dpr);
    const targetH = Math.round(cssH * dpr);
    if (canvas.width !== targetW || canvas.height !== targetH) {
      canvas.width = targetW;
      canvas.height = targetH;
    }

    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const sProg = Math.max(0.0, Math.min(1.0, startProgress));
    const eProg = Math.max(0.0, Math.min(1.0, endProgress));
    if (eProg - sProg <= 0.01) return;

    const lineSegments = this.getTaskRowLineSegments(canvas);

    ctx.save();
    ctx.scale(dpr, dpr);

    lineSegments.forEach((seg, segIdx) => {
      const minX = seg.minX;
      const maxX = seg.maxX;
      const totalSpan = Math.max(20, maxX - minX);
      const currentStartX = minX + totalSpan * sProg;
      const currentEndX = minX + totalSpan * eProg;
      const centerY = seg.centerY;

      const grad = ctx.createLinearGradient(minX, centerY, maxX, centerY);
      grad.addColorStop(0.0, 'rgba(65, 63, 60, 0.88)');
      grad.addColorStop(0.72, 'rgba(72, 70, 66, 0.82)');
      grad.addColorStop(0.90, 'rgba(110, 108, 104, 0.56)');
      grad.addColorStop(1.0, 'rgba(150, 148, 144, 0.14)');

      ctx.strokeStyle = grad;
      ctx.lineWidth = 2.35;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(currentStartX, centerY);
      ctx.lineTo(currentEndX, centerY);
      ctx.stroke();

      const numGrains = Math.floor(totalSpan * 2.4);
      for (let i = 0; i < numGrains; i++) {
        const t = i / Math.max(1, numGrains);
        if (t < sProg || t > eProg) continue;
        const gx = minX + t * totalSpan;
        const seed = i + segIdx * 137;
        const hash1 = Math.sin(seed * 12.9898 + 4.1) * 43758.5453;
        const frac1 = hash1 - Math.floor(hash1);
        const hash2 = Math.cos(seed * 78.233 + 1.7) * 24634.6345;
        const frac2 = hash2 - Math.floor(hash2);

        const offsetY = (frac1 - 0.5) * 3.4;
        const tailFade = t > 0.74 ? (1.0 - (t - 0.74) / 0.26) * 0.85 : 1.0;
        const alpha = (0.22 + 0.36 * frac2) * tailFade;

        ctx.fillStyle = `rgba(58, 56, 53, ${alpha.toFixed(3)})`;
        ctx.fillRect(gx, centerY + offsetY - 0.45, 1.15, 0.95);
      }
    });

    ctx.restore();
  }

  bindTaskRowPencilGesture(rowEl, task, strikeCanvas, isStackCard = false) {
    let startX = null;
    let startY = null;
    let isTracking = false;
    let startedAtLeftEdgeBezel = false;

    rowEl.addEventListener('pointerdown', (e) => {
      if (e.target.closest('.task-tomato-btn')) return;
      e.stopPropagation(); // QA #1: Prevent bubbling to #daily-card-3d / #stack-card-3d so flip doesn't double-toggle
      startX = e.clientX;
      startY = e.clientY;
      const rowRect = rowEl.getBoundingClientRect();
      const relX = e.clientX - rowRect.left;

      // Determine where the actual task text ends so swiping on empty white space to the right flips the card!
      let maxTextRightX = rowRect.width - 52;
      const titleSpan = rowEl.querySelector('.task-title');
      if (titleSpan) {
        const rects = Array.from(titleSpan.getClientRects()).filter((r) => r.width > 2);
        if (rects.length > 0) {
          maxTextRightX = Math.max(...rects.map((r) => r.right - rowRect.left));
        }
      }

      startedAtLeftEdgeBezel = relX < 24 || relX > maxTextRightX + 18;
      isTracking = true;
      try {
        rowEl.setPointerCapture(e.pointerId);
      } catch (_) {}
    });

    rowEl.addEventListener('pointermove', (e) => {
      if (!isTracking || startX === null) return;
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;

      const activeWrapper = isStackCard ? this.els.stackCard3D : this.els.card3DWrapper;
      const baseDeg = isStackCard ? this._stackFlipDeg : this._todayFlipDeg;

      if (startedAtLeftEdgeBezel || dx < -10) {
        if (activeWrapper && Math.abs(dx) > Math.abs(dy) * 1.15) {
          const tiltOffset = Math.max(-65, Math.min(65, (dx / 180) * 65));
          const liveDeg = baseDeg + tiltOffset;
          activeWrapper.style.transition = 'none';
          activeWrapper.style.transform = `rotateY(${liveDeg.toFixed(1)}deg)`;
        }
        return;
      }

      const progress = CardGestureMath.strikethroughProgress(
        dx,
        dy,
        rowEl.clientWidth || 280
      );
      if (progress > 0) {
        if (!task.isCompleted) {
          this.drawGraphiteStroke(strikeCanvas, 0.0, progress);
        } else {
          this.drawGraphiteStroke(strikeCanvas, progress, 1.0);
        }
      }
    });

    const finishGesture = (e) => {
      if (!isTracking || startX === null) return;
      e.stopPropagation();
      isTracking = false;
      try {
        rowEl.releasePointerCapture(e.pointerId);
      } catch (_) {}

      const activeWrapper = isStackCard ? this.els.stackCard3D : this.els.card3DWrapper;
      if (activeWrapper) {
        activeWrapper.style.transition = '';
        activeWrapper.style.transform = '';
      }

      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      startX = null;
      startY = null;

      if (Math.abs(dx) < 6 && Math.abs(dy) < 6) {
        this.drawGraphiteStroke(strikeCanvas, 0.0, task.isCompleted ? 1.0 : 0.0);
        if (isStackCard) {
          this.openEditStackTaskModal(task);
        } else {
          this.openEditTaskModal(task);
        }
        return;
      }

      const gesture = CardGestureMath.classifyGesture(dx, dy, !startedAtLeftEdgeBezel);
      if (gesture === 'strikethrough') {
        task.isCompleted = !task.isCompleted;
        rowEl.dataset.completed = task.isCompleted ? 'true' : 'false';
        this.sensory.playPencilStrikethrough(!task.isCompleted);
        this.drawGraphiteStroke(strikeCanvas, 0.0, task.isCompleted ? 1.0 : 0.0);
        this.saveState();
      } else if (
        gesture === 'flipCard' ||
        ((startedAtLeftEdgeBezel || dx < -10) &&
          Math.abs(dx) >= 22 &&
          Math.abs(dx) > Math.abs(dy) * 1.15)
      ) {
        this.drawGraphiteStroke(strikeCanvas, 0.0, task.isCompleted ? 1.0 : 0.0);
        const dir = dx >= 0 ? 1 : -1;
        if (isStackCard) {
          this.triggerStackCardFlip(dir);
        } else {
          this.triggerCardFlip(dir);
        }
      } else {
        this.drawGraphiteStroke(strikeCanvas, 0.0, task.isCompleted ? 1.0 : 0.0);
      }
    };

    rowEl.addEventListener('pointerup', finishGesture);
    rowEl.addEventListener('pointercancel', finishGesture);
  }

  /**
   * Renders Screen 2: 6-Pomodoro 2x3 Grid View (Mockup 03-grid-timer.png)
   */
  renderGridScreen() {
    this.state.timers.forEach((slot, qIdx) => {
      const quadEl = this.els.gridQuadrants[qIdx];
      if (!quadEl) return;

      const isAssigned = Boolean(slot.assignedTaskId || slot.customTitle);
      const isCompleted = slot.runState === 'completed';
      const paletteKey = isAssigned ? qIdx : 'unassigned';
      const imgDataUrl = this.gridRenderer.getDataURL(paletteKey);
      const silverImgDataUrl = this.gridRenderer.getDataURL('completed');

      const readoutText = OdometerDialPhysics.formatMockupReadout(
        slot.remainingSeconds
      );
      const shortTitleText = OdometerDialPhysics.formatShortTomatoTitle(
        slot.customTitle || '',
        2,
        13
      );
      const isDropdownOpen = this.state.openDropdownQuadrant === qIdx;

      quadEl.innerHTML = '';

      const tomatoWrap = document.createElement('div');
      tomatoWrap.className = 'grid-tomato-wrap';

      if (isAssigned && isCompleted && !slot._justTransitionedSilver) {
        tomatoWrap.classList.add('is-silver-completed');
      } else if (isAssigned && !isCompleted && slot._justTransitionedFromSilver) {
        tomatoWrap.classList.add('is-silver-completed');
      }

      const img = document.createElement('img');
      img.className = 'grid-tomato-img grid-tomato-base-img';
      img.src = imgDataUrl;
      img.alt = isAssigned
        ? `${shortTitleText} Tomato Timer`
        : 'Unassigned Tomato Timer';
      tomatoWrap.appendChild(img);

      if (isAssigned) {
        const silverImg = document.createElement('img');
        silverImg.className = 'grid-tomato-img grid-tomato-silver-img';
        silverImg.src = silverImgDataUrl;
        silverImg.alt = '';
        silverImg.setAttribute('aria-hidden', 'true');
        tomatoWrap.appendChild(silverImg);
      }

      if (slot._justTransitionedSilver) {
        slot._justTransitionedSilver = false;
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            tomatoWrap.classList.add('is-silver-completed');
          });
        });
      } else if (slot._justTransitionedFromSilver) {
        slot._justTransitionedFromSilver = false;
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            tomatoWrap.classList.remove('is-silver-completed');
          });
        });
      }

      const overlay = document.createElement('div');
      overlay.className = 'grid-tomato-overlay';

      if (isAssigned) {
        tomatoWrap.title = 'Tap tomato body to open Hero Timer; tap title text to edit/reassign';

        const titleEl = document.createElement('div');
        titleEl.className = 'grid-tomato-title';
        titleEl.title = 'Tap title to edit or reassign task';
        titleEl.textContent = shortTitleText;
        titleEl.addEventListener('click', (e) => {
          e.stopPropagation();
          this.state.openDropdownQuadrant =
            this.state.openDropdownQuadrant === qIdx ? null : qIdx;
          this.renderGridScreen();
        });

        const timeEl = document.createElement('div');
        timeEl.className = 'grid-tomato-time';
        timeEl.classList.toggle('has-hours', slot.remainingSeconds > 3600);
        timeEl.textContent = readoutText;

        overlay.appendChild(titleEl);
        overlay.appendChild(timeEl);

        tomatoWrap.addEventListener('click', (e) => {
          e.stopPropagation();
          this.state.openDropdownQuadrant = null;
          this.state.selectedQuadrant = qIdx;
          this.state.timerSubMode = 'hero';
          this.saveState();
          this.renderAll();
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
        stopBtn.setAttribute(
          'aria-label',
          isCompleted ? 'Reset Timer to 00:00' : 'End Timer (Turn Silver Metallic)'
        );
        stopBtn.title = isCompleted
          ? 'Reset Tomato Timer to 00:00'
          : 'End Timer (Turns tomato Silver Metallic without clearing)';
        stopBtn.innerHTML = isCompleted
          ? `<svg width="21" height="21" viewBox="0 0 24 24" fill="none"><path d="M4.8 9.8C6.2 6.1 9.8 3.6 13.8 3.6C18.9 3.6 22.4 7.8 22.4 12.6C22.4 17.6 18.4 21.4 13.5 21.4C9.5 21.4 6.1 18.9 4.9 15.3" stroke="#0F0F0F" stroke-width="2.3" stroke-linecap="round"/><path d="M3.5 4.5V10.3H9.3" stroke="#0F0F0F" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"/></svg>`
          : `<svg width="20" height="20" viewBox="0 0 24 24"><rect x="2" y="2" width="20" height="20" rx="2.5" fill="#0F0F0F"/></svg>`;
        stopBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          this.handleEndOrResetButton(qIdx);
        });

        controlsRow.appendChild(playPauseBtn);
        controlsRow.appendChild(stopBtn);
      }

      quadEl.appendChild(controlsRow);
    });
  }

  buildTaskDropdownDOM(quadrant) {
    const slot = this.state.timers[quadrant];
    const hasExistingTitle = Boolean(slot && (slot.assignedTaskId || slot.customTitle));

    const menu = document.createElement('div');
    menu.className = 'task-assign-dropdown';
    menu.addEventListener('click', (e) => e.stopPropagation());

    const customBtn = document.createElement('button');
    customBtn.type = 'button';
    customBtn.className = 'dropdown-custom-header';
    const headerLabel = hasExistingTitle ? '✎ Edit Title...' : '+ Custom Title...';
    customBtn.innerHTML = `
      <span>${headerLabel}</span>
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

    const availableTasks = this.state.tasks.filter(
      (t) => t.assignedQuadrant === null || t.assignedQuadrant === undefined
    );

    availableTasks.forEach((t) => {
      const itemBtn = document.createElement('button');
      itemBtn.type = 'button';
      itemBtn.className = 'dropdown-task-item';
      itemBtn.textContent = t.title;
      itemBtn.addEventListener('click', () => {
        this.assignTaskToQuadrant(quadrant, t);
      });
      listBody.appendChild(itemBtn);
    });

    if (hasExistingTitle) {
      const unassignBtn = document.createElement('button');
      unassignBtn.type = 'button';
      unassignBtn.className = 'dropdown-task-item';
      unassignBtn.style.color = '#8B1E24';
      unassignBtn.textContent = '✕ Unassign Tomato';
      unassignBtn.addEventListener('click', () => {
        this.clearQuadrantAssignment(quadrant);
      });
      listBody.appendChild(unassignBtn);
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

    this.els.heroReadout.textContent = OdometerDialPhysics.formatMockupReadout(
      slot.remainingSeconds
    );
    this.els.heroReadout.classList.toggle('has-hours', slot.remainingSeconds > 3600);

    if (slot.assignedTaskId || slot.customTitle) {
      const orderStr = String(slot.assignedTaskOrder || slot.quadrant + 1).padStart(
        2,
        '0'
      );
      const shortTitle = OdometerDialPhysics.formatShortTomatoTitle(
        slot.customTitle || 'EXAMPLE TASK',
        4,
        22
      );
      this.els.heroSubtitle.textContent = `${orderStr} / ${shortTitle}`;
    } else {
      const orderStr = String(slot.quadrant + 1).padStart(2, '0');
      this.els.heroSubtitle.textContent = `${orderStr} / TAP TO ASSIGN`;
    }

    if (this.els.heroSubtitleDropdownMount) {
      this.els.heroSubtitleDropdownMount.innerHTML = '';
      if (this.state.isHeroDropdownOpen) {
        this.els.heroSubtitleDropdownMount.appendChild(
          this.buildTaskDropdownDOM(slot.quadrant)
        );
      }
    }

    const isAssigned = Boolean(slot.assignedTaskId || slot.customTitle);
    const isCompleted = slot.runState === 'completed';
    if (this.hero3D) {
      this.hero3D.updateOdometer(
        slot.angleDegrees,
        slot.quadrant,
        isAssigned,
        isCompleted
      );
    }

    this.els.heroBtnPlayPause.innerHTML =
      slot.runState === 'running'
        ? `<svg width="36" height="44" viewBox="0 0 36 44"><rect x="4" y="2" width="10" height="40" rx="3" fill="#0F0F0F"/><rect x="22" y="2" width="10" height="40" rx="3" fill="#0F0F0F"/></svg>`
        : `<svg width="36" height="44" viewBox="0 0 36 44"><path d="M6 3 L33 22 L6 41 Z" fill="#0F0F0F" stroke="#0F0F0F" stroke-width="2" stroke-linejoin="round"/></svg>`;

    if (this.els.heroBtnStop) {
      this.els.heroBtnStop.setAttribute(
        'aria-label',
        isCompleted ? 'Reset Timer to 00:00' : 'End Timer (Turn Silver Metallic)'
      );
      this.els.heroBtnStop.title = isCompleted
        ? 'Reset Tomato Timer to 00:00'
        : 'End Timer (Turns tomato Silver Metallic without clearing)';
      this.els.heroBtnStop.innerHTML = isCompleted
        ? `<svg width="36" height="36" viewBox="0 0 36 36" fill="none"><path d="M7.5 14.5C9.5 9.2 14.6 5.5 20.5 5.5C28.2 5.5 33.5 11.8 33.5 18.8C33.5 26.2 27.6 31.8 20.2 31.8C14.2 31.8 9.2 28.1 7.4 22.8" stroke="#0F0F0F" stroke-width="3.0" stroke-linecap="round"/><path d="M5.5 6.8V15.2H13.9" stroke="#0F0F0F" stroke-width="3.0" stroke-linecap="round" stroke-linejoin="round"/></svg>`
        : `<svg width="36" height="36" viewBox="0 0 36 36"><rect x="3" y="3" width="30" height="30" rx="4.5" fill="#0F0F0F"/></svg>`;
    }

    this.els.heroBtnStopwatch.classList.toggle(
      'stopwatch-active',
      slot.mode === 'stopwatch'
    );
  }

  // =========================================================================
  // MODALS FOR ADDING / EDITING TASKS (TODAY'S CARD & RETROACTIVE STACK)
  // =========================================================================

  openAddTaskModal() {
    if (this.state.tasks.length >= 6) {
      this.showNotificationBanner('Maximum 6 tasks per Daily Card reached.');
      return;
    }
    this.openInputModal(
      'Add Task',
      '',
      (val) => {
        const cleanVal = this.clampTaskInputText(val).trim();
        if (!cleanVal) return;
        const newOrder = this.state.tasks.length + 1;
        this.state.tasks.push({
          id: 'task-' + Date.now(),
          orderIndex: newOrder,
          title: cleanVal,
          isCompleted: false,
          assignedQuadrant: null,
        });
        this.sensory.playMechanicalTick();
        this.saveState();
        this.renderAll();
      },
      null,
      true
    );
  }

  openAddStackTaskModal() {
    const card = this.getSelectedStackCard();
    if (!card) return;
    if (!Array.isArray(card.tasks)) card.tasks = [];
    if (card.tasks.length >= 6) {
      this.showNotificationBanner('Maximum 6 tasks per Daily Card reached.');
      return;
    }
    this.openInputModal(
      `Add Task to ${card.shortDate}`,
      '',
      (val) => {
        const cleanVal = this.clampTaskInputText(val).trim();
        if (!cleanVal) return;
        card.tasks.push({
          id: `${card.dateKey}-task-${Date.now()}`,
          orderIndex: card.tasks.length + 1,
          title: cleanVal,
          isCompleted: false,
        });
        this.sensory.playMechanicalTick();
        this.saveState();
        this.renderStackScreen();
      },
      null,
      true
    );
  }

  openEditStackTaskModal(task) {
    const card = this.getSelectedStackCard();
    if (!card) return;
    this.openInputModal(
      `Edit ${card.shortDate} Task ${String(task.orderIndex).padStart(2, '0')}`,
      task.title,
      (val) => {
        const cleanVal = this.clampTaskInputText(val).trim();
        if (!cleanVal) {
          card.tasks = card.tasks.filter((t) => t.id !== task.id);
          card.tasks.forEach((t, idx) => {
            t.orderIndex = idx + 1;
          });
          this.saveState();
          this.renderStackScreen();
          this.showNotificationBanner('Task removed from archived card');
          return;
        }
        task.title = cleanVal;
        this.saveState();
        this.renderStackScreen();
      },
      () => {
        card.tasks = card.tasks.filter((t) => t.id !== task.id);
        card.tasks.forEach((t, idx) => {
          t.orderIndex = idx + 1;
        });
        this.saveState();
        this.renderStackScreen();
        this.showNotificationBanner('Task removed from archived card');
      },
      true
    );
  }

  openEditTaskModal(task) {
    this.openInputModal(
      `Edit Task ${String(task.orderIndex).padStart(2, '0')}`,
      task.title,
      (val) => {
        const cleanVal = this.clampTaskInputText(val).trim();
        if (!cleanVal) {
          this.confirmPermanentDeleteTask(task);
          return;
        }
        task.title = cleanVal;
        for (const s of this.state.timers) {
          if (s.assignedTaskId === task.id) {
            s.customTitle = task.title;
          }
        }
        this.saveState();
        this.renderAll();
      },
      () => {
        this.confirmPermanentDeleteTask(task);
      },
      true
    );
  }

  confirmPermanentDeleteTask(task) {
    if (this.els.deleteModalTitle) {
      this.els.deleteModalTitle.textContent = 'Permanently delete this item?';
    }
    if (this.els.deleteModalDesc) {
      this.els.deleteModalDesc.textContent =
        'This action cannot be undone. The item will be permanently removed from Today’s Card.';
    }
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
          s.runState = 'idle';
          s.remainingSeconds = 0;
          s.configuredMinutes = 0;
          s.angleDegrees = 0;
          s.lastTickTimestamp = null;
        } else if (s.assignedTaskId) {
          const remainingTask = this.state.tasks.find((t) => t.id === s.assignedTaskId);
          if (remainingTask) {
            s.assignedTaskOrder = remainingTask.orderIndex;
          }
        }
      }
      this.saveState();
      this.renderAll();
      this.showNotificationBanner('Item permanently deleted & associated tomato reset');
    };
    const cleanup = () => {
      this.els.deleteModalCancel.removeEventListener('click', onCancel);
      this.els.deleteModalConfirm.removeEventListener('click', onConfirm);
    };
    this.els.deleteModalCancel.addEventListener('click', onCancel);
    this.els.deleteModalConfirm.addEventListener('click', onConfirm);
  }

  openCustomTitleModal(quadrant) {
    const slot = this.state.timers[quadrant];
    const current = slot?.customTitle || '';
    const isEditingExisting = Boolean(slot && (slot.assignedTaskId || slot.customTitle));
    this.openInputModal(
      isEditingExisting ? 'Edit Timer Title' : 'Assign Custom Timer Title',
      current,
      (val) => {
        const cleanVal = this.clampTaskInputText(val).trim();
        if (!cleanVal) return;
        if (slot && slot.assignedTaskId) {
          const linkedTask = this.state.tasks.find((t) => t.id === slot.assignedTaskId);
          if (linkedTask) {
            linkedTask.title = cleanVal;
          }
          slot.customTitle = cleanVal;
          this.state.openDropdownQuadrant = null;
          this.state.isHeroDropdownOpen = false;
          this.saveState();
          this.renderAll();
        } else {
          this.assignCustomTitleToQuadrant(quadrant, cleanVal);
        }
      },
      null,
      true
    );
  }

  openInputModal(title, initialValue, onSave, onDelete = null, enforceTaskCap = true) {
    this.els.modalTitle.textContent = title;
    this.els.modalInput.value = initialValue;
    this.els.modalInput.maxLength = enforceTaskCap ? MAX_TASK_CHARS : 48;
    if (this.els.modalDelete) {
      this.els.modalDelete.classList.toggle('hidden', !onDelete);
    }
    this.els.modalOverlay.classList.remove('hidden');
    setTimeout(() => this.els.modalInput.focus(), 30);

    const onInput = () => {
      if (!enforceTaskCap) return;
      const clamped = this.clampTaskInputText(this.els.modalInput.value);
      if (this.els.modalInput.value !== clamped) {
        this.els.modalInput.value = clamped;
        this.showTelemetryToast(`Task limit: max ${MAX_TASK_WORDS} words / ${MAX_TASK_CHARS} chars`);
      }
      const len = this.els.modalInput.value.length;
      this.els.modalInput.style.fontSize = len > 26 ? '14.5px' : len > 18 ? '15.5px' : '16.5px';
    };
    onInput();

    const close = () => {
      this.els.modalOverlay.classList.add('hidden');
      cleanup();
    };
    const confirm = () => {
      const val = this.els.modalInput.value;
      close();
      onSave(val);
    };
    const handleDelete = () => {
      close();
      if (onDelete) onDelete();
    };
    const onKey = (e) => {
      if (e.key === 'Enter') confirm();
      if (e.key === 'Escape') close();
    };
    const cleanup = () => {
      this.els.modalCancel.removeEventListener('click', close);
      this.els.modalConfirm.removeEventListener('click', confirm);
      if (this.els.modalDelete) {
        this.els.modalDelete.removeEventListener('click', handleDelete);
      }
      this.els.modalInput.removeEventListener('keydown', onKey);
      this.els.modalInput.removeEventListener('input', onInput);
    };

    this.els.modalCancel.addEventListener('click', close);
    this.els.modalConfirm.addEventListener('click', confirm);
    if (this.els.modalDelete && onDelete) {
      this.els.modalDelete.addEventListener('click', handleDelete);
    }
    this.els.modalInput.addEventListener('keydown', onKey);
    this.els.modalInput.addEventListener('input', onInput);
  }

  initFirstTimeOnboarding() {
    if (!this.els.onboardingOverlay) return;
    const dismiss = () => {
      this.els.onboardingOverlay.classList.add('hidden');
      this.state.hasCompletedOnboarding = true;
      this.saveState();
      this.checkFirstTimePageHint();
    };
    if (this.els.onboardingDismissBtn) {
      this.els.onboardingDismissBtn.addEventListener('click', dismiss);
    }
    this.els.onboardingOverlay.addEventListener('click', (e) => {
      if (e.target === this.els.onboardingOverlay) {
        dismiss();
      }
    });
    if (!this.state.hasCompletedOnboarding) {
      this.els.onboardingOverlay.classList.remove('hidden');
    } else {
      this.checkFirstTimePageHint();
    }
  }

  checkFirstTimePageHint() {
    if (!this.state.hasCompletedOnboarding) return;
    if (!this.state.seenPageHints || typeof this.state.seenPageHints !== 'object') {
      this.state.seenPageHints = {};
    }

    const pillar = this.state.activePillar;
    let pageKey = null;
    let hintText = null;

    if (pillar === 'home') {
      pageKey = 'home';
      hintText = 'Tap the card to plan today, or click on the tomato to start a timer';
    } else if (pillar === 'card') {
      if (!this.state.isCardFlipped) {
        pageKey = 'card_front';
        hintText = 'Swipe on text to cross out the item · Swipe edge to flip to journal page';
      } else {
        pageKey = 'card_back';
        hintText = 'Journal page: write evening reflections or tap to attach photos';
      }
    } else if (pillar === 'timer') {
      if (this.state.timerSubMode === 'grid') {
        pageKey = 'timer_grid';
        hintText = 'Click on a tomato to start a timer · Tap title text to edit';
      } else {
        pageKey = 'timer_hero';
        hintText = 'Drag the tomato dial or tap the digits to set duration';
      }
    } else if (pillar === 'stack') {
      if (!this.state.isStackCardFlipped) {
        pageKey = 'stack_front';
        hintText = 'Drag left or right (or scroll) to move through archived cards';
      } else {
        pageKey = 'stack_back';
        hintText = 'Archived journal page: tap text or photos to edit retroactively';
      }
    } else if (pillar === 'calendar') {
      pageKey = 'calendar';
      hintText = 'Tap any highlighted date to open that day’s card';
    }

    if (pageKey && hintText && !this.state.seenPageHints[pageKey]) {
      this.state.seenPageHints[pageKey] = true;
      this.saveState();
      this.showTelemetryToast(hintText, 2800);
    }
  }

  showTelemetryToast(msg, durationMs = 1900) {
    if (!this.els.toastPill) return;
    this.els.toastPill.textContent = msg;
    this.els.toastPill.classList.add('visible');
    clearTimeout(this._toastTimer);
    this._toastTimer = setTimeout(() => {
      this.els.toastPill.classList.remove('visible');
    }, durationMs);
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

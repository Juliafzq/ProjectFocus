# Fable / Flow — Master Product Requirements Document (v4.3) & Technical Implementation Plan

> **Authoritative Spec & Phase 2 (`v0.5.0-mvp`) Completion Baseline:**
> This master document consolidates the **Product Requirements Document (v4.3)** and **Technical Implementation Plan (v4.3)**, documenting every feature, visual preference, 3D shader refinement, typography rule, gesture mechanic, onboarding flow, and QA/PM/User fix implemented through **Phase 1 (`v0.2.0-beta`)** and **Phase 2 (`v0.5.0-mvp`)**.

---

# Part I: Product Requirements Document (v4.3)

## 1. Idea & Background

**A tactile, digital-analog tool space that increases a user's sense of lived fulfillment by restoring daily focus, accomplishment, and presence without coercive gamification, complex hierarchies, or productivity guilt.**

Project **Fable / Flow** delivers a calm, hyper-minimalist, physical-first environment built around two tactile objects—a **dual-sided index card** and a **photorealistic 3D heirloom tomato Pomodoro timer**—replacing abstract dashboards with organic, physical tools for daily planning, deep focus, and evening reflection.

---

## 2. Owner Visual & Tactile Preferences (Locked Baseline Across All Phases)

The following visual and interaction preferences are **mandatory requirements** across Phase 1, Phase 2, and Phase 3:

1. **Photorealistic Studio-Lit Heirloom Tomatoes & Seamless Background Feathering (`#EAE8E3` / `#E7E8E2`):**
   - All tomato sprites (`home-tomato.png`, `hero-tomato-*`, `grid-tomato-*`, `mini-tomato-*`) derive from the studio-lit sculpted heirloom tomato renders with extended canvas margins (`500×500` on Hero/Home, `340×340` on Grid) whose cast shadows feather seamlessly into the page background so **no square border or cropping boundary is ever visible**.
2. **Clean Equatorial Seam & Unclipped Perspective-Accurate 3D Curve Numbers on Hero Tomato:**
   - The center opening (equatorial seam) on the Hero Tomato has a clean, smooth lip following $y_{\text{seam}}(u) = 258.8 + 0.5 u - 18.2 u^2 - 15.2 u^4$ (where $u = \frac{x - 250.5}{215.5} \in [-1, 1]$).
   - Measurement ticks (`1-min` minor, `5-min` medium, `10-min` major) and numbers (`0, 10, 20 ... 180`) wrap around a true 2x Retina 3D surface mesh (`texH = 92 * K`, `meshHalfH = 44`, `numCenterY = 47.0 * K`, `padX = 16 * K`) with 4x horizontal supersampling so every character (`0`–`180`) is **100% shown with zero top, bottom, or side clipping**.
3. **Satin-Polished, Lower-Contrast Silver Metallic Completed Tomato (`docs/mockup-images/silver-sphere-ref.png`):**
   - When a countdown finishes (`00:00`) or the user clicks `End (■)`, the tomato smoothly transitions (`620ms` cross-fade) into a **Satin-Polished Silver Metallic** tomato (`hero-tomato-silver.png`, `grid-tomato-silver.png`, `mini-tomato-silver.png`).
   - **Reference-Mapped Studio Environment Reflection (`scripts/extract_mockup_assets.py`):**
     - Samples the 12-pass Gaussian-smoothed spherical studio reflection field directly from the reference silver sphere (`docs/mockup-images/silver-sphere-ref.png`) using contour-following heirloom coordinates (`bx, by`), producing a broad luminous upper studio dome reflection (`RGB ~ 240–249`), a soft low-contrast mid-silver core reflection (`RGB ~ 128–150`, never harsh black), and a bright tabletop bounce reflection (`RGB ~ 190–210`) around the lower belly and sides.
     - Uses Green-channel absorption alpha ($\alpha_G$) around all $360^\circ$ of the silhouette for crisp, natural studio anti-aliased edges.
4. **Shiny, Single-Highlight Small Card Tomato Icons (`mini-tomato-*`):**
   - The small tomato icons on Today's Card Front are rendered with smooth $C^\infty$ 3D dome shading, **zero horizontal strips/bands**, **zero pink outer/stem halo**, and **one crisp specular highlight** on the upper-left cheek.
5. **Clean White Front Card, Unified Card Typography & Multi-Line Pencil Strikethrough:**
   - Today's Card Front uses a clean white surface (`#FDFDFB`, zero background dots).
   - **Unified Font Size Per Card (`fitUnifiedCardTaskTypography`):** All task numbers (`.task-index`), task titles (`.task-title`), and `+ Add item` on a card share the **exact same unified font size** (`24px` baseline). Font size **never** shrinks on a single long task independently; it only steps down uniformly (`24px` → `16.5px` floor) when the **entire vertical card page is filled**.
   - **Task Word/Character Limit:** Tasks allow up to **18 words / 110 characters** (`MAX_TASK_WORDS = 18`, `MAX_TASK_CHARS = 110`).
   - **Multi-Line Pencil Strikethrough & Erase (`getTaskRowLineSegments`):** Dragging `Left → Right` across a multi-line task draws (or erases from `Left → Right`) a dry-graphite pencil line across **every wrapped line of text**, while maintaining a safe right margin (`maxSafeRightX`) so lines never touch the mini-tomato icon or card edge.
6. **Two-Way Silent 3D Card Flip (`Left ↔ Right`):**
   - Both Today's Card (`#daily-card-3d`) and Archived Stack Cards (`#stack-card-3d`) can be flipped `180°` in **both directions** (swiping `Right → Left` or `Left → Right` on the card surface/margins, or tapping the `[Flip]` button).
   - Card flipping and stack dragging are **silent on audio** (no synthetic "whoop" sound), providing clean visual 3D motion and light tactile haptics.
7. **Clean Initial Profile — Single `"Example Task"` Only:**
   - When a user opens the app for the first time, they see a **100% clean profile**:
     - **Today's Card Front:** Only **`01 Example Task`** is filled out (`tasks: [{ id: 'task-1', orderIndex: 1, title: 'Example Task', isCompleted: false, assignedQuadrant: null }]`).
     - **Today's Card Back (Journal):** Completely blank (`reflectionText: ''`, `reflectionPhotos: []`).
     - **Card Stack Archive & Calendar:** Starts with zero past-day cards (`archiveCards: {}`).

---

## 3. Detailed Functional Requirements & Phase 2 Updates

### A. Minimalist 2-Object Homepage (`01-home-page.png` — Screen 0)

1. **Exact Mockup Typography & Proportions:**
   - **Top Header (`#home-brand-title`):** Centered `'FABLE / FLOW'` in `24px` sans-serif (`weight: 500`, `letter-spacing: 0.24em`, `#141413`) with the minimalist `[Profile Icon]` in the top-right corner.
   - **Upper Object — Miniature Daily Card (`#home-mini-card`):** Exact `334×222px` horizontal white card (`border-radius: 12px`) stamped in the top-left with **`06 OCT`** (`28px` editorial serif, `weight: 400`, `letter-spacing: 0.03em`). Tapping opens Today's Card Front.
   - **Lower Object — 3D Heirloom Tomato (`#home-tomato-btn`):** Photorealistic `450px` studio-lit Crimson Tomato (`assets/tomatoes/home-tomato.png`, extracted from `01-home-page.png` with zero numbers/pointer). Tapping opens the Timer pillar.

### B. Minimalist Profile Popover, Animated Visual Gesture Tour & Constrained Toast Hints

1. **Minimalist Top-Right Profile Popover (`#profile-modal-overlay`):**
   - Tapping `#profile-btn` opens a compact, zero-clutter popover anchored in the top-right with four controls:
     - **`Home`:** Returns immediately to the Minimalist 2-Object Homepage (`#screen-home`).
     - **`Guided Tour` (`#profile-guided-tour-btn`):** Launches the animated visual gesture tour at any time.
     - **`Daily Reset`:** Dropdown selector (`12:00 AM` through `11:00 PM`, default `05:00 AM`) controlling when Today's Card automatically archives into the Stack and resets for the new day.
     - **`Sound`:** One-tap toggle between `On` and `Off` (`isSilentMode`), persisted across reloads.
2. **Clean, Non-Interactive Minimalist Animated Tutorial Modal (`#onboarding-overlay` — Visual > Text):**
   - Launches automatically on a user's first visit (`hasCompletedOnboarding: false`) and can be replayed anytime from **Profile → Guided Tour**.
   - Covers the full viewport with `pointer-events: auto` (`rgba(18, 18, 16, 0.42)` + `backdrop-filter: blur(4px)`) and blocks all pointer/wheel events from reaching the underlying pages so users **cannot** accidentally interact with background pages while going through the tutorial.
   - Displays a clean centered minimalist card (`.guided-tour-card`) containing **only**:
     1. **Minimalist Geometric Animation (`#tour-anim-stage`):**
        - **Step 1 (`Flip Page`):** Minimalist 3D card flipping `180°` (`See back of card`).
        - **Step 2 (`Swipe Text`):** Minimalist line drawing across a task bar (`Cross out or erase an item`).
        - **Step 3 (`Tap Tomato`):** Minimalist tomato circle with concentric pulse ring (`Assign task and open timer`).
        - **Step 4 (`Turn Dial`):** Minimalist dial seam with sliding tick marks (`Set duration, or tap digits`).
        - **Step 5 (`Scroll Stack`):** Minimalist layered cards sliding horizontally (`Browse past daily cards`).
     2. **The Action (`#tour-step-title`)** and **What It Does (`#tour-step-desc`)**.
     3. **`Last` (`#tour-prev-btn`) and `Next` / `Done` (`#tour-next-btn`) buttons**.
3. **Constrained Toast Pop-Up Width (`max-width: calc(100% - 56px)`):**
   - All toast pills (`.telemetry-toast`) enforce `width: max-content; max-width: calc(100% - 56px); white-space: normal; text-align: center;` so toast notifications never bleed into the left or right edges of the screen.
4. **First-Visit Contextual Page Hint Toasts (`checkFirstTimePageHint`):**
   - Displays a subtle, one-time bottom pill toast the first time a user visits each screen (`seenPageHints` persisted in `localStorage`).

### C. Pillar 1: Flow / Engagement (6-Pomodoro Grid & Single Big Hero Tomato)

1. **6-Tomato Grid View (`2×3` Layout — Screen 2):**
   - **Split Tap Targets on Assigned Grid Tomatoes (`PM #1`):**
     - Tapping an assigned tomato's **body** opens the **Single Big Hero Tomato View** for that slot.
     - Tapping an assigned tomato's **task title text** (`.grid-tomato-title`) opens the **Task Edit / Reassignment Dropdown** right on the Grid.
   - **Inline Title Editing (`PM #2`):**
     - When a tomato already has an assigned task or custom title, the top action in the dropdown reads **`✎ Edit Title...`** (pre-filling the current title and updating both the tomato and any linked card task).
2. **Single Big Hero Tomato View (Screen 3):**
   - **1-Minute (`6.0°`) Bidirectional Dial + Tap-on-Digits Time Entry (`0–180m` / `HH:MM`):**
     - Dragging `Right → Left` winds up; dragging `Left → Right` unwinds.
     - Tapping `#hero-readout` opens `#hero-time-editor` with `0–180m` / `HH:MM` input and preset pills (`15m..180m`).
   - **Stopwatch Mode Duration Guard (`QA #1`):**
     - Attempting to drag the Hero tomato dial or tap the digits while in Stopwatch mode displays a subtle toast: **`"Switch to Countdown to set duration"`**.
   - **Hide `End Timer (■)` When Tomato Has Not Been Set (`isTimerSlotSet`):**
     - When a tomato has not been set (unassigned or `remainingSeconds === 0 && runState === 'idle'`), the `End Timer (■)` button (`#hero-btn-stop` on Hero, `stopBtn` on Grid) is completely hidden.
   - **Two-Step `End (■)` → Satin-Polished Silver Metallic → `Reset (↺)` Flow:**
     - Ending an active/set timer or reaching `00:00` transitions the tomato into Satin-Polished Silver Metallic (`runState = 'completed'`) and turns `End (■)` into `Reset (↺)`.

### D. Pillar 2: Purpose & Presence (Dual-Sided Card, Stack & Calendar)

1. **Front of Today's Card (`04-card-front.png` — Screen 1):**
   - Clean white cardstock (`#FDFDFB`), stamped `TUESDAY — OCT 06`, starting with a single `01 Example Task`.
   - Up to 6 flat tasks (`01`–`06`), unified `24px` typography (only shrinking if the whole page is filled), `18-word / 110-char` cap, multi-line `Left → Right` graphite strikethrough & erase, and two-way `180°` card flip.
   - **2-Icon Bottom Action Bar (`[Stack]` and `[Flip]`):** The redundant bottom `+` button has been removed from `.card-bottom-bar` since tasks are added via `+ Add item` on the card front and photos via `+ Attach Photo` on the card back.
2. **Back of Today's Card (`05-card-back.png` — Matte Black Evening Reflection Journal):**
   - Matte black cardstock (`#141413`) with `#FAF9F5` editorial serif typography.
   - **Unified Reflection Typography (`adjustReflectionTypography`):** Remains at `21px` unless the entire reflection area is vertically filled (`scrollHeight > clientHeight + 2`), then steps down uniformly to a `13px` minimum floor (`MAX_REFLECTION_WORDS = 95`, `MAX_REFLECTION_CHARS = 520`).
   - **0 to 2 Framed Photo Slots (`#card-back-photos`):** Client-side compression (`≤ 1600px` JPEG via `compressImageFileToDataURL`). Tapping an existing photo replaces it in place; tapping `×` removes it.
3. **Chronological Card Stack Viewer (`06-stack-detail.png` — Screen 4):**
   - **Empty Archive State on Clean Profile:** When no past cards have been archived yet (`archiveCards: {}`), displays `"NO ARCHIVED CARDS YET"` and `"Past cards appear here automatically after each Daily Reset."` with disabled peek cards.
   - **Interactive Stack Scrolling & Visible Slide Motion:**
     - Users can scroll through archived cards via horizontal drag on the peeking cards/carousel stage (`#stack-carousel-stage`), mouse wheel / trackpad scroll, scrubbing along `#stack-date-strip`, or tapping `#stack-peek-left` / `#stack-peek-right`.
     - Every card change triggers a visible directional slide animation (`animateStackCardScroll`: `stackSlideFromRight` / `stackSlideFromLeft`, `280ms cubic-bezier(0.22, 1, 0.36, 1)`) or a boundary bounce (`animateStackBoundaryBounce`) at the ends of the stack.
   - **Full Retroactive Editing & Independent State:** Past cards in the Stack can be edited (tasks, strikethroughs, reflection text, and photos) independently of Today's Card, or permanently deleted via `[Trash 🗑]`.
4. **Monthly Calendar Zoom-Out View (`07-calendar-view.png` — Screen 5):**
   - Dynamically renders monthly grids from **September 1, 2026 through December 31, 2026**, and **always renders at least 2 additional months after the current card month** (`SEPTEMBER 2026`, `OCTOBER 2026`, `NOVEMBER 2026`, `DECEMBER 2026`).
   - Highlights Today's card (`.has-card.is-today`) and any archived cards (`.has-card`), dims future dates (`.is-future`), and navigates directly to Today's Card or the selected Stack Card on tap.

---

# Part II: Phase 2 (`v0.5.0-mvp`) Technical Implementation Summary

## 1. File-by-File Architecture (`v0.5.0-mvp` — Complete & Verified `21/21 PASS`)

| File Path | Phase 2 Implementation Responsibilities |
| :--- | :--- |
| [`index.html`](file:///usr/local/google/home/zuqi/github/ProjectFocus/index.html) | Defines all 7 mockup screens (`#screen-home`, `#screen-card`, `#screen-grid`, `#screen-hero`, `#screen-stack`, `#screen-calendar`), the minimalist top-right Profile Popover (`#profile-modal-overlay`: `Home`, `Daily Reset`, `Sound`), the First-Time Onboarding Modal (`#onboarding-overlay`), and PWA mobile web-app metadata (`manifest.json`, `apple-mobile-web-app-capable`). |
| [`css/style.css`](file:///usr/local/google/home/zuqi/github/ProjectFocus/css/style.css) | Implements exact `01-home-page.png` geometry (`334×222px` mini-card, `28px` date stamp, `24px` `FABLE / FLOW` header), 3D two-way card flip perspectives (`--card-flip-deg`), Stack card slide/bounce keyframe animations (`stackSlideFromRight`, `stackSlideFromLeft`, `stackBounceRight`, `stackBounceLeft`), Matte Black journal layout, Calendar multi-month scroll container, Profile popover, and Onboarding card styling. |
| [`js/app.js`](file:///usr/local/google/home/zuqi/github/ProjectFocus/js/app.js) | Implements clean initial state (`STORAGE_KEY = 'fable_flow_phase2_mvp_v3'`, single `Example Task`, empty journal/photos, empty `archiveCards: {}`), live configurable `dailyResetHour` rollover ticker, unified card task typography (`fitUnifiedCardTaskTypography`), multi-line pencil strikethrough (`getTaskRowLineSegments`), two-way `window`-tracked 3D card flip (`bindTwoWayCardFlipOnWrapper`), Stack drag/wheel/strip scrolling with slide animations, Sep–Dec+2M Calendar generator, and first-time onboarding + contextual page hints. |
| [`js/tomato3D.js`](file:///usr/local/google/home/zuqi/github/ProjectFocus/js/tomato3D.js) | Implements `HeroTomato3DView` with expanded odometer strip (`texH = 92 * K`, `meshHalfH = 44`, `numCenterY = 47.0 * K`, `padX = 16 * K`) so every digit `0`–`180` renders unclipped, plus `GridTomatoRenderer` for the 6 heirloom shades, grey unassigned state, and silver metallic state. |
| [`js/sensoryEngine.js`](file:///usr/local/google/home/zuqi/github/ProjectFocus/js/sensoryEngine.js) | Implements WebAudio procedural foley for dial ratchet notches, graphite pencil scratch/erase, trash delete, and the Mechanical Dual-Bell Pomodoro Chime, while keeping `playCardFlipSwoosh()` and `playStackRiffleTick()` silent on audio per user preference and suppressing debug haptic toasts. |
| [`scripts/extract_mockup_assets.py`](file:///usr/local/google/home/zuqi/github/ProjectFocus/scripts/extract_mockup_assets.py) | Extracts `home-tomato.png` from `01-home-page.png` and generates `hero-tomato-silver.png`, `grid-tomato-silver.png`, and `mini-tomato-silver.png` using Green-channel absorption alpha ($\alpha_G$) around all $360^\circ$ of the silhouette plus $38\%$ studio photo diffuse modulation (`photo_mod`) for natural 3D shading and crisp, un-cropped edges. |
| [`tests/evaluate_phase1.py`](file:///usr/local/google/home/zuqi/github/ProjectFocus/tests/evaluate_phase1.py) | Automated 21-check evaluation suite verifying all Phase 1 and Phase 2 architectural, mathematical, visual, and HTTP asset serving requirements (`21/21 PASS`). |

---

## 2. Local Persistence vs. Phase 3 Cloud Sync

- **Phase 2 On-Device Persistence (`localStorage` via `fable_flow_phase2_mvp_v3`):**
  - Each user/friend opening the public web link (`https://juliafzq.github.io/ProjectFocus/`) has their own isolated browser `localStorage` on their phone or laptop.
  - Automatically remembers first-time tutorial completion (`hasCompletedOnboarding`), seen page hints (`seenPageHints`), sound/reset settings, active tasks, timers, evening reflections, compressed photos, and archived stack cards across browser reloads on that device.
- **Phase 3 (`v1.0.0-rc1` — Future Scope):**
  - Adds optional user authentication (Sign in with Apple / Cloud Account), cross-device CloudKit/backend sync, 7-day trial & StoreKit 2 hybrid paywall, and native iOS Lock Screen Live Activities / Dynamic Island widgets.

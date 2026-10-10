# Fable / Flow — Master Product Requirements Document (v4.4) & Technical Implementation Plan

> **Authoritative Spec & Phase 2 (`v0.6.0-mvp` / `v27`) Completion Baseline:**
> This master document consolidates the **Product Requirements Document (v4.4)** and **Technical Implementation Plan (v4.4)**, documenting every feature, visual preference, 3D shader refinement, typography rule, gesture mechanic, onboarding flow, retrospective card creation flow, dynamic system date refresh, and QA/PM/User fix implemented through **Phase 1 (`v0.2.0-beta`)** and **Phase 2 (`v0.6.0-mvp` / `v27`)**.

---

# Part I: Product Requirements Document (v4.4)

## 1. Idea & Background

**A tactile, digital-analog tool space that increases a user's sense of lived fulfillment by restoring daily focus, accomplishment, and presence without coercive gamification, complex hierarchies, or productivity guilt.**

Project **Fable / Flow** delivers a calm, hyper-minimalist, physical-first environment built around two tactile objects—a **dual-sided index card** and a **photorealistic 3D heirloom tomato Pomodoro timer**—replacing abstract dashboards with organic, physical tools for daily planning, deep focus, and evening reflection.

---

## 2. Owner Visual & Tactile Preferences (Locked Baseline Across All Phases)

The following visual and interaction preferences are **mandatory requirements** across Phase 1, Phase 2, and Phase 3:

1. **Photorealistic Studio-Lit Heirloom Tomatoes & Seamless Background Feathering (`#EAE8E3` / `#E7E8E2`):**
   - All tomato sprites (`home-tomato.png`, `hero-tomato-*`, `grid-tomato-*`, `mini-tomato-*`) derive from the studio-lit sculpted heirloom tomato renders with extended canvas margins (`500×500` on Hero, `700×600` on Home centered on the `0` marker & `▲` pointer apex, `340×340` on Grid) whose cast shadows feather seamlessly into the page background so **no square border or cropping boundary is ever visible**.
2. **Clean Equatorial Seam & Unclipped Perspective-Accurate 3D Curve Numbers on Hero Tomato:**
   - The center opening (equatorial seam) on the Hero Tomato has a clean, smooth lip following $y_{\text{seam}}(u) = 258.8 + 0.5 u - 18.2 u^2 - 15.2 u^4$ (where $u = \frac{x - 250.5}{215.5} \in [-1, 1]$).
   - Measurement ticks (`1-min` minor, `5-min` medium, `10-min` major) and numbers (`0, 10, 20 ... 180`) wrap around a true 2x Retina 3D surface mesh (`texH = 92 * K`, `meshHalfH = 44`, `numCenterY = 47.0 * K`, `padX = 16 * K`, tight `rimFade` at `|u| > 0.962`) with 4x horizontal supersampling so every character (`0`–`180`) is **100% shown with zero top, bottom, or side clipping**.
3. **Satin-Polished, Crisp-Edged, Zero-Color-Bleed Silver Metallic Completed Tomato (`docs/mockup-images/silver-sphere-ref.png`):**
   - When a countdown finishes (`00:00`) or the user clicks `End (■)`, the tomato smoothly transitions (`620ms` cross-fade) into a **Satin-Polished Silver Metallic** tomato (`hero-tomato-silver.png`, `grid-tomato-silver.png`, `mini-tomato-silver.png`).
   - **True Reference-Sphere Coordinates & Un-Pinched Reflection (`scripts/extract_mockup_assets.py`):**
     - Samples the 12-pass Gaussian-smoothed spherical studio reflection field from `docs/mockup-images/silver-sphere-ref.png` at its exact sphere coordinates (`cx=276.0, cy=151.0, r=108.5`) using smooth ellipsoidal coordinates `(nx_ell, by_ell)` so reflections wrap smoothly around the lower belly without pinching.
   - **Crisp 1.5px Studio Anti-Aliased Edge & Zero Red/Warm Color Bleed:**
     - Uses a tight `1.5px` studio silhouette ramp (`sig` `11.0..22.5`) combined with a Euclidean contour-distance (`dist_edge`) Fresnel metallic rim and a 100% desaturated `#E7E8E2` studio background/shadow with a 5px neutral collar—eliminating any blurry boundary or warm/red bounce-light color bleed.
     - On the 6-Tomato Grid, `.grid-tomato-wrap.is-silver-completed .grid-tomato-img:not(.grid-tomato-silver-img)` transitions to `opacity: 0` so the underlying colored tomato never bleeds around the silver tomato's silhouette.
4. **Shiny, Single-Highlight Small Card Tomato Icons (`mini-tomato-*`):**
   - The small tomato icons on Today's Card Front are rendered with smooth $C^\infty$ 3D dome shading, **zero horizontal strips/bands**, **zero pink outer/stem halo**, and **one crisp specular highlight** on the upper-left cheek.
5. **Identical Front & Back Card Header Typography & Position + Unified Card Task Typography:**
   - Today's Card Front uses a clean white surface (`#FDFDFB`, zero background dots).
   - **Identical Front & Back Date Title:** Both `.card-header-bar` (Front) and `.card-back-header-bar` (Back) use identical padding (`22px 26px 15px`) and typography (`font-size: 22.5px; font-weight: 800; letter-spacing: -0.015em; line-height: 1.15`).
   - **Unified Font Size Per Card (`fitUnifiedCardTaskTypography`):** All task numbers (`.task-index`), task titles (`.task-title`), and `+ Add item` on a card share the **exact same unified font size** (`24px` baseline), stepping down uniformly (`24px` → `16.5px` floor) only when the entire vertical card page is filled.
   - **Multi-Line Pencil Strikethrough & Erase (`getTaskRowLineSegments`):** Dragging `Left → Right` across a multi-line task draws (or erases from `Left → Right`) a dry-graphite pencil line across **every wrapped line of text**.
6. **Two-Way Silent 3D Card Flip (`Left ↔ Right`):**
   - Both Today's Card (`#daily-card-3d`) and Archived Stack Cards (`#stack-card-3d`) flip `180°` in **both directions** (`Right → Left` or `Left → Right` swipe, or tapping `[Flip]`), silent on audio with light tactile haptics.
7. **Concise, Minimalist Toast Copy (Zero Design Rationales in UI):**
   - All toast pills (`showTelemetryToast`) and notification banners (`showNotificationBanner`) state only the direct status or action (e.g., `"Task length limit reached"`, `"Reflection length limit reached"`, `"Task deleted"`, `"Card added for OCT 03"`) and **never** explain design rationales (such as *"to keep text away from edge"*) or internal mechanics.

---

## 3. Detailed Functional Requirements & Phase 2 (`v26`) Updates

### A. Minimalist 2-Object Homepage (`01-home-page.png` — Screen 0)

1. **Exact Mockup Typography, Proportions & Vertical Center-Line Alignment:**
   - **Top Header (`#home-brand-title`):** Centered `'FABLE / FLOW'` in `24px` sans-serif (`weight: 500`, `letter-spacing: 0.24em`, `#141413`) with the minimalist `[Profile Icon]` in the top-right corner.
   - **Upper Object — Miniature Daily Card (`#home-mini-card`):** `334×222px` horizontal white card (`border-radius: 12px`) stamped in the top-left with **`06 OCT`**.
   - **Lower Object — Centered 3D Heirloom Tomato (`#home-tomato-btn`):** Photorealistic studio-lit Crimson Tomato (`assets/tomatoes/home-tomato.png`, cropped symmetrically around `x=385` so the `0` marker and `▲` pointer apex lie on the exact `50%` vertical center line of the viewport).

### B. Minimalist Profile Popover & 8-Step Motion-Driven Guided Tutorial

1. **Minimalist Top-Right Profile Popover (`#profile-modal-overlay`):**
   - Anchored in the top-right with four controls: **`Home`**, **`Guided Tour`**, **`Daily Reset`** (`00:00`–`23:00`, default `05:00`), and **`Sound`** (`On` / `Off`).
2. **8-Step Motion-Driven Live Page Guided Tutorial (`#onboarding-overlay`, `#tour-page-dot`, `#tour-page-dot-2`):**
   - Launches automatically on first visit (`hasCompletedOnboarding: false`) and is accessible anytime via **Profile → Guided Tour**.
   - **60fps Motion & Attention Fading:** Pointing steps fade the dot smoothly on and off (`opacity: 0.08 ↔ 1.0`) with a ripple ring; gesture steps move the dot in 1:1 lockstep with the live UI element.
   - **8-Step End-to-End Flow:**
     1. **`Tap Card or Tomato` (`#screen-home`):** Both dots align strictly on the `50%` vertical center line (`overlayRect.width * 0.5`), alternating between the `06 OCT` mini-card center and the exact **`0` marker** on the tomato (`box.top + box.height * 0.457`).
     2. **`Front Page · Daily To-Dos` (`#screen-card`, Front):** Dot moves `Left → Right` across `01 Example Task` while live-drawing the dry-graphite pencil strikethrough.
     3. **`Flip Page · Daily Reflection` (`#screen-card`, Front ↔ Back):** Dot swipes across the card while turning the card `0° → -180°` in 3D to reveal the Matte Black Evening Reflection journal.
     4. **`Tap Mini Tomato` (`#screen-card`, Front):** Card snaps to `0°` (`setInstantCardRotation`) so the pulsing dot lands squarely on `.task-mini-tomato-img` and lights it up crimson on press.
     5. **`Turn Tomato Dial` (`#screen-hero`):** Immediately follows Step 4—dot moves along the Hero Tomato equator while turning the 3D tomato (`25:00 → 30:00`) in 1:1 lockstep.
     6. **`Tomato Grid · 6 Focus Timers` (`#screen-grid`):** Dot fades on and off on Quadrant 1's tomato body and title.
     7. **`Scroll Stack · Past Cards` (`#screen-stack`):** Dot moves horizontally with the card (`translateX`) and triggers a natural two-card sliding transition between `MONDAY — OCT 05` and `SUNDAY — OCT 04`.
     8. **`Zoom Out · Monthly Calendar` (`#screen-stack` → `#screen-calendar`):** Two dots (`#tour-page-dot` & `#tour-page-dot-2`) pinch inward while the Stack card smoothly shrinks (`scale(1) → scale(0.24)`) and fades out over the Monthly Calendar underneath.

### C. Pillar 1: Flow / Engagement (6-Pomodoro Grid & Single Big Hero Tomato)

1. **6-Tomato Grid View (`2×3` Layout — Screen 2):**
   - Split tap targets on assigned tomatoes (body opens Hero Timer; title opens inline Edit/Reassign dropdown).
2. **Single Big Hero Tomato View (Screen 3):**
   - `1-minute` (`6.0°`) bidirectional dial + Tap-on-Digits inline time editor (`0–180m` / `HH:MM`).
   - `End Timer (■)` is hidden whenever a tomato has not been set (`!isTimerSlotSet(slot)`).
   - Two-step `End (■)` → Crisp Satin-Polished Silver Metallic → `Reset (↺)` flow.

### D. Pillar 2: Purpose & Presence (Dual-Sided Card, Retrospective Cards, Natural Stack Scroll & Smooth Zoom)

1. **Front & Back of Today's Card (`04-card-front.png` & `05-card-back.png` — Screen 1):**
   - Clean white front (`01`–`06` tasks) and matte black back (evening reflection + `0`–`2` compressed photo slots), with a 2-icon bottom bar (`[Stack]` and `[Flip]`).
2. **Retrospective Card Creation for Past Days (`#screen-calendar` & `#screen-stack`):**
   - Clicking any past date on the **Monthly Calendar** (`#screen-calendar`, e.g., `OCT 03` or `SEP 28`) or on the **Stack Date Strip** (`#stack-date-strip`) zooms into `#screen-stack` for that date.
   - If that past date does not have an archived card yet (`!this.state.archiveCards[dateKey]`), `#screen-stack` renders a **dashed empty card slot** (`.stack-retro-empty-slot`, styled like the `+ Attach Photo` slot) inside the card face reading **`+ Add Card for OCT 03`** (*"Add daily to-dos & reflection retrospectively"*).
   - Tapping the dashed slot invokes `createRetrospectiveCardForDate(dateKey)`, creating a full dual-sided card for that date in `archiveCards`, immediately opening it in the Stack so the user can add tasks, cross them out, flip to the back to write a reflection, and attach photos—and highlighting that date with a circle (`.has-card`) on the Monthly Calendar.
3. **Natural Two-Card Stack Scrolling Transition (`_spawnOutgoingStackCardClone` + `animateStackCardScroll`):**
   - When scrolling to the previous or next card in `#screen-stack` (via swipe, wheel, peek card tap, or date strip tap), `_spawnOutgoingStackCardClone` captures a visual clone (`.stack-outgoing-card-clone`) of the outgoing card that glides smoothly off-screen (`translateX(±106%) scale(0.92), opacity: 0`) while the incoming card glides in from the opposite side (`stackSlideFromRight` / `stackSlideFromLeft`, `360ms cubic-bezier(0.22, 1, 0.36, 1)`).
4. **Smooth Card-Shrinking Zoom-Out & Expanding Zoom-In (`zoomOutStackToCalendar` & `zoomInCalendarToStack`):**
   - **Zoom Out (`Stack → Calendar`):** Layers `#screen-stack.is-zoom-transitioning` over `#screen-calendar` so the Stack card smoothly shrinks (`scale(1) → scale(0.24)`) and fades out (`opacity: 1 → 0`) while the Monthly Calendar scales in (`scale(0.95) → scale(1), opacity: 0 → 1`) over `360ms`—eliminating any sudden jump.
   - **Zoom In (`Calendar → Stack`):** Tapping a date on the Calendar or tapping `🔍+` smoothly expands the Stack card from `scale(0.28), opacity: 0` to `scale(1), opacity: 1` while the Calendar fades out underneath.

5. **Dynamic System Logical Date Refresh (`getCurrentLogicalDateString` + `getOffsetDateKey`):**
   - Today's Card (`cardDateKey`, `cardHeaderDate`, `cardShortDate`), the Homepage mini-card stamp (`#home-mini-date`), the Stack Date Strip (`#stack-date-strip` with pinned `.stack-month-label` and scrollable `.stack-date-pills-track` from `01` up to today's day number), and the Monthly Calendar Today ring (`.cal-day-btn.is-today`) always reflect and automatically refresh to the **current system logical date** (`getCurrentLogicalDateString(dailyResetHour)`, e.g. `10 OCT` / `SATURDAY — OCT 10` on Oct 10) on load, on `visibilitychange`/`focus`, and via the wall-clock ticker—migrating any prior saved state (`v9` → `v10`) without ever getting stuck on a hardcoded date.

---

# Part II: Phase 2 (`v0.6.0-mvp` / `v27`) Technical Implementation Summary

## 1. File-by-File Architecture (`v0.6.0-mvp` / `v27` — Complete & Verified `21/21 PASS`)

| File Path | Phase 2 (`v27`) Implementation Responsibilities |
| :--- | :--- |
| [`index.html`](file:///usr/local/google/home/zuqi/github/ProjectFocus/index.html) | Defines all 6 screens (`#screen-home`, `#screen-card`, `#screen-grid`, `#screen-hero`, `#screen-stack`, `#screen-calendar`), the minimalist Profile Popover (`Home`, `Guided Tour`, `Daily Reset`, `Sound`), the 8-step Guided Tutorial overlay (`#onboarding-overlay`, `#tour-page-dot`, `#tour-page-dot-2`), and cache-busted `?v=20261010_v27` asset references. |
| [`css/style.css`](file:///usr/local/google/home/zuqi/github/ProjectFocus/css/style.css) | Implements iOS `100dvh` dynamic viewport sizing, identical front/back card header bars, `.grid-tomato-wrap.is-silver-completed` base-image hiding (preventing edge color bleed), `.stack-date-pills-track` clean date strip scrolling next to `.stack-month-label`, `.stack-outgoing-card-clone` & `stackSlideFromRight`/`Left` two-card scrolling transitions, `.stack-screen.is-zoom-transitioning` smooth shrink/expand layering, and `.stack-retro-empty-slot` dashed retrospective card slot styling. |
| [`js/app.js`](file:///usr/local/google/home/zuqi/github/ProjectFocus/js/app.js) | Implements dynamic system logical date refresh (`getCurrentLogicalDateString()`, `getOffsetDateKey()`, `loadInitialState()` migration, and `visibilitychange`/wall-clock refresh), concise toast copy (zero design rationales), `formatDateMetadataForKey()` & `createRetrospectiveCardForDate()` for retrospective past-day cards, `_spawnOutgoingStackCardClone()` for natural two-card stack scrolling, `zoomOutStackToCalendar()` & `zoomInCalendarToStack()` for continuous shrink/expand zoom motion, and the 8-step `requestAnimationFrame` Guided Tour. |
| [`js/tomato3D.js`](file:///usr/local/google/home/zuqi/github/ProjectFocus/js/tomato3D.js) | Implements `HeroTomato3DView` with tight `rimFade` (`|u| > 0.962`) and `?v=20261010_v26` asset loading, plus `GridTomatoRenderer` for the 6 heirloom shades, grey unassigned state, and bleed-free silver metallic state. |
| [`scripts/extract_mockup_assets.py`](file:///usr/local/google/home/zuqi/github/ProjectFocus/scripts/extract_mockup_assets.py) | Crops `home-tomato.png` symmetrically around `x=385` (`0` marker & `▲` apex at `50%` width) and generates `hero-tomato-silver.png`, `grid-tomato-silver.png`, and `mini-tomato-silver.png` using exact `silver-sphere-ref.png` coordinates (`276.0, 151.0, 108.5`), a crisp `1.5px` studio silhouette ramp, Euclidean contour Fresnel rim, and 100% desaturated `#E7E8E2` studio background/shadow. |
| [`tests/evaluate_phase1.py`](file:///usr/local/google/home/zuqi/github/ProjectFocus/tests/evaluate_phase1.py) | Automated 21-check evaluation suite verifying all Phase 1 and Phase 2 architectural, mathematical, visual, and HTTP asset serving requirements (`21/21 PASS`). |

---

## 2. Mobile Testing & Sharing Link (`v27`)

- **Public Mobile Test Link to Share with Friends:**
  - **`https://juliafzq.github.io/ProjectFocus/?v=27`**
  - Works directly in mobile Safari/Chrome or via **Share → Add to Home Screen** on iOS for full-screen standalone mode (`100dvh` dynamic viewport, zero Safari toolbar cropping, WebAudio foley & iOS silent-switch compliance).

# Product Requirements Document (v4.2 — Phase 1 Verified & Phase 2 Ready): Fable / Flow

**Target Platform:** iOS 17.0+ (`Swift` / `SwiftUI` / `RealityKit` & `Metal` / `CoreHaptics` / `SwiftData` / `CloudKit` / `ActivityKit` / `StoreKit 2`) & Interactive Web/Mobile Reference Runtime (`HTML5 Canvas 2x Retina 3D Surface Mesh` / `Web Audio API` / `Pointer Events`)

> **Authoritative Spec Status (`v0.2.0-beta` Complete → Ready for Phase 2 `v0.5.0-mvp`):**
> This document incorporates every visual preference, interaction refinement, 3D rendering rule, and QA/PM audit fix established during Phase 1 so that Phase 2 and Phase 3 can be executed with 100% precision and zero regression on any Phase 1 behavior.

---

## 1. Idea & Background

**A tactile, digital-analog tool space that increases a user's sense of lived fulfillment by restoring daily focus, accomplishment, and presence without coercive gamification, complex hierarchies, or productivity guilt.**

Modern productivity applications force users to choose between fragmented "app stacks" (e.g., *Todoist + Forest + Day One*) that induce high context-switching friction, or monolithic "all-in-one" systems (e.g., *Notion, Asana, TickTick*) that demand steep onboarding curves and end up creating cognitive overload.

Project **Fable / Flow** bridges this divide by delivering a calm, hyper-minimalist, physical-first environment. Built around two tactile objects—a **dual-sided index card** and a **3D heirloom tomato Pomodoro timer**—it replaces abstract dashboards with organic, physical tools for daily planning, deep focus, and evening reflection.

---

## 2. Goals, Guiding Principles & Explicit Non-Goals

### Goals

- **User Value:** The tools are first and foremost functional and helpful. The experience provides stress-free cognitive grounding through calm, tactile interaction. Users leave feeling fulfilled by concrete daily accomplishments rather than trapped in digital maintenance loops.
- **Product & Business Value:** An "anti-tech," sensory-rich interface model on iOS that achieves strong organic retention through intrinsic tactile delight rather than addictive games, monetized via a transparent 7-day trial and hybrid subscription / one-time lifetime unlock.

### Guiding Principles

- **Simplicity Over Systems:** Reality is where life happens, not inside an app. Tools are single-purpose, obvious, and devoid of multi-level configuration menus.
- **Tactile & Organic Skeuomorphism:** Digital objects obey physical intuition—they twist and unwind with 1-minute stepped haptic resistance, cross out and erase from left to right with audible graphite/eraser friction, transform into mirror-polished chrome silver upon completion, flip with crisp cardstock weight, and settle with natural mass.
- **Zero-Guilt Architecture:** No broken streak penalties, no automatic rollover of unfinished tasks piling up, no red overdue badges, no performance/analytics charts, and no anxiety-inducing marketing/guilt push notifications.
- **Local-First & Ephemeral Option ("Goldfish Mode"):** Complete utility without forced account creation. Users operate locally without cloud sync by default, and free-tier users after the trial retain a 1-card, 1-timer daily experience without losing their previously archived trial cards on-device.

### Explicit Non-Goals

- **Not a Complex Project Management Suite:** No Gantt charts, subtasks, task dependencies, team assignments, or Kanban boards (e.g., *Asana / Trello / Lunatask*). Tasks are strictly flat and capped at **6 main tasks per card**.
- **No Automatic Task Rollover:** If a user does not finish a task by the end of the day (5:00 AM cutoff), it remains uncrossed on that day's card as an honest snapshot in the archive rather than rolling over to clutter tomorrow's card.
- **Not a Behavioral Habit Tracker or Analytics Dashboard:** No mandatory 66-day habit loops, streak counts, focused-hour trend graphs, or dopamine-driven conditioning (e.g., *Fabulous / Habi*).
- **Not a Clinical Wellness/Meditation App:** No guided meditation voice tracks or generic daily affirmations (e.g., *Calm*).
- **No Generative AI Rewriting:** Thoughts and reflections remain 100% the user's own authentic words—no AI text generation or automated summarizing.

---

## 3. Owner Visual & Tactile Preferences (Mandatory Across All Phases)

The following visual and interaction preferences are **hard requirements** verified in Phase 1 and must be preserved across Phase 2 and Phase 3:

1. **Photorealistic Studio-Lit Heirloom Tomatoes (Never Synthetic 3D Primitives):**
   - All tomato sprites (`hero-tomato-*`, `grid-tomato-*`, `mini-tomato-*`) derive from the studio-lit sculpted heirloom tomato renders with extended canvas margins (`700×600` on Hero, `324×300` on Grid) whose cast shadows feather seamlessly into the `#E7E8E2` (`rgb(231, 232, 226)`) page background so **no square border or shading boundary line is ever visible**.
2. **Clean, Straight Equatorial Seam & Perspective-Accurate 3D Curve Numbers on Hero Tomato:**
   - The center opening (equatorial seam) on the Hero Tomato has a clean, smooth, un-stepped lip following $y_{\text{seam}}(u) = 258.8 + 0.5 u - 18.2 u^2 - 15.2 u^4$ (where $u = \frac{x - 250.5}{215.5} \in [-1, 1]$), with zero backward hook at the edges.
   - The equatorial tick marks (`1-min` minor, `5-min` medium, `10-min` major) and numbers (`0, 10, 20 ... 180`) wrap around a true 2x Retina 3D surface mesh with 4x horizontal supersampling, perspective-camera horizon projection ($\sin\theta_{\text{persp}} = 0.968 u$), upper-dome latitude relaxation, and bounded meridian tilt outside $\arcsin$.
   - Numbers on the sides foreshorten naturally in 3D perspective all the way to the visual curve edge ($|u| \in [0.968, 0.996]$) without early fade-out, top-clipping, or parallelogram skew.
3. **Mirror-Polished, High-Gloss Chrome Silver Metallic Completed Tomato:**
   - When a countdown finishes (`00:00`) or the user clicks `End (■)`, the tomato smoothly transitions into a **Mirror-Polished Chrome Silver Metallic** tomato (`#C8CDD4`, never dull vintage pewter).
   - **Surface & Edge Fidelity:** The metallic tomato must have **100% natural, studio-anti-aliased outer edges** (sub-pixel foreground opacity $\alpha(x,y)$ composited over local neutral background—zero dark rim ring, zero pink halo, zero shadow speckles), **ultra-smooth, even 3D metallic cheeks/belly** ($C^\infty$ paraboloid-dome normals + 10-pass seam-aware smoothing + zero bottom-right crescent ridge), **crisp 3D stem & calyx leaf ridges** (preserved via a 3-pass bilateral filter inside a smooth 2D elliptical crown mask), **one luminous studio softbox highlight** on the upper-left cheek, and **dark anthracite-charcoal etched markings** (`▲` pointer, ticks, and numbers).
4. **Shiny, Single-Highlight Small Card Tomato Icons (`mini-tomato-*`):**
   - The small tomato icons on Today's Card Front must look **glossy and shiny with zero horizontal strips/bands**, **zero pink outer/stem halo**, and **just ONE crisp specular highlight** on the upper-left cheek.
5. **Clean White Front Card (No Background Dots) & Straight Horizontal Left-to-Right Strikethrough/Erase:**
   - Today's Card Front uses a clean, crisp white surface (`#FDFDFB`) with **zero background dots**.
   - Dragging `Left → Right` across a task draws a **straight horizontal** graphite strikethrough centered vertically on the text; dragging `Left → Right` across a crossed-out task **erases the line from Left to Right** (never right-to-left).
6. **Clean Initial State — Single `"Example Task"` Only:**
   - Fresh state initialization starts with **one single `"Example Task"`** (`01 Example Task`) assigned to Tomato #1 (`25:00`), without pre-populated demo clutter (`Math Study`, `Build Deck`, etc.).

---

## 4. Business & Monetization Model

- **Free-to-Download with 7-Day Full-Access Trial:** New users receive 7 days of unrestricted access immediately upon download (no upfront paywall or credit card required) to build their first week-long **Card Stack** (up to 6 tasks/day, all 6 Pomodoro timers, Back-of-Card evening journal with up to 2 photos, Stack & Calendar archive).
- **Hybrid Paywall (Post-Trial Unlock via StoreKit 2):**
  - **Monthly Subscription:** Low-commitment recurring access.
  - **Annual Subscription:** Discounted yearly access.
  - **Lifetime One-Time Purchase:** Positioned as *"Buy Your Physical Tools Once"* for users who prefer ownership over subscriptions.
- **Free Tier Fallback ("Goldfish Mode"):** If a user chooses not to purchase after the 7-day trial, the app remains functional in a constrained daily mode: **1 Daily Card (Front To-Do List)** and **1 Pomodoro Timer (Top-Left Slot #1)** per day, resetting fresh at 5:00 AM each morning without historical Stack access, Back-of-Card journal access, or multi-device CloudKit sync. *(Cards and photos created during the 7-day trial are never deleted; they remain encrypted on-device and unlock immediately if the user subscribes or purchases Lifetime later.)*

---

## 5. End-to-End User Journey

1. **Morning Intake (5:00 AM Daily Reset):** The user opens the app in the morning. At **5:00 AM local time**, yesterday's card was automatically filed into the **Card Stack**, and a fresh white index card is ready on the minimalist homepage (stamped `06 OCT` in miniature). Tapping the Card zooms smoothly into Today's Clean White Index Card stamped `TUESDAY — OCT 06`. On first launch, a single `01 Example Task` is ready; the user can tap any task text once to **Edit or Delete** it, or tap `+ Add item` / the bottom-right `[+]` button to add up to 6 main tasks (`01`–`06`; no subtasks).
2. **Focus Execution (1-Minute Precision 3-Turn Odometer Dial OR Tap-Digits Time Entry):**
   - On Today's Card Front, tapping an **unassigned grey mini-tomato** lights it up (assigns that task to an available timer slot) **and immediately navigates to the Single Big Hero Tomato view** for that task. (Tapping an already-lit colored or silver mini-tomato on the Front Card unassigns and resets that tomato back to grey.)
   - In the Hero Tomato view, the user can either:
     - **Twist the 3D Tomato Dial:** Drag horizontally **Right → Left** in **1-minute (`3°`) notched increments** up to `180 minutes` (`540°` / 3 full 60-minute turns), or drag **Left → Right** to unwind down to `00:00`.
     - **Tap the Digital Readout (`#hero-readout`) to Type Time Directly:** Tapping the digits opens an inline time input bar (`0–180` minutes or `HH:MM` format like `02:30`) plus quick preset pills (`15m`, `25m`, `45m`, `60m`, `90m`, `120m`, `150m`, `180m`), immediately rotating the 3D tomato to the entered duration.
   - When the duration is **strictly greater than 60 minutes** (`> 60:00`), the digital readout automatically switches to **`HH:MM:SS` (`00:00:00`)** format (e.g., `02:30:00`). For `≤ 60 minutes`, it displays `MM:SS` (e.g., `25:00`).
3. **Interruption, 6-Tomato Grid & In-Place Hero Task Switching:**
   - The user can tap the task subtitle (`01 / EXAMPLE TASK ▾`) directly on the Hero Tomato page to reassign the tomato to another unassigned task, create a `+ Custom Title...`, or unassign it right in place.
   - Tapping the bottom-left **`[Grid Icon]`** opens the **6-Pomodoro Grid View (`2×3` layout)**, where 6 heirloom tomatoes correspond to the 6 daily task slots. Clicking any **assigned (colored or silver) tomato** on the Grid opens that tomato in the **Hero Tomato View** (clicking on the Grid never unassigns a tomato; unassign-by-click is exclusive to the Front Card). Clicking an **unassigned grey tomato** (`Tap to assign`) opens the dark task dropdown, which automatically **hides any task already assigned to another tomato**.
   - Up to 6 timers can hold assigned/paused states concurrently, while **only 1 timer actively ticks at a time**.
4. **Ending / Completing a Timer (Polished Silver Metallic & Two-Step Reset) & Left-to-Right Strikethrough/Erase:**
   - When a countdown reaches `00:00` (playing the **Mechanical Dual-Bell Pomodoro Chime**) OR when the user clicks **`End (■)`**, the timer does **not** abruptly clear: instead, the tomato smoothly transitions into a **Mirror-Polished Chrome Silver Metallic** tomato (both on the Hero/Grid views and on the Front Card's mini-tomato icon), and the `End (■)` button transforms into a **`Reset (↺)`** button.
   - Clicking **`Reset (↺)`** on a completed silver tomato restores its active Heirloom Red color and resets its countdown to its last configured duration (`lastConfiguredSeconds`, e.g., `25:00`).
   - Because timer completion is intentionally decoupled from task completion, the user switches back to the Card via the top `Card | Timer` pill and drags horizontally **Left → Right** (`Δx > +15 px`) across the task row to draw a straight horizontal graphite strikethrough. Dragging **Left → Right** across a crossed-out task erases the line from **Left to Right**.
5. **Evening Reflection (The Right-to-Left Flip — Phase 2):** At night, the user swipes **Right → Left** (`Δx < -40 px`) across the card body (or taps the bottom-center `[Flip Icon]`) to turn the card `180°` over in 3D space to its **matte black reverse side** stamped `TUESDAY — OCT 06`. The user types a reflection and taps the `[+ Photo]` squares (or bottom-right `[+]` button) to attach up to 2 photos. As they type longer text, the typography dynamically scales down from `20pt` to a `13pt` minimum floor before becoming scrollable.
6. **Effortless Archiving, Retroactive Edits & Permanent Trash Deletion (Phase 2):** At **5:00 AM**, the card is automatically available in the **Card Stack** and a fresh card is placed on the workspace. Tapping the bottom-left `[Stack Icon]` opens the chronological date strip (`OCT 01 02 03 04 (05) 06`) for retroactive editing, pinching zooms out to the Monthly Calendar View, and tapping the bottom-right `[Trash Can 🗑]` prompts a confirmation modal before permanently deleting the card and displaying a confirmation banner.

---

## 6. Information Architecture & Page Navigation

- **Minimalist Homepage (Phase 2):**
  - Top Bar: Centered `'FABLE / FLOW'` title and top-right `[Profile Icon]`.
  - Canvas: Displays the Physical Card (stamped `06 OCT`) and 3D Tomato resting on a warm off-white canvas (`#E7E8E2`).
  - Tapping the Card opens **Today's Card (Front)**.
  - Tapping the Tomato opens the **Timer View**.
- **Global Top Bar (Present Inside Card, Timer, Stack & Calendar Views):**
  - **Centered `Card | Timer` Segmented Pill:** One-tap toggle between the active Card view and the Pomodoro Timer view. **Remembers the user's last active Timer sub-view** (`Hero Tomato` vs. `6-Tomato Grid`) when switching back and forth between `Card` and `Timer`.
  - **Top-Right `[Profile Icon]`:** Opens the Account & Settings modal (Foley Audio / Silent Mode toggle, Sign in with Apple, CloudKit sync toggle, subscription management; strictly no trackers or analytics trends).
- **Card Views Navigation:**
  - **Front of Today's Card (Clean White) ↔ Back of Today's Card (Matte Black):** Switch via `Right → Left` swipe gesture (`Δx < -40 px`) on the card body or by tapping the bottom-center `[Flip Icon]`.
  - **Today's Card Grey Mini-Tomato Tap → Assigns Task & Opens Single Big Hero Tomato:** Tapping an unassigned grey mini-tomato on a task row assigns that task to an available timer slot and immediately opens the Hero Tomato view for that slot.
  - **Today's Card Lit Mini-Tomato Tap → Unassigns & Resets Tomato:** Tapping an assigned (colored or silver) mini-tomato on a task row unassigns that tomato and returns it to Matte Neutral Grey.
  - **Today's Card Task Text Tap → Opens Edit / Delete Task Modal:** Single-tapping a task's text opens the modal to edit the title or permanently delete the task (deleting a task automatically resets its associated tomato back to grey).
  - **Today's Card → Card Stack Viewer (Archive):** Tap the bottom-left `[Stack Icon]`.
- **Timer Views Navigation:**
  - **6-Pomodoro Grid View (`2×3`) → Single Big Hero Tomato View:** Tap any assigned (colored or silver) tomato body on the Grid. (Never unassigns on the Grid.)
  - **Single Big Hero Tomato View → 6-Pomodoro Grid View (`2×3`):** Tap the bottom-left `[Grid Icon]`.
  - **Single Big Hero Tomato View Inline Task Reassignment:** Tap the uppercase task subtitle (`01 / EXAMPLE TASK ▾` or `TAP TO ASSIGN TASK ▾`) directly below the Hero digital readout to assign, switch, custom-title, or unassign the tomato right on the Hero page.

---

## 7. Detailed Functional Requirements

### #1. Minimalist Homepage & Global Navigation Bar

- **Homepage Visual Representation:**
  - Warm off-white canvas (`#E7E8E2`) displaying two physical objects resting on the surface:
    1. **The Daily Card:** Clean white horizontal cardstock in a subtle frame, stamped in the top-left with `06 OCT` (`DD MMM` uppercase).
    2. **The Tomato Pomodoro:** Photorealistic studio-lit 3D heirloom tomato timer in Deep Crimson Red with equatorial tick notches and white pointer triangle (`▲`).
- **Global Top Bar:**
  - Centered `'FABLE / FLOW'` title on Homepage; morphs into centered `Card | Timer` segmented pill inside Card/Timer/Stack/Calendar views.
  - Top-Right `[Profile Icon]`: Opens minimal account/settings sheet.

### #2. Pillar 1: Flow / Engagement (The 6-Pomodoro Timer System)

#### A. The 6-Tomato Grid View (`2×3` Layout)

- **Visual Representation:** Balanced `2×3` grid (2 columns × 3 rows) of six photorealistic studio-lit 3D Pomodoro timers separated by subtle horizontal and vertical crosshair lines, matching the 6 task slots of Today's Card.
- **Three Distinct Visual States (Unassigned Grey, Assigned Heirloom Red Palette, Completed Polished Silver Metallic):**
  1. **Unassigned State:** Matte neutral grey (`#8E8D8A`, `grid-tomato-grey.png`) with a subtle `Tap to assign` label vertically centered on the tomato body (`top: 52%`).
  2. **Assigned Active State:** Transitions into its slot's distinct heirloom shade of red, displaying the shortened uppercase Task Title (`max-width: 152px` with ellipsis, max 16 chars) and Digital Readout (`EXAMPLE TASK / 25:00` or `02:30:00` when `> 60m`) centered on the tomato body, plus inline `[Play ▶ / Pause ||]` and `[End ■]` controls directly below that tomato:
     - **Slot 1 (Top-Left):** Deep Crimson (`#8B1E24`, `grid-tomato-0.png`)
     - **Slot 2 (Top-Right):** Warm Terracotta (`#C84B31`, `grid-tomato-1.png`)
     - **Slot 3 (Middle-Left):** Rich Dark Burgundy (`#5E192A`, `grid-tomato-2.png`)
     - **Slot 4 (Middle-Right):** Sun-Ripened Coral (`#D96B52`, `grid-tomato-3.png`)
     - **Slot 5 (Bottom-Left):** Golden Persimmon (`#C96A2B`, `grid-tomato-4.png`)
     - **Slot 6 (Bottom-Right):** Spiced Garnet (`#9E2A3B`, `grid-tomato-5.png`)
  3. **Completed Silver Metallic State:** When a countdown finishes (`00:00`) or the user clicks `End (■)`, the tomato smoothly transitions into a **Mirror-Polished Chrome Silver Metallic** tomato (`#C8CDD4`, `grid-tomato-silver.png`) with high-contrast dark anthracite readout text, disabled Play button, and the `End (■)` button transformed into a **`Reset (↺)`** circular-arrow button.
- **Smart Task Assignment Dropdown (Excludes Already-Assigned Tasks):**
  - Tapping an unassigned grey tomato (`Tap to assign`) or tapping the task subtitle below an assigned Grid tomato opens a dark floating dropdown menu listing `+ Custom Title...` followed by **only the tasks from Today's Card that are not currently assigned to another tomato**, plus an option to unassign/clear.
  - Clicking the body of an assigned (colored or silver) tomato on the Grid **navigates to the Single Big Hero Tomato View** for that slot.
- **6-Timer Concurrency & Two-Step End/Reset Controls (`Play ▶`, `Pause ||`, `End ■` → `Reset ↺`):**
  - Up to 6 timers can hold an assigned/paused/completed state concurrently. **Only 1 timer can actively tick at the same time** (starting one automatically pauses any other running timer).
  - **Pause (`||`):** Freezes the timer at its current countdown or stopwatch value.
  - **End (`■`) → Completed Silver Metallic:** Ends the focus session, transitions the tomato into the **Polished Silver Metallic** state (`isCompleted = true`), and turns the `End (■)` button into **`Reset (↺)`** so the timer is never accidentally wiped on a single click.
  - **Reset (`↺`) → Restore Active Color & Configured Duration:** Clicking `Reset (↺)` on a silver metallic tomato restores its slot's Heirloom Red shade (`isCompleted = false`) and resets the clock to `lastConfiguredSeconds` (or `00:00` in Stopwatch mode).
  - **Decoupled Task Strikethrough:** A timer reaching `00:00` or being ended via `■` **never** automatically crosses out the corresponding task on the Card.

#### B. Single Big Hero Tomato View, 3D Surface Mesh & Dual Time-Entry Mechanics

- **Entering & Exiting the Hero View:**
  - Reached by tapping an assigned tomato on the `2×3` Grid, tapping an unassigned grey mini-tomato on Today's Card Front, or switching to `Timer` via the top pill when Hero was the last active timer view.
  - Displays:
    1. **Upper-Left Digital Readout (`#hero-readout`):** Displays `MM:SS` (`25:00`) when duration `≤ 60 minutes`, and automatically formats as **`HH:MM:SS` (`00:00:00`)** (e.g., `02:30:00` at `50px` font size) when duration `> 60 minutes`.
    2. **Interactive Task Subtitle (`#hero-subtitle`):** Displays `01 / EXAMPLE TASK ▾` (or `TAP TO ASSIGN TASK ▾` when unassigned). Tapping it opens an inline dropdown right on the Hero page to assign/reassign an available task, set a `+ Custom Title...`, or unassign.
    3. **Center Photorealistic 3D Hero Tomato (`700×600` stage):** Renders the studio-lit heirloom tomato (or smooth 620ms cross-fade into `hero-tomato-silver.png` upon completion) with its 2x Retina 3D surface mesh equatorial odometer scale.
    4. **4-Icon Bottom Control Bar:**
       - **Bottom-Left `[Grid Icon]` (`⊞`):** Returns to the 6-Tomato Grid View.
       - **Center-Left `[Play ▶ / Pause ||]`:** Starts or pauses the clock (disabled in completed silver state; guarded at `00:00` in countdown mode with a helpful prompt).
       - **Center-Right `[End ■ / Reset ↺]`:** Transitions an active timer to Polished Silver Metallic (`■`), or resets a completed silver timer back to its configured duration and red color (`↺`).
       - **Bottom-Right `[Stopwatch Toggle ⏱]`:** Switches to Count-Up Stopwatch Mode (or resumes/pauses if already in Stopwatch Mode; prompts confirmation if switching away from an active/paused countdown with progress).
- **Method 1: Bidirectional 180-Minute 3-Turn Odometer Dial (`1-Minute` Precision):**
  - **Winding (`Right → Left` Drag):** Dragging horizontally right-to-left across the tomato body winds the timer up in **1-minute (`3°`) notched increments** (`60` clicks = `180°` = `60 minutes`), up to a maximum of **180 minutes (`540°`)**.
  - **Unwinding (`Left → Right` Drag):** Dragging horizontally left-to-right unwinds/decrements the timer in **1-minute (`3°`) notched steps** down to `00:00`.
  - **3D Surface Mesh Projection:** Ticks (`1m` minor, `5m` medium, `10m` major) and numbers (`0, 10, 20 ... 180`) wrap around the 3D curvature using perspective-camera horizon mapping ($\sin\theta_{\text{persp}} = 0.968 u$), upper-dome latitude relaxation, and bounded meridian tilt outside $\arcsin$ so numbers at the visual curve edge foreshorten cleanly without top-clipping or skew.
- **Method 2: Tap-on-Digits Inline Time Entry (`#hero-time-editor`):**
  - Tapping the digital readout (`#hero-readout`) opens an inline time editor directly in place of the readout with:
    - Text input accepting minutes (`0–180`, e.g., `90` or `135`) or `HH:MM` (`01:30`, `02:15`).
    - Quick duration preset pills (`15m`, `25m`, `45m`, `60m`, `90m`, `120m`, `150m`, `180m`).
  - Submitting (`Enter` or `Set` button) or tapping a preset pill immediately sets the duration and rotates the 3D tomato to the matching angle.
- **Mechanical Dual-Bell Pomodoro Completion Chime:**
  - When a countdown reaches `00:00`, the Sensory Engine plays a realistic **Mechanical Spring-Driven Dual-Bell Pomodoro Chime** (brass striker transient + rapid twin-bell ring roll + inharmonic brass overtones + warm acoustic body resonance) while the tomato smoothly transitions into Polished Silver Metallic.
- **Count-Up Stopwatch Mode — Whole-Minute Forward Rotation:**
  - While counting up in Stopwatch mode, the digital readout increments every second (`MM:SS` up to `60:00`, then `HH:MM:SS`), while the 3D tomato **physically rotates forward only on whole elapsed minutes** (`+3°` / 1 minute notch per full elapsed minute) with a subtle mechanical escapement tick.

### #3. Pillar 2: Purpose & Presence (The Dual-Sided Card & Stack)

#### A. Daily Card Lifecycle & Automatic 5:00 AM Rollover

- **Automatic Stack Saving:** Every card is automatically saved in the chronological Card Stack in real time.
- **5:00 AM Daily Boundary:** At **5:00 AM local time** each day (`currentTime - 5 hours`), the workspace automatically transitions to a fresh, blank white index card stamped with the new date, while the previous day's card resides in the Stack.
- **No Unfinished Task Rollover:** Tasks not crossed out before 5:00 AM stay uncrossed on yesterday's card in the Stack and **do not** copy over to the new card.
- **Always Editable History:** Users can open any past card in the Stack at any time to edit task text, cross/uncross tasks, write or update their evening reflection, or add/change photos.

#### B. Front of Card — Purpose / Accomplishment (Clean White To-Do Card)

- **Visual Representation:** Clean, crisp white index card (`#FDFDFB`, **zero background dots**) stamped at the top-left with `TUESDAY — OCT 06` above a horizontal divider line.
- **Strict 6-Task Limit, Default `"Example Task"`, & `+ Add item` Row (No Subtasks, No Vertical Scroll):**
  - Supports a flat list of maximum **6 main tasks (`01` through `06`)** with zero vertical scrolling.
  - Default fresh state contains a single `01 Example Task`.
  - When fewer than 6 tasks exist, displays a muted grey **`+ Add item`** row below the last task.
- **Single-Tap Task Edit & Delete Modal (with Automatic Tomato Reset):**
  - Clicking once on any task's text opens the **Edit Task Modal** pre-filled with the task title, featuring a left-aligned **`Delete` (`🗑`)** button alongside `Cancel` and `Save`.
  - Deleting a task removes it from Today's Card, re-indexes remaining tasks (`01`..`0N`), and **automatically unassigns and resets any tomato associated with that deleted task** back to Matte Neutral Grey.
- **Pixel-Locked Straight Horizontal Pencil Strikethrough & Left-to-Right Erase Gesture (`Left → Right` Only):**
  - **Pixel Math Rule:** Triggered strictly when a finger drag begins inside a task row and moves horizontally **Left → Right** with `Δx > +15 px` and vertical angle within `±25°` (`|Δy| <= Δx * tan(25°)`).
  - **Cross Out (`Left → Right`):** Dragging `Left → Right` across an uncrossed task draws a **straight horizontal** graphite pencil line (`y = 50%`) from left to right following the finger's horizontal position with pencil-scratch haptics and audio.
  - **Un-Cross / Erase (`Left → Right`):** Dragging `Left → Right` across an already crossed-out task **erases the graphite line from Left to Right** (progressively clearing the left portion of the stroke as the finger moves rightward).
- **Cross-Pillar Shiny Single-Highlight Mini-Tomato Icon:**
  - A glossy, single-highlight mini-tomato icon sits on the right side of each task row:
    - **Grey (`mini-tomato-grey.png`)** when unassigned: tapping it **lights up (assigns) a tomato AND navigates to the Single Big Hero Tomato page**.
    - **Heirloom Red (`mini-tomato-0..5.png`)** when assigned or **Polished Silver (`mini-tomato-silver.png`)** when completed: tapping it on the Front Card **unassigns and resets** that tomato back to Matte Neutral Grey.
- **Today's Card Bottom Bar (3 Icons):**
  1. **Left `[Stack Icon]`:** Opens the chronological Card Stack Viewer.
  2. **Center `[Flip Icon]`:** Flips Today's Card `180°` between Front (White) and Back (Matte Black).
  3. **Right `[+ Plus Icon]`:** Opens the modal to add the next task slot on the Front (up to 6 max), or adds a photo / focuses reflection text on the Back.

#### C. Back of Card — Presence / Mindfulness (Matte Black Journal Card — Phase 2)

- **Pixel-Locked Card Flip Interaction (`Right → Left` Only):**
  - **Pixel Math Rule:** Triggered when a finger swipe moves horizontally **Right → Left** anywhere on the card body with `Δx < -40 px` and vertical angle within `±35°` (`|Δy| <= |Δx| * tan(35°)`), or when tapping the bottom-center `[Flip Icon]`. Rotates the card `180°` in 3D space accompanied by a cardstock-flip haptic and paper-whoosh audio cue.
- **Visual Representation:** Inverts to a calm matte black card (`#141413`) with clean white text (`#FAF9F5`), stamped at the top-left with `TUESDAY — OCT 06` above a subtle divider line.
- **Adaptive Typography, Optional Photos & Scroll Threshold:**
  - **Dynamic Font Scaling → Scroll Fallback:** As the user enters more journal text, the typography automatically scales down from `20pt` to a **`13pt` minimum legible floor** so longer reflections fit comfortably within the card frame. Once the text reaches `13pt` and exceeds the card frame, the text area locks at `13pt` and becomes vertically scrollable.
  - **Optional Photo Slots (0 to 2 Images):** Users can attach up to 2 photos framed side-by-side at the bottom of the black card. When 0 or 1 photo is attached, compact minimal `[+ Photo]` square buttons allow adding photos while letting text occupy the remaining space.

#### D. Card Stack Viewer & Calendar View (Phase 2)

- **Stack Detail View (Archived Cards):**
  - Displays a horizontal chronological date strip at the top (`OCT 01   02   03   04   (05)   06`) with a solid black circle on the selected date (`05`).
  - Displays the selected card in center focus with peeking neighbor card edges on left/right.
  - **Archived Card Bottom Bar (4 Icons):**
    1. **Left `[Return / Undo Arrow ↩]`:** Immediately returns the user to Today's current card.
    2. **Center-Left `[Zoom Out Magnifying Glass 🔍-]`:** Zooms out to the Monthly Calendar View (also triggered by pinching two fingers inward).
    3. **Center-Right `[Flip Icon]`:** Flips the archived card `180°` between Front and Back.
    4. **Right `[Trash Can 🗑]`:** Prompts a confirmation modal (*"Permanently delete this card? This action cannot be undone."*). Upon confirmation, **permanently deletes** the card from storage and pops up an in-app confirmation notification banner (*"Card permanently deleted"*).
- **Calendar Zoom-Out View:**
  - Displays vertically stacked monthly calendars (`SEPTEMBER 2026`, `OCTOBER 2026`) with soft grey circles on dates that have archived cards and a solid black circle on the currently selected date.
  - **Calendar Bottom Bar (2 Icons):**
    1. **Left `[Return / Undo Arrow ↩]`:** Immediately returns the user to Today's current card.
    2. **Right `[Zoom In Magnifying Glass 🔍+]`:** Zooms into the selected date's card in the Stack Detail View (also triggered by tapping any highlighted date on the calendar).

---

## 8. Complete Gesture, Haptic & Audio System

### Gesture & Navigation Summary Table

| Screen / Context | User Input / Gesture | System Action |
| :--- | :--- | :--- |
| **Homepage (Phase 2)** | Tap Card (`06 OCT`) / Tap Tomato | Smoothly zooms into Today's Card or the Timer View |
| **Global Top Bar** | Tap `Card \| Timer` Pill | Switches between active Card view and last active Timer sub-view (`Hero Tomato` or `6-Tomato Grid`) |
| **Global Top Bar** | Tap Top-Right `[Profile Icon]` | Opens Account / Audio Settings / CloudKit Sync modal (no trackers/trends) |
| **Card (Front & Back)** | Swipe `Right → Left` (`Δx < -40 px`) on card or tap center `[Flip Icon]` | Flips the card `180°` in 3D space between Clean White Front (To-Do) and Matte Black Back (Journal) |
| **Card (Front Task Row)** | Single-tap on task text | Opens Edit Task Modal (`Save`, `Cancel`, or `Delete 🗑` which also resets any assigned tomato) |
| **Card (Front Task Row)** | Drag `Left → Right` (`Δx > +15 px`) on task row | Draws straight horizontal graphite pencil strikethrough from Left to Right (or erases strikethrough from Left to Right if already crossed out) |
| **Card (Front Task Row)** | Tap **grey** mini-tomato icon on right of row | Lights up (assigns) a tomato for that task AND navigates to the Single Big Hero Tomato view |
| **Card (Front Task Row)** | Tap **lit (colored/silver)** mini-tomato icon on right of row | Unassigns and resets that tomato back to Matte Neutral Grey (exclusive to Front Card) |
| **6-Tomato Grid View** | Tap **unassigned grey** tomato or assigned tomato's title | Opens dark task assignment dropdown (`+ Custom Title...` + unassigned Today's Card tasks) |
| **6-Tomato Grid View** | Tap **assigned (colored/silver)** tomato body | Navigates to Single Big Hero Tomato View for that slot (never unassigns on Grid) |
| **Single Hero Tomato** | Drag `Right → Left` or `Left → Right` across tomato body | Winds (`Right → Left`) or unwinds (`Left → Right`) countdown in **1-min (`3°`)** steps between `00:00` and `03:00:00` (`180m`) |
| **Single Hero Tomato** | Tap Digital Readout (`#hero-readout`) | Opens inline Tap-to-Type Time Editor (`0–180m` or `HH:MM` + preset pills `15m..180m`) |
| **Single Hero Tomato** | Tap Task Subtitle (`#hero-subtitle`) | Opens inline task dropdown right on the Hero page to assign, switch, custom-title, or unassign |
| **Single Hero Tomato** | Tap `[Grid ⊞]` / `[Play ▶ / Pause \|\|]` / `[End ■ / Reset ↺]` / `[Stopwatch ⏱]` | Returns to `2×3` Grid / Starts or pauses timer / Transitions to Polished Silver Metallic (`■`) or resets silver tomato to red (`↺`) / Toggles whole-minute forward-rotating Stopwatch mode |

### Haptic & Audio Matrix

| Action & Gesture Direction | Visual Effect | Haptic Pattern (`CoreHaptics`) | Audio Design (`AVAudioEngine` / `WebAudio`) |
| :--- | :--- | :--- | :--- |
| **Winding (`Right → Left`) or Unwinding (`Left → Right`) Hero Tomato (`0m–180m`, 1-min steps)** | 3D rotational `3°` (1-min) notch alignment; 3D surface mesh updates perspective-curved ticks & numbers (`0–180`) | Continuous stepped mechanical clicks (`3°` / 1-min notch) | Soft mechanical ratchet tick on twist; optional escapement tick while running |
| **Countdown Completion (`00:00`) or Clicking `End (■)`** | Tomato smoothly transitions into **Mirror-Polished Chrome Silver Metallic** (`#C8CDD4`); `End (■)` becomes `Reset (↺)` | Crisp double-bell completion resonance | Authentic **Mechanical Dual-Bell Pomodoro Chime** (brass hammer transient + 5-strike rapid twin-bell ring roll + warm acoustic resonance) |
| **Striking Out / Erasing Task (`Left → Right` Pixel Drag, `Δx > +15 px`)** | Straight horizontal graphite line dynamically follows finger from Left to Right (or erases from Left to Right on second `Left → Right` drag) | Sharp transient pencil contact impact + continuous velocity-modulated drag friction | Subtle graphite pencil stroke / soft eraser rub on heavy cardstock paper |
| **Flipping the Card (`Right → Left` Swipe, `Δx < -40 px`, or `[Flip Icon]`)** | 3D `180°` cardstock rotation (`Clean White Front ↔ Matte Black Back`) | Crisp mid-weight transient lift + soft landing thud | Subtle heavy cardstock paper flip whoosh |
| **Thumb-Scrolling the Card Stack Date Strip / Carousel (Phase 2)** | Chronological cards riffle and snap into center focus | Light crisp transient tick per card passed | Authentic cardstock sliding and settling sound |
| **Deleting Archived Card or Task via `[Trash Can 🗑]`** | Confirmation modal → item removed + associated tomato reset + pop-up confirmation banner | Subtle warning double-tap on prompt; crisp paper-crumple transient on confirm | Soft paper tear/discard audio cue |

---

## 9. Phased Implementation Roadmap & Status

- **Phase 1 — Beta (`v0.2.0-beta` — COMPLETE & VERIFIED):**
  - **Front of Today's Card:** Clean white card (no dots), single `"Example Task"` default, max 6 main tasks (no subtasks, no scroll), `+ Add item` row, 3-icon bottom bar (`[Stack]`, `[Flip]`, `[+]`), single-tap task Edit/Delete modal (with automatic tomato reset on task delete), pixel-locked `Left → Right` straight horizontal pencil strikethrough & `Left → Right` erase, and glossy single-highlight mini-tomato icons (grey tap assigns & opens Hero; lit tap unassigns).
  - **6-Pomodoro Timer (`2×3` Grid) & Single Hero Tomato:** 6 heirloom red shades, unassigned matte grey (`Tap to assign` vertically centered), Mirror-Polished Chrome Silver Metallic completed state, two-step `End (■)` → `Reset (↺)` safety flow, 1-minute dial resolution up to 180 minutes, perspective-accurate 3D edge number rendering, Tap-on-Digits inline time entry (`0–180m` / `HH:MM` + presets), `HH:MM:SS` (`00:00:00`) display for durations `> 60m`, inline Hero subtitle task reassignment dropdown (excluding already-assigned tasks), whole-minute Stopwatch rotation, and Mechanical Dual-Bell Pomodoro Completion Chime.
- **Phase 2 — MVP (`v0.5.0-mvp` — COMPLETE & VERIFIED `21/21 PASS`):**
  - **Minimalist 2-Object Homepage (`01-home-page.png` Exact Match):** Exact `334×222px` horizontal mini-card stamped `06 OCT` (`28px` serif), `24px` `'FABLE / FLOW'` header, and photorealistic `450px` 3D Crimson Tomato (`home-tomato.png`, zero numbers/pointer).
  - **Clean Initial Profile State (`fable_flow_phase2_mvp_v3`):** Starts with a 100% clean profile containing only `01 Example Task` on Today's Card Front, an empty Evening Reflection journal (`reflectionText: ''`, `reflectionPhotos: []`), and zero pre-populated past-day cards (`archiveCards: {}`).
  - **Unified Card Typography & Multi-Line Strikethrough:** All tasks on a card share the exact same unified font size (`24px` baseline, only stepping down to `16.5px` if the entire vertical card page is filled), capped at `18 words / 110 chars`. Multi-line `Left → Right` pencil strikethrough/erase crosses out every wrapped line (`getTaskRowLineSegments`) while maintaining a safe right margin (`maxSafeRightX`).
  - **Effortless Two-Way Silent Card Flip:** Both `Right → Left` and `Left → Right` swipes flip Today's Card and Stack Cards in either direction (`±180°`) via `window`-level pointer tracking, with card flip/drag whoop audio removed.
  - **Back of Card (`05-card-back.png` — Matte Black Journal):** Unified `21px` → `13px` typography (`95 words / 520 chars` cap) that only shrinks when the reflection area fills up, plus 0–2 framed photo slots (`≤ 1600px` JPEG compression, one-tap replace or `×` remove).
  - **Card Stack Viewer (`06-stack-detail.png`) & Calendar (`07-calendar-view.png`):** Interactive Stack scrolling via carousel drag, wheel/trackpad scroll, date-strip scrubbing, or peek cards, complete with directional slide/bounce animations (`animateStackCardScroll` / `animateStackBoundaryBounce`). Calendar dynamically loads `Sept 1, 2026 – Dec 31, 2026` (always showing at least 2 additional months after the current month).
  - **Silver Tomato 3D Shading & 360° Smooth Silhouette + Split Grid Tap Targets:** Green-channel absorption alpha ($\alpha_G$) around all $360^\circ$ of the silver tomato silhouette blended with $38\%$ studio photo diffuse shading (`photo_mod`); unclipped Hero odometer digits (`texH = 92 * K`, `meshHalfH = 44`); split Grid tap targets (tap body = Hero timer, tap title = edit/reassign dropdown); Stopwatch duration hint toast (`"Switch to Countdown to set duration"`).
  - **Minimalist Profile Popover, Animated Visual Gesture Tour & Constrained Toast Hints:** Top-right Profile popover with `Home`, `Guided Tour` (`#profile-guided-tour-btn`), `Daily Reset` (`12 AM – 11 PM`), and `Sound` (`On / Off`); 6-step **Animated Visual Gesture Tour** (`#tour-gesture-coach`) that positions an animated hand pointer, touch ripple, and motion trail directly over each target element on the live pages (with synchronized pencil-draw, 3D card flip, and odometer rotation demos, zero static bottom text boxes), plus constrained toast pop-ups (`max-width: calc(100% - 56px)`) that never bleed into screen edges.
- **Phase 3 — V1 (`v1.0.0-rc1` — Cloud Sync, Monetization & System Integration):**
  - **Account Auth & Cross-Device Sync:** Sign in with Apple and opt-in **CloudKit Sync** across devices (strictly no trackers/trend graphs).
  - **Monetization:** 7-Day Free Trial, Hybrid Paywall (Monthly, Annual, Lifetime), and non-destructive post-trial Free Fallback ("Goldfish Mode": 1 Card + 1 Timer per day).
  - **iOS System Surfaces & Accessibility:** Live Activities, Dynamic Island integration, Lock Screen widgets, Ambient Desk Mode, and full VoiceOver custom actions.

---
type: design-spec
name: Health Dashboard V1 Design Spec
aliases: ["Dashboard Design Spec", "Health Dashboard Spec"]
date: 2026-04-13
project: health-fat-loss
status: draft
priority: high
supersedes: PLAN.md Task 8 (9-section sketch)
tags: [dashboard, design, spec, v1, airtable-tokens, obsidian-rest-api]
---

# Health Dashboard V1 — Design Spec

One self-contained source of truth for the Phase 2 implementer. Every visual, interaction, data, and component decision is locked here. No section describes alternatives — only the chosen path and its rationale.

## 1. Goals & Non-Goals

### What V1 ships

- **Pragmatist core cards** — one KPI strip on the Today view (readiness, weight, calories-vs-target, protein-vs-target) plus one tile per domain (Training, Nutrition, Medications, Body).
- **Dual body maps** — 2D SVG (default) and 3D `<model-viewer>` GLB, toggled from the Body view. Toggle state persists in `localStorage`.
- **AI-Sphere quick-log** — animated floating action button (bottom-right) that expands to a text input. Regex-based domain classifier routes text to the correct PATCH write. Text-only in V1.
- **Readiness formula with null-returning wearable slots** — HRV, RHR, sleep-hours inputs are wired as `null` sources in V1; the formula renormalizes over present inputs and surfaces a "wearable not connected" affordance. Formula is fully specified in §6.
- **Obsidian Local REST API as data layer** — reads + writes to `Data/health/*.md` via the plugin from day one. Local-first, no server. API is assumed installed and authenticated (Phase 0 responsibility).

### What V1 explicitly defers

| Deferred | Why deferred | Target phase |
|---|---|---|
| Exercise GIF / WebP previews | Asset pipeline + licensing unresolved | V2 |
| Trends surface (weekly / monthly charts) | Data too sparse in V1 (training-log is empty) | V2 |
| Alert banners (injection day, deload week, PR proximity) | Requires stable data baseline first | V2 |
| Mobile / responsive layout | Desktop-first; breakpoints ≥1280px only | V2 |
| Wearable integrations (HRV, RHR, sleep import) | Readiness formula accepts null; UI renders "—" | V2 |
| Voice input on AI-Sphere | Text-only in V1 | V2 |
| LLM-backed classifier on AI-Sphere | Regex only; LLM fallback deferred | V2 |

### What stays untouched

- `Projects/health-fat-loss/nippard-training-hub.html` — reference only; line ranges are cited throughout this spec. NOT migrated, NOT edited.
- `Projects/health-fat-loss/health-tracker.html` — reference only; line ranges cited. NOT migrated, NOT edited.
- `plugins/health-agent/` — orchestrator stays authoritative over write patterns; dashboard matches its conventions (see §8).
- All files under `Data/health/` — the dashboard reads and PATCHes them via the plugin's existing heading anchors. It never rewrites a full file.

### Success shape (one sentence)

Phase 2 completes when a desktop user on the Today view sees a readiness score, four non-empty tiles (or graceful EmptyStates), can toggle 2D ↔ 3D body maps, and can quick-log a meal via AI-Sphere that appears both in the UI and under today's `## Meals` heading in `Data/health/nutrition/daily-log.md` — all with no JS errors when every canonical file is near-empty.

## 2. Information Architecture

### Layout

Desktop-first, two-column CSS grid: left sidebar (240px fixed) + main content (1fr). Locked per `PLAN.md` §"Notable V1 Scope Decisions". No client-side router; views are swapped by a single `showView(name)` function (pattern lifted from `nippard-training-hub.html:1385`).

```
┌────────────┬─────────────────────────────────────────────────┐
│ Sidebar    │  HERO readiness card (full-width, 120px tall)    │
│ 240px      ├─────────────────────────────────────────────────┤
│            │  ┌──────────┬──────────┬──────────┬──────────┐  │
│ ● Today    │  │ Training │ Nutrition│   Meds   │   Body   │  │
│ ○ Training │  └──────────┴──────────┴──────────┴──────────┘  │
│ ○ Nutrition├─────────────────────────────────────────────────┤
│ ○ Meds     │  (view-specific surface — per active nav)        │
│ ○ Body     ├─────────────────────────────────────────────────┤
│ ○ Settings │  footer: attribution + API status pill           │
└────────────┴─────────────────────────────────────────────────┘
                                    ⦿ AI-Sphere FAB (bottom-right)
```

### Views (six)

| View | Default? | Primary content | Data sources |
|---|---|---|---|
| **Today** | ✅ yes | Readiness hero + 4 KPI strip + 4 tiles (Training, Nutrition, Meds, Body) | profile.md, today's daily-log.md block, training-log.md head, weekly-volume.md, compliance-log.md, active-medications.md |
| **Training** | no | Program overview, exercise list, session log entry form, weekly volume chart (empty-state in V1) | training/program.md, training-log.md, weekly-volume.md, exercise-library.md |
| **Nutrition** | no | Meal-library browser, today's macro progress bars, recent meals table | nutrition/meal-library.md, nutrition/daily-log.md |
| **Medications** | no | Active-meds cards, compliance-log calendar heatmap, supplement-stack list | medications/active-medications.md, compliance-log.md, supplement-stack.md |
| **Body** | no | 2D↔3D body map, muscle side panel, weekly-snapshots table | training/weekly-volume.md, training-log.md, weekly-snapshots.md |
| **Settings** | no | API key form (display-only, never commit), refresh-interval slider, active persona display, reset-localStorage button | profile.md (read-only) |

### Sidebar states

- **Expanded** (default): 240px, full labels, active view marked with left-edge blue bar (`--theme_button-bg-active`).
- **Collapsed**: 64px, icons only, labels as hover tooltips. Toggled by a chevron button at the bottom of the sidebar.
- Persisted in `localStorage['sidebar:collapsed']` (boolean string).

### View-switching mechanics (lifted pattern)

Reimplement `showView(name)` following the shape at `nippard-training-hub.html:1385`:
- Hide every element with `.view`.
- Show element `#view-${name}`.
- Update `.nav-btn.active` class on the sidebar.
- Dispatch `state.ui.activeView = name` (see §10).
- Persist to `localStorage['ui:activeView']`; restore on page load.

### Keyboard / affordances

- `1`…`6` keys switch views (Today=1, Training=2, …, Settings=6).
- `/` focuses AI-Sphere input.
- `Esc` collapses AI-Sphere if open.
- No other global keybindings in V1.

## 3. Visual Design Tokens

Lifted verbatim from `Airtable_DESIGN.md` §§2–6. **No new tokens.** Every color, radius, and shadow in `dashboard.html` must reference one of these custom properties — no literal hex/rgba outside this `:root` block. This is a hard departure from `nippard-training-hub.html`'s dark theme — do not import tokens from that file.

### `:root` block (paste into `dashboard.html` `<style>`)

```css
:root {
  /* Colors — primary */
  --theme_canvas: #ffffff;
  --theme_text: #181d26;
  --theme_text-weak: rgba(4, 14, 32, 0.69);
  --theme_text-spotlight: rgba(249, 252, 255, 0.97);
  --theme_blue: #1b61c9;
  --theme_blue-mid: #254fad;
  --theme_blue-glow: rgba(45, 127, 249, 0.5);

  /* Colors — semantic */
  --theme_success: #006400;
  --theme_danger: #b00020;
  --theme_warning: #b8860b;

  /* Colors — neutrals */
  --theme_border: #e0e2e6;
  --theme_surface: #f8fafc;
  --theme_text-secondary: #333333;
  --theme_button-text-secondary-active: rgba(7, 12, 20, 0.82);

  /* Typography */
  --theme_font-body: 'Haas', -apple-system, system-ui, 'Segoe UI', Roboto, sans-serif;
  --theme_font-display: 'Haas Groot Disp', var(--theme_font-body);

  /* Type ramp (size / weight / line-height / tracking) */
  --theme_type-hero: 48px/1.15 var(--theme_font-body); /* weight 400 */
  --theme_type-display-bold: 48px/1.50 var(--theme_font-display); /* weight 900 */
  --theme_type-section: 40px/1.25 var(--theme_font-body); /* weight 400 */
  --theme_type-subhead: 32px/1.20 var(--theme_font-body); /* weight 400–500 */
  --theme_type-card-title: 24px/1.25 var(--theme_font-body); /* weight 400, tracking 0.12px */
  --theme_type-feature: 20px/1.35 var(--theme_font-body); /* weight 400, tracking 0.1px */
  --theme_type-body: 18px/1.35 var(--theme_font-body); /* weight 400, tracking 0.18px */
  --theme_type-body-medium: 16px/1.30 var(--theme_font-body); /* weight 500, tracking 0.08–0.16px */
  --theme_type-button: 16px/1.25 var(--theme_font-body); /* weight 500, tracking 0.08px */
  --theme_type-caption: 14px/1.30 var(--theme_font-body); /* weight 400–500, tracking 0.07–0.28px */

  --theme_track-body: 0.18px;
  --theme_track-caption: 0.07px;
  --theme_track-button: 0.08px;
  --theme_track-card-title: 0.12px;

  /* Spacing (8px base, 1–48px scale) */
  --theme_space-1: 1px;
  --theme_space-xs: 4px;
  --theme_space-sm: 8px;
  --theme_space-md: 16px;
  --theme_space-lg: 24px;
  --theme_space-xl: 32px;
  --theme_space-2xl: 48px;

  /* Radii */
  --theme_radius-sharp: 2px;
  --theme_radius-btn: 12px;
  --theme_radius-card: 16px;
  --theme_radius-section: 24px;
  --theme_radius-large: 32px;

  /* Shadows — multi-layer blue-tinted */
  --theme_shadow-card: rgba(0, 0, 0, 0.32) 0 0 1px,
                        rgba(0, 0, 0, 0.08) 0 0 2px,
                        rgba(45, 127, 249, 0.28) 0 1px 3px,
                        rgba(0, 0, 0, 0.06) 0 0 0 0.5px inset;
  --theme_shadow-ambient: rgba(15, 48, 106, 0.05) 0 0 20px;
}
```

### Do & Don't

**Do:**
- Reference `var(--theme_*)` for every color, radius, and shadow.
- Use Airtable Blue (`--theme_blue`) for every CTA and primary link.
- Apply positive letter-spacing per the ramp (`--theme_track-*`).
- Use 12px button radius, 16px card radius, 24px section radius.
- Stack the multi-layer shadow for every elevated card.

**Don't:**
- Reintroduce the dark theme from `nippard-training-hub.html` (navy canvas, neon accents). Those tokens are out of scope.
- Use heavy single-layer shadows (`rgba(0,0,0,0.3) 0 4px 12px` style). Use the multi-layer blue-tinted stack.
- Skip letter-spacing on body text. Positive tracking (`0.18px` on body) is a signature detail.

### Fonts

`Haas` and `Haas Groot Disp` are licensed fonts; load via your existing Adobe Fonts kit (or equivalent). If not available at runtime, the fallback chain (`-apple-system, system-ui, 'Segoe UI', Roboto`) delivers acceptable rendering on macOS/iOS and Windows. Do NOT bundle unlicensed font files in the repo.

## 4. Component Inventory

Eight reusable components. Every one names (a) at least one source `file:line` reference so Phase 2 can lift behavior instead of inventing it, (b) the prop shape, and (c) the state table. Prop shapes describe the data contract, not a TypeScript signature — V1 uses vanilla JS, so these are the expected fields on the function argument or DOM dataset.

---

#### C1. `<KPICard>`

**Used on:** Today view KPI strip (readiness, weight, calories-vs-target, protein-vs-target). Four cards total in V1.

**Reference:** `health-tracker.html:722–757` — KPI strip markup is lifted almost verbatim; rename class prefix to `kpi-card-v2` to avoid colliding with the legacy sheet if both are ever on the same page.

**Props:**
```js
{
  icon: '⚖️' | '🔥' | '🥩' | '✅',      // emoji or <svg> element
  label: 'Weight' | 'Avg Calories' | …,
  value: number | '—',                  // null renders as '—'
  unit: 'lbs' | 'kcal' | 'g' | '%',
  change: { text: string, tone: 'good' | 'neutral' | 'bad' },
}
```

**States:**

| State | Trigger | Visual |
|---|---|---|
| loaded | value is number | value in `--theme_type-section` weight, change row in `--theme_type-caption` |
| loading | value === undefined | skeleton bar 60% width, shimmer animation |
| empty | value === null | value is `—`, change reads "No data yet" |
| error | fetch threw | value is `—`, change reads "Disconnected" in `--theme_danger` |

**Interactions:** click → navigates to the matching tile's detail view (readiness → stays on Today, weight → Body, calories/protein → Nutrition).

---

#### C2. `<ProgressBar>`

**Used on:** Nutrition tile daily macro progress (protein / carbs / fat / water).

**Reference:** `health-tracker.html:941` ("Today's Progress" card title) — model the container + bar markup on that section's CSS. For the new spec, use `--theme_blue` for fill and `--theme_border` for track.

**Props:**
```js
{
  label: 'Protein' | 'Carbs' | 'Fat' | 'Water',
  value: number,             // actual
  target: number,            // goal
  unit: 'g' | 'L',
  tone: 'good' | 'over' | 'under',   // determines fill color
}
```

**States:**

| State | Trigger | Visual |
|---|---|---|
| under | value / target < 0.9 | fill width = pct, color = `--theme_warning` |
| good | 0.9 ≤ ratio ≤ 1.1 | fill color = `--theme_success` |
| over | ratio > 1.1 | fill color = `--theme_danger`, fill width clamped to 100% |
| empty | value == null OR target == null | track only, no fill; right-align "no target" |

---

#### C3. `<DataTable>`

**Used on:** Recent meals (Nutrition tile), recent sessions (Training tile), recent med doses (Meds tile).

**Reference:** `health-tracker.html:880` ("Recent Entries" card title) — lift header / row / empty-row markup and CSS.

**Props:**
```js
{
  columns: [{ key: string, label: string, align?: 'left'|'right', width?: string }],
  rows: Array<Record<string, string | number>>,
  sortable?: boolean,    // default true
  defaultSort?: { key: string, dir: 'asc' | 'desc' },
  emptyMessage: string,
}
```

**States:**

| State | Trigger | Visual |
|---|---|---|
| populated | rows.length > 0 | rendered table |
| empty | rows.length === 0 | one row spanning all cols with `emptyMessage` centered in `--theme_text-weak` |

**Interactions:** column header click → toggles sort dir on that column (only when `sortable` is true).

---

#### C4. `<HeatmapCalendar>`

**Used on:** Meds tile compliance calendar; Nutrition tile check-in streak; (Training tile skipped in V1 — data too sparse).

**Reference:** `health-tracker.html:918` (`calendar-grid` container) and `health-tracker.html:1159` (`renderCalendar()`) and `health-tracker.html:1595` (render-loop hook). Lift the 7-column grid CSS and date-iteration logic.

**Props:**
```js
{
  days: Array<{ date: 'YYYY-MM-DD', intensity: 0 | 1 | 2 | 3 | 4, tooltip?: string }>,
  weeks: number,         // default 12 (≈ 3 months back)
  title: string,
  legend: Array<{ label: string, intensity: 0|1|2|3|4 }>,
}
```

**States:**

| State | Trigger | Visual |
|---|---|---|
| populated | any day.intensity > 0 | tinted cells, legend visible |
| empty | all intensities === 0 | all cells show `--theme_surface`, caption "Log activity to populate" |

**Interactions:** cell hover → tooltip shows `day.tooltip`. No click in V1.

---

#### C5. `<ExerciseRow>` / `<ExerciseModal>`

**Used on:** Training tile exercise list; optional Body-view side panel.

**Reference (row):** `nippard-training-hub.html:1490` (`html += '<tr class="exercise-row" onclick="openExerciseModal(…)">'`). **Reference (modal):** `nippard-training-hub.html:1577` (`function openExerciseModal(name)`). Reuse the exact shape — muscle-tag chips, set/rep row, RPE targets, sub-exercise list.

**Props (row):**
```js
{
  name: string,
  primaryMuscle: string,
  secondaryMuscles: string[],
  setsReps: string,          // e.g. '3×8–10'
  rpe: string,               // e.g. 'RPE 7–8'
  lastLoggedDate?: 'YYYY-MM-DD',
}
```

**Props (modal):**
```js
{
  exercise: ExerciseRowProps,
  substitutions: [{ name: string, reason: string }, …],
  notes: string,             // coaching cues
  lastFourSessions: Array<{ date: 'YYYY-MM-DD', weight: number, reps: number[], rpe: number }>,
}
```

**States:** row → { idle | hover | muted (when filtered out) }; modal → { open | closed }.

**Interactions:** row click → opens modal. Modal escape / click-outside → closes.

---

#### C6. `<AISphereFAB>`

**Used on:** every view, bottom-right fixed position.

**Reference:** no exact precedent — this is new. Model the floating-button CSS on `health-tracker.html:360` (`.habit-check` button shape, rounded) but promote to fixed position with a CSS gradient background.

**Props:**
```js
{
  onSubmit: (text: string) => Promise<{ domain: 'meal'|'workout'|'med'|'note', result: string }>,
  position: 'bottom-right' | 'bottom-center',   // default 'bottom-right'
}
```

**States:**

| State | Visual |
|---|---|
| collapsed | 56px circle, CSS conic gradient, slow 20s rotation animation, pulse shadow |
| expanded | 320px × 80px rounded panel, text input + submit button, Esc closes |
| submitting | spinner overlays input, button disabled |
| success | 400ms green flash, then auto-collapse |
| error | red toast slides in below, stays 4s, then auto-dismiss |

**Full interaction spec in §9.**

---

#### C7. `<BodyMapToggle>`

**Used on:** Body view, above the map canvas.

**Reference:** `health-tracker.html:718` (`.body-svg .muscle-region` CSS) for the 2D styling. No toggle precedent — new pattern.

**Props:**
```js
{
  mode: '2d' | '3d',
  onChange: (next: '2d' | '3d') => void,
}
```

**States:** `2d` | `3d`. Mode persists in `localStorage['ui:bodyMapMode']`.

**Interactions:** click the opposite button → calls `onChange(next)` → state dispatch → re-render. 200ms cross-fade between maps.

**Full map spec in §5.**

---

#### C8. `<EmptyState>`

**Used on:** every tile when its canonical file is sparse (current reality — `training-log.md` has 0 sessions, `compliance-log.md` is empty, `weekly-volume.md` is empty).

**Reference:** new pattern. Model the outer card shape on `nippard-training-hub.html:1048` (`.body-map-container`) — same border, padding, radius, but with centered content.

**Props:**
```js
{
  icon: string,              // emoji or svg name
  title: string,             // e.g. "No training sessions yet"
  body: string,              // e.g. "Log your first session with the AI-Sphere or run /health to kick off a check-in."
  cta?: { label: string, onClick: () => void },
}
```

**States:** single visual state. No loading/error variants — this component IS the fallback.

**Interactions:** CTA click → invokes `onClick`. Default CTA for tiles with `/health-setup` domains: open a modal that copies the exact shell command to the clipboard (since the dashboard can't execute it).

---

### Component usage matrix (which view uses which component)

| Component | Today | Training | Nutrition | Meds | Body | Settings |
|---|---|---|---|---|---|---|
| KPICard | ✅ ×4 | ✅ ×1 (weekly volume) | ✅ ×3 (P/C/F) | ✅ ×1 (% compliance) | ✅ ×1 (weight) | — |
| ProgressBar | — | — | ✅ ×4 | ✅ ×1 per med | — | — |
| DataTable | — | ✅ recent sessions | ✅ recent meals | ✅ recent doses | ✅ weekly snapshots | — |
| HeatmapCalendar | — | — | ✅ check-in streak | ✅ compliance heat | — | — |
| ExerciseRow/Modal | — | ✅ | — | — | ✅ (side panel) | — |
| AISphereFAB | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| BodyMapToggle | — | — | — | — | ✅ | — |
| EmptyState | ✅ ×N (as needed) | ✅ | ✅ | ✅ | ✅ | — |

## 5. Body Map Strategy

Two renderers, one state atom (`state.ui.bodyMapMode`), one toggle component (`C7`). Default is 2D. Toggle state persists in `localStorage['ui:bodyMapMode']`.

### 2D SVG renderer

**Source:** lifted from `nippard-training-hub.html:1048–1115` (the `<svg class="body-svg" viewBox="0 0 300 520">` block and its 11 muscle regions). Copy these SVG paths verbatim into `Projects/health-fat-loss/components/body-map-2d.html` during Phase 0 Task 3b; the dashboard inlines the component.

**11 regions (each with `class="muscle-region" data-muscle="<name>"`):**

| Region | `data-muscle` | Source line |
|---|---|---|
| Traps | `traps` | `nippard-training-hub.html:1059` |
| Shoulders (L/R) | `shoulders` | `:1061–1062` |
| Chest | `chest` | `:1064` |
| Biceps (L/R) | `biceps` | `:1066–1067` |
| Triceps (L/R) | `triceps` | `:1069–1070` |
| Abs | `abs` | `:1072` |
| Back (L/R) | `back` | `:1074–1075` |
| Glutes | `glutes` | `:1077` |
| Quads (L/R) | `quads` | `:1079–1080` |
| Hamstrings (L/R) | `hamstrings` | `:1082–1083` |
| Calves (L/R) | `calves` | `:1085–1086` |

Replace the legacy `fill="var(--traps)"` etc. CSS variables (dark-theme tokens) with a heatmap class applied dynamically — see below.

### Heatmap overlay

Driven by `Data/health/training/weekly-volume.md`. Parse the file's `| muscle | sets |` table (schema emerges once the file is non-empty — Phase 0 Task 2 captures it). Map `setsPerMuscle` to a 5-intensity scale:

| Intensity | Sets/week | CSS class | Fill |
|---|---|---|---|
| 0 | 0 | `.heat-0` | `var(--theme_surface)` |
| 1 | 1–4 | `.heat-1` | color-mix(in srgb, var(--theme_blue) 15%, transparent) |
| 2 | 5–9 | `.heat-2` | color-mix(in srgb, var(--theme_blue) 35%, transparent) |
| 3 | 10–14 | `.heat-3` | color-mix(in srgb, var(--theme_blue) 55%, transparent) |
| 4 | 15+ | `.heat-4` | color-mix(in srgb, var(--theme_blue) 85%, transparent) |

Apply via `region.classList.add('heat-${n}')` during render; clear previous heat class on re-render.

**Empty-file behavior:** when `weekly-volume.md` body is empty (current reality — only frontmatter + HTML comment), render every region at `.heat-0`. Do NOT render the heatmap legend if all regions are heat-0; show a small caption "Log a session to populate the heatmap" under the map.

### Click-to-expand side panel

Lift the behavior from `nippard-training-hub.html:1626` (`function selectMuscle(muscle)`) and `:1634` (`function renderMuscleExercises()`). Exact behavior:

1. User clicks a `.muscle-region` → `selectMuscle(dataset.muscle)` fires.
2. Set `state.ui.selectedMuscle = name`; dispatch re-render.
3. Highlight clicked region with `.active` class (drop-shadow glow — see `health-tracker.html:725`).
4. Side panel renders `<ExerciseRow>` list of all exercises whose `primaryMuscle === name`, sorted by `lastLoggedDate` ascending (oldest first = "most stale, train next").
5. Exercise source: during Phase 0 Task 3a, the 48-exercise inline DB from `nippard-training-hub.html` is extracted to `Projects/health-fat-loss/data/nippard-program.json`. The dashboard loads this JSON at startup.

**De-selection:** click the same region twice, or click outside the map → `selectedMuscle = null`, panel collapses.

### 3D renderer

**Tech:** Google `<model-viewer>` web component (Apache-2.0), loaded from CDN — no bundler, no framework.

```html
<script type="module" src="https://ajax.googleapis.com/ajax/libs/model-viewer/4.2.0/model-viewer.min.js"></script>
```

**Asset:** Sketchfab Gadzhiev male GLB, CC-BY 4.0. Stored at `Projects/health-fat-loss/assets/body.glb`. Asset size must be < 8 MB after Draco compression (verified in Phase 0 Task 4). If > 8 MB, re-compress or reject.

**Element:**

```html
<model-viewer
  src="assets/body.glb"
  alt="Male musculature"
  camera-controls
  shadow-intensity="1"
  exposure="0.9"
  style="width: 100%; height: 560px; background: var(--theme_surface);">
  <!-- hotspots injected at runtime from Projects/health-fat-loss/data/hotspots.json -->
</model-viewer>
```

**Hotspots:** 16–22 pins, authored in Phase 0 Task 5 via `https://modelviewer.dev/editor/`. Each pin is a `<button slot="hotspot-N" data-position="x y z" data-normal="x y z" data-muscle="chest">` with a label tooltip. Runtime loads `data/hotspots.json` and injects each pin into the `<model-viewer>` element at mount.

**Click behavior:** clicking a hotspot → fires the same `selectMuscle(dataset.muscle)` function as 2D → same side panel, same exercise list. The 2D↔3D toggle is purely cosmetic over the muscle-selection state.

**Camera on hotspot click:** programmatically set `cameraTarget` and `cameraOrbit` on `<model-viewer>` to focus the clicked hotspot's `data-position`. Smooth transition handled by model-viewer's internal animation.

**Auto-rotate:** OFF in V1 (hotspot tooltips flicker during rotation).

**Attribution:** when 3D is active, render a footer line `3D model: Ruslan Gadzhiev / Sketchfab · CC-BY 4.0` in `--theme_type-caption` `--theme_text-weak`. CC-BY 4.0 is non-optional — do not hide this line even if layout is tight.

### Toggle (C7)

Persists `state.ui.bodyMapMode` to `localStorage['ui:bodyMapMode']`. On page load, restore from localStorage (default `'2d'`). 200ms cross-fade between the two map containers — both are always mounted; only `display` and `opacity` toggle.

### Acceptance for §5 (subset of §12)

- Every 2D muscle region is clickable and fires `selectMuscle(name)` with the correct muscle name.
- Heatmap classes apply correctly for a synthetic `weekly-volume.md` with known sets counts.
- When `weekly-volume.md` is empty, all regions render `.heat-0` and no legend appears.
- 3D model loads within 4s on cable (asset < 8 MB).
- CC-BY 4.0 attribution visible whenever 3D is active.
- Toggle state survives page reload.
- Clicking a 3D hotspot routes through the same selectMuscle() as 2D (shared side panel).

## 6. Readiness Card (TDD)

The readiness card is the single highest-stakes UI element — users judge the dashboard's credibility by whether this score feels right. Spec the inputs, per-input scoring, null handling, and test vectors explicitly so Phase 2 writes unit tests before the UI.

### Inputs

| Input | Source | Type | V1 behavior |
|---|---|---|---|
| `caloriesRatio` | prior day `Calories` row in `Data/health/nutrition/daily-log.md` (actual ÷ target) | number or null | parsed from yesterday's `## YYYY-MM-DD` block |
| `proteinRatio` | prior day `Protein` row in `Data/health/nutrition/daily-log.md` (actual ÷ target) | number or null | parsed from yesterday's `## YYYY-MM-DD` block |
| `trainedYesterday` | whether yesterday's date appears as a `## YYYY-MM-DD` heading in `Data/health/training/training-log.md` | boolean | `true` if heading exists, else `false` |
| `supplementCompliance` | today's row in `Data/health/medications/compliance-log.md` → `checked ÷ total` | number (0–1) or null | null if no row for today |
| `hrv` | wearable | null | **null in V1** |
| `restingHr` | wearable | null | **null in V1** |
| `sleepHours` | wearable | null | **null in V1** |

### Per-input scoring (each returns `number | null`)

```js
function caloriesScore(ratio) {
  if (ratio == null) return null;
  if (ratio >= 0.9 && ratio <= 1.1) return 95;
  if (ratio >= 0.8 && ratio <= 1.2) return 80;
  if (ratio >= 0.7 && ratio <= 1.3) return 65;
  return 45;
}

function proteinScore(ratio) {
  if (ratio == null) return null;
  if (ratio >= 1.0) return 100;
  if (ratio >= 0.8) return 80;
  if (ratio >= 0.6) return 60;
  if (ratio >= 0.4) return 40;
  return 20;
}

function trainedScore(trainedYesterday) {
  // boolean is always known (presence/absence of heading) — never null in V1
  return trainedYesterday ? 90 : 60;
}

function supplementScore(complianceFraction) {
  if (complianceFraction == null) return null;
  return Math.round(complianceFraction * 100);
}

// V1 wearable stubs — all return null
function hrvScore(_) { return null; }
function rhrScore(_) { return null; }
function sleepScore(_) { return null; }
```

### Combined score

```js
function readiness({ caloriesRatio, proteinRatio, trainedYesterday, supplementCompliance, hrv, restingHr, sleepHours }) {
  const scores = [
    caloriesScore(caloriesRatio),
    proteinScore(proteinRatio),
    trainedScore(trainedYesterday),   // always present
    supplementScore(supplementCompliance),
    hrvScore(hrv),
    rhrScore(restingHr),
    sleepScore(sleepHours),
  ].filter(s => s != null);

  if (scores.length === 0) {
    return { score: null, status: 'no_data', narrative: 'Log a meal or workout to unlock readiness.' };
  }

  const score = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
  return { score, status: statusFor(score), narrative: narrativeFor(score) };
}

function statusFor(s) {
  if (s >= 75) return 'green';
  if (s >= 50) return 'amber';
  return 'red';
}

function narrativeFor(s) {
  if (s >= 90) return 'Primed — full send.';
  if (s >= 75) return 'Green light — hit the session.';
  if (s >= 60) return 'Amber — train but skip intensity techniques.';
  if (s >= 40) return 'Back off — light accessory day.';
  return 'Recover — rest, eat, sleep.';
}
```

### Null handling

- **Individual wearable inputs are always null in V1** — `hrvScore / rhrScore / sleepScore` return null; the filter drops them; score normalizes over `{calories, protein, trained, supplement}` (up to 4 present inputs).
- **Any nutrition input can be null** (e.g., yesterday's daily-log.md block missing, or the user didn't log) — its score is dropped; the remaining inputs still compute a score.
- **If all four primary inputs are null** — the function returns `{score: null, status: 'no_data', narrative: 'Log a meal or workout to unlock readiness.'}`. The UI renders "—" for the score and shows a "wearable not connected" affordance below the narrative (link: "Connect a wearable in V2 · read-only status").

### Test vectors (write unit tests for each BEFORE UI)

| # | Inputs | Expected output | Why |
|---|---|---|---|
| 1 | `{caloriesRatio: 1.0, proteinRatio: 1.0, trainedYesterday: true, supplementCompliance: 1.0, hrv: null, restingHr: null, sleepHours: null}` | `{score: 96, status: 'green', narrative: 'Primed — full send.'}` | Perfect day; mean of 95+100+90+100 = 96.25 → 96 |
| 2 | `{caloriesRatio: 0.50, proteinRatio: 0.44, trainedYesterday: true, supplementCompliance: 0, hrv: null, restingHr: null, sleepHours: null}` | `{score: 44, status: 'red', narrative: 'Back off — light accessory day.'}` | Undereaten but trained; mean of 45+40+90+0 = 43.75 → 44 |
| 3 | `{caloriesRatio: null, proteinRatio: null, trainedYesterday: false, supplementCompliance: null, hrv: null, restingHr: null, sleepHours: null}` | `{score: 60, status: 'amber', narrative: 'Amber — train but skip intensity techniques.'}` | Only `trainedScore(false) = 60` is present → score = 60 |
| 4 | `{caloriesRatio: null, proteinRatio: null, trainedYesterday: null, supplementCompliance: null, hrv: null, restingHr: null, sleepHours: null}` | `{score: null, status: 'no_data', narrative: 'Log a meal or workout to unlock readiness.'}` | All inputs null (including trained — hypothetically, though in V1 `trained` is always computed) → no_data branch |
| 5 | `{caloriesRatio: 1.15, proteinRatio: 1.05, trainedYesterday: false, supplementCompliance: 0.75, hrv: null, restingHr: null, sleepHours: null}` | `{score: 78, status: 'green', narrative: 'Green light — hit the session.'}` | Slightly over on cals, perfect protein, rest day, 75% supps; mean of 80+100+60+75 = 78.75 → 78 |

**Note on test vector 4:** in practice, V1 never sees `trainedYesterday: null` — it is always `true` (heading exists) or `false` (no heading). Test vector 4 exists for robustness when a future V2 wearable-only mode might render readiness without a training-log at all. Implementer should still handle the branch.

### Card UI shape

- **Hero placement:** top of Today view, full-width card, 120px tall.
- **Left:** score in `--theme_type-hero` (48px), status-colored circle background behind it (`green`/`amber`/`red` → `--theme_success` / `--theme_warning` / `--theme_danger`). If `status === 'no_data'`, circle is `--theme_border`, score reads `—`.
- **Right:** narrative in `--theme_type-feature` (20px) on top line, "Wearable: not connected" affordance in `--theme_type-caption` `--theme_text-weak` on bottom line with link styling.
- **Card outer:** `--theme_radius-card` (16px), `--theme_shadow-card`, `--theme_space-lg` (24px) padding.

## 7. Data Contracts

Every canonical file the dashboard reads has one subsection: REST endpoint, expected heading anchors, parse strategy, refresh policy, and empty-state contract. All paths rooted at the Obsidian vault; REST API base is `https://127.0.0.1:27124/vault/`.

**Shared:** every request attaches `Authorization: Bearer ${localStorage['obsidian:apiKey']}` and `Accept: text/markdown`. The dashboard reads the API key from `localStorage['obsidian:apiKey']` (user pastes it once in Settings view; never committed, never sent anywhere but 127.0.0.1). Use `fetch()` with credentials omitted. All reads are SWR (stale-while-revalidate) — cache the body in `localStorage['cache:<path>']` with a `last-fetched` timestamp; return cache immediately if < `staleMs`, fire a refresh in parallel.

### 7.1 `profile.md`

- **GET** `/vault/Data/health/profile.md`
- **Expected anchors:** `## Identity`, `## Goals`, `## Diet Profile`, `## Training Profile`, `## Health Profile`, `## Active Persona`
- **Parse:** split on `^## ` → section map. For each section, extract `- **Key**: Value` pairs into a flat `{key: value}` object. Special: `## Diet Profile` → `Targets` line is a comma-separated list `1,900 kcal / 160g P / 190g C / 55g F / 3.0L water` → regex `/(\d[\d,]*)\s*(kcal|g|L)/g` to extract `{calories, proteinG, carbsG, fatG, waterL}`.
- **Refresh:** SWR, `staleMs: 5 * 60 * 1000` (5 min). Profile rarely changes mid-session.
- **Empty state:** the file should always exist and be populated; if it 404s, surface a blocking banner "Run /health-setup to initialize profile".
- **Sample (current reality, see actual file):**

```
## Identity
- **Name**: Amir
- **Current weight**: 185 lbs (cut start)
- **Goal weight**: 150 lbs

## Diet Profile
- **Targets**: 1,900 kcal / 160g P / 190g C / 55g F / 3.0L water
```

### 7.2 `nutrition/daily-log.md`

- **GET** `/vault/Data/health/nutrition/daily-log.md`
- **Expected anchors:** YAML frontmatter; then per-day `## YYYY-MM-DD (Day N)` blocks with nested `### Meals`, `### Supplements`, `### Compliance`, `### Notes`.
- **Parse:** split on `/^## \d{4}-\d{2}-\d{2}/m` → array of day blocks (newest first — file is reverse-chronological). For each day:
  - Top-of-day `| Metric | Value | Target | Status |` table → parse rows; `Value` and `Target` via regex `/^(\d+(?:\.\d+)?)\s*(kcal|g|L)?/` to strip units.
  - `### Meals` → each numbered item (`^\d+\. `) is a meal. Regex `/^\d+\.\s+\*\*(.+?)\s+\((.+?)\)\*\*\s+—\s+(.+)$/m` extracts `{name, time, description}`. Nutrient line below is `- Cal: ~NNN | P: ~Ng | C: ~Ng | F: ~Ng` → regex `/Cal: ~?(\d+)/`, `/P: ~?(\d+)g/`, etc.
  - `### Supplements` → list of `- [ ]` or `- [x]` items → `{name, taken: bool}`.
  - `### Compliance` → list of `- [ ]` or `- [x]` items with strikethrough optional.
- **Refresh:** SWR, `staleMs: 60 * 1000` (1 min). Today's entry changes mid-session when user quick-logs.
- **KPI strip driver:** today's day block's macro table row → feeds all 3 nutrition KPICards (calories/protein + computed remaining).
- **Empty state:** if no `## YYYY-MM-DD` for today exists, render tile with `<EmptyState icon="🍽️" title="No meals logged today" body="Use the AI-Sphere or run /health to log a meal." />`.

### 7.3 `avoidance-metrics.md`

- **GET** `/vault/Data/health/avoidance-metrics.md`
- **Expected anchors:** `## Current State`, `## Ghost History`
- **Parse:** from `## Current State` section, extract bulleted `- **Key**: Value` pairs into object. Fields of interest: `Days since last input`, `Current ghost streak`, `Longest ghost streak`, `Escalation level`, `Response rate`.
- **Refresh:** SWR, `staleMs: 2 * 60 * 1000` (2 min).
- **Used for:** header-area "ghost streak" counter badge (when `Current ghost streak > 0`, show in `--theme_warning`; when 0, hide).
- **Empty state:** if 404, hide the badge (non-fatal).

### 7.4 `training/training-log.md`

- **GET** `/vault/Data/health/training/training-log.md`
- **Expected anchors:** YAML frontmatter (`total-sessions`, `last-updated`); per-session `## YYYY-MM-DD` headings (append-only, newest-first).
- **Parse:** split on `/^## \d{4}-\d{2}-\d{2}/m` → array of session blocks (top = newest). Exact session body shape is not yet locked (file is currently empty, Phase 0 Task 2 schema emerges when first session is logged). For V1, the dashboard only needs:
  - presence/absence of today's heading → feeds `trainedYesterday` in readiness (§6)
  - count of headings in trailing 7 days → Training tile KPICard value
  - top 10 headings → DataTable rows on Training tile (columns: date, focus, top-set RPE)
- **Refresh:** SWR, `staleMs: 60 * 1000`.
- **Empty state (current reality — `total-sessions: 0`):** Training tile renders `<EmptyState icon="🏋️" title="No sessions logged yet" body="Log your first session via the AI-Sphere ('workout today: upper push, 6 exercises') or /health." />`.

### 7.5 `training/weekly-volume.md`

- **GET** `/vault/Data/health/training/weekly-volume.md`
- **Expected anchors:** YAML frontmatter; body is a table `| Muscle | Sets | Week | … |` (schema emerges post-Phase-0).
- **Parse:** find the first table; for each row extract `{muscle: string, setsThisWeek: number}`. Phase 2 may refine when the schema lands — treat this as a best-effort parse with fallback to 0.
- **Refresh:** SWR, `staleMs: 5 * 60 * 1000`.
- **Used for:** 2D body map heatmap intensities (see §5).
- **Empty state (current reality):** file body is empty → parser returns `[]` → every region renders `.heat-0` with legend hidden and caption "Log a session to populate the heatmap".

### 7.6 `medications/active-medications.md` + `compliance-log.md`

- **GET** `/vault/Data/health/medications/active-medications.md`
- **Expected anchors:** one `## <Drug Name>` per active med (e.g. `## Retatrutide`), with `- **Class**`, `- **Dose**`, `- **Schedule**`, `- **Started**`, `- **Known side effects**`, `- **Coaching implications**`.
- **Parse:** split on `^## ` → for each med, parse bulleted `- **Key**: Value` pairs into object.
- **GET** `/vault/Data/health/medications/compliance-log.md`
- **Expected anchors:** per-day `## YYYY-MM-DD` blocks with checkbox items (`- [x] Retatrutide` / `- [ ] Creatine`).
- **Parse:** same split-on-`## \d{4}` pattern. For each day: extract checkbox items `^- \[([ x])\] (.+)$` → `{taken: bool, item: name}`.
- **Refresh:** SWR, `staleMs: 60 * 1000`.
- **Used for:** Meds tile (list of active meds + today's compliance bar + 12-week heatmap of compliance%); feeds `supplementCompliance` in readiness (§6).
- **Empty state (current reality — compliance-log is empty):** heatmap is all `.heat-0`, tile shows `<EmptyState icon="💊" title="No compliance logged today" body="Tap a med card to mark it taken." />`.

### 7.7 `check-in-config.md`

- **GET** `/vault/Data/health/check-in-config.md`
- **Expected anchors:** `## Schedule`, `## Active Domains`, `## Morning Covers`, `## Evening Covers`, `## Custom Preferences`.
- **Parse:** `## Schedule` table → `{morning: '9:00 AM', evening: '10:00 PM', morningActive: true, eveningActive: true}`. `## Active Domains` checklist → array of active domain strings.
- **Refresh:** SWR, `staleMs: 10 * 60 * 1000` (10 min — rarely changes).
- **Used for:** Settings view next-check-in display; Today view header pill "Next check-in: 9:00 AM".
- **Empty state:** if 404, hide the pill; Settings view shows CTA "Run /health-setup to configure check-ins".

### 7.8 `nutrition/meal-library.md` (optional V1)

- **GET** `/vault/Data/health/nutrition/meal-library.md`
- **Expected anchors:** TBD (file exists but schema not yet inspected — deferred to Phase 0 Task 2).
- **V1 use:** Nutrition view's "meal library" browser. If schema not yet locked by Phase 2 start, render an `<EmptyState>` and revisit in V1.1.

### Summary table

| File | Staleness | Feeds | Empty behavior |
|---|---|---|---|
| profile.md | 5 min | Targets, persona, name | blocking banner |
| nutrition/daily-log.md | 1 min | KPIs, meals table, readiness calories/protein | EmptyState per tile |
| avoidance-metrics.md | 2 min | Ghost-streak badge | hide badge |
| training/training-log.md | 1 min | Sessions table, readiness trained bool | EmptyState |
| training/weekly-volume.md | 5 min | 2D heatmap intensities | heat-0 everywhere |
| medications/active-medications.md | 5 min | Med cards | EmptyState |
| medications/compliance-log.md | 1 min | Compliance heatmap, readiness supplement% | heat-0, EmptyState |
| check-in-config.md | 10 min | Header pill, Settings | hide pill |
| nutrition/meal-library.md | (deferred) | Meal browser | EmptyState in V1 |

## 8. Write Patterns (PATCH)

**Iron rule:** every write is a heading-targeted PATCH. Never PUT a full file. Full-file PUTs race with the health-agent plugin's writes and corrupt `Data/health/*.md` (see `PLAN.md` §"Concurrency risk"). Phase 0 Task 1's write-pattern audit locks the exact heading anchors each agent uses — this section matches them.

### Shared PATCH shape

```
PATCH /vault/<path>
Authorization: Bearer <apiKey>
Content-Type: text/markdown
Operation: append | prepend | replace
Target-Type: heading
Target: <heading anchor, e.g. "Meals" or a nested "2026-04-13/Meals">
Trim-Target-Whitespace: true

<payload body — plain markdown>
```

The Local REST API resolves `Target: Meals` to the first `### Meals` (or `## Meals`, etc.) heading at any level under the given path. Nested targets use `/` to disambiguate: `Target: 2026-04-13/Meals` resolves to `### Meals` under `## 2026-04-13`.

### Write sites

#### 8.1 Quick-log meal → `nutrition/daily-log.md`

- **PATCH** `/vault/Data/health/nutrition/daily-log.md`
- **Operation:** `append`
- **Target-Type:** `heading`
- **Target:** `<today-date>/Meals` (e.g. `2026-04-13/Meals`)
- **Payload:**

  ```markdown
  N. **<meal name> (<HH:MMam/pm>)** — <description>
     - Cal: ~<N> | P: ~<N>g | C: ~<N>g | F: ~<N>g
     - Confidence: <low|medium|high>
     - Input: text, response quality: N/A
     - Source: dashboard quick-log
  ```

  where `N` = next ordinal (dashboard reads current meal count under `### Meals` and increments).

- **Precondition:** today's `## YYYY-MM-DD (Day N)` block must exist. If absent, the dashboard first PATCHes to PREPEND a new day block (see 8.6) before the meal append.
- **Post-UI:** optimistic — append the meal to state immediately; reconcile on next GET.

#### 8.2 Quick-log workout → `training/training-log.md`

- **PATCH** `/vault/Data/health/training/training-log.md`
- **Operation:** `prepend` (append-only log is *newest-first*, so prepend a new top heading)
- **Target-Type:** `heading`
- **Target:** *(root-level — no anchor; the REST API supports `Target: "" Operation: prepend` to target document top; if unsupported in current plugin version, fall back to a file-body append with a manual top-level heading)*
- **Payload:**

  ```markdown
  ## <today-date>

  - **Focus:** <focus from AI-Sphere input, e.g. "Upper Push">
  - **Exercises:** <N>
  - **Source:** dashboard quick-log
  ```

- **Note:** full session schema (sets × reps × RPE per exercise) is deferred to V1.1 — V1's quick-log captures only the date heading + focus. This is enough to flip `trainedYesterday` to `true` in readiness (§6).
- **Post-UI:** optimistic.

#### 8.3 Mark med taken → `medications/compliance-log.md`

- **PATCH** `/vault/Data/health/medications/compliance-log.md`
- **Operation:** `append`
- **Target-Type:** `heading`
- **Target:** `<today-date>` (e.g. `2026-04-13`)
- **Payload:**

  ```markdown
  - [x] <med or supplement name>
  ```

- **Precondition:** today's `## YYYY-MM-DD` block must exist. If absent, PATCH PREPEND to document-top first (see 8.6 variant for compliance-log).
- **Post-UI:** optimistic — toggle the checkbox in state immediately.

#### 8.4 Quick-log note (catch-all) → today's `Daily/YYYY-MM-DD.md`

- **PATCH** `/vault/Daily/<today-date>.md`
- **Operation:** `append`
- **Target-Type:** `heading`
- **Target:** `Quick Log`
- **Payload:**

  ```markdown
  - <HH:MM> — <free text>
  ```

- **Precondition:** daily note may not exist (Obsidian daily-note plugin creates it on demand). If 404, the dashboard first PUTs a minimal template (only safe PUT in the whole spec, because daily notes are not concurrently written by the health-agent):

  ```markdown
  ---
  date: <today>
  ---

  ## Quick Log
  ```

  …then PATCHes the append.

#### 8.5 New-day bootstrap → `nutrition/daily-log.md`

- **PATCH** `/vault/Data/health/nutrition/daily-log.md`
- **Operation:** `prepend`
- **Target-Type:** `heading`  (or document-top if plugin lacks prepend-to-top support)
- **Payload:**

  ```markdown
  ## <today-date> (Day <N>)

  | Metric | Value | Target | Status |
  |--------|-------|--------|--------|
  | Calories | 0 | <profile-calorie-target> | 0% |
  | Protein | 0g | <profile-protein-target>g | 0% |
  | Carbs | 0g | <profile-carb-target>g | 0% |
  | Fat | 0g | <profile-fat-target>g | over |
  | Water | 0 | <profile-water-target>L | 0% |

  ### Meals

  ### Supplements

  ### Compliance

  ### Notes
  ```

- **Triggered by:** 8.1 precondition failure (today's block missing).

#### 8.6 New-day bootstrap → `medications/compliance-log.md`

- **PATCH** `/vault/Data/health/medications/compliance-log.md`
- **Operation:** `prepend`
- **Payload:**

  ```markdown
  ## <today-date>
  ```

- **Triggered by:** 8.3 precondition failure.

### Retry policy

Every PATCH wraps in a single retry on network error (`TypeError: NetworkError` or non-2xx):

```js
async function patch(path, opts, attempt = 1) {
  try {
    const res = await fetch(base + path, {method: 'PATCH', ...opts});
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res;
  } catch (err) {
    if (attempt === 1) return patch(path, opts, 2);
    surfaceErrorToast(`Write failed: ${err.message}`);
    throw err;
  }
}
```

No exponential backoff (local 127.0.0.1, failure modes are binary — plugin running or not).

### Optimistic UI rules

Every quick-log write:
1. **Update UI immediately** — add the row/checkbox/entry to `state` before the network call.
2. **Fire PATCH** — in parallel, not awaited by render.
3. **On success** — mark the state entry as `synced: true`; no visual change unless §11 (Failure Modes) demands.
4. **On failure (after retry)** — roll back the state change AND show a red error toast: "Write failed — the plugin is probably offline. Use /health to log this instead." Keep optimistic entry greyed with "retry" button.
5. **On next GET** — reconcile. If the next read doesn't contain the optimistic entry, remove it silently (the retry can still be manually fired).

### Never do

- Never PUT a full-file body to any file under `Data/health/`.
- Never write to a heading anchor that doesn't exist yet — use the bootstrap PATCHes (8.5/8.6) first.
- Never write to `profile.md` from the dashboard in V1. Profile is owned by `/health-setup` exclusively.
- Never retry more than once; surfacing the error is better than hammering the plugin.

## 9. AI-Sphere FAB Interaction

One button, bottom-right, that lets the user log anything in one sentence. V1 is **regex-only** — no LLM call. The sphere routes `"ate 6 eggs"` to `8.1`, `"trained upper push"` to `8.2`, `"took retatrutide"` to `8.3`, everything else to `8.4` (free note).

### Visuals

- **Collapsed:** fixed position `bottom: 24px; right: 24px;`, 56px circle, `z-index: 1000`.
- **Background:** CSS conic gradient `conic-gradient(from 0deg, var(--theme_blue) 0%, var(--theme_blue-mid) 35%, var(--theme_blue) 70%, var(--theme_blue-mid) 100%)` with 20s slow rotation animation:

  ```css
  .ai-sphere {
    position: fixed; bottom: 24px; right: 24px;
    width: 56px; height: 56px; border-radius: 50%;
    background: conic-gradient(from 0deg, var(--theme_blue) 0%, var(--theme_blue-mid) 35%, var(--theme_blue) 70%, var(--theme_blue-mid) 100%);
    box-shadow: var(--theme_shadow-card), 0 0 24px rgba(45, 127, 249, 0.4);
    cursor: pointer; border: none;
    animation: ai-sphere-spin 20s linear infinite;
  }
  @keyframes ai-sphere-spin { to { transform: rotate(360deg); } }
  ```

- **Expanded:** 320px × 80px rounded panel replaces the sphere in-place; input field + submit button; slow rotation pauses.
- **Keyboard:** global `/` focuses and expands the sphere; `Esc` collapses.

### Classifier (regex-only, V1)

Run each regex in order; first match wins. Unmatched input → free note (`8.4`).

```js
const CLASSIFIERS = [
  {
    domain: 'meal',
    pattern: /^(ate|had|eating|breakfast|lunch|dinner|snack|meal)\b/i,
    extract: (text) => ({ name: text.replace(/^(ate|had|eating|breakfast|lunch|dinner|snack|meal)\s*:?\s*/i, '').trim() }),
  },
  {
    domain: 'workout',
    pattern: /^(trained|workout|lifted|ran|gym session|session)\b/i,
    extract: (text) => ({ focus: text.replace(/^(trained|workout|lifted|ran|gym session|session)\s*:?\s*/i, '').trim() }),
  },
  {
    domain: 'med',
    pattern: /^(took|injected|dosed|dose)\b/i,
    extract: (text) => ({ item: text.replace(/^(took|injected|dosed|dose)\s*:?\s*/i, '').trim() }),
  },
];

function classify(text) {
  for (const c of CLASSIFIERS) {
    if (c.pattern.test(text)) return { domain: c.domain, data: c.extract(text) };
  }
  return { domain: 'note', data: { text } };
}
```

### Submit flow

1. User types → presses Enter (or clicks submit).
2. `classify(text)` → `{domain, data}`.
3. Switch on `domain`:
   - `meal` → build meal payload (name + time = now; cal/p/c/f = nulls with "Confidence: low" marker for user to edit later) → `8.1` PATCH.
   - `workout` → build workout payload → `8.2` PATCH.
   - `med` → build med payload → `8.3` PATCH.
   - `note` → `8.4` PATCH.
4. Optimistic UI update (§8 rules).
5. 400ms green flash on the sphere, then auto-collapse. If error, red flash + toast.

### Prompt template (for V2 LLM upgrade)

The regex classifier has a known ceiling. V2 replaces `classify(text)` with a one-shot LLM call using this template (spec'd here for continuity):

```
You are a health-tracker input classifier. The user submits one short sentence describing a meal, workout, medication, or arbitrary note. Classify and extract structured fields.

User input: "<text>"

Return valid JSON matching this schema:
{
  "domain": "meal" | "workout" | "med" | "note",
  "confidence": 0.0–1.0,
  "data": <domain-specific object — see examples below>
}

Examples:
- "6 tyson wings" → {"domain":"meal","confidence":0.95,"data":{"name":"6 tyson wings","time":"now","cal":600,"proteinG":60,"carbsG":0,"fatG":40}}
- "upper push, 6 exercises" → {"domain":"workout","confidence":0.9,"data":{"focus":"Upper Push","exerciseCount":6}}
- "took retatrutide 4mg" → {"domain":"med","confidence":0.95,"data":{"item":"Retatrutide","dose":"4mg"}}
- "random thought about cardio" → {"domain":"note","confidence":1.0,"data":{"text":"random thought about cardio"}}

Respond with JSON only, no prose.
```

V1 does not call any LLM. The classifier is regex-only, and missing macros are logged as `null` for the user to fill in later on the Nutrition tile.

### Empty-input handling

If the user submits an empty string or < 2 characters, shake the input (`translateX` keyframe), focus it, do nothing else. No PATCH fires.

### Offline handling

If `navigator.onLine === false` OR the last health-check ping to `GET /vault/Data/health/profile.md` failed, disable the submit button and show a tooltip "Obsidian disconnected — reconnect in Settings". The sphere is still visible and spins, but submissions are blocked.

## 10. State Management

Single global `state` object, single `dispatch(action)` entrypoint, pure `render*(state)` functions. No framework. This is a direct expansion of `nippard-training-hub.html`'s existing patterns — `activeFilters` (`:1508`) and `selectedMuscle` (`:1624`) are the precedent — scaled up to whole-dashboard state.

### State shape

```js
const state = {
  // Canonical data — mirrors Data/health/*.md files after parse
  profile: {
    identity: { name: null, age: null, weightLbs: null, goalWeightLbs: null },
    goals: { primary: null, secondary: null },
    dietProfile: { restrictions: [], calories: null, proteinG: null, carbsG: null, fatG: null, waterL: null },
    activePersona: null,
  },

  today: {
    date: '2026-04-13',
    macros: { calories: 0, proteinG: 0, carbsG: 0, fatG: 0, waterL: 0 },
    meals: [],        // {name, time, description, cal, proteinG, carbsG, fatG, confidence}[]
    supplements: [],  // {name, taken}[]
    compliance: [],   // {item, taken}[]
  },

  training: {
    lastSessionDate: null,
    trainedYesterday: false,
    recentSessions: [],   // {date, focus, exerciseCount}[]
    weeklyVolume: {},     // {[muscle]: setsThisWeek}
  },

  nutrition: {
    recentMeals: [],      // flattened from last 7 days of daily-log
    mealLibrary: [],      // {name, cal, proteinG, …}[] — deferred to V1.1
  },

  meds: {
    active: [],           // {name, class, dose, schedule, started, sideEffects, coaching}[]
    complianceLast12Weeks: {}, // {date: {items: [{name, taken}], compliancePct}}
    supplementStack: [],
  },

  body: {
    weeklySnapshots: [],   // {date, weightLbs, bodyFatPct?, notes}[]
  },

  avoidance: {
    daysSinceLastInput: 0,
    currentGhostStreak: 0,
    longestGhostStreak: 0,
    escalationLevel: 0,
  },

  checkInConfig: {
    morning: null,
    evening: null,
    activeDomains: [],
  },

  readiness: {             // computed; re-derived after any canonical update
    score: null,
    status: 'no_data',
    narrative: 'Log a meal or workout to unlock readiness.',
  },

  ui: {
    activeView: 'today',                 // 'today' | 'training' | 'nutrition' | 'meds' | 'body' | 'settings'
    sidebarCollapsed: false,
    bodyMapMode: '2d',                   // '2d' | '3d'
    selectedMuscle: null,                // string | null
    aiSphereOpen: false,
    apiReachable: true,
    apiLastError: null,
  },

  cache: {                   // stored in localStorage; hydrated on boot
    lastFetched: {},         // {[path]: unixMs}
    bodies: {},              // {[path]: rawMarkdown}
  },
};
```

### Dispatch

All mutations go through one function:

```js
function dispatch(action) {
  console.log('[dispatch]', action.type, action);  // V1: log every action
  switch (action.type) {
    case 'HYDRATE_PROFILE':           state.profile = action.payload; break;
    case 'HYDRATE_TODAY':             state.today = action.payload; break;
    case 'HYDRATE_TRAINING':          state.training = action.payload; break;
    case 'HYDRATE_NUTRITION':         state.nutrition = action.payload; break;
    case 'HYDRATE_MEDS':              state.meds = action.payload; break;
    case 'HYDRATE_AVOIDANCE':         state.avoidance = action.payload; break;
    case 'HYDRATE_CHECKIN':           state.checkInConfig = action.payload; break;

    case 'UI_SET_VIEW':               state.ui.activeView = action.view; break;
    case 'UI_TOGGLE_SIDEBAR':         state.ui.sidebarCollapsed = !state.ui.sidebarCollapsed; break;
    case 'UI_SET_BODYMAP_MODE':       state.ui.bodyMapMode = action.mode; break;
    case 'UI_SELECT_MUSCLE':          state.ui.selectedMuscle = action.muscle; break;
    case 'UI_TOGGLE_AI_SPHERE':       state.ui.aiSphereOpen = !state.ui.aiSphereOpen; break;

    case 'OPTIMISTIC_ADD_MEAL':       state.today.meals.push(action.meal); break;
    case 'OPTIMISTIC_MARK_MED':       state.today.compliance.find(c => c.item === action.item).taken = true; break;
    case 'OPTIMISTIC_ROLLBACK':       /* reverse the last action in a history stack */ break;

    case 'API_REACHABLE':             state.ui.apiReachable = true; state.ui.apiLastError = null; break;
    case 'API_UNREACHABLE':           state.ui.apiReachable = false; state.ui.apiLastError = action.error; break;

    default: console.warn('Unknown action:', action.type); return;
  }

  // Re-derive computed fields
  state.readiness = readiness({
    caloriesRatio: state.today.macros.calories / state.profile.dietProfile.calories,
    proteinRatio: state.today.macros.proteinG / state.profile.dietProfile.proteinG,
    trainedYesterday: state.training.trainedYesterday,
    supplementCompliance: /* today compliance fraction */ null,
    hrv: null, restingHr: null, sleepHours: null,
  });

  persistLocalCache();
  renderAll(state);
}
```

### Persist

On each dispatch, write a slim slice to `localStorage`:

```js
function persistLocalCache() {
  localStorage.setItem('ui:activeView', state.ui.activeView);
  localStorage.setItem('ui:sidebarCollapsed', JSON.stringify(state.ui.sidebarCollapsed));
  localStorage.setItem('ui:bodyMapMode', state.ui.bodyMapMode);
  // Cached raw bodies are set by the fetcher, not here.
}
```

On boot, `hydrateFromLocalStorage()` reads these keys (with defaults) and restores `state.ui`.

### Render

Top-level `renderAll(state)` calls per-view/per-tile renderers:

```js
function renderAll(state) {
  renderSidebar(state);
  renderReadiness(state);
  renderKPIStrip(state);
  renderActiveView(state);     // dispatches to renderToday/renderTraining/...
  renderAISphere(state);
  renderAPIStatusPill(state);
}
```

Each `render*` function:
- is **pure** — reads state, writes to DOM; no state mutation.
- replaces DOM subtree content by re-building a fragment and `replaceChildren()` on the container — no diffing.
- uses `textContent` / `createElement` / `appendChild` exclusively — never `innerHTML` (XSS hardening is non-negotiable, since AI-Sphere input is user-controlled).

This is a deliberate tradeoff: full re-render on every dispatch is slower than a framework's diff, but tractable at this data size (<< 1000 DOM nodes per view) and avoids a framework dependency.

### Precedent references

- `nippard-training-hub.html:1508` — `let activeFilters = new Set()` — single module-level state atom, mutated directly. The dashboard preserves the *single-atom* idea but routes mutations through `dispatch()` for observability.
- `nippard-training-hub.html:1624` — `let selectedMuscle = null` — same pattern; the dashboard lifts this exact atom into `state.ui.selectedMuscle`.
- `nippard-training-hub.html:1385` — `function showView(name)` — minimal routing via class toggle; the dashboard reimplements this as a dispatch + `renderActiveView()`.

## 11. Failure Modes

Sparse canonical data is the *default* state, not an edge case. The dashboard must degrade gracefully every time a file is missing, empty, or unparseable. This section enumerates every failure class with the matching UI response.

### F1. Obsidian REST API unreachable (connection refused / timeout)

- **Detection:** any fetch throws `TypeError`, or returns 5xx, or does not respond within 3s.
- **UI response:**
  - Persistent banner at top of main content: **"Obsidian disconnected — read-only mode. Reconnect in Settings."** background `--theme_warning` at 10% opacity, text `--theme_text`, close button hidden.
  - Every data read resolves to the cached value from `localStorage['cache:<path>']` if present; empty state otherwise.
  - All PATCH buttons (AI-Sphere submit, med checkboxes, tile quick-log forms) are disabled with tooltip "Plugin offline".
  - Status pill in footer flips from `● Connected` green to `● Disconnected` red.
- **Recovery:** dashboard polls `GET /vault/Data/health/profile.md` every 30s while disconnected; on success, dispatch `API_REACHABLE`, clear banner, re-enable writes.

### F2. 404 on a canonical file (file doesn't exist)

- **Detection:** GET returns 404.
- **UI response:** the tile/section that depends on that file renders `<EmptyState>` with domain-appropriate copy and CTA. Examples:

  | File | EmptyState title | EmptyState body | CTA |
  |---|---|---|---|
  | `profile.md` | Profile not initialized | Run `/health-setup` to create your profile. | Copy command |
  | `nutrition/daily-log.md` | No nutrition log | Run `/health-setup --domain nutrition` to begin logging. | Copy command |
  | `training/training-log.md` | No training log | Run `/health-setup --domain training` to begin logging. | Copy command |
  | `medications/active-medications.md` | No active medications | Run `/health-setup --domain health` to set up meds. | Copy command |
  | `medications/compliance-log.md` | No compliance log | File is created on first med log — no action needed. | — |
  | `training/weekly-volume.md` | No volume data | Log a training session to populate. | — |
  | `check-in-config.md` | No check-in schedule | Run `/health-setup` to set check-in times. | Copy command |

- **No global banner** — 404s are per-file, recoverable by running the setup command.

### F3. File exists but body is empty (current reality for 4 files)

- **Detection:** GET returns 200 with body consisting of only YAML frontmatter + HTML comments.
- **UI response:** same as F2 (render `<EmptyState>`). This is the *normal* initial state; the copy is phrased accordingly (e.g. "Log your first session with the AI-Sphere" rather than "No training log").
- Affected in V1 reality: `training-log.md`, `training/weekly-volume.md`, `medications/compliance-log.md`, `nutrition/meal-library.md` (behavior TBD).

### F4. Parse error on a file (schema regression)

- **Detection:** parser throws or returns a partial object missing required fields.
- **UI response:**
  - Tile renders `<EmptyState icon="⚠️" title="Parse error" body="The file shape changed — check [file path]." />`.
  - Full error + filepath logged to console under `[parse:<file>]`.
  - Non-blocking: other tiles continue to render.
- **No global banner** — parse errors are per-file; the right fix is a schema update in Phase 0 Task 2.

### F5. PATCH conflict (ETag mismatch / concurrent write)

- **Detection:** PATCH returns 409 or the post-write GET reveals the optimistic entry is missing / duplicated.
- **UI response:**
  - Re-read the file.
  - Compute a diff between optimistic state and the fresh body.
  - Open a modal: **"Conflict detected"**, show both versions side-by-side, two buttons: **"Keep mine (retry PATCH)"** and **"Discard mine (use latest)"**.
  - User picks; dispatch accordingly; close modal.
- V1 may never hit this in practice (single-user, low write rate), but the handler is specified so the dashboard doesn't silently corrupt state.

### F6. Optimistic write fails after retry

- **Detection:** both PATCH attempts return non-2xx.
- **UI response:**
  - Roll back the optimistic state change.
  - Red toast bottom-left, 6s: **"Write failed — use `/health` to log this."**
  - The queued write stays in `state.writeQueue[]`; a "Retry queued writes" button appears in the footer that re-fires all queued writes on click.

### F7. Authentication failure (401 / 403)

- **Detection:** GET or PATCH returns 401 / 403.
- **UI response:**
  - Full-screen modal blocking interaction: **"Obsidian REST API key invalid"**, input field for new key, "Save" button.
  - Save writes to `localStorage['obsidian:apiKey']`, dismisses modal, re-runs the failed request.
  - If Save still fails, modal stays open with error message under the input.

### F8. Asset load failure (GLB > 8 MB or 404)

- **Detection:** `<model-viewer>` fires `error` event OR asset size verified pre-Phase-0 fails check.
- **UI response:**
  - Body view falls back to 2D only; toggle is hidden.
  - Console warn `[asset] body.glb failed to load` with the error detail.
  - No user-facing banner — 2D is a full-quality fallback.

### F9. AI-Sphere submit while empty / classifier matches nothing

- **Empty input:** shake animation, no PATCH.
- **Classifier unmatched:** routes to `8.4` free-note PATCH. Not a failure; documented here for completeness.

### Sparse-data tolerance as a first-class requirement

Current reality (2026-04-13): `profile.md` is the only file with meaningful content. The dashboard is considered **passing** when:

- Today view loads with **zero JavaScript errors** in console when every non-profile canonical file is empty.
- Every tile renders either its content or a graceful `<EmptyState>` — never a crash, never a blank area, never `undefined` or `NaN` in the DOM.
- The readiness card shows `—` for the score (not `null`, not `NaN`, not an error) and the `no_data` narrative.

This is the bar. Phase 2 QA must verify it before anything else.

## 12. Acceptance Criteria

A reviewer runs this checklist against `Projects/health-fat-loss/health-dashboard.html` before V1 is called shippable. Every check is binary: pass or fail. A single fail blocks V1 sign-off.

### Data + rendering (no-crash baseline)

- [ ] **A1.** Today view loads with zero JavaScript console errors when every `Data/health/*.md` file contains only YAML frontmatter (current reality).
- [ ] **A2.** Every tile renders either its content or a domain-appropriate `<EmptyState>` — no blank areas, no `undefined`, no `NaN` in the DOM.
- [ ] **A3.** Readiness card displays `—` for score and the `no_data` narrative when all four primary inputs (calories, protein, trained, supplements) are null.
- [ ] **A4.** Readiness card displays a computed integer score (not `NaN`, not `undefined`) for every combination of 1–4 present inputs, matching the test vectors in §6.
- [ ] **A5.** Reload after 5 minutes returns to the last active view (`localStorage['ui:activeView']` restored) with sidebar collapse state preserved.

### Body map

- [ ] **A6.** 2D body map renders all 11 muscle regions as clickable SVG paths matching the anchors in §5.
- [ ] **A7.** Clicking a 2D region highlights it, sets `state.ui.selectedMuscle`, and populates the side panel with exercises whose `primaryMuscle` matches, sorted by `lastLoggedDate` ascending.
- [ ] **A8.** Body-map 2D↔3D toggle persists across page reload (`localStorage['ui:bodyMapMode']`).
- [ ] **A9.** When 3D mode is active, the footer displays the mandatory CC-BY 4.0 attribution line verbatim: `3D model: Ruslan Gadzhiev / Sketchfab · CC-BY 4.0`.
- [ ] **A10.** Heatmap applies `.heat-0` to every region when `weekly-volume.md` body is empty; legend is hidden; a caption reads "Log a session to populate the heatmap".

### Writes

- [ ] **A11.** Quick-logging a meal via AI-Sphere causes `Data/health/nutrition/daily-log.md` to gain exactly one additional numbered item under today's `### Meals` heading — not zero, not two, not in `### Supplements`.
- [ ] **A12.** Quick-logging a workout prepends a new `## YYYY-MM-DD` heading at the top of `Data/health/training/training-log.md` (below frontmatter).
- [ ] **A13.** Marking a med taken appends a single `- [x] <name>` checkbox line under today's `## YYYY-MM-DD` heading in `Data/health/medications/compliance-log.md`.
- [ ] **A14.** Every outbound write observed in DevTools Network tab is an HTTP `PATCH` with `Target-Type: heading` header and a specific `Target:` — no `PUT` to any `Data/health/*.md` file.
- [ ] **A15.** Optimistic UI rule: a quick-logged meal appears in the Nutrition tile within 200ms of submit, before the PATCH response returns.

### Failure modes

- [ ] **A16.** Stopping Obsidian (or unplugging the REST API) triggers the persistent "read-only mode" banner within 5s and disables every PATCH button.
- [ ] **A17.** Restarting Obsidian clears the banner within 30s and re-enables PATCH buttons.
- [ ] **A18.** Deleting a canonical file (e.g. `mv Data/health/training/training-log.md ...bak`) causes its tile to render `<EmptyState>` with the "Copy command" CTA — not a crash.
- [ ] **A19.** Re-adding the file restores the tile to its normal state on the next SWR refresh.

### Visual / token compliance

- [ ] **A20.** Every computed-style color in the rendered DOM resolves to a `var(--theme_*)` token from the §3 `:root` block — no literal hex or rgba values outside `:root`. (Verify via DevTools Computed tab sampling.)
- [ ] **A21.** All button radii are 12px (`--theme_radius-btn`); all card radii are 16px (`--theme_radius-card`); all section radii are 24px (`--theme_radius-section`). No exceptions.
- [ ] **A22.** Body text uses the `--theme_font-body` stack with `letter-spacing: 0.18px` (positive tracking).
- [ ] **A23.** Every elevated card uses the multi-layer `--theme_shadow-card` — no single-layer `0 4px 12px` shadows anywhere.

### Smoke test

- [ ] **A24.** A fresh clone of the repo, `open Projects/health-fat-loss/health-dashboard.html` in Chrome with the Obsidian REST API plugin running and the API key in `localStorage`, produces a fully-rendered Today view within 3 seconds — no CORS errors, no 404 on assets.

# Unified Health Dashboard — Implementation Plan

## Context

Continuation of `~/.claude/plans/snug-frolicking-treasure.md` (the brainstorm + research plan from 2026-04-13). That plan locked three architectural decisions and deferred 5 design questions to research. Both research vectors are now complete:

- General dashboard research: `Research/reports/2026-04-13-health-dashboard-research.html`
- 3D body-model implementation research: `Research/reports/2026-04-13-3d-body-model-options.html`

This plan supersedes them with a concrete build-ready spec.

**Goal:** evolve the static `Projects/health-fat-loss/nippard-training-hub.html` (1,700 lines, 48 hardcoded exercises, 11-region SVG body map, modal YouTube links) into a **live, multi-domain health dashboard** (NEW file) that:

- Reads canonical data from `Data/health/{training,nutrition,medications}/*.md`
- Writes back to the same markdown so the existing `/health` agent stays in sync
- Surfaces training + nutrition + body composition + medication compliance on one "Today" view
- Includes BOTH a 2D SVG body map (analytical heatmap, click→exercises) AND a 3D rotatable body model with hotspot tooltips (visual + AR mode), toggleable
- Has a 3D animated AI sphere FAB for quick-logging (visual now, AI-powered later)

**Locked from brainstorm (still locked):**
- Scope: unified health (training + nutrition + body comp + meds + compliance)
- Data flow: hybrid — markdown canonical, dashboard reads + writes
- Exercise visuals: hybrid — looping GIF/WebP preview + YouTube on demand (deferred to V2)

**Out-of-scope (inherited):**
- Apple Health / iOS Shortcuts (V2+)
- Wearable import (Whoop, Oura, Apple Watch) — but design forward-compat hooks
- AI coaching loop inside the dashboard (we have `/health-persona`)
- Replacing the iMessage check-in flow (dashboard complements it)
- Mobile responsive layout (V2 progressive enhancement; desktop-only V1)

---

## Decisions (locked)

| Topic | Decision |
|---|---|
| **File strategy** | New file: `Projects/health-fat-loss/dashboard.html`. Use `frontend-design` skill to scaffold against `Airtable_DESIGN.md` |
| **Design system** | Airtable-inspired: white canvas `#ffffff`, deep navy `#181d26`, Airtable Blue `#1b61c9`, Haas font (with system fallback), 12px button radius, 16–32px card radius, multi-layer blue-tinted shadow |
| **V1 scope philosophy** | Pragmatist core + 2D-and-3D body map enhancement + AI-sphere FAB (no voice/LLM yet); defer GIFs, Trends, alert banner to V2 |
| **Bridge mechanism (Q1)** | Obsidian Local REST API plugin (HTTPS 27124, bearer token, surgical PATCH at heading level) |
| **Body map (Q2)** | **TWO coexisting surfaces with 2D ↔ 3D toggle**: (a) 2D SVG with 11 regions, heatmap toggle (volume/recovery), click→primary-exercises sorted by recent training intensity; (b) 3D `<model-viewer>` with Sketchfab Gadzhiev male GLB, 16-22 hotspot pins with name + 1-2 sentence facts + program exercise count, AR mode for iOS Quick Look. Single-mesh GLB → no per-muscle highlighting in 3D (analytical work stays in 2D) |
| **Layout (Q3)** | Desktop-first, **left sidebar nav** (Airtable-style); Today only in V1 (Trends V2) |
| **GIFs (Q4)** | **Defer to V2.** Existing YouTube modal links suffice for V1 |
| **Style (Q5)** | Adopt Airtable design system (overrides research's "adopt Nippard hub style" recommendation); 3D research's Nippard CSS is adapted to Airtable tokens |
| **Hero readiness (Q6)** | Research's 4-input weighted formula: (a) days since last session, (b) last session intensity (RPE-derived), (c) total training load past 7d, (d) sleep self-report if logged. Output 0–100, mapped to traffic-light. Wearable inputs (HRV/sleep stages/RHR) wired as null-returning slots ready for swap-in |
| **Quick-log** | **3D animated AI sphere FAB** — animated sphere bottom-right; click opens text-input panel; V1 just appends timestamped note to today's `Daily/YYYY-MM-DD.md`. Voice + AI parsing → V2/V3 |
| **Active alert banner** | **V2** |
| **Existing nippard-training-hub.html** | **Delete after extraction.** Phase 0 extracts: (a) 48-exercise database, (b) 11-region 2D SVG body map markup, (c) any reusable modal/search code → ports to new dashboard structure |
| **/health agent write-pattern audit** | **Hard prerequisite.** Audit `~/.claude/plugins/local/health-agent/` for full-file PUT vs heading-PATCH. If full-file, fix convention BEFORE building dashboard writes |
| **Wearable forward-compat** | **Design hooks now.** Hero formula has slots for HRV/sleep/RHR returning null today, swap-in when wearable arrives |
| **Process** | **Write design spec first** at `Projects/health-fat-loss/specs/dashboard-design.md` BEFORE implementation. Spec includes component breakdowns, data schemas, visual layouts, Airtable-token mapping, then implementation follows |
| **Body map asset audit** | Open Sketchfab GLB at https://gltf-viewer.donmccurdy.com/ → confirm load + polygon count + mesh structure. If > 8 MB or > 200k tris, Draco-compress: `npx gltf-pipeline -i body-male.glb -o body-male-draco.glb -d` |
| **Mobile** | V2 progressive enhancement; V1 desktop-only |

---

## 3D Body Model Module — Spec (from 3D research)

**Tech stack:** Google's `<model-viewer>` web component (Apache-2.0, ~300-350 KB gzipped via CDN, zero framework dependency, no build step). NOT Three.js / React Three Fiber for V1 (over-engineered for hotspot use case).

**CDN import (one line in `<head>`):**
```html
<script type="module" src="https://ajax.googleapis.com/ajax/libs/model-viewer/4.2.0/model-viewer.min.js"></script>
```

**Asset:**
- Source: https://sketchfab.com/3d-models/male-body-muscular-system-anatomy-study-991eb96938be4d0d8fadee241a1063d3
- Author: **Ruslan Gadzhiev** · License: **CC-BY 4.0** (attribution required)
- Path: `Projects/health-fat-loss/assets/body-male.glb`
- Expected size: 3-8 MB (~106k vertices)
- If > 5 MB, run Draco compression
- Female model optional V2 add-on (gender toggle): https://sketchfab.com/3d-models/female-body-muscular-system-anatomy-study-9a596b6c24b344bfbe6bb5246290df0e

**Single-mesh constraint (skeptic catch):** Gadzhiev models are likely écorchés (all muscles fused into one mesh). Per-muscle named-mesh highlighting is NOT viable. Hotspot pins are the only V1 interaction model. Per-muscle highlighting requires Z-Anatomy + Blender prep → defer if ever.

**Hotspot authoring:** Use the official drag-and-drop editor at https://modelviewer.dev/editor/ (NOT hand-coded coordinates). Drop the GLB, click each muscle group, copy generated `data-position` and `data-normal` attributes into the dashboard HTML. ~3-5 min per hotspot, ~1 hour for 22 hotspots.

**Recommended 22-hotspot taxonomy (matches Nippard exercise database muscle taxonomy):**

| Region | Hotspots |
|---|---|
| Chest | upper-chest, mid-chest, lower-chest |
| Back | upper-traps, lats, mid-back/rhomboids, lower-back/erectors |
| Shoulders | front-delt, side-delt, rear-delt |
| Arms | biceps, triceps, forearms |
| Core | rectus-abdominis (abs), obliques |
| Legs | quads, hamstrings, glutes, calves, hip-flexors/adductors |

(Trim to 16 by collapsing chest splits + delt splits if 22 is too dense.)

**Hotspot tooltip content per pin:**
- Muscle name (bold)
- 1-2 sentence anatomy fact (LLM-generated, cached in `Projects/health-fat-loss/data/muscle-facts.json`)
- "X exercises in your program" count (computed from the canonical Nippard exercise database)

**Click-to-zoom enhancement (small JS addition not in research):**
- On hotspot click, programmatically set `camera-orbit` + `camera-target` on the model-viewer to focus on that hotspot's `data-position`. Implements user's "zooms into that area" request. ~10 lines.

**Skeptic catches to implement (from research):**
1. **Auto-rotate OFF** — flickering hotspot UX (binary visibility threshold).
2. **CC-BY 4.0 attribution mandatory** — footer line: `3D model: Ruslan Gadzhiev / Sketchfab · CC-BY 4.0` near body map or in dashboard global footer.
3. **Test on mobile before committing to AR** — verify 60fps orbit/zoom on actual iPhone 12+ before relying on `ar` attribute.
4. **Verify GLB after download** — open at https://gltf-viewer.donmccurdy.com/ → confirm load time + poly count + mesh structure. Compress if > 8 MB / > 200k tris.

**Drop list (V1 do NOT):**
- ❌ Three.js / React Three Fiber (model-viewer is the right tool)
- ❌ Per-muscle named-mesh highlighting (single-mesh GLB constraint)
- ❌ Blender prep on Z-Anatomy (out of scope)
- ❌ Zygote Body iframe ($98/mo, limits UX)
- ❌ Auto-rotate (hotspot flicker)

**Airtable-token CSS for hotspots (adapted from research's Nippard-themed CSS):**

```css
.hotspot {
  width: 18px; height: 18px;
  border-radius: 50%;
  border: 2px solid #ffffff;
  background: rgba(27, 97, 201, 0.92);  /* Airtable Blue */
  cursor: pointer; padding: 0;
  box-shadow: 0 0 12px rgba(45, 127, 249, 0.5);  /* blue-tinted glow */
}
.hotspot .label {
  display: none; position: absolute;
  left: 22px; top: -10px;
  background: #ffffff; color: #181d26;  /* deep navy on white */
  font: 14px/1.5 'Haas', -apple-system, system-ui, sans-serif;
  padding: 10px 14px; border-radius: 12px;  /* Airtable card radius */
  width: 240px; pointer-events: none;
  border: 1px solid #e0e2e6;
  box-shadow: rgba(45,127,249,0.28) 0px 1px 3px;  /* Airtable shadow */
}
.hotspot:hover .label, .hotspot:focus .label { display: block; }
.hotspot .label strong { color: #1b61c9; font-size: 15px; }  /* Airtable Blue */
.hotspot .label em { color: rgba(4,14,32,0.69); font-size: 12px; }  /* weak text */

.bodymap-toggle {
  display: inline-flex; gap: 4px;
  background: #f8fafc;  /* light surface */
  padding: 4px; border-radius: 12px;
  margin-bottom: 1rem;
  border: 1px solid #e0e2e6;
}
.bodymap-toggle button {
  font: 14px/1 'Haas', sans-serif;
  letter-spacing: 0.08px;
  color: rgba(4,14,32,0.69);
  background: transparent; border: none;
  padding: 8px 16px; border-radius: 8px;
  cursor: pointer;
}
.bodymap-toggle button.active {
  background: #1b61c9; color: #ffffff;  /* Airtable Blue */
}

model-viewer {
  background: #f8fafc;  /* light surface, not the research's dark #0a0a0c */
}
```

---

## Key References

- General dashboard research: `Research/reports/2026-04-13-health-dashboard-research.html`
- 3D body model research: `Research/reports/2026-04-13-3d-body-model-options.html`
- 3D body model raw research: `Research/_raw/2026-04-13-3d-body-model-options.md`
- Original brainstorm + research plan (superseded): `~/.claude/plans/snug-frolicking-treasure.md`
- Existing dashboard (to be deleted after extraction): `Projects/health-fat-loss/nippard-training-hub.html`
- Health agent plugin: `~/.claude/plugins/local/health-agent/`
- Canonical health data: `Data/health/{training,nutrition,medications}/*.md`
- Daily-note location for AI-sphere V1 logging: `Daily/YYYY-MM-DD.md`
- Design system: `~/Desktop/The Vault/Airtable_DESIGN.md`
- Frontend-design skill: `frontend-design:frontend-design`
- model-viewer hotspot editor: https://modelviewer.dev/editor/
- model-viewer docs: https://modelviewer.dev/docs/index.html
- GLB inspector: https://gltf-viewer.donmccurdy.com/

---

## Build Sequence (V1)

Each step has an observable success criterion. Order is for fastest-validation feedback.

### Phase 0 — Prerequisites (BLOCK on these)

1. **Audit `/health` agent write patterns** *(1–2 hr)*
   - Read `~/.claude/plugins/local/health-agent/` — confirm whether agent appends to headings (safe) vs rewrites whole files (unsafe).
   - If unsafe: refactor agent to heading-PATCH BEFORE step 12 of build.
   - **Success:** documented in `dashboard-design.md` as "safe for concurrent PATCH" or "needs convention change first" (with the change made).

2. **Audit `Data/health/` schemas** *(1 hr)*
   - Map field names from each canonical markdown file to dashboard tile values.
   - Identify gaps (missing fields the dashboard needs).
   - **Success:** 1-page schema map in `dashboard-design.md`.

3. **Extract Nippard data + 2D SVG body map from old hub** *(2–3 hr)*
   - Pull 48-exercise database (lines 1270–1319) — fields: name, primary/secondary muscles, RPE, day types, YouTube URL, notes, substitutions.
   - Pull 11-region 2D SVG body map markup + interaction code.
   - Cross-reference exercise database with original Jeff Nippard program docs in `Projects/health-fat-loss/specs/`.
   - Save canonical sources:
     - `Data/health/training/nippard-program.json` — exercise database
     - `Projects/health-fat-loss/components/body-map-2d.svg.html` — extracted SVG + interaction skeleton
   - Keep `nippard-training-hub.html` until step 7 verifies extraction is complete; then delete.
   - **Success:** new dashboard can read 48 exercises from a single canonical file; SVG body map renders independently of old hub.

4. **Download + verify 3D GLB asset** *(30 min)*
   - Create `Projects/health-fat-loss/assets/` directory.
   - Sketchfab account → download Gadzhiev male muscular system GLB.
   - Save as `Projects/health-fat-loss/assets/body-male.glb`.
   - Open at https://gltf-viewer.donmccurdy.com/ → record file size, polygon count, mesh structure.
   - If > 8 MB / > 200k tris: `npx gltf-pipeline -i body-male.glb -o body-male-draco.glb -d` and replace original.
   - Confirm CC-BY 4.0 license + record attribution string in `dashboard-design.md`.
   - **Success:** body-male.glb in assets/ ≤ 8 MB, loads in viewer without errors, attribution recorded.

5. **Author 16-22 hotspots via model-viewer editor** *(~1 hr)*
   - Open https://modelviewer.dev/editor/ → drag in `body-male.glb`.
   - Click each muscle group on the model per the 22-hotspot taxonomy in this plan.
   - Copy generated `data-position` and `data-normal` attributes into a structured JSON: `Projects/health-fat-loss/data/hotspot-coordinates.json`.
   - **Success:** JSON file with 16–22 entries, each with muscle name, slot ID, position, normal.

6. **Install + verify Local REST API bridge** *(2 hr)*
   - Obsidian → Settings → Community plugins → Browse → "Local REST API" → install + enable.
   - Copy API key, trust cert in macOS Keychain.
   - Verify with `curl -k https://127.0.0.1:27124/` returns OK.
   - **Success:** 15-line test page reads a known heading from `Data/health/training/nippard-program.json`.

7. **Verify all extracted data + delete old nippard-training-hub.html** *(30 min)*
   - Cross-check: every value in `nippard-training-hub.html` that the new dashboard needs is in `Data/health/training/nippard-program.json` or `body-map-2d.svg.html`.
   - Delete `nippard-training-hub.html`.
   - Update `Projects/health-fat-loss/README.md` to reflect new file layout.
   - **Success:** old file gone; new dashboard can be built from extracted sources only.

### Phase 1 — Design Spec

8. **Write `Projects/health-fat-loss/specs/dashboard-design.md`** *(half-day)*
   - Component breakdowns: hero, 4 domain tiles, body map (2D + 3D toggle), AI sphere FAB, left sidebar.
   - Data flow diagrams: each tile → which markdown file → which heading → which field.
   - Visual layouts: rough wireframes + Airtable design tokens applied.
   - Lock readiness formula with actual computation logic.
   - Incorporate the 3D body model spec from this plan + the 22-hotspot taxonomy + the Airtable-adapted CSS.
   - Note: design spec is the single source of truth — implementation reads from it, not from this plan file.
   - **Success:** spec is review-ready; checklist of components matches build sequence below.

### Phase 2 — V1 Build

9. **Scaffold dashboard via `frontend-design` skill** *(2–4 hr)*
   - Invoke skill with `Airtable_DESIGN.md` as design system + the spec from step 8.
   - Generate base HTML + CSS for: left sidebar, Today surface, 4-tile grid, hero card, body map card placeholder, AI sphere FAB placeholder, footer with CC-BY attribution slot.
   - Include `<model-viewer>` CDN script in `<head>`.
   - **Success:** static V0.1 with hardcoded JSON renders cleanly in browser, screenshot-quality matches Airtable aesthetic.

10. **Build body map module — 2D + 3D toggle** *(1 weekend)*
    - **2D surface (port from extracted SVG):**
      - Render `body-map-2d.svg.html` markup.
      - Heatmap toggle: volume mode (recent training load) ↔ recovery mode (time since training).
      - Color ramp: deep navy `#0d3a7a` → Airtable Blue `#1b61c9` → accent red `#ef4444` for high intensity.
      - Click muscle → side panel shows: muscle name, LLM-generated facts, primary exercises sorted by recent training intensity.
    - **3D surface (model-viewer):**
      - `<model-viewer>` element with `src="assets/body-male.glb"`, `camera-controls`, `tone-mapping="neutral"`, `ar`, `ar-modes="webxr scene-viewer quick-look"`, NO `auto-rotate`.
      - Render 16-22 hotspots from `hotspot-coordinates.json`.
      - Each hotspot tooltip: muscle name (bold) + LLM-generated 1-2 sentence fact + computed exercise count.
      - Click-to-zoom: small JS handler sets `camera-orbit` + `camera-target` to focus on the clicked hotspot.
    - **Toggle:** 2D / 3D toggle button; toggle CSS `display` swap.
    - **Default mode:** 2D (analytical work surface).
    - **Footer:** CC-BY attribution string visible.
    - **Success:** rotate + click 3D body, see facts + exercise count; toggle to 2D, see heatmap + click→exercises panel; AR button on iOS launches Quick Look.

11. **Generate + cache muscle facts** *(1 hr)*
    - One-time script: prompt Claude (Sonnet 4.6) to generate `{description, function, fun_facts[]}` for each muscle group in the 22-hotspot taxonomy.
    - Save to `Projects/health-fat-loss/data/muscle-facts.json`.
    - Reuse in BOTH 2D click panel AND 3D hotspot tooltip.
    - User reviews + edits before final commit.
    - **Success:** clicking any muscle (2D or 3D) shows facts panel with edited content.

12. **Build hero card with readiness formula** *(2–4 hr)*
    - Implement 4-input formula: days since last session, RPE-derived intensity, 7-day load, sleep self-report.
    - Wire null-returning slots for HRV / sleep stages / RHR (forward-compat for wearables).
    - Output 0–100 → traffic-light visualization.
    - **Success:** hero shows numeric score + traffic-light + 1-line explanation; gracefully handles missing inputs.

13. **Wire live reads via Local REST API** *(4–6 hr)*
    - Replace each hardcoded tile value with a fetch to Local REST API.
    - Order: training tile → nutrition tile → body comp tile → meds tile.
    - **Success:** all 4 tiles populate from real markdown.

14. **Build 3D AI sphere FAB** *(1 weekend)*
    - Animated sphere bottom-right (subtle pulsing/rotation animation). Implementation note: this CAN use `<model-viewer>` with a primitive sphere GLB OR pure CSS/SVG animation — decide in design spec; CSS/SVG simpler if no other 3D library beyond model-viewer.
    - Click → expands input panel (text only in V1).
    - Submit → PATCH appends timestamped note to today's `Daily/YYYY-MM-DD.md` under "## Quick Log" heading.
    - **Success:** click sphere → type "did 4x8 bench at 135" → confirm appends to today's daily note.

15. **Quick-log writeback for structured data** *(4–6 hr)*
    - Each tile has a small "+" button → opens domain-specific structured form (workout set, meal, weigh-in, med-taken).
    - Form submission → PATCH to appropriate heading in correct markdown file via Local REST API.
    - **Success:** log a workout from dashboard → verify it lands in `Data/health/training/training-log.md` → /health agent reads it correctly on next invocation.

### V1 Done = step 15

V2 progressive enhancements:

- **Trends surface** (separate view; needs ≥4 weeks of data)
- **Active alert banner** (missed med, missing weigh-in, no workout 4d+)
- **Exercise GIF/WebP library** (ExerciseDB pipeline + Gymvisual fallback)
- **AI sphere voice input** (Web Speech API or Whisper)
- **AI sphere LLM parsing** (NL → structured log entries routed to correct files)
- **Mobile responsive** (research recommended V2 progressive enhancement)
- **Wearable integration** (slots already wired in V1; just plug in source)
- **3D body model — female gender toggle** (download Gadzhiev female GLB, add gender selector)
- **Per-muscle named-mesh highlighting in 3D** (only if Z-Anatomy + Blender prep is ever justified)

---

## Critical Files

| File | Role |
|---|---|
| `Projects/health-fat-loss/specs/dashboard-design.md` | NEW — design spec written in Phase 1 before any code |
| `Projects/health-fat-loss/dashboard.html` | NEW — the new dashboard file |
| `Projects/health-fat-loss/assets/body-male.glb` | NEW — Sketchfab Gadzhiev GLB (CC-BY 4.0) |
| `Projects/health-fat-loss/data/muscle-facts.json` | NEW — LLM-cached muscle facts |
| `Projects/health-fat-loss/data/hotspot-coordinates.json` | NEW — 22 hotspot positions + normals |
| `Projects/health-fat-loss/components/body-map-2d.svg.html` | NEW — extracted 2D SVG body map |
| `Data/health/training/nippard-program.json` | NEW — extracted exercise database |
| `Data/health/training/training-log.md` | EXISTING (empty skeleton) — populated by dashboard quick-log |
| `Data/health/nutrition/daily-log.md` | EXISTING — read by nutrition tile |
| `Data/health/medications/*.md` | EXISTING — read by meds compliance ring |
| `Data/health/weekly-snapshots.md` | EXISTING — read by hero card |
| `Daily/YYYY-MM-DD.md` | EXISTING (Obsidian daily note) — appended by AI-sphere FAB |
| `~/.claude/plugins/local/health-agent/` | EXISTING — audit in Phase 0; coexists via heading-PATCH |
| `Projects/health-fat-loss/nippard-training-hub.html` | DELETE in Phase 0 step 7 after extraction verified |
| `Projects/health-fat-loss/README.md` | UPDATE — reflect new file layout, 3D module addition, Sketchfab attribution |

---

## Existing utilities to reuse

- **`/research-pipeline`** — already used for both research vectors
- **`frontend-design`** skill — primary scaffolding tool for the new dashboard
- **`/health-status`** command — verifies dashboard writes are agent-readable
- **Obsidian CLI** (`obsidian read`, `obsidian search`, `obsidian daily:append`) — fallback bridge for reads
- **48-exercise database** in `nippard-training-hub.html` lines 1270–1319 — extract before deletion
- **11-region 2D SVG body map** in `nippard-training-hub.html` — extract before deletion
- **`<model-viewer>` web component** — CDN, no install
- **`gltf-pipeline`** (npx, no install) — for Draco compression if GLB > 8 MB

---

## Verification — V1 Acceptance Criteria

After V1 ships, ALL must be true:

**Dashboard core:**
- [ ] Open `dashboard.html` → today's training, calorie progress, body weight trend, meds compliance render automatically from `Data/health/`
- [ ] Hero readiness card displays 0–100 score + traffic-light, computed from training history; handles missing inputs gracefully
- [ ] Each domain tile has structured "+" log → writes to correct markdown file via Local REST API
- [ ] /health agent reads any data the dashboard wrote with no corruption (verified via `/health-status`)
- [ ] All reads + writes via Local REST API (no `file://`, no hardcoded paths)
- [ ] Visual matches Airtable design tokens (Haas font, navy text, Airtable Blue CTAs, 12px button radius, blue-tinted shadows)

**Body map (2D + 3D toggle):**
- [ ] 2D SVG: 11 regions render; heatmap toggles between volume + recovery; clicking a muscle shows facts panel + sorted primary exercises
- [ ] 3D model: Sketchfab Gadzhiev GLB loads in `<model-viewer>` ≤ 8 MB
- [ ] 3D mode: mouse-drag rotates, scroll zooms; 16-22 hotspot pins visible
- [ ] 3D hotspot click: tooltip shows muscle name + 1-2 sentence fact + "X exercises in your program"; camera zooms to that area
- [ ] 2D / 3D toggle works; default mode = 2D
- [ ] Auto-rotate is OFF (no hotspot flicker)
- [ ] iOS Safari tap on AR button launches Quick Look successfully
- [ ] CC-BY attribution visible in footer: "3D model: Ruslan Gadzhiev / Sketchfab · CC-BY 4.0"
- [ ] No JavaScript console errors

**AI sphere FAB:**
- [ ] Animated sphere visible bottom-right on every page
- [ ] Click → text input opens
- [ ] Submit → appends timestamped note to today's `Daily/YYYY-MM-DD.md` under "## Quick Log"

**Cleanup:**
- [ ] Old `nippard-training-hub.html` deleted
- [ ] `Projects/health-fat-loss/README.md` updated to reflect new layout
- [ ] Design spec at `Projects/health-fat-loss/specs/dashboard-design.md` is current and matches what was built

---

## End-to-End User Flow (post-V1)

The user should be able to:

1. Open `dashboard.html` → sees today's readiness, 4 domain tiles populated, body map (2D default).
2. Toggle to 3D → spin the body model with mouse drag → click "biceps" hotspot → see anatomy fact + "3 exercises in your program" → camera zooms to that area.
3. On iPhone, tap AR button → see life-size body model in their room via Quick Look.
4. Toggle back to 2D → click "biceps" muscle region → side panel shows full list of primary biceps exercises sorted by recency.
5. Click the AI sphere FAB → type "ate 200g chicken + rice for lunch" → confirm appended to `Daily/2026-04-13.md` under "## Quick Log".
6. Click "+" on training tile → log a structured workout set → confirm it lands in `Data/health/training/training-log.md`.
7. Open Obsidian / run `/health-status` → confirm dashboard writes are visible to `/health` agent without corruption.

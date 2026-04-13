# Unified Health Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Evolve the static Nippard training hub (`Projects/health-fat-loss/nippard-training-hub.html`, 1,700 lines, 48 hardcoded exercises, 11-region SVG body map) into a live, multi-domain health dashboard (`Projects/health-fat-loss/dashboard.html`) that reads canonical markdown from `Data/health/`, writes back via the Obsidian Local REST API, and surfaces training + nutrition + body composition + medication compliance on a single "Today" view with both a 2D SVG body map and a 3D `<model-viewer>` body model (toggleable), plus a 3D animated AI-sphere FAB for quick logging.

**Architecture:** Single-page HTML dashboard, no build step. Static assets: Sketchfab Gadzhiev GLB body model + extracted 48-exercise Nippard database (JSON) + LLM-cached muscle facts (JSON). Live data layer: fetch Obsidian markdown via Local REST API on HTTPS `127.0.0.1:27124`, parse frontmatter + headings with a tiny client-side parser, write back via heading-targeted PATCH so the existing `/health` agent stays in sync. Visual: Airtable design tokens (`Airtable_DESIGN.md`) — white canvas, deep navy text, Airtable Blue CTAs, Haas typography, 12–32px radii, multi-layer blue-tinted shadow. 3D surface: Google's `<model-viewer>` web component (Apache-2.0, ~300 KB gzipped, CDN) with 16–22 hotspot pins authored via the official editor.

**Tech Stack:** HTML5 + CSS + vanilla JS (zero dependencies shipped in source); `<model-viewer>` 4.2.0 (CDN); Obsidian Local REST API community plugin (HTTPS 27124, bearer-token auth, heading-level PATCH); `gltf-pipeline` via `npx` (optional Draco compression); Airtable design tokens.

---

## Context

Continuation of `~/.claude/plans/snug-frolicking-treasure.md` (brainstorm + research plan, 2026-04-13). Both research vectors are complete:

- General dashboard research: `Research/reports/2026-04-13-health-dashboard-research.html`
- 3D body-model implementation research: `Research/reports/2026-04-13-3d-body-model-options.html`
- 3D body-model raw research: `Research/_raw/2026-04-13-3d-body-model-options.md`

This plan supersedes them with a concrete build-ready spec. The brainstorm locked three architectural decisions (unified scope, hybrid data flow, hybrid exercise visuals). Research resolved the 5 open questions; all decisions below are final for V1.

**Out-of-scope (inherited):**
- Apple Health / iOS Shortcuts import (V2+)
- Wearable import — Whoop, Oura, Apple Watch (V2+; design forward-compat hooks now)
- AI coaching loop inside the dashboard (already handled by `/health-persona`)
- Replacing the iMessage check-in flow (dashboard complements it)
- Mobile responsive layout (V2 progressive enhancement; V1 desktop-only)

---

## Locked Decisions

| Topic | Decision |
|---|---|
| **File strategy** | New file: `Projects/health-fat-loss/dashboard.html`. Use `frontend-design` skill to scaffold against `Airtable_DESIGN.md` |
| **Design system** | Airtable-inspired: white canvas `#ffffff`, deep navy `#181d26`, Airtable Blue `#1b61c9`, Haas font (with `-apple-system, system-ui` fallback), 12px button radius, 16–32px card radius, multi-layer blue-tinted shadow |
| **V1 scope philosophy** | Pragmatist core + 2D-and-3D body map enhancement + AI-sphere FAB (no voice/LLM yet); defer GIFs, Trends surface, alert banner to V2 |
| **Bridge mechanism (Q1)** | Obsidian Local REST API plugin (HTTPS 27124, bearer token, surgical PATCH at heading level) |
| **Body map (Q2)** | **TWO coexisting surfaces with 2D ↔ 3D toggle**: (a) 2D SVG with 11 regions, heatmap toggle (volume/recovery), click→primary-exercises sorted by recent training intensity; (b) 3D `<model-viewer>` with Sketchfab Gadzhiev male GLB, 16–22 hotspot pins with muscle name + 1–2 sentence facts + program exercise count, AR mode for iOS Quick Look. Single-mesh GLB → no per-muscle highlighting in 3D (analytical work stays in 2D) |
| **Layout (Q3)** | Desktop-first, **left sidebar nav** (Airtable-style); Today view only in V1 (Trends V2) |
| **GIFs (Q4)** | **Defer to V2.** Existing YouTube modal links suffice for V1 |
| **Style (Q5)** | Adopt Airtable design system (overrides research's "adopt Nippard hub style" recommendation); 3D research's Nippard CSS is adapted to Airtable tokens |
| **Hero readiness (Q6)** | Research's 4-input weighted formula: (a) days since last session, (b) last session intensity (RPE-derived), (c) total training load past 7d, (d) sleep self-report if logged. Output 0–100, mapped to traffic-light. Wearable inputs (HRV / sleep stages / RHR) wired as null-returning slots ready for swap-in |
| **Quick-log** | **3D animated AI sphere FAB** — animated sphere bottom-right; click opens text-input panel; V1 just appends timestamped note to today's `Daily/YYYY-MM-DD.md` under `## Quick Log`. Voice + AI parsing → V2/V3 |
| **Active alert banner** | **V2** |
| **Existing nippard-training-hub.html** | **Delete after extraction.** Phase 0 extracts: (a) 48-exercise database, (b) 11-region 2D SVG body map markup, (c) any reusable modal/search code → ports to new dashboard structure |
| **`/health` agent write-pattern audit** | **Hard prerequisite.** Audit `plugins/health-agent/` for full-file PUT vs heading-PATCH. If full-file, fix convention BEFORE building dashboard writes |
| **Wearable forward-compat** | **Design hooks now.** Hero formula has slots for HRV/sleep/RHR returning null today, swap-in when wearable arrives |
| **Process** | **Write design spec first** at `Projects/health-fat-loss/specs/dashboard-design.md` BEFORE implementation. Spec includes component breakdowns, data schemas, visual layouts, Airtable-token mapping, then implementation follows |
| **Body map asset audit** | Open Sketchfab GLB at https://gltf-viewer.donmccurdy.com/ → confirm load + polygon count + mesh structure. If > 8 MB or > 200k tris, Draco-compress: `npx gltf-pipeline -i body-male.glb -o body-male-draco.glb -d` |
| **Mobile** | V2 progressive enhancement; V1 desktop-only |

---

## 3D Body Model Module — Spec (from 3D research)

**Tech stack:** Google's `<model-viewer>` web component (Apache-2.0, ~300–350 KB gzipped via CDN, zero framework dependency, no build step). NOT Three.js / React Three Fiber for V1.

**CDN import (one line in `<head>`):**

```html
<script type="module" src="https://ajax.googleapis.com/ajax/libs/model-viewer/4.2.0/model-viewer.min.js"></script>
```

**Asset:**
- Source: https://sketchfab.com/3d-models/male-body-muscular-system-anatomy-study-991eb96938be4d0d8fadee241a1063d3
- Author: **Ruslan Gadzhiev** · License: **CC-BY 4.0** (attribution required)
- Path: `Projects/health-fat-loss/assets/body-male.glb`
- Expected size: 3–8 MB (~106k vertices)
- If > 5 MB, run Draco compression
- Female model optional V2 add-on: https://sketchfab.com/3d-models/female-body-muscular-system-anatomy-study-9a596b6c24b344bfbe6bb5246290df0e

**Single-mesh constraint (skeptic catch):** Gadzhiev models are likely écorchés (all muscles fused into one mesh). Per-muscle named-mesh highlighting is NOT viable. Hotspot pins are the only V1 interaction model.

**Hotspot authoring:** Use the official drag-and-drop editor at https://modelviewer.dev/editor/ (NOT hand-coded coordinates). Drop the GLB, click each muscle group, copy generated `data-position` and `data-normal` attributes. ~3–5 min per hotspot, ~1 hour for 22 hotspots.

**22-hotspot taxonomy (matches Nippard muscle taxonomy):**

| Region | Hotspots |
|---|---|
| Chest | upper-chest, mid-chest, lower-chest |
| Back | upper-traps, lats, mid-back/rhomboids, lower-back/erectors |
| Shoulders | front-delt, side-delt, rear-delt |
| Arms | biceps, triceps, forearms |
| Core | rectus-abdominis (abs), obliques |
| Legs | quads, hamstrings, glutes, calves, hip-flexors/adductors |

Trim to 16 by collapsing chest splits + delt splits if 22 is too dense.

**Hotspot tooltip content per pin:**
- Muscle name (bold)
- 1–2 sentence anatomy fact (LLM-generated, cached in `Projects/health-fat-loss/data/muscle-facts.json`)
- "X exercises in your program" count (computed from `Data/health/training/nippard-program.json`)

**Click-to-zoom enhancement:** on hotspot click, programmatically set `camera-orbit` + `camera-target` on the `<model-viewer>` to focus on the clicked hotspot's `data-position`. ~10 lines.

**Skeptic catches (implement all):**
1. Auto-rotate OFF (flickering hotspot UX).
2. CC-BY 4.0 attribution mandatory: footer line `3D model: Ruslan Gadzhiev / Sketchfab · CC-BY 4.0`.
3. Test on mobile before committing to AR — verify 60 fps orbit/zoom on iPhone 12+.
4. Verify GLB at https://gltf-viewer.donmccurdy.com/ after download; compress if > 8 MB / > 200k tris.

**Drop list (V1 do NOT):**
- Three.js / React Three Fiber
- Per-muscle named-mesh highlighting
- Blender prep on Z-Anatomy
- Zygote Body iframe
- Auto-rotate

**Airtable-token CSS for hotspots (paste into dashboard.html `<style>`):**

```css
.hotspot {
  width: 18px; height: 18px;
  border-radius: 50%;
  border: 2px solid #ffffff;
  background: rgba(27, 97, 201, 0.92);  /* Airtable Blue */
  cursor: pointer; padding: 0;
  box-shadow: 0 0 12px rgba(45, 127, 249, 0.5);
}
.hotspot .label {
  display: none; position: absolute;
  left: 22px; top: -10px;
  background: #ffffff; color: #181d26;
  font: 14px/1.5 'Haas', -apple-system, system-ui, sans-serif;
  padding: 10px 14px; border-radius: 12px;
  width: 240px; pointer-events: none;
  border: 1px solid #e0e2e6;
  box-shadow: rgba(45,127,249,0.28) 0px 1px 3px;
}
.hotspot:hover .label, .hotspot:focus .label { display: block; }
.hotspot .label strong { color: #1b61c9; font-size: 15px; }
.hotspot .label em { color: rgba(4,14,32,0.69); font-size: 12px; }

.bodymap-toggle {
  display: inline-flex; gap: 4px;
  background: #f8fafc;
  padding: 4px; border-radius: 12px;
  margin-bottom: 1rem;
  border: 1px solid #e0e2e6;
}
.bodymap-toggle button {
  font: 14px/1 'Haas', -apple-system, system-ui, sans-serif;
  letter-spacing: 0.08px;
  color: rgba(4,14,32,0.69);
  background: transparent; border: none;
  padding: 8px 16px; border-radius: 8px;
  cursor: pointer;
}
.bodymap-toggle button.active { background: #1b61c9; color: #ffffff; }

model-viewer { background: #f8fafc; }
```

---

## Key References

- General dashboard research: `Research/reports/2026-04-13-health-dashboard-research.html`
- 3D body model research: `Research/reports/2026-04-13-3d-body-model-options.html`
- 3D body model raw research: `Research/_raw/2026-04-13-3d-body-model-options.md`
- Original brainstorm + research plan (superseded): `~/.claude/plans/snug-frolicking-treasure.md`
- Existing static dashboard (delete after Phase 0 step 7): `Projects/health-fat-loss/nippard-training-hub.html`
- Health agent plugin (local repo copy): `plugins/health-agent/`
- Health agent plugin (canonical install): `~/.claude/plugins/local/health-agent/`
- Canonical health data: `Data/health/{training,nutrition,medications}/*.md`
- Daily-note location for AI-sphere V1 logging: `Daily/YYYY-MM-DD.md` (Obsidian vault)
- Design system: `Airtable_DESIGN.md`
- Frontend-design skill: `frontend-design:frontend-design`
- model-viewer hotspot editor: https://modelviewer.dev/editor/
- model-viewer docs: https://modelviewer.dev/docs/index.html
- GLB inspector: https://gltf-viewer.donmccurdy.com/
- Obsidian Local REST API docs: https://coddingtonbear.github.io/obsidian-local-rest-api/

---

## Implementation Tasks

Three phases. Phase 0 is BLOCKING. Phase 1 writes the design spec before any code. Phase 2 implements V1 in fastest-validation order.

Repo root for all paths below: `~/Desktop/health-dashboard/` (working copy of `maghazi7/health-dashboard`). When a path starts with `~/` it's outside the repo; otherwise it's relative to the repo root.

---

### Phase 0 — Prerequisites (BLOCKING)

Hard gates. Skipping any risks data corruption, rework, or a dashboard that looks fine but breaks the `/health` agent's read path.

---

### Task 1: Audit health-agent write patterns

**Goal:** Determine whether the four health-agent sub-agents write to canonical markdown in a way compatible with concurrent dashboard writes (heading-level append via PATCH) vs. a full-file overwrite pattern that would race with dashboard writes. Document findings; remediate if unsafe.

**Files:**
- Read: `plugins/health-agent/agents/nutrition-tracker.md`
- Read: `plugins/health-agent/agents/training-tracker.md`
- Read: `plugins/health-agent/agents/health-tracker.md`
- Read: `plugins/health-agent/agents/health-coach.md`
- Create: `Projects/health-fat-loss/specs/write-pattern-audit.md`

- [ ] **Step 1.1: Grep each sub-agent for write instructions**

Run from repo root:

```bash
cd ~/Desktop/health-dashboard
for f in plugins/health-agent/agents/*.md; do
  echo "=== $f ==="
  grep -nE "(Write tool|Edit tool|append|overwrite|rewrite|full file|PATCH|write to|update.*log)" "$f" || echo "(no write-related matches)"
done
```

Expected: each agent's prescribed write pattern surfaces (e.g., "append to daily-log.md under today's heading", "Edit the macro table row", etc.).

- [ ] **Step 1.2: Classify each write site in a table**

For every `Data/health/**/*.md` file an agent writes to, record:
- `file` — relative path
- `agent` — which agent writes
- `operation` — append-under-heading / replace-heading-body / frontmatter-update / full-file-rewrite / other
- `safety` — `safe` (operation = anything except full-file-rewrite) / `unsafe` (= full-file-rewrite)

Keep this table in memory for Step 1.3.

- [ ] **Step 1.3: Write `specs/write-pattern-audit.md`**

```markdown
---
type: audit
status: complete
date: 2026-04-13
audience: dashboard-implementation
---

# Health Agent Write-Pattern Audit

## Summary
- Total write sites: N
- Safe for concurrent heading-PATCH: N
- Unsafe (full-file rewrite): N

## Per-file findings

| File | Agent | Operation | Safety | Notes |
|---|---|---|---|---|
| Data/health/nutrition/daily-log.md | nutrition-tracker | append-under-heading | safe | Appends `## YYYY-MM-DD (Day N)` sections |
| ... | ... | ... | ... | ... |

## Remediation (if any)
- (empty if all safe)
- (list each unsafe site + proposed convention change + agent prompt edits)

## Conclusion
- [ ] Safe for dashboard heading-PATCH writes as-is
- [ ] Requires convention change before Task 15 (dashboard quick-log writes)
```

- [ ] **Step 1.4: If any site is `unsafe`, write remediation plan inside the audit doc**

The remediation plan must:
1. Name each unsafe site.
2. Propose the minimum-viable prompt edit to the relevant agent markdown (e.g., "change line 37 from 'rewrite daily-log.md with the new day appended' to 'use Edit tool to insert a new `## YYYY-MM-DD (Day N)` heading at the top of the body, preserving existing entries'").
3. Commit to doing those edits BEFORE Task 15. (Do NOT do the edits now — this task just documents.)

- [ ] **Step 1.5: Commit audit**

```bash
cd ~/Desktop/health-dashboard
git add Projects/health-fat-loss/specs/write-pattern-audit.md
git commit -m "docs: audit health-agent write patterns for dashboard concurrency"
```

Expected: one file staged, one commit created.

---

### Task 2: Audit `Data/health/` canonical schemas

**Goal:** Map every field the dashboard needs from canonical markdown → which file, which heading, which row/column. Identify gaps the dashboard will need to tolerate (V1 ships with several sparse files).

**Files:**
- Read: `Data/health/profile.md`
- Read: `Data/health/check-in-config.md`
- Read: `Data/health/weekly-snapshots.md`
- Read: `Data/health/nutrition/daily-log.md`
- Read: `Data/health/nutrition/meal-library.md`
- Read: `Data/health/training/program.md`
- Read: `Data/health/training/training-log.md`
- Read: `Data/health/training/exercise-library.md`
- Read: `Data/health/training/weekly-volume.md`
- Read: `Data/health/medications/active-medications.md`
- Read: `Data/health/medications/compliance-log.md`
- Read: `Data/health/medications/side-effects-log.md`
- Read: `Data/health/medications/supplement-stack.md`
- Append to: `Projects/health-fat-loss/specs/write-pattern-audit.md` (new section)

- [ ] **Step 2.1: Read each file and note structure**

```bash
cd ~/Desktop/health-dashboard
for f in Data/health/profile.md Data/health/check-in-config.md Data/health/weekly-snapshots.md \
         Data/health/nutrition/*.md Data/health/training/*.md Data/health/medications/*.md; do
  echo "=== $f ==="; head -40 "$f"; echo
done | less
```

Record per file: frontmatter fields, section headings, table columns, sparse vs populated.

- [ ] **Step 2.2: Append "Schema map" section to write-pattern-audit.md**

Append this exact structure, filled with real values from Step 2.1:

```markdown
## Schema map — canonical data → dashboard tiles

### Hero: readiness score
| Input | Source file | Heading/field | Current population |
|---|---|---|---|
| Last session date | Data/health/training/training-log.md | first `## ` heading | empty — 0 sessions |
| Last session RPE | Data/health/training/training-log.md | `rpe:` in entry frontmatter | empty |
| 7-day training load | Data/health/training/weekly-volume.md | current-week row | empty |
| Sleep self-report | Data/health/profile.md | `sleep-avg-hours:` frontmatter | check |

### Training tile
| Display | Source file | Heading/field | Current population |
|---|---|---|---|
| Today's workout name | Data/health/training/program.md | `## Weekly Schedule` row for today | empty skeleton |
| Last session summary | Data/health/training/training-log.md | first `## ` entry | empty |
| Weekly volume by muscle | Data/health/training/weekly-volume.md | current-week table | empty |

### Nutrition tile
| Display | Source file | Heading/field | Current population |
|---|---|---|---|
| Today's calories / target | Data/health/nutrition/daily-log.md | today's `## YYYY-MM-DD` → `Calories` row | 1 day populated |
| Today's protein / target | Data/health/nutrition/daily-log.md | today's `## YYYY-MM-DD` → `Protein` row | 1 day populated |
| Streak (compliance days) | Data/health/nutrition/daily-log.md | count of days w/ Calories status ≠ "over"/"under" | derived |

### Body-comp tile
| Display | Source file | Heading/field | Current population |
|---|---|---|---|
| Current weight | Data/health/weekly-snapshots.md | latest `## Week of ...` → weight row | empty |
| Trend (7d / 30d) | Data/health/weekly-snapshots.md | diff between last N weeks | empty |

### Meds tile
| Display | Source file | Heading/field | Current population |
|---|---|---|---|
| Active meds list | Data/health/medications/active-medications.md | each `## <Med>` heading | 1 med (Retatrutide) |
| Compliance % (7d) | Data/health/medications/compliance-log.md | last 7 `## YYYY-MM-DD` checkboxes | empty |
| Supplements list | Data/health/medications/supplement-stack.md | each `## ` heading | check |

### AI-sphere quick log
| Destination | Source file | Heading | Operation |
|---|---|---|---|
| Timestamped note | Daily/YYYY-MM-DD.md (Obsidian vault, NOT in this repo) | `## Quick Log` | append-under-heading |

## Sparse-source gaps (V1 must tolerate)
- training-log.md: 0 sessions — readiness formula returns neutral (75) when no history
- weekly-volume.md: 0 weeks — 2D heatmap defaults to uniform neutral
- compliance-log.md: empty — meds tile shows "no data yet" placeholder
- weekly-snapshots.md: empty — body-comp tile shows "log your first weigh-in" CTA
```

- [ ] **Step 2.3: Commit schema map**

```bash
cd ~/Desktop/health-dashboard
git add Projects/health-fat-loss/specs/write-pattern-audit.md
git commit -m "docs: add Data/health schema map to audit"
```

---

### Task 3a: Extract 48-exercise Nippard database to JSON

**Goal:** Move the hardcoded `const exercises = {...}` JS object literal (lines 1270–1319 of `nippard-training-hub.html`) into a standalone canonical JSON file the dashboard reads at runtime. Preserves all fields: `muscles`, `subs`, `notes`, `dayTypes`, `rpe`.

**Files:**
- Read: `Projects/health-fat-loss/nippard-training-hub.html` (lines 1270–1319)
- Create: `Data/health/training/nippard-program.json`
- Create: `scripts/verify-nippard-extract.sh`

- [ ] **Step 3a.1: Create the JSON target with verified schema**

```bash
cd ~/Desktop/health-dashboard
mkdir -p Data/health/training
```

Write `Data/health/training/nippard-program.json`:

```json
{
  "schema_version": 1,
  "source": "Projects/health-fat-loss/nippard-training-hub.html lines 1270-1319",
  "exercise_count": 48,
  "exercises": {
    "45° Incline Barbell Press": {
      "muscles": ["chest"],
      "subs": ["45° Incline DB Press", "45° Incline Machine Press"],
      "notes": "1 second pause at the bottom of each rep while maintaining tension on the pecs.",
      "dayTypes": ["Upper Strength"],
      "rpe": "6-8"
    }
  }
}
```

- [ ] **Step 3a.2: Populate all 48 exercises**

Open `nippard-training-hub.html` at line 1270. For each of the 48 entries between line 1270 and line 1318 (inclusive), copy the fields verbatim into the `exercises` object of `nippard-program.json`. Expected keys per entry: `muscles`, `subs`, `notes`, `dayTypes`, `rpe`.

Result: 48 distinct keys under `exercises`, matching the JS object literal exactly.

- [ ] **Step 3a.3: Write verification script**

Write `scripts/verify-nippard-extract.sh`:

```bash
#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

HTML_PATH="Projects/health-fat-loss/nippard-training-hub.html"
JSON_PATH="Data/health/training/nippard-program.json"

echo "--- HTML exercise count (object literal keys) ---"
html_count=$(awk '/const exercises = \{/,/^};/' "$HTML_PATH" | grep -cE '^\s*"[^"]+":\s*\{')
echo "html_count=$html_count"

echo "--- JSON exercise count ---"
json_count=$(python3 -c "import json; print(len(json.load(open('$JSON_PATH'))['exercises']))")
echo "json_count=$json_count"

echo "--- Diff of exercise names (HTML ↔ JSON) ---"
diff \
  <(awk '/const exercises = \{/,/^};/' "$HTML_PATH" | grep -oE '^\s*"[^"]+"' | sed 's/^\s*//' | sort) \
  <(python3 -c "import json; [print(repr(k)) for k in sorted(json.load(open('$JSON_PATH'))['exercises'].keys())]") \
  && echo "OK: all 48 exercise names match" \
  || { echo "FAIL: names diverge"; exit 1; }

[[ "$html_count" == "$json_count" ]] && [[ "$json_count" == "48" ]] \
  && echo "OK: both sides are 48" \
  || { echo "FAIL: expected 48 on both sides"; exit 1; }
```

Make it executable:

```bash
chmod +x scripts/verify-nippard-extract.sh
```

- [ ] **Step 3a.4: Run verification, expect OK**

```bash
cd ~/Desktop/health-dashboard
./scripts/verify-nippard-extract.sh
```

Expected output ends with:

```
OK: all 48 exercise names match
OK: both sides are 48
```

If FAIL: diff will show missing/renamed entries. Fix `nippard-program.json`, rerun.

- [ ] **Step 3a.5: Commit**

```bash
cd ~/Desktop/health-dashboard
git add Data/health/training/nippard-program.json scripts/verify-nippard-extract.sh
git commit -m "feat: extract Nippard 48-exercise database to canonical JSON"
```

---

### Task 3b: Extract 2D SVG body map to standalone component

**Goal:** Pull the 11-region SVG (lines 1050–1093 of `nippard-training-hub.html`) and its styling (lines 698–725) into a standalone HTML component that renders independently of the old hub and can be embedded in the new dashboard.

**Files:**
- Read: `Projects/health-fat-loss/nippard-training-hub.html` lines 698–725, 1048–1095
- Create: `Projects/health-fat-loss/components/body-map-2d.html`

- [ ] **Step 3b.1: Create the component file scaffold**

```bash
cd ~/Desktop/health-dashboard
mkdir -p Projects/health-fat-loss/components
```

Write `Projects/health-fat-loss/components/body-map-2d.html`:

```html
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>2D Body Map — Standalone</title>
<style>
  :root {
    --surface-1: #ffffff;
    --surface-3: #e0e2e6;
    --border-light: #d1d5db;
    --text-muted: rgba(4,14,32,0.69);
    --chest: #1b61c9;
    --back: #1b61c9;
    --shoulders: #1b61c9;
    --biceps: #1b61c9;
    --triceps: #1b61c9;
    --traps: #1b61c9;
    --abs: #1b61c9;
    --glutes: #1b61c9;
    --quads: #1b61c9;
    --hamstrings: #1b61c9;
    --calves: #1b61c9;
  }
  body { font-family: 'Haas', -apple-system, system-ui, sans-serif; background: #f8fafc; padding: 2rem; }
  .body-map-container { display: grid; grid-template-columns: 320px 1fr; gap: 2rem; max-width: 960px; margin: 0 auto; }
  .body-svg-wrap { background: var(--surface-1); border: 1px solid var(--surface-3); border-radius: 16px; padding: 1.5rem; }
  .body-svg { width: 100%; max-width: 300px; height: auto; display: block; margin: 0 auto; }
  .body-svg .muscle-region { cursor: pointer; transition: opacity 0.15s; opacity: 0.4; }
  .body-svg .muscle-region:hover { opacity: 0.8; }
  .body-svg .muscle-region.active { opacity: 1; filter: drop-shadow(0 0 8px currentColor); }
  .muscle-exercise-list { background: var(--surface-1); border: 1px solid var(--surface-3); border-radius: 16px; padding: 1.5rem; min-height: 200px; }
  #selectedMuscle { font-size: 1.25rem; color: #1b61c9; margin-bottom: 1rem; }
</style>
</head>
<body>
<div class="body-map-container">
  <div class="body-svg-wrap">
    <!-- 11-REGION SVG: paste verbatim from nippard-training-hub.html lines 1050-1093 -->
    <svg class="body-svg" viewBox="0 0 300 520" xmlns="http://www.w3.org/2000/svg">
      <g fill="none" stroke="var(--border-light)" stroke-width="1">
        <ellipse cx="150" cy="42" rx="28" ry="34"/>
        <rect x="140" y="72" width="20" height="18" rx="4"/>
      </g>
      <path class="muscle-region" data-muscle="traps" d="M115,90 Q150,80 185,90 L180,108 Q150,100 120,108 Z" fill="var(--traps)" onclick="selectMuscle('traps')"/>
      <ellipse class="muscle-region" data-muscle="shoulders" cx="98" cy="112" rx="22" ry="16" fill="var(--shoulders)" onclick="selectMuscle('shoulders')"/>
      <ellipse class="muscle-region" data-muscle="shoulders" cx="202" cy="112" rx="22" ry="16" fill="var(--shoulders)" onclick="selectMuscle('shoulders')"/>
      <path class="muscle-region" data-muscle="chest" d="M112,108 Q150,100 188,108 L185,148 Q150,155 115,148 Z" fill="var(--chest)" onclick="selectMuscle('chest')"/>
      <ellipse class="muscle-region" data-muscle="biceps" cx="82" cy="158" rx="14" ry="32" fill="var(--biceps)" onclick="selectMuscle('biceps')"/>
      <ellipse class="muscle-region" data-muscle="biceps" cx="218" cy="158" rx="14" ry="32" fill="var(--biceps)" onclick="selectMuscle('biceps')"/>
      <ellipse class="muscle-region" data-muscle="triceps" cx="78" cy="162" rx="10" ry="28" fill="var(--triceps)" transform="translate(-8,0)" onclick="selectMuscle('triceps')"/>
      <ellipse class="muscle-region" data-muscle="triceps" cx="222" cy="162" rx="10" ry="28" fill="var(--triceps)" transform="translate(8,0)" onclick="selectMuscle('triceps')"/>
      <rect class="muscle-region" data-muscle="abs" x="128" y="150" width="44" height="68" rx="8" fill="var(--abs)" onclick="selectMuscle('abs')"/>
      <rect class="muscle-region" data-muscle="back" x="112" y="112" width="14" height="50" rx="4" fill="var(--back)" opacity="0.6" onclick="selectMuscle('back')"/>
      <rect class="muscle-region" data-muscle="back" x="174" y="112" width="14" height="50" rx="4" fill="var(--back)" opacity="0.6" onclick="selectMuscle('back')"/>
      <path class="muscle-region" data-muscle="glutes" d="M118,220 Q150,212 182,220 L180,250 Q150,258 120,250 Z" fill="var(--glutes)" onclick="selectMuscle('glutes')"/>
      <path class="muscle-region" data-muscle="quads" d="M115,252 L128,252 L130,360 L110,360 Z" fill="var(--quads)" onclick="selectMuscle('quads')"/>
      <path class="muscle-region" data-muscle="quads" d="M172,252 L185,252 L190,360 L170,360 Z" fill="var(--quads)" onclick="selectMuscle('quads')"/>
      <path class="muscle-region" data-muscle="hamstrings" d="M130,252 L145,252 L143,355 L132,355 Z" fill="var(--hamstrings)" onclick="selectMuscle('hamstrings')"/>
      <path class="muscle-region" data-muscle="hamstrings" d="M155,252 L170,252 L168,355 L157,355 Z" fill="var(--hamstrings)" onclick="selectMuscle('hamstrings')"/>
      <ellipse class="muscle-region" data-muscle="calves" cx="120" cy="408" rx="12" ry="40" fill="var(--calves)" onclick="selectMuscle('calves')"/>
      <ellipse class="muscle-region" data-muscle="calves" cx="180" cy="408" rx="12" ry="40" fill="var(--calves)" onclick="selectMuscle('calves')"/>
      <rect x="60" y="195" width="12" height="50" rx="6" fill="var(--surface-3)"/>
      <rect x="228" y="195" width="12" height="50" rx="6" fill="var(--surface-3)"/>
      <ellipse cx="120" cy="470" rx="16" ry="8" fill="var(--surface-3)"/>
      <ellipse cx="180" cy="470" rx="16" ry="8" fill="var(--surface-3)"/>
    </svg>
    <div style="text-align:center;margin-top:16px;font-size:12px;color:var(--text-muted);">Click a muscle group</div>
  </div>
  <div class="muscle-exercise-list" id="muscleExerciseList">
    <div id="selectedMuscle">No muscle selected</div>
    <div id="muscleExercises" style="color:var(--text-muted);">Click a region on the body map to see exercises.</div>
  </div>
</div>

<script>
  function selectMuscle(name) {
    document.querySelectorAll('.muscle-region').forEach(r => r.classList.toggle('active', r.dataset.muscle === name));
    document.getElementById('selectedMuscle').textContent = name[0].toUpperCase() + name.slice(1);
    document.getElementById('muscleExercises').textContent = 'Exercises list wired in dashboard.';
  }
</script>
</body>
</html>
```

- [ ] **Step 3b.2: Verify rendering**

```bash
cd ~/Desktop/health-dashboard
open Projects/health-fat-loss/components/body-map-2d.html
```

Expected:
- Body outline renders centered
- All 11 muscle regions visible (pale blue)
- Hovering brightens a region
- Clicking any region highlights it and updates the right panel with the muscle name

If any region doesn't render, diff against `nippard-training-hub.html` lines 1050–1093.

- [ ] **Step 3b.3: Commit**

```bash
cd ~/Desktop/health-dashboard
git add Projects/health-fat-loss/components/body-map-2d.html
git commit -m "feat: extract 2D SVG body map to standalone component"
```

---

### Task 4: Download and verify 3D GLB asset

**Goal:** Get the Sketchfab Gadzhiev male muscular-system GLB into `assets/`, confirm it's usable (size ≤ 8 MB, polys ≤ 200k), compress if needed, and record the license attribution for later footer insertion.

**Files:**
- Create: `Projects/health-fat-loss/assets/body-male.glb` (binary, downloaded manually)
- Append to: `Projects/health-fat-loss/specs/write-pattern-audit.md` (new "GLB asset record" section)

- [ ] **Step 4.1: Create assets directory**

```bash
cd ~/Desktop/health-dashboard
mkdir -p Projects/health-fat-loss/assets
```

- [ ] **Step 4.2: Manual download**

1. Open https://sketchfab.com/3d-models/male-body-muscular-system-anatomy-study-991eb96938be4d0d8fadee241a1063d3 in a browser.
2. Sign in to Sketchfab (free account).
3. Click "Download 3D Model" → select "glTF (.glb)" → download.
4. Move the downloaded file:

```bash
mv ~/Downloads/male-body-muscular-system-anatomy-study.glb \
   ~/Desktop/health-dashboard/Projects/health-fat-loss/assets/body-male.glb
```

- [ ] **Step 4.3: Record size + inspect mesh**

```bash
cd ~/Desktop/health-dashboard
ls -lh Projects/health-fat-loss/assets/body-male.glb
```

Open https://gltf-viewer.donmccurdy.com/ → drag `body-male.glb` onto it → note in the Performance panel:
- File size
- Primitives (meshes) — likely 1 (single-mesh confirmed)
- Vertices — should be ≤ 200k
- Triangles — should be ≤ 200k

- [ ] **Step 4.4: Compress if needed**

If file size > 8 MB OR triangles > 200k:

```bash
cd ~/Desktop/health-dashboard/Projects/health-fat-loss/assets
npx gltf-pipeline -i body-male.glb -o body-male-draco.glb -d
mv body-male.glb body-male-uncompressed.glb
mv body-male-draco.glb body-male.glb
ls -lh body-male.glb
```

Expected: new file ≤ 3 MB. Re-inspect at https://gltf-viewer.donmccurdy.com/ to confirm it still renders.

- [ ] **Step 4.5: Append "GLB asset record" to audit doc**

Append to `Projects/health-fat-loss/specs/write-pattern-audit.md`:

```markdown
## GLB asset record

- Path: Projects/health-fat-loss/assets/body-male.glb
- Source: https://sketchfab.com/3d-models/male-body-muscular-system-anatomy-study-991eb96938be4d0d8fadee241a1063d3
- Author: Ruslan Gadzhiev
- License: CC-BY 4.0
- Attribution string (required in dashboard footer): `3D model: Ruslan Gadzhiev / Sketchfab · CC-BY 4.0`
- Downloaded: 2026-04-13
- Original size: <fill>
- Mesh count: <fill> (likely 1 — single-mesh écorché)
- Triangle count: <fill>
- Draco-compressed: yes/no
- Final size: <fill>
```

- [ ] **Step 4.6: Commit**

```bash
cd ~/Desktop/health-dashboard
git add Projects/health-fat-loss/assets/body-male.glb Projects/health-fat-loss/specs/write-pattern-audit.md
# If you want to keep the uncompressed backup in git, also:
# git add Projects/health-fat-loss/assets/body-male-uncompressed.glb
git commit -m "feat: add Sketchfab Gadzhiev body-male.glb (CC-BY 4.0)"
```

Note: if the GLB is large, consider `.gitattributes` with Git LFS. For now, commit as regular binary (≤ 8 MB is manageable in git without LFS).

---

### Task 5: Author 16–22 hotspots via model-viewer editor

**Goal:** Use the official drag-and-drop editor to pick 3D coordinates for each muscle-region hotspot. Output a structured JSON that the dashboard reads at runtime.

**Files:**
- Create: `Projects/health-fat-loss/data/hotspot-coordinates.json`

- [ ] **Step 5.1: Create data directory**

```bash
cd ~/Desktop/health-dashboard
mkdir -p Projects/health-fat-loss/data
```

- [ ] **Step 5.2: Write the JSON schema scaffold**

Write `Projects/health-fat-loss/data/hotspot-coordinates.json` with this structure (empty `pins` array for now):

```json
{
  "schema_version": 1,
  "model_path": "Projects/health-fat-loss/assets/body-male.glb",
  "author": "Ruslan Gadzhiev (Sketchfab)",
  "license": "CC-BY 4.0",
  "recommended_count": 22,
  "pins": []
}
```

Each pin will have this shape (fill in Step 5.3):

```json
{
  "slot": "biceps",
  "muscle_name": "Biceps Brachii",
  "region": "arms",
  "position": "0 1.3 0.2",
  "normal": "0 0 1"
}
```

- [ ] **Step 5.3: Author each hotspot in the editor**

1. Open https://modelviewer.dev/editor/
2. Drag `Projects/health-fat-loss/assets/body-male.glb` onto the viewport.
3. In the "Hotspots" panel on the right, click "Add hotspot", then click the muscle location on the 3D model.
4. The editor generates HTML like `<button class="Hotspot" slot="hotspot-1" data-position="0.05 1.4 0.18" data-normal="0 0 1">...</button>`.
5. For each of the 22 muscles in the taxonomy (see "Locked Decisions" → body map), add one hotspot; name the `slot` attribute to match the taxonomy slug (`upper-chest`, `mid-chest`, …, `hip-flexors-adductors`).
6. After placing all 22, copy each hotspot's `data-position` and `data-normal` into the `pins` array of `hotspot-coordinates.json`:

```json
{
  "slot": "upper-chest",
  "muscle_name": "Upper Pectoralis Major",
  "region": "chest",
  "position": "0.0 1.40 0.18",
  "normal": "0 0 1"
}
```

Do all 22. If 22 feels too dense, collapse to 16 by merging chest splits (`upper-chest`, `mid-chest`, `lower-chest` → `chest`) and delt splits (`front-delt`, `side-delt`, `rear-delt` → `shoulders`) — but keep the collapsed slug consistent with the 2D SVG `data-muscle` values (`chest`, `shoulders`, etc.) so 2D↔3D state matching works.

- [ ] **Step 5.4: Validate JSON**

```bash
cd ~/Desktop/health-dashboard
python3 -c "import json; d=json.load(open('Projects/health-fat-loss/data/hotspot-coordinates.json')); assert 16 <= len(d['pins']) <= 22, f'expected 16-22 pins, got {len(d[\"pins\"])}'; print(f'OK: {len(d[\"pins\"])} pins')"
```

Expected: `OK: <N> pins` where N is between 16 and 22. Each pin must have all five keys (`slot`, `muscle_name`, `region`, `position`, `normal`).

- [ ] **Step 5.5: Validate slug consistency with 2D SVG + exercise taxonomy**

```bash
cd ~/Desktop/health-dashboard
python3 <<'PY'
import json, re, pathlib
pins = json.load(open('Projects/health-fat-loss/data/hotspot-coordinates.json'))['pins']
ex = json.load(open('Data/health/training/nippard-program.json'))['exercises']
svg = pathlib.Path('Projects/health-fat-loss/components/body-map-2d.html').read_text()
svg_muscles = sorted(set(re.findall(r'data-muscle="([^"]+)"', svg)))
ex_muscles = sorted({m for v in ex.values() for m in v['muscles']})
pin_slots = sorted({p['slot'] for p in pins})
pin_regions = sorted({p['region'] for p in pins})
print('2D SVG muscle slugs:', svg_muscles)
print('Exercise DB muscle slugs:', ex_muscles)
print('3D pin slots:', pin_slots)
print('3D pin regions:', pin_regions)
missing = [m for m in svg_muscles if m not in pin_slots and m not in pin_regions]
if missing:
    print('MISSING 3D coverage for 2D regions:', missing)
else:
    print('OK: every 2D muscle slug has a matching 3D slot or region.')
PY
```

Expected: `OK: every 2D muscle slug has a matching 3D slot or region.` If MISSING, add pins for the missing muscles OR update the pin `region` field so 2D↔3D state can bridge.

- [ ] **Step 5.6: Commit**

```bash
cd ~/Desktop/health-dashboard
git add Projects/health-fat-loss/data/hotspot-coordinates.json
git commit -m "feat: author 16-22 hotspot coordinates for 3D body model"
```

---

### Task 6: Install and verify Obsidian Local REST API bridge

**Goal:** Stand up the HTTPS endpoint the dashboard will use for all read/write I/O. Verify with a curl probe AND a minimal HTML test page to catch cert-trust issues before Task 13 wiring.

**Files:**
- Create: `Projects/health-fat-loss/components/rest-api-probe.html`
- Append to: `Projects/health-fat-loss/specs/write-pattern-audit.md` (new "Local REST API" section)

- [ ] **Step 6.1: Install plugin**

1. Open Obsidian.
2. Settings → Community plugins → Browse → search "Local REST API" → Install → Enable.
3. Settings → Local REST API → copy the API key (long string). **Do not commit this key.**

- [ ] **Step 6.2: Trust self-signed cert**

```bash
# Download the plugin's self-signed cert (shown in plugin settings as a download button)
# Save to ~/Downloads/obsidian-local-rest-api.crt, then:
sudo security add-trusted-cert -d -r trustRoot -k /Library/Keychains/System.keychain \
  ~/Downloads/obsidian-local-rest-api.crt
```

Enter macOS admin password when prompted.

- [ ] **Step 6.3: curl probe**

```bash
# Paste your real API key (do NOT commit it anywhere)
export OBS_KEY='<paste-real-key-here>'
curl -sk https://127.0.0.1:27124/ -H "Authorization: Bearer $OBS_KEY" | head -30
```

Expected: JSON response listing REST API endpoints (`/vault`, `/periodic`, etc.). If `curl: (60) SSL certificate problem`, repeat Step 6.2 or use `-k` to bypass trust (acceptable for localhost-only use).

- [ ] **Step 6.4: Probe a real vault file**

```bash
curl -sk "https://127.0.0.1:27124/vault/Data/health/nutrition/daily-log.md" \
  -H "Authorization: Bearer $OBS_KEY" | head -40
```

Expected: the literal content of `Data/health/nutrition/daily-log.md`. If 404, confirm the vault root is set to the repo working copy (Obsidian's current vault should be `~/Desktop/health-dashboard/` or the actual Vault). Adjust the path as needed.

- [ ] **Step 6.5: Create probe HTML page**

Write `Projects/health-fat-loss/components/rest-api-probe.html`:

```html
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Local REST API Probe</title>
<style>
  body { font-family: -apple-system, system-ui, sans-serif; padding: 2rem; max-width: 720px; margin: 0 auto; }
  input, button { font: inherit; padding: 0.5rem; margin: 0.25rem 0; }
  input { width: 100%; }
  pre { background: #f8fafc; border: 1px solid #e0e2e6; border-radius: 8px; padding: 1rem; white-space: pre-wrap; }
  .ok { color: #006400; }
  .fail { color: #b00020; }
</style>
</head>
<body>
<h1>Obsidian Local REST API Probe</h1>
<p>Paste your API key (it's kept in-memory only, not saved):</p>
<input id="key" type="password" placeholder="Bearer token" />
<input id="path" type="text" value="Data/health/nutrition/daily-log.md" placeholder="Vault-relative path" />
<button id="go">Fetch</button>
<h2>Status: <span id="status">idle</span></h2>
<pre id="out">(no response yet)</pre>

<script>
document.getElementById('go').addEventListener('click', async () => {
  const key = document.getElementById('key').value.trim();
  const path = document.getElementById('path').value.trim();
  const statusEl = document.getElementById('status');
  const outEl = document.getElementById('out');
  if (!key || !path) { statusEl.textContent = 'missing key or path'; return; }
  statusEl.textContent = 'fetching...';
  try {
    const res = await fetch(`https://127.0.0.1:27124/vault/${encodeURI(path)}`, {
      headers: { 'Authorization': `Bearer ${key}` }
    });
    statusEl.textContent = res.ok ? `OK ${res.status}` : `FAIL ${res.status}`;
    statusEl.className = res.ok ? 'ok' : 'fail';
    const txt = await res.text();
    outEl.textContent = txt.slice(0, 2000) + (txt.length > 2000 ? '\n...(truncated)' : '');
  } catch (e) {
    statusEl.textContent = `ERROR: ${e.message}`;
    statusEl.className = 'fail';
    outEl.textContent = String(e);
  }
});
</script>
</body>
</html>
```

- [ ] **Step 6.6: Verify probe page loads vault content**

```bash
cd ~/Desktop/health-dashboard
open Projects/health-fat-loss/components/rest-api-probe.html
```

Paste API key → click Fetch. Expected: Status `OK 200`, body panel shows `daily-log.md` content. If ERROR, check:
- Cert trusted (Step 6.2)
- Obsidian running
- Obsidian's current vault = the path where `Data/health/nutrition/daily-log.md` actually exists

- [ ] **Step 6.7: Append "Local REST API" section to audit doc**

Append to `Projects/health-fat-loss/specs/write-pattern-audit.md`:

```markdown
## Local REST API

- Host: https://127.0.0.1:27124
- Auth: `Authorization: Bearer <key>` (key stored in macOS Keychain as `obsidian-rest-api-key` — NEVER commit)
- Cert: self-signed, trusted in System keychain via `security add-trusted-cert`
- Probe page: Projects/health-fat-loss/components/rest-api-probe.html
- PATCH operations used by dashboard:
  - `Operation: append` + `Target-Type: heading` + `Target: <heading path>` → append content under a heading without touching siblings
  - `Operation: replace` + `Target-Type: heading` + `Target: <heading path>` → replace heading body (used for updating today's macro table)
- Failure modes the dashboard must handle:
  - 401 (bad/missing key) → show "Re-enter API key" banner
  - 404 (vault path doesn't exist) → show empty state with "create note" CTA
  - connection refused (Obsidian not running) → show "Obsidian offline — start the app" banner
```

- [ ] **Step 6.8: Commit probe + doc**

```bash
cd ~/Desktop/health-dashboard
git add Projects/health-fat-loss/components/rest-api-probe.html Projects/health-fat-loss/specs/write-pattern-audit.md
git commit -m "feat: add Local REST API probe page + audit record"
```

---

### Task 7: Verify extraction complete, delete old Nippard hub, update README

**Goal:** Confirm every datum the new dashboard will need is in one of the extracted files (JSON / SVG component / GLB / hotspots), then remove the monolith and update the project README.

**Files:**
- Delete: `Projects/health-fat-loss/nippard-training-hub.html`
- Modify: `Projects/health-fat-loss/README.md`

- [ ] **Step 7.1: Cross-check the exercise count**

```bash
cd ~/Desktop/health-dashboard
./scripts/verify-nippard-extract.sh
```

Expected: `OK: both sides are 48`.

- [ ] **Step 7.2: Cross-check the SVG regions**

```bash
cd ~/Desktop/health-dashboard
diff \
  <(grep -oE 'data-muscle="[^"]+"' Projects/health-fat-loss/nippard-training-hub.html | sort -u) \
  <(grep -oE 'data-muscle="[^"]+"' Projects/health-fat-loss/components/body-map-2d.html | sort -u) \
  && echo "OK: all 2D SVG muscle slugs preserved" \
  || { echo "FAIL: muscle slugs diverge"; exit 1; }
```

Expected: `OK: all 2D SVG muscle slugs preserved`.

- [ ] **Step 7.3: Cross-check the weekProgram references (V1-needed parts)**

V1's dashboard displays today's planned workout. Check whether `weekProgram` (lines 1321+ of the old hub) is needed for V1 or deferred.

Decision: for V1, the Training tile reads today's scheduled session from `Data/health/training/program.md` (populated by `/health-setup`), NOT from the old hub's hardcoded `weekProgram`. So `weekProgram` data is NOT required for V1 — it was Nippard-specific boilerplate. Skip re-extracting it.

- [ ] **Step 7.4: Delete the old hub**

```bash
cd ~/Desktop/health-dashboard
git rm Projects/health-fat-loss/nippard-training-hub.html
```

- [ ] **Step 7.5: Update project README**

Read the current README:

```bash
cat ~/Desktop/health-dashboard/Projects/health-fat-loss/README.md
```

Edit it to reflect the new layout. Replace any reference to `nippard-training-hub.html` with the new file map:

```markdown
## Files

- `dashboard.html` — live multi-domain health dashboard (V1 in progress)
- `components/body-map-2d.html` — extracted 2D SVG body map (embedded in dashboard)
- `components/rest-api-probe.html` — diagnostic page for Local REST API
- `assets/body-male.glb` — Sketchfab Gadzhiev muscular-system model (CC-BY 4.0)
- `data/hotspot-coordinates.json` — 16–22 hotspot pins for the 3D body model
- `data/muscle-facts.json` — LLM-cached muscle anatomy facts (generated in Task 11)
- `specs/dashboard-design.md` — V1 design spec (single source of truth)
- `specs/write-pattern-audit.md` — Phase 0 audit of `/health` agent write safety + schema map + GLB record + REST API notes
- `specs/nippard-program-overview.md` — reference: Jeff Nippard program summary

## Attribution
3D body model: Ruslan Gadzhiev / Sketchfab · CC-BY 4.0
```

(Preserve any other sections of the README that already existed — this just replaces the Files section.)

- [ ] **Step 7.6: Commit**

```bash
cd ~/Desktop/health-dashboard
git add Projects/health-fat-loss/README.md
git commit -m "chore: delete old Nippard hub; update README for new layout"
```

**Phase 0 DONE gate:**
- All six prior tasks' commits exist
- `scripts/verify-nippard-extract.sh` passes
- `hotspot-coordinates.json` has 16–22 pins
- REST API probe returns 200 on a real vault file
- `nippard-training-hub.html` no longer exists in the working tree

---

### Phase 1 — Design Spec (BEFORE any code)

Write the spec FIRST, so the implementer (human or agent) builds from a single source of truth and not from scattered notes in this plan.

---

### Task 8: Write `Projects/health-fat-loss/specs/dashboard-design.md`

**Goal:** One document that, together with the extracted JSON + SVG + GLB assets, gives a fresh engineer everything they need to build the dashboard without reading this plan.

**Files:**
- Create: `Projects/health-fat-loss/specs/dashboard-design.md`

- [ ] **Step 8.1: Write the spec skeleton with 9 sections**

Write `Projects/health-fat-loss/specs/dashboard-design.md`:

```markdown
---
type: design-spec
status: draft
date: 2026-04-13
project: unified-health-dashboard
supersedes: specs/nippard-program-overview.md (for dashboard UX)
---

# Unified Health Dashboard — Design Spec (V1)

## 1. Purpose and Scope
## 2. Information Architecture
## 3. Component Inventory
## 4. Data Model
## 5. Readiness Formula
## 6. Airtable Token Mapping
## 7. 2D Body Map Spec
## 8. 3D Body Model Spec
## 9. AI-Sphere FAB Spec
```

- [ ] **Step 8.2: Fill section 1 — Purpose and Scope**

Under `## 1. Purpose and Scope`:

```markdown
Live single-page dashboard at `Projects/health-fat-loss/dashboard.html`. Reads canonical markdown from `Data/health/` via Obsidian Local REST API; writes back via heading-targeted PATCH so `/health` agent stays in sync. Desktop-only in V1.

**In V1:**
- Hero readiness (0-100 + traffic light)
- 4 domain tiles: Training, Nutrition, Body Comp, Meds
- Body map with 2D↔3D toggle (default 2D)
- AI-sphere FAB for quick-log
- Structured quick-log forms per tile

**Out of V1:** Trends view, active alert banner, GIF/WebP exercise previews, mobile layout, wearable import, AI/voice parsing.
```

- [ ] **Step 8.3: Fill section 2 — Information Architecture**

Under `## 2. Information Architecture`, include this ASCII wireframe and the IA notes:

```markdown
Layout: left sidebar (240px) + main content (1fr).

  ┌──────────┬──────────────────────────────────────────────────┐
  │ sidebar  │  HERO readiness card (full-width, 120px tall)     │
  │          ├──────────────────────────────────────────────────┤
  │ Today    │  ┌──────────┬──────────┬──────────┬──────────┐   │
  │ Trends¹  │  │ Training │ Nutrition│ Body Comp│   Meds   │   │
  │ Settings²│  └──────────┴──────────┴──────────┴──────────┘   │
  │          ├──────────────────────────────────────────────────┤
  │          │  BODY MAP card (2D ↔ 3D toggle) + side panel      │
  │          ├──────────────────────────────────────────────────┤
  │          │  footer: CC-BY 4.0 attribution                    │
  └──────────┴──────────────────────────────────────────────────┘
                                     ⦿ AI-sphere FAB (bottom-right)
  ¹ V2    ² V2

Default route: Today. No client-side routing in V1 (single view).
```

- [ ] **Step 8.4: Fill section 3 — Component Inventory**

```markdown
| # | Component | File/module | Depends on |
|---|---|---|---|
| C1 | Sidebar nav | inline in dashboard.html | none (static) |
| C2 | Hero readiness card | inline HTML + `js/readiness.js` | `Data/health/training/training-log.md`, `profile.md` |
| C3 | Training tile | inline HTML + `js/tile-training.js` | `Data/health/training/{program,training-log,weekly-volume}.md` |
| C4 | Nutrition tile | inline HTML + `js/tile-nutrition.js` | `Data/health/nutrition/daily-log.md` |
| C5 | Body comp tile | inline HTML + `js/tile-bodycomp.js` | `Data/health/weekly-snapshots.md` |
| C6 | Meds tile | inline HTML + `js/tile-meds.js` | `Data/health/medications/{active-medications,compliance-log,supplement-stack}.md` |
| C7 | Body map 2D | `js/bodymap-2d.js` + SVG from `components/body-map-2d.html` | `Data/health/training/{weekly-volume,training-log}.md`, `nippard-program.json` |
| C8 | Body map 3D | `js/bodymap-3d.js` | `assets/body-male.glb`, `data/hotspot-coordinates.json`, `data/muscle-facts.json`, `nippard-program.json` |
| C9 | 2D/3D toggle | `js/bodymap-toggle.js` | C7, C8 |
| C10 | AI-sphere FAB | `js/ai-sphere.js` | today's `Daily/YYYY-MM-DD.md` |
| C11 | Structured quick-log forms (4) | `js/quicklog-forms.js` | all canonical data files |
| C12 | Obsidian REST client | `js/obsidian-api.js` | Local REST API |
| C13 | Markdown parser | `js/md-parser.js` | — |
```

- [ ] **Step 8.5: Fill section 4 — Data Model**

Copy the schema map from `specs/write-pattern-audit.md` (Task 2 Step 2.2) into section 4, unchanged. The audit doc is the source of truth; this section is a pointer:

```markdown
Schema map lives in `specs/write-pattern-audit.md` → "Schema map — canonical data → dashboard tiles". Keep them in sync: any new field the dashboard needs must first be recorded there before implementation.
```

- [ ] **Step 8.6: Fill section 5 — Readiness Formula**

```markdown
**Inputs (all optional, null-safe):**
- `days_since_last_session` (int, from training-log.md first heading date)
- `last_session_rpe` (float 1–10, from training-log.md latest entry)
- `weekly_load` (int, from weekly-volume.md current-week sum of sets×RPE)
- `sleep_hours` (float, from profile.md or today's daily note — V1 reads profile default only)
- Wearable slots (all null in V1): `hrv_ms`, `resting_hr`, `sleep_deep_min`, `sleep_rem_min`

**Per-input scoring (0–100):**
- `days_since_last_session` → 0 or 1 = 40 (DOMS/CNS load); 2 = 85 (peak); 3–4 = 75; 5–7 = 60; ≥ 8 = 40 (detraining signal); null = 75
- `last_session_rpe` → 100 − (rpe × 5), clamped [50, 95]; null = 75
- `weekly_load` → if ≤ 40: 70 (undertrained); 41–100: 85 (sweet spot); 101–150: 75 (high); > 150: 60 (overload); null = 75
- `sleep_hours` → 7–9: 90; 6: 70; 5: 50; < 5: 30; > 9: 80; null = 75

**Combined score:** unweighted mean of the four available inputs, rounded to integer. If all four are null, return `{score: null, status: "no_data"}`.

**Traffic-light mapping:**
- ≥ 75 → green ("Go")
- 50–74 → yellow ("Maintain")
- < 50 → red ("Recover")
- null → grey ("Log a session to unlock")

**Wearable swap-in (V2):** add `hrv_score()`, `rhr_score()`, `sleep_deep_score()` as 5th/6th/7th inputs; re-weight combined score to 1/N.
```

- [ ] **Step 8.7: Fill section 6 — Airtable Token Mapping**

```markdown
Copy these CSS custom properties into `dashboard.html`'s `:root`. They map `Airtable_DESIGN.md` tokens onto the dashboard's DOM.

```css
:root {
  /* colors */
  --canvas: #ffffff;
  --text: #181d26;
  --text-weak: rgba(4,14,32,0.69);
  --blue: #1b61c9;
  --blue-mid: #254fad;
  --blue-glow: rgba(45,127,249,0.5);
  --success: #006400;
  --danger: #b00020;
  --border: #e0e2e6;
  --surface: #f8fafc;

  /* typography */
  --font-body: 'Haas', -apple-system, system-ui, 'Segoe UI', Roboto, sans-serif;
  --font-display: 'Haas Groot Disp', var(--font-body);
  --track-body: 0.18px;
  --track-caption: 0.07px;
  --track-button: 0.08px;

  /* radii */
  --radius-btn: 12px;
  --radius-card: 16px;
  --radius-section: 24px;

  /* shadows */
  --shadow-card: rgba(0,0,0,0.32) 0 0 1px, rgba(0,0,0,0.08) 0 0 2px, rgba(45,127,249,0.28) 0 1px 3px, rgba(0,0,0,0.06) 0 0 0 0.5px inset;
  --shadow-ambient: rgba(15,48,106,0.05) 0 0 20px;

  /* spacing (8px base) */
  --gap-xs: 4px; --gap-sm: 8px; --gap: 16px; --gap-lg: 24px; --gap-xl: 32px;
}
```

Do NOT deviate from these tokens. Every color, radius, and shadow in the dashboard must reference a token.
```

- [ ] **Step 8.8: Fill sections 7, 8, 9 by reference**

```markdown
## 7. 2D Body Map Spec
See Task 10a in PLAN.md for the full implementation reference. Behaviour: 11-region SVG; heatmap toggle (volume / recovery); click-muscle → side panel lists primary exercises sorted by days-since-last-trained.

## 8. 3D Body Model Spec
See PLAN.md "3D Body Model Module — Spec" section + Task 10b. Model-viewer CDN 4.2.0; Gadzhiev male GLB; 16–22 hotspots authored via modelviewer.dev/editor/; click-to-zoom via camera-orbit + camera-target; auto-rotate OFF; CC-BY 4.0 footer attribution mandatory.

## 9. AI-Sphere FAB Spec
See Task 14 in PLAN.md. V1: CSS/SVG animated sphere bottom-right; click opens text panel; submit PATCH-appends timestamped note to today's `Daily/YYYY-MM-DD.md` under `## Quick Log`. Voice + AI parsing deferred.
```

- [ ] **Step 8.9: Sanity-check spec by reading it top-to-bottom**

```bash
cd ~/Desktop/health-dashboard
wc -l Projects/health-fat-loss/specs/dashboard-design.md
# expect > 150 lines
less Projects/health-fat-loss/specs/dashboard-design.md
```

Read through once. Confirm:
- All 9 sections present
- No TBD / TODO
- Schema map pointer correctly references audit doc
- Readiness formula unambiguous (could be implemented from this alone)

- [ ] **Step 8.10: Commit**

```bash
cd ~/Desktop/health-dashboard
git add Projects/health-fat-loss/specs/dashboard-design.md
git commit -m "docs: add V1 dashboard design spec"
```

**Phase 1 DONE gate:**
- `specs/dashboard-design.md` exists with all 9 sections populated
- Every V1 component from Phase 2 has a matching row in the component inventory table

---

### Phase 2 — V1 Build

Each task has an observable success criterion. Order is for fastest-validation feedback. Commit after every task.

**Safety convention for all JS modules:** construct DOM nodes via `createElement` + `textContent` + `appendChild`. Avoid setting `.innerHTML`. Avoid the legacy `document .write` API. This keeps the dashboard XSS-safe even when muscle facts or user-entered quick-log text is injected into the DOM.

---

### Task 9: Scaffold dashboard HTML skeleton

**Goal:** A static skeleton that renders the 8-region layout (sidebar + hero + 4 tiles + body-map card + footer + FAB slot) in correct Airtable tokens. The 2D SVG body map markup is INLINED in the HTML (so JS modules never have to inject markup). Hardcoded placeholders; no live data yet.

**Files:**
- Create: `Projects/health-fat-loss/dashboard.html`
- Create: `Projects/health-fat-loss/js/` (empty directory; modules land here in later tasks)

- [ ] **Step 9.1: Create the directory structure**

```bash
cd ~/Desktop/health-dashboard
mkdir -p Projects/health-fat-loss/js
mkdir -p Projects/health-fat-loss/data
mkdir -p Projects/health-fat-loss/tests
```

- [ ] **Step 9.2: Write the skeleton HTML**

Write `Projects/health-fat-loss/dashboard.html`:

```html
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Unified Health Dashboard</title>
<script type="module" src="https://ajax.googleapis.com/ajax/libs/model-viewer/4.2.0/model-viewer.min.js"></script>
<style>
:root {
  --canvas: #ffffff;
  --text: #181d26;
  --text-weak: rgba(4,14,32,0.69);
  --blue: #1b61c9;
  --blue-mid: #254fad;
  --blue-glow: rgba(45,127,249,0.5);
  --success: #006400;
  --danger: #b00020;
  --border: #e0e2e6;
  --surface: #f8fafc;
  --font-body: 'Haas', -apple-system, system-ui, 'Segoe UI', Roboto, sans-serif;
  --font-display: 'Haas Groot Disp', var(--font-body);
  --track-body: 0.18px;
  --track-caption: 0.07px;
  --track-button: 0.08px;
  --radius-btn: 12px;
  --radius-card: 16px;
  --radius-section: 24px;
  --shadow-card: rgba(0,0,0,0.32) 0 0 1px, rgba(0,0,0,0.08) 0 0 2px, rgba(45,127,249,0.28) 0 1px 3px, rgba(0,0,0,0.06) 0 0 0 0.5px inset;
  --shadow-ambient: rgba(15,48,106,0.05) 0 0 20px;
  --gap-xs: 4px; --gap-sm: 8px; --gap: 16px; --gap-lg: 24px; --gap-xl: 32px;
}

* { box-sizing: border-box; }
body { margin: 0; background: var(--canvas); color: var(--text); font-family: var(--font-body); letter-spacing: var(--track-body); }

.layout { display: grid; grid-template-columns: 240px 1fr; min-height: 100vh; }
.sidebar { background: var(--surface); border-right: 1px solid var(--border); padding: var(--gap-lg) var(--gap); display: flex; flex-direction: column; gap: var(--gap-lg); }
.sidebar .brand { font-family: var(--font-display); font-size: 20px; font-weight: 500; color: var(--text); }
.sidebar nav { display: flex; flex-direction: column; gap: var(--gap-xs); }
.sidebar nav a { text-decoration: none; color: var(--text-weak); padding: 10px var(--gap); border-radius: var(--radius-btn); font-size: 16px; font-weight: 500; letter-spacing: var(--track-button); }
.sidebar nav a.active { background: var(--blue); color: var(--canvas); }
.sidebar nav a[aria-disabled="true"] { opacity: 0.4; cursor: not-allowed; }

.main { padding: var(--gap-xl); display: flex; flex-direction: column; gap: var(--gap-lg); max-width: 1400px; }
.card { background: var(--canvas); border: 1px solid var(--border); border-radius: var(--radius-card); padding: var(--gap-lg); box-shadow: var(--shadow-card); }

.hero { display: grid; grid-template-columns: auto 1fr auto; align-items: center; gap: var(--gap-lg); }
.hero .score { font-family: var(--font-display); font-size: 48px; font-weight: 900; line-height: 1; }
.hero .score[data-status="green"] { color: var(--success); }
.hero .score[data-status="yellow"] { color: #b8860b; }
.hero .score[data-status="red"] { color: var(--danger); }
.hero .score[data-status="grey"] { color: var(--text-weak); font-size: 24px; font-weight: 500; }
.hero .label { font-size: 14px; color: var(--text-weak); letter-spacing: var(--track-caption); text-transform: uppercase; }
.hero .explain { font-size: 16px; color: var(--text); }

.tiles { display: grid; grid-template-columns: repeat(4, 1fr); gap: var(--gap); }
.tile { display: flex; flex-direction: column; gap: var(--gap-sm); min-height: 160px; position: relative; }
.tile h3 { margin: 0; font-size: 14px; font-weight: 500; color: var(--text-weak); letter-spacing: var(--track-caption); text-transform: uppercase; }
.tile .value { font-family: var(--font-display); font-size: 32px; font-weight: 500; line-height: 1.15; }
.tile .sub { font-size: 14px; color: var(--text-weak); }
.tile .add-btn { position: absolute; top: var(--gap); right: var(--gap); width: 28px; height: 28px; border-radius: 50%; border: 1px solid var(--border); background: var(--canvas); cursor: pointer; font-size: 18px; line-height: 1; color: var(--blue); }
.tile .add-btn:hover { background: var(--surface); }

.bodymap-card { display: grid; grid-template-columns: 1fr 320px; gap: var(--gap-lg); }
.bodymap-surface { background: var(--surface); border-radius: var(--radius-card); min-height: 520px; display: flex; align-items: center; justify-content: center; }
.bodymap-side { display: flex; flex-direction: column; gap: var(--gap); }
.bodymap-side h3 { margin: 0; color: var(--text-weak); font-size: 14px; letter-spacing: var(--track-caption); text-transform: uppercase; }

.bodymap-toggle { display: inline-flex; gap: 4px; background: var(--surface); padding: 4px; border-radius: var(--radius-btn); border: 1px solid var(--border); width: fit-content; }
.bodymap-toggle button { font: 500 14px/1 var(--font-body); letter-spacing: var(--track-button); color: var(--text-weak); background: transparent; border: none; padding: 8px 16px; border-radius: 8px; cursor: pointer; }
.bodymap-toggle button.active { background: var(--blue); color: var(--canvas); }

footer.dash-footer { color: var(--text-weak); font-size: 12px; letter-spacing: var(--track-caption); padding-top: var(--gap-lg); border-top: 1px solid var(--border); }

.ai-sphere { position: fixed; right: var(--gap-xl); bottom: var(--gap-xl); width: 64px; height: 64px; border-radius: 50%; border: none; cursor: pointer; background: radial-gradient(circle at 30% 30%, #4c8ef0, var(--blue) 60%, var(--blue-mid)); box-shadow: 0 0 24px var(--blue-glow), 0 8px 24px rgba(0,0,0,0.15); animation: sphere-pulse 4s ease-in-out infinite; }
.ai-sphere:hover { transform: scale(1.05); }
@keyframes sphere-pulse {
  0%, 100% { transform: scale(1); box-shadow: 0 0 24px var(--blue-glow), 0 8px 24px rgba(0,0,0,0.15); }
  50% { transform: scale(1.04); box-shadow: 0 0 36px var(--blue-glow), 0 12px 32px rgba(0,0,0,0.18); }
}
.ai-panel { position: fixed; right: var(--gap-xl); bottom: 108px; width: 360px; background: var(--canvas); border: 1px solid var(--border); border-radius: var(--radius-card); box-shadow: var(--shadow-card); padding: var(--gap); display: none; }
.ai-panel.open { display: flex; flex-direction: column; gap: var(--gap-sm); }
.ai-panel textarea { resize: vertical; min-height: 60px; width: 100%; padding: var(--gap-sm); border: 1px solid var(--border); border-radius: var(--radius-btn); font-family: var(--font-body); font-size: 14px; }
.ai-panel .row { display: flex; justify-content: space-between; align-items: center; gap: var(--gap-sm); }
.ai-panel button.submit { background: var(--blue); color: var(--canvas); border: none; padding: 8px 16px; border-radius: var(--radius-btn); font: 500 14px/1.25 var(--font-body); letter-spacing: var(--track-button); cursor: pointer; }
.ai-panel .status { font-size: 12px; color: var(--text-weak); }

.hotspot { width: 18px; height: 18px; border-radius: 50%; border: 2px solid #ffffff; background: rgba(27, 97, 201, 0.92); cursor: pointer; padding: 0; box-shadow: 0 0 12px var(--blue-glow); }
.hotspot .label { display: none; position: absolute; left: 22px; top: -10px; background: var(--canvas); color: var(--text); font: 14px/1.5 var(--font-body); padding: 10px 14px; border-radius: var(--radius-btn); width: 240px; pointer-events: none; border: 1px solid var(--border); box-shadow: var(--shadow-card); }
.hotspot:hover .label, .hotspot:focus .label { display: block; }
.hotspot .label strong { color: var(--blue); font-size: 15px; display: block; margin-bottom: 4px; }
.hotspot .label em { color: var(--text-weak); font-size: 12px; display: block; margin-top: 4px; font-style: normal; }

model-viewer { width: 100%; height: 520px; background: var(--surface); --poster-color: transparent; }

.body-svg { width: 100%; max-width: 300px; height: auto; display: block; margin: 0 auto; }
.body-svg .muscle-region { cursor: pointer; transition: opacity 0.15s, fill 0.2s; opacity: 0.4; fill: var(--blue); }
.body-svg .muscle-region:hover { opacity: 0.8; }
.body-svg .muscle-region.active { opacity: 1; filter: drop-shadow(0 0 8px currentColor); }

.muscle-detail-exercises { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: var(--gap-sm); }
.muscle-detail-exercises li { padding: var(--gap-sm); background: var(--surface); border-radius: var(--radius-btn); }
.muscle-detail-exercises .ex-name { font-weight: 500; }
.muscle-detail-exercises .ex-sub { font-size: 12px; color: var(--text-weak); }
</style>
</head>
<body>

<div class="layout">

  <aside class="sidebar">
    <div class="brand">Health</div>
    <nav>
      <a href="#" class="active">Today</a>
      <a href="#" aria-disabled="true">Trends</a>
      <a href="#" aria-disabled="true">Settings</a>
    </nav>
  </aside>

  <main class="main">

    <section class="card hero" id="heroCard">
      <div>
        <div class="label">Readiness</div>
        <div class="score" data-status="grey" id="heroScore">—</div>
      </div>
      <div class="explain" id="heroExplain">Log a session to unlock your readiness score.</div>
      <div class="label" id="heroStatusLabel">No Data</div>
    </section>

    <section class="tiles">
      <div class="card tile" id="tileTraining">
        <button class="add-btn" data-tile="training" title="Log workout">+</button>
        <h3>Today's Training</h3>
        <div class="value" data-slot="value">—</div>
        <div class="sub" data-slot="sub">—</div>
      </div>
      <div class="card tile" id="tileNutrition">
        <button class="add-btn" data-tile="nutrition" title="Log meal">+</button>
        <h3>Today's Nutrition</h3>
        <div class="value" data-slot="value">—</div>
        <div class="sub" data-slot="sub">—</div>
      </div>
      <div class="card tile" id="tileBodyComp">
        <button class="add-btn" data-tile="bodycomp" title="Log weigh-in">+</button>
        <h3>Body Comp</h3>
        <div class="value" data-slot="value">—</div>
        <div class="sub" data-slot="sub">—</div>
      </div>
      <div class="card tile" id="tileMeds">
        <button class="add-btn" data-tile="meds" title="Log med/supplement">+</button>
        <h3>Meds (7d)</h3>
        <div class="value" data-slot="value">—</div>
        <div class="sub" data-slot="sub">—</div>
      </div>
    </section>

    <section class="card bodymap-card">
      <div>
        <div class="bodymap-toggle" id="bodymapToggle">
          <button data-mode="2d" class="active">2D</button>
          <button data-mode="3d">3D</button>
        </div>
        <div class="bodymap-surface" id="bodymap2dHost">
          <div style="width:100%;display:flex;flex-direction:column;align-items:center;gap:var(--gap);padding:var(--gap-lg);">
            <svg class="body-svg" viewBox="0 0 300 520" xmlns="http://www.w3.org/2000/svg">
              <g fill="none" stroke="#d1d5db" stroke-width="1">
                <ellipse cx="150" cy="42" rx="28" ry="34"/>
                <rect x="140" y="72" width="20" height="18" rx="4"/>
              </g>
              <path class="muscle-region" data-muscle="traps" d="M115,90 Q150,80 185,90 L180,108 Q150,100 120,108 Z"/>
              <ellipse class="muscle-region" data-muscle="shoulders" cx="98" cy="112" rx="22" ry="16"/>
              <ellipse class="muscle-region" data-muscle="shoulders" cx="202" cy="112" rx="22" ry="16"/>
              <path class="muscle-region" data-muscle="chest" d="M112,108 Q150,100 188,108 L185,148 Q150,155 115,148 Z"/>
              <ellipse class="muscle-region" data-muscle="biceps" cx="82" cy="158" rx="14" ry="32"/>
              <ellipse class="muscle-region" data-muscle="biceps" cx="218" cy="158" rx="14" ry="32"/>
              <ellipse class="muscle-region" data-muscle="triceps" cx="78" cy="162" rx="10" ry="28" transform="translate(-8,0)"/>
              <ellipse class="muscle-region" data-muscle="triceps" cx="222" cy="162" rx="10" ry="28" transform="translate(8,0)"/>
              <rect class="muscle-region" data-muscle="abs" x="128" y="150" width="44" height="68" rx="8"/>
              <rect class="muscle-region" data-muscle="back" x="112" y="112" width="14" height="50" rx="4" opacity="0.6"/>
              <rect class="muscle-region" data-muscle="back" x="174" y="112" width="14" height="50" rx="4" opacity="0.6"/>
              <path class="muscle-region" data-muscle="glutes" d="M118,220 Q150,212 182,220 L180,250 Q150,258 120,250 Z"/>
              <path class="muscle-region" data-muscle="quads" d="M115,252 L128,252 L130,360 L110,360 Z"/>
              <path class="muscle-region" data-muscle="quads" d="M172,252 L185,252 L190,360 L170,360 Z"/>
              <path class="muscle-region" data-muscle="hamstrings" d="M130,252 L145,252 L143,355 L132,355 Z"/>
              <path class="muscle-region" data-muscle="hamstrings" d="M155,252 L170,252 L168,355 L157,355 Z"/>
              <ellipse class="muscle-region" data-muscle="calves" cx="120" cy="408" rx="12" ry="40"/>
              <ellipse class="muscle-region" data-muscle="calves" cx="180" cy="408" rx="12" ry="40"/>
              <rect x="60" y="195" width="12" height="50" rx="6" fill="#e0e2e6"/>
              <rect x="228" y="195" width="12" height="50" rx="6" fill="#e0e2e6"/>
              <ellipse cx="120" cy="470" rx="16" ry="8" fill="#e0e2e6"/>
              <ellipse cx="180" cy="470" rx="16" ry="8" fill="#e0e2e6"/>
            </svg>
            <div class="bodymap-toggle" id="heatmapToggle">
              <button data-heatmap="volume" class="active">Volume</button>
              <button data-heatmap="recovery">Recovery</button>
            </div>
          </div>
        </div>
        <div class="bodymap-surface" id="bodymap3dHost" style="display:none"><!-- model-viewer appended by bodymap-3d.js --></div>
      </div>
      <aside class="bodymap-side">
        <h3>Muscle Detail</h3>
        <div id="muscleDetailEmpty" style="color:var(--text-weak);">Click a muscle on the body map.</div>
        <div id="muscleDetail" style="display:none;">
          <div id="muscleDetailName" style="font-family:var(--font-display); font-size:20px; color:var(--blue); margin-bottom:var(--gap-sm);"></div>
          <div id="muscleDetailCount" style="font-size:12px;color:var(--text-weak);text-transform:uppercase;letter-spacing:var(--track-caption);margin-bottom:var(--gap-sm);"></div>
          <ul class="muscle-detail-exercises" id="muscleDetailExercises"></ul>
        </div>
      </aside>
    </section>

    <footer class="dash-footer">
      3D model: Ruslan Gadzhiev / Sketchfab · CC-BY 4.0
    </footer>

  </main>
</div>

<button class="ai-sphere" id="aiSphere" aria-label="Quick log"></button>
<div class="ai-panel" id="aiPanel" role="dialog" aria-label="Quick log">
  <textarea id="aiInput" placeholder="Log anything — e.g. did 4x8 bench @ 135lb"></textarea>
  <div class="row">
    <span class="status" id="aiStatus"></span>
    <button class="submit" id="aiSubmit">Log</button>
  </div>
</div>

<script type="module">
  // Minimal Task 9 wiring: toggle the AI sphere panel.
  // Additional modules wired in later tasks.
  const sphere = document.getElementById('aiSphere');
  const panel = document.getElementById('aiPanel');
  sphere.addEventListener('click', () => panel.classList.toggle('open'));
</script>

</body>
</html>
```

- [ ] **Step 9.3: Open in browser and verify layout**

```bash
cd ~/Desktop/health-dashboard
open Projects/health-fat-loss/dashboard.html
```

Expected:
- Left sidebar (240 px wide, light grey, "Health" brand, Today highlighted blue)
- Hero card with grey `—` score and explain text
- 4 tiles each with `+` button and `—` placeholders
- Body-map card: 2D SVG with all 11 regions in pale blue; 2D/3D toggle visible; Volume/Recovery toggle below SVG; 3D host hidden
- Footer with CC-BY attribution
- Bottom-right pulsing blue sphere; clicking opens/closes the text-input panel
- No console errors

- [ ] **Step 9.4: Commit**

```bash
cd ~/Desktop/health-dashboard
git add Projects/health-fat-loss/dashboard.html
git commit -m "feat: scaffold dashboard.html with Airtable tokens + inline 2D SVG + FAB"
```

---

### Task 10a: Wire 2D body map interactions (click + heatmap)

**Goal:** Take the inlined SVG from Task 9 and give it click-to-select + Volume/Recovery heatmap colours, driven by state the dashboard will later populate from canonical data. Use safe DOM builders — no `innerHTML`.

**Files:**
- Create: `Projects/health-fat-loss/js/bodymap-2d.js`
- Modify: `Projects/health-fat-loss/dashboard.html` (import + init call)

- [ ] **Step 10a.1: Write the module**

Write `Projects/health-fat-loss/js/bodymap-2d.js`:

```javascript
// 2D SVG body map interaction. The SVG is inlined in dashboard.html (Task 9);
// this module only queries + binds. Safe DOM builders only.

const COLOR_RAMP = [
  { t: 0.0, color: [13, 58, 122] },
  { t: 0.5, color: [27, 97, 201] },
  { t: 1.0, color: [239, 68, 68] }
];

export function rampColor(t) {
  t = Math.max(0, Math.min(1, t));
  for (let i = 1; i < COLOR_RAMP.length; i++) {
    const a = COLOR_RAMP[i - 1], b = COLOR_RAMP[i];
    if (t <= b.t) {
      const local = (t - a.t) / (b.t - a.t);
      const rgb = a.color.map((c, k) => Math.round(c + (b.color[k] - c) * local));
      return `rgb(${rgb.join(',')})`;
    }
  }
  return 'rgb(239,68,68)';
}

export function normalize(raw) {
  const values = Object.values(raw).filter(v => typeof v === 'number');
  if (!values.length) return {};
  const max = Math.max(...values);
  if (max === 0) return Object.fromEntries(Object.keys(raw).map(k => [k, 0]));
  return Object.fromEntries(Object.entries(raw).map(([k, v]) => [k, (v || 0) / max]));
}

export function initBodyMap2D({ host, heatmapToggleEl, state, onMuscleClick }) {
  const regions = host.querySelectorAll('.muscle-region');

  heatmapToggleEl.querySelectorAll('button').forEach(b => {
    b.addEventListener('click', () => {
      heatmapToggleEl.querySelectorAll('button').forEach(x => x.classList.remove('active'));
      b.classList.add('active');
      paint(b.dataset.heatmap);
    });
  });

  regions.forEach(r => {
    r.addEventListener('click', () => {
      regions.forEach(x => x.classList.toggle('active', x.dataset.muscle === r.dataset.muscle));
      onMuscleClick(r.dataset.muscle);
    });
  });

  function paint(mode) {
    const raw = mode === 'volume' ? (state.volume || {}) : (state.recovery || {});
    const norm = normalize(raw);
    regions.forEach(r => {
      const m = r.dataset.muscle;
      const t = norm[m];
      r.setAttribute('fill', rampColor(t ?? 0));
      r.style.opacity = (t == null || t === 0) ? '0.25' : (0.4 + 0.6 * t).toFixed(2);
    });
  }

  paint('volume');
  return { repaint: paint };
}

export function exercisesForMuscle(muscle, exerciseDb, lastTrainedByExercise = {}) {
  const hits = Object.entries(exerciseDb).filter(([, v]) => v.muscles.includes(muscle));
  hits.sort(([an], [bn]) => (lastTrainedByExercise[bn] ?? -Infinity) - (lastTrainedByExercise[an] ?? -Infinity));
  return hits.map(([name, v]) => ({ name, rpe: v.rpe, notes: v.notes, subs: v.subs }));
}

export function renderMuscleDetail({ emptyEl, containerEl, nameEl, countEl, listEl }, muscle, exercises) {
  emptyEl.style.display = 'none';
  containerEl.style.display = '';
  nameEl.textContent = muscle[0].toUpperCase() + muscle.slice(1);
  countEl.textContent = `${exercises.length} exercise${exercises.length === 1 ? '' : 's'} in your program`;

  listEl.replaceChildren();

  exercises.slice(0, 6).forEach(e => {
    const li = document.createElement('li');

    const nameDiv = document.createElement('div');
    nameDiv.className = 'ex-name';
    nameDiv.textContent = e.name;

    const subDiv = document.createElement('div');
    subDiv.className = 'ex-sub';
    const notes = e.notes.length > 80 ? e.notes.slice(0, 80) + '…' : e.notes;
    subDiv.textContent = `RPE ${e.rpe} · ${notes}`;

    li.appendChild(nameDiv);
    li.appendChild(subDiv);
    listEl.appendChild(li);
  });
}
```

- [ ] **Step 10a.2: Wire the module in `dashboard.html`**

Replace the Task-9 minimal `<script type="module">` block with:

```html
<script type="module">
  import { initBodyMap2D, exercisesForMuscle, renderMuscleDetail } from './js/bodymap-2d.js';

  const state = {
    volume: { chest: 12, back: 18, shoulders: 8, biceps: 6, triceps: 6, traps: 4, abs: 4, glutes: 10, quads: 14, hamstrings: 10, calves: 6 },
    recovery: { chest: 2, back: 0, shoulders: 1, biceps: 3, triceps: 3, traps: 5, abs: 1, glutes: 4, quads: 1, hamstrings: 2, calves: 4 }
  };

  const exerciseDb = await fetch('../../Data/health/training/nippard-program.json')
    .then(r => r.json())
    .then(d => d.exercises);

  const lastTrainedByExercise = {};  // Task 13 populates

  const panelRefs = {
    emptyEl: document.getElementById('muscleDetailEmpty'),
    containerEl: document.getElementById('muscleDetail'),
    nameEl: document.getElementById('muscleDetailName'),
    countEl: document.getElementById('muscleDetailCount'),
    listEl: document.getElementById('muscleDetailExercises')
  };

  initBodyMap2D({
    host: document.getElementById('bodymap2dHost'),
    heatmapToggleEl: document.getElementById('heatmapToggle'),
    state,
    onMuscleClick: (muscle) => {
      const exs = exercisesForMuscle(muscle, exerciseDb, lastTrainedByExercise);
      renderMuscleDetail(panelRefs, muscle, exs);
    }
  });

  document.getElementById('aiSphere').addEventListener('click', () =>
    document.getElementById('aiPanel').classList.toggle('open'));
</script>
```

Note: relative path `../../Data/health/training/nippard-program.json` works from `Projects/health-fat-loss/dashboard.html` when opened via `file://`. Task 13 switches to Local REST API fetches.

- [ ] **Step 10a.3: Reload and verify**

```bash
cd ~/Desktop/health-dashboard
open Projects/health-fat-loss/dashboard.html
```

Expected:
- Body map renders with Volume heatmap; back/quads visibly redder than calves/abs
- Toggle "Recovery" → colours shift (traps/calves red, back blue/green)
- Click "chest" region → side panel shows "Chest" header, exercise count, up to 6 exercises
- Other regions clickable; panel updates

- [ ] **Step 10a.4: Commit**

```bash
cd ~/Desktop/health-dashboard
git add Projects/health-fat-loss/js/bodymap-2d.js Projects/health-fat-loss/dashboard.html
git commit -m "feat: 2D body map heatmap + click→detail panel"
```

---

### Task 10b: Build 3D body model module

**Goal:** Load the GLB into a `<model-viewer>` inside `#bodymap3dHost`, render 16–22 hotspot pins with tooltips (name + fact + exercise count), implement click-to-zoom, enable AR for iOS.

**Files:**
- Create: `Projects/health-fat-loss/js/bodymap-3d.js`
- Modify: `Projects/health-fat-loss/dashboard.html` (import + init)

- [ ] **Step 10b.1: Write the module**

Write `Projects/health-fat-loss/js/bodymap-3d.js`:

```javascript
// 3D body model with hotspot pins. <model-viewer> is loaded via CDN in dashboard.html.
// Safe DOM builders only.

export async function initBodyMap3D({ host, hotspotsUrl, factsUrl, exerciseDb }) {
  const [hotspotsDoc, factsDoc] = await Promise.all([
    fetch(hotspotsUrl).then(r => r.json()),
    fetch(factsUrl).then(r => r.json()).catch(() => ({}))
  ]);

  const modelPath = hotspotsDoc.model_path.replace(/^Projects\/health-fat-loss\//, '');

  const mv = document.createElement('model-viewer');
  mv.setAttribute('src', modelPath);
  mv.setAttribute('camera-controls', '');
  mv.setAttribute('tone-mapping', 'neutral');
  mv.setAttribute('ar', '');
  mv.setAttribute('ar-modes', 'webxr scene-viewer quick-look');
  mv.setAttribute('shadow-intensity', '0.5');
  mv.setAttribute('interaction-prompt', 'none');
  mv.setAttribute('exposure', '1.0');
  // NO auto-rotate (hotspot flicker).

  host.replaceChildren(mv);

  const factsMap = factsDoc.facts || factsDoc;

  hotspotsDoc.pins.forEach((pin, i) => {
    const btn = document.createElement('button');
    btn.className = 'hotspot';
    btn.setAttribute('slot', `hotspot-${i}`);
    btn.setAttribute('data-position', pin.position);
    btn.setAttribute('data-normal', pin.normal);
    btn.setAttribute('data-visibility-attribute', 'visible');
    btn.setAttribute('aria-label', pin.muscle_name);

    const exerciseCount = Object.values(exerciseDb).filter(e =>
      e.muscles.includes(pin.slot) || e.muscles.includes(pin.region)).length;
    const fact = factsMap[pin.slot] || factsMap[pin.region] || '';

    const label = document.createElement('span');
    label.className = 'label';

    const strong = document.createElement('strong');
    strong.textContent = pin.muscle_name;
    label.appendChild(strong);

    if (fact) {
      const factSpan = document.createElement('span');
      factSpan.textContent = fact;
      label.appendChild(factSpan);
    }

    const em = document.createElement('em');
    em.textContent = `${exerciseCount} exercise${exerciseCount === 1 ? '' : 's'} in your program`;
    label.appendChild(em);

    btn.appendChild(label);
    btn.addEventListener('click', () => zoomTo(mv, pin.position));
    mv.appendChild(btn);
  });

  return { modelViewer: mv };
}

function zoomTo(mv, position) {
  const [x, y, z] = position.split(/\s+/).map(Number);
  mv.cameraTarget = `${x}m ${y}m ${z}m`;
  mv.cameraOrbit = `0deg 75deg 1.5m`;
  mv.fieldOfView = '25deg';
}
```

- [ ] **Step 10b.2: Create a stub `muscle-facts.json`**

Write `Projects/health-fat-loss/data/muscle-facts.json`:

```json
{
  "schema_version": 1,
  "_note": "Task 11 replaces this with LLM-authored facts.",
  "facts": {}
}
```

- [ ] **Step 10b.3: Wire 3D init in `dashboard.html`**

Add to the module script:

```javascript
import { initBodyMap3D } from './js/bodymap-3d.js';

await initBodyMap3D({
  host: document.getElementById('bodymap3dHost'),
  hotspotsUrl: './data/hotspot-coordinates.json',
  factsUrl: './data/muscle-facts.json',
  exerciseDb
});
```

- [ ] **Step 10b.4: Temporarily show the 3D host**

In `dashboard.html`, change `<div class="bodymap-surface" id="bodymap3dHost" style="display:none">` to `style="display:flex"`. Task 10c re-hides.

- [ ] **Step 10b.5: Reload, verify 3D model + hotspots**

```bash
cd ~/Desktop/health-dashboard
open Projects/health-fat-loss/dashboard.html
```

Expected:
- 3D muscular-system body renders within ~2 s
- Mouse drag rotates; scroll zooms; auto-rotate OFF
- 16–22 blue circles on muscle groups
- Hover any hotspot → tooltip with muscle name (blue bold), optional fact line, exercise count in grey italic
- Click a hotspot → camera zooms toward that position
- No console errors

- [ ] **Step 10b.6: iOS AR smoke test (optional)**

Serve the project over HTTPS (AR requires it), load on iPhone, tap AR icon → Quick Look opens.

- [ ] **Step 10b.7: Commit**

```bash
cd ~/Desktop/health-dashboard
git add Projects/health-fat-loss/js/bodymap-3d.js Projects/health-fat-loss/data/muscle-facts.json Projects/health-fat-loss/dashboard.html
git commit -m "feat: 3D body model with hotspots + click-to-zoom"
```

---

### Task 10c: 2D/3D toggle

**Goal:** Swap the visible body-map surface, persist via `localStorage`.

**Files:**
- Create: `Projects/health-fat-loss/js/bodymap-toggle.js`
- Modify: `Projects/health-fat-loss/dashboard.html`

- [ ] **Step 10c.1: Revert the 3D host display**

In `dashboard.html`:

```html
<div class="bodymap-surface" id="bodymap3dHost" style="display:none">
```

- [ ] **Step 10c.2: Write the module**

Write `Projects/health-fat-loss/js/bodymap-toggle.js`:

```javascript
const KEY = 'bodymap:mode';

export function initBodyMapToggle({ toggleEl, host2d, host3d }) {
  const stored = localStorage.getItem(KEY);
  const initial = (stored === '2d' || stored === '3d') ? stored : '2d';
  apply(initial);

  toggleEl.querySelectorAll('button').forEach(b => {
    b.addEventListener('click', () => apply(b.dataset.mode));
  });

  function apply(mode) {
    toggleEl.querySelectorAll('button').forEach(b => b.classList.toggle('active', b.dataset.mode === mode));
    host2d.style.display = mode === '2d' ? '' : 'none';
    host3d.style.display = mode === '3d' ? '' : 'none';
    localStorage.setItem(KEY, mode);
  }

  return { apply };
}
```

- [ ] **Step 10c.3: Wire in `dashboard.html`**

Add to module script:

```javascript
import { initBodyMapToggle } from './js/bodymap-toggle.js';

initBodyMapToggle({
  toggleEl: document.getElementById('bodymapToggle'),
  host2d: document.getElementById('bodymap2dHost'),
  host3d: document.getElementById('bodymap3dHost')
});
```

- [ ] **Step 10c.4: Reload, verify**

Expected: 2D default; 3D button swaps surface; reload persists mode via DevTools → Application → Local Storage → `bodymap:mode`.

- [ ] **Step 10c.5: Commit**

```bash
cd ~/Desktop/health-dashboard
git add Projects/health-fat-loss/js/bodymap-toggle.js Projects/health-fat-loss/dashboard.html
git commit -m "feat: 2D/3D body map toggle with localStorage"
```

---

### Task 11: Generate + cache muscle facts

**Goal:** Produce `data/muscle-facts.json` with one ≤25-word anatomy fact per slot/region slug. LLM-authored, user-reviewed.

**Files:**
- Create: `Projects/health-fat-loss/scripts/generate-muscle-facts.md`
- Replace: `Projects/health-fat-loss/data/muscle-facts.json`

- [ ] **Step 11.1: Write the generation procedure**

Write `Projects/health-fat-loss/scripts/generate-muscle-facts.md`:

```markdown
# Muscle Facts Generation

Run once; commit the output. Re-run only if the 22-hotspot taxonomy changes.

## Procedure

1. Read the unique slug list from `Projects/health-fat-loss/data/hotspot-coordinates.json` (union of `slot` + `region`).
2. Paste the prompt below into Claude Sonnet 4.6.
3. Review each fact for accuracy + tone.
4. Save reviewed output to `Projects/health-fat-loss/data/muscle-facts.json`.

## Prompt

You are writing concise muscle anatomy facts for a fitness dashboard.
For each slug below, return ONE sentence (max 25 words) describing the muscle's primary function and anatomical location. Plain factual tone; no motivation-speak.

Return one JSON object keyed by slug. Example:

    {"upper-chest": "Fibers of pectoralis major attaching near the clavicle; drives shoulder flexion and horizontal adduction, emphasized by incline pressing."}

Slugs: [paste comma-separated list]

## Expected saved schema

    {
      "schema_version": 1,
      "generated": "2026-04-13",
      "facts": {
        "upper-chest": "...",
        "mid-chest": "...",
        "...": "..."
      }
    }
```

- [ ] **Step 11.2: Generate and paste output**

Follow the procedure. Replace the stub file at `Projects/health-fat-loss/data/muscle-facts.json` with the reviewed output.

- [ ] **Step 11.3: User review pass**

Read each fact. Correct any inaccuracies or tone issues directly.

- [ ] **Step 11.4: Reload, verify tooltips**

Switch the dashboard to 3D. Hover any hotspot → tooltip now shows the fact sentence.

- [ ] **Step 11.5: Commit**

```bash
cd ~/Desktop/health-dashboard
git add Projects/health-fat-loss/scripts/generate-muscle-facts.md Projects/health-fat-loss/data/muscle-facts.json
git commit -m "feat: cache LLM-authored muscle facts for 3D tooltips"
```

---

### Task 12: Build hero readiness card (TDD)

**Goal:** Replace the placeholder hero with a tested 4-input readiness calculation.

**Files:**
- Create: `Projects/health-fat-loss/js/readiness.js`
- Create: `Projects/health-fat-loss/tests/readiness.test.html`
- Modify: `Projects/health-fat-loss/dashboard.html`

- [ ] **Step 12.1: Write the failing test page**

Write `Projects/health-fat-loss/tests/readiness.test.html`:

```html
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><title>readiness.js tests</title>
<style>body{font-family:system-ui;padding:2rem;} .pass{color:#006400;} .fail{color:#b00020;}</style>
</head>
<body>
<h1>readiness.js tests</h1>
<div id="out"></div>
<script type="module">
import { computeReadiness, scoreDays, scoreRpe, scoreLoad, scoreSleep, toStatus } from '../js/readiness.js';

const out = document.getElementById('out');
let pass = 0, fail = 0;
function t(name, actual, expected) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (ok) pass++; else fail++;
  const el = document.createElement('div');
  el.className = ok ? 'pass' : 'fail';
  el.textContent = `${ok ? 'PASS' : 'FAIL'} — ${name} :: got ${JSON.stringify(actual)}, expected ${JSON.stringify(expected)}`;
  out.appendChild(el);
}

t('days 0 → 40', scoreDays(0), 40);
t('days 1 → 40', scoreDays(1), 40);
t('days 2 → 85', scoreDays(2), 85);
t('days 3 → 75', scoreDays(3), 75);
t('days 7 → 60', scoreDays(7), 60);
t('days 14 → 40', scoreDays(14), 40);
t('days null → 75', scoreDays(null), 75);

t('rpe 10 → 50', scoreRpe(10), 50);
t('rpe 5 → 75', scoreRpe(5), 75);
t('rpe 1 → 95', scoreRpe(1), 95);
t('rpe null → 75', scoreRpe(null), 75);

t('load 20 → 70', scoreLoad(20), 70);
t('load 70 → 85', scoreLoad(70), 85);
t('load 120 → 75', scoreLoad(120), 75);
t('load 180 → 60', scoreLoad(180), 60);
t('load null → 75', scoreLoad(null), 75);

t('sleep 8 → 90', scoreSleep(8), 90);
t('sleep 7 → 90', scoreSleep(7), 90);
t('sleep 6 → 70', scoreSleep(6), 70);
t('sleep 5 → 50', scoreSleep(5), 50);
t('sleep 4 → 30', scoreSleep(4), 30);
t('sleep 10 → 80', scoreSleep(10), 80);
t('sleep null → 75', scoreSleep(null), 75);

t('all undefined → no_data',
  computeReadiness({}),
  { score: null, status: 'no_data', explain: 'Log a session to unlock your readiness score.' });

t('days=2 rpe=6 load=70 sleep=8 → mean',
  computeReadiness({ days: 2, rpe: 6, load: 70, sleep: 8 }).score,
  Math.round((85 + 70 + 85 + 90) / 4));

t('status 80 → green', toStatus(80), 'green');
t('status 65 → yellow', toStatus(65), 'yellow');
t('status 40 → red', toStatus(40), 'red');
t('status null → grey', toStatus(null), 'grey');

const summary = document.createElement('h2');
summary.className = fail === 0 ? 'pass' : 'fail';
summary.textContent = `${pass} passed, ${fail} failed`;
out.prepend(summary);
</script>
</body>
</html>
```

- [ ] **Step 12.2: Run tests — expect ALL FAIL**

```bash
cd ~/Desktop/health-dashboard
open Projects/health-fat-loss/tests/readiness.test.html
```

DevTools Console: `Failed to load module script` (readiness.js missing). Good.

- [ ] **Step 12.3: Write the readiness module**

Write `Projects/health-fat-loss/js/readiness.js`:

```javascript
export function scoreDays(days) {
  if (days == null) return 75;
  if (days <= 1) return 40;
  if (days === 2) return 85;
  if (days <= 4) return 75;
  if (days <= 7) return 60;
  return 40;
}

export function scoreRpe(rpe) {
  if (rpe == null) return 75;
  const s = 100 - rpe * 5;
  return Math.max(50, Math.min(95, s));
}

export function scoreLoad(load) {
  if (load == null) return 75;
  if (load <= 40) return 70;
  if (load <= 100) return 85;
  if (load <= 150) return 75;
  return 60;
}

export function scoreSleep(hours) {
  if (hours == null) return 75;
  if (hours >= 7 && hours <= 9) return 90;
  if (hours > 9) return 80;
  if (hours >= 6) return 70;
  if (hours >= 5) return 50;
  return 30;
}

export function toStatus(score) {
  if (score == null) return 'grey';
  if (score >= 75) return 'green';
  if (score >= 50) return 'yellow';
  return 'red';
}

const STATUS_EXPLAIN = {
  green: 'Go — recovery looks solid.',
  yellow: 'Maintain — tune intensity or add sleep.',
  red: 'Recover — lighter session or a rest day.',
  grey: 'Log a session to unlock your readiness score.'
};

export function computeReadiness({
  days = null, rpe = null, load = null, sleep = null,
  hrv = null, rhr = null, sleep_deep_min = null, sleep_rem_min = null
} = {}) {
  const scores = [];
  if (days !== null) scores.push(scoreDays(days));
  if (rpe !== null) scores.push(scoreRpe(rpe));
  if (load !== null) scores.push(scoreLoad(load));
  if (sleep !== null) scores.push(scoreSleep(sleep));

  if (scores.length === 0) {
    return { score: null, status: 'no_data', explain: STATUS_EXPLAIN.grey };
  }
  const score = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
  const status = toStatus(score);
  return { score, status, explain: STATUS_EXPLAIN[status] };
}

export function renderHero({ scoreEl, explainEl, statusEl, inputs }) {
  const r = computeReadiness(inputs);
  scoreEl.textContent = r.score ?? '—';
  scoreEl.dataset.status = r.status === 'no_data' ? 'grey' : r.status;
  explainEl.textContent = r.explain;
  statusEl.textContent = r.status === 'no_data' ? 'No Data' :
    r.status === 'green' ? 'Go' : r.status === 'yellow' ? 'Maintain' : 'Recover';
  return r;
}
```

- [ ] **Step 12.4: Run tests — expect ALL PASS**

Reload the test page. Expected: "29 passed, 0 failed" in green. If any FAIL, fix the module, not the tests.

- [ ] **Step 12.5: Wire hero into dashboard**

Add to module script:

```javascript
import { renderHero } from './js/readiness.js';

renderHero({
  scoreEl: document.getElementById('heroScore'),
  explainEl: document.getElementById('heroExplain'),
  statusEl: document.getElementById('heroStatusLabel'),
  inputs: { days: null, rpe: null, load: null, sleep: null }
});
```

- [ ] **Step 12.6: Verify empty state**

Reload. Hero shows grey `—`, "Log a session to unlock your readiness score.", `No Data` label.

Temporarily swap inputs to `{ days: 2, rpe: 6, load: 70, sleep: 8 }` → confirm green ~82, "Go — recovery looks solid.", `Go` label. Revert.

- [ ] **Step 12.7: Commit**

```bash
cd ~/Desktop/health-dashboard
git add Projects/health-fat-loss/js/readiness.js Projects/health-fat-loss/tests/readiness.test.html Projects/health-fat-loss/dashboard.html
git commit -m "feat: hero readiness card with tested 4-input formula"
```

---

### Task 13: Wire live reads via Local REST API

**Goal:** Replace hardcoded placeholders with real reads from `Data/health/` via Obsidian Local REST API. Build a tiny client-side markdown parser, a thin REST client, and four tile renderers. Each tile handles empty/offline states.

**Files:**
- Create: `Projects/health-fat-loss/js/obsidian-api.js`
- Create: `Projects/health-fat-loss/js/md-parser.js`
- Create: `Projects/health-fat-loss/tests/md-parser.test.html`
- Create: `Projects/health-fat-loss/js/tiles.js`
- Modify: `Projects/health-fat-loss/dashboard.html`

- [ ] **Step 13.1: Write the REST client**

Write `Projects/health-fat-loss/js/obsidian-api.js`:

```javascript
// Thin wrapper over Obsidian Local REST API. Every call returns a normalized
// {ok, status, data, error} shape so tile renderers can branch on state.

const BASE = 'https://127.0.0.1:27124';

function getKey() { return localStorage.getItem('obsidian:apiKey') || ''; }
export function setKey(key) { localStorage.setItem('obsidian:apiKey', key); }

export async function readFile(vaultPath) {
  const key = getKey();
  if (!key) return { ok: false, status: 0, error: 'NO_KEY' };
  try {
    const res = await fetch(`${BASE}/vault/${encodeURI(vaultPath)}`, {
      headers: { 'Authorization': `Bearer ${key}` }
    });
    if (!res.ok) return { ok: false, status: res.status, error: `HTTP_${res.status}` };
    const text = await res.text();
    return { ok: true, status: res.status, data: text };
  } catch (e) {
    return { ok: false, status: 0, error: 'OFFLINE', message: String(e) };
  }
}

export async function appendUnderHeading(vaultPath, headingPath, content) {
  const key = getKey();
  if (!key) return { ok: false, status: 0, error: 'NO_KEY' };
  try {
    const res = await fetch(`${BASE}/vault/${encodeURI(vaultPath)}`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${key}`,
        'Operation': 'append',
        'Target-Type': 'heading',
        'Target': headingPath,
        'Content-Type': 'text/markdown'
      },
      body: content
    });
    if (!res.ok) return { ok: false, status: res.status, error: `HTTP_${res.status}` };
    return { ok: true, status: res.status };
  } catch (e) {
    return { ok: false, status: 0, error: 'OFFLINE', message: String(e) };
  }
}

export async function prependToFile(vaultPath, content) {
  const key = getKey();
  if (!key) return { ok: false, status: 0, error: 'NO_KEY' };
  try {
    const res = await fetch(`${BASE}/vault/${encodeURI(vaultPath)}`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${key}`,
        'Operation': 'prepend',
        'Target-Type': 'document',
        'Content-Type': 'text/markdown'
      },
      body: content
    });
    if (!res.ok) return { ok: false, status: res.status, error: `HTTP_${res.status}` };
    return { ok: true, status: res.status };
  } catch (e) {
    return { ok: false, status: 0, error: 'OFFLINE', message: String(e) };
  }
}
```

- [ ] **Step 13.2: Write the md-parser test page first**

Write `Projects/health-fat-loss/tests/md-parser.test.html`:

```html
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><title>md-parser.js tests</title>
<style>body{font-family:system-ui;padding:2rem;} .pass{color:#006400;} .fail{color:#b00020;} pre{background:#f8fafc;padding:0.5rem;font-size:12px;}</style>
</head>
<body>
<h1>md-parser.js tests</h1>
<div id="out"></div>
<script type="module">
import { parseFrontmatter, headingSections, firstHeadingDate, tableRows } from '../js/md-parser.js';

const out = document.getElementById('out');
let pass = 0, fail = 0;
function t(name, actual, expected) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (ok) pass++; else fail++;
  const el = document.createElement('div');
  el.className = ok ? 'pass' : 'fail';
  el.textContent = `${ok ? 'PASS' : 'FAIL'} — ${name}`;
  out.appendChild(el);
  if (!ok) {
    const pre = document.createElement('pre');
    pre.textContent = `actual=${JSON.stringify(actual)}\nexpected=${JSON.stringify(expected)}`;
    out.appendChild(pre);
  }
}

const SAMPLE = `---
type: nutrition-log
last-updated: 2026-04-12
day-count: 1
---

<!-- comment -->

## 2026-04-12 (Day 14)

| Metric | Value | Target | Status |
|--------|-------|--------|--------|
| Calories | 950 | 1,900 | 50% |
| Protein | 70g | 160g | 44% |

### Meals
1. Wings.

## 2026-04-11 (Day 13)

| Metric | Value | Target | Status |
|--------|-------|--------|--------|
| Calories | 2000 | 1,900 | over |
`;

t('frontmatter values',
  parseFrontmatter(SAMPLE),
  { type: 'nutrition-log', 'last-updated': '2026-04-12', 'day-count': '1' });

const sections = headingSections(SAMPLE, 2);
t('two H2 sections', sections.length, 2);
t('first section heading', sections[0].heading, '2026-04-12 (Day 14)');
t('second section heading', sections[1].heading, '2026-04-11 (Day 13)');

t('first heading date', firstHeadingDate(SAMPLE), '2026-04-12');

const rows = tableRows(sections[0].body);
t('row count 2', rows.length, 2);
t('first row calories', rows[0], { Metric: 'Calories', Value: '950', Target: '1,900', Status: '50%' });
t('second row protein', rows[1], { Metric: 'Protein', Value: '70g', Target: '160g', Status: '44%' });

const summary = document.createElement('h2');
summary.className = fail === 0 ? 'pass' : 'fail';
summary.textContent = `${pass} passed, ${fail} failed`;
out.prepend(summary);
</script>
</body>
</html>
```

- [ ] **Step 13.3: Open the test page — expect ALL FAIL (module missing)**

```bash
cd ~/Desktop/health-dashboard
open Projects/health-fat-loss/tests/md-parser.test.html
```

DevTools Console: `Failed to load module script`. Good.

- [ ] **Step 13.4: Write the markdown parser**

Write `Projects/health-fat-loss/js/md-parser.js`:

```javascript
// Tiny parser for the Obsidian markdown subset the dashboard reads.
// Handles YAML frontmatter, H2 sections, pipe tables. Tolerates missing fields.

export function parseFrontmatter(src) {
  const m = src.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!m) return {};
  const out = {};
  m[1].split(/\r?\n/).forEach(line => {
    const kv = line.match(/^([A-Za-z0-9_-]+):\s*(.*?)\s*$/);
    if (kv) out[kv[1]] = kv[2].replace(/^"|"$/g, '');
  });
  return out;
}

export function bodyAfterFrontmatter(src) {
  return src.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/, '');
}

export function headingSections(src, level = 2) {
  const body = bodyAfterFrontmatter(src);
  const re = new RegExp(`^${'#'.repeat(level)} (.+)$`, 'gm');
  const matches = [];
  for (const m of body.matchAll(re)) {
    matches.push({ heading: m[1].trim(), index: m.index, length: m[0].length });
  }
  return matches.map((h, i) => {
    const start = h.index + h.length;
    const end = i + 1 < matches.length ? matches[i + 1].index : body.length;
    return { heading: h.heading, body: body.slice(start, end).trim() };
  });
}

export function firstHeadingDate(src) {
  const sections = headingSections(src, 2);
  for (const s of sections) {
    const m = s.heading.match(/^(\d{4}-\d{2}-\d{2})/);
    if (m) return m[1];
  }
  return null;
}

export function tableRows(body) {
  const lines = body.split(/\r?\n/).map(l => l.trim()).filter(l => l.startsWith('|'));
  if (lines.length < 2) return [];
  const headerCells = splitRow(lines[0]);
  const rows = lines.slice(2).map(splitRow);
  return rows.map(cells => Object.fromEntries(headerCells.map((h, i) => [h, (cells[i] ?? '').trim()])));
}

function splitRow(line) {
  return line.replace(/^\|/, '').replace(/\|$/, '').split('|').map(c => c.trim());
}
```

- [ ] **Step 13.5: Reload the test page — expect ALL PASS**

Reload `tests/md-parser.test.html`. Expected: "8 passed, 0 failed".

- [ ] **Step 13.6: Write the tile renderers**

Write `Projects/health-fat-loss/js/tiles.js`:

```javascript
// Renders the 4 domain tiles from canonical markdown.
import { headingSections, firstHeadingDate, tableRows } from './md-parser.js';

const TODAY = () => new Date().toISOString().slice(0, 10);

function setTile(tileEl, value, sub) {
  tileEl.querySelector('[data-slot="value"]').textContent = value;
  tileEl.querySelector('[data-slot="sub"]').textContent = sub;
}

export function renderTraining(tileEl, { trainingLogMd, programMd }) {
  if (!trainingLogMd) { setTile(tileEl, 'Offline', 'Obsidian unreachable'); return; }
  const lastDate = firstHeadingDate(trainingLogMd);
  if (!lastDate) { setTile(tileEl, 'No sessions', 'Log your first workout'); return; }
  const daysSince = Math.floor((new Date(TODAY()) - new Date(lastDate)) / 86_400_000);
  let planName = '—';
  if (programMd) {
    const rows = headingSections(programMd, 2).flatMap(s => tableRows(s.body));
    const todayDow = new Date().toLocaleDateString('en-US', { weekday: 'long' });
    const row = rows.find(r => (r.Day || '').startsWith(todayDow.slice(0, 3)));
    if (row) planName = row.Session || row.Focus || '—';
  }
  setTile(tileEl, planName, `Last session ${daysSince}d ago`);
}

export function renderNutrition(tileEl, { dailyLogMd }) {
  if (!dailyLogMd) { setTile(tileEl, 'Offline', 'Obsidian unreachable'); return; }
  const sections = headingSections(dailyLogMd, 2);
  if (!sections.length) { setTile(tileEl, 'No log yet', "Add today's meals"); return; }
  const today = sections.find(s => s.heading.startsWith(TODAY()));
  const picked = today || sections[0];
  const rows = tableRows(picked.body);
  const cal = rows.find(r => r.Metric === 'Calories');
  const pro = rows.find(r => r.Metric === 'Protein');
  const value = cal ? `${cal.Value} / ${cal.Target} cal` : '—';
  const sub = pro ? `${pro.Value} protein · ${picked.heading}` : picked.heading;
  setTile(tileEl, value, sub);
}

export function renderBodyComp(tileEl, { weeklyMd }) {
  if (!weeklyMd) { setTile(tileEl, 'Offline', 'Obsidian unreachable'); return; }
  const sections = headingSections(weeklyMd, 2);
  if (!sections.length) { setTile(tileEl, 'No weigh-ins', 'Log your first weight'); return; }
  const latest = sections[0];
  const rows = tableRows(latest.body);
  const weight = rows.find(r => /weight/i.test(r.Metric || ''));
  setTile(tileEl, weight ? `${weight.Value}` : '—', latest.heading);
}

export function renderMeds(tileEl, { complianceMd, activeMedsMd }) {
  if (!complianceMd || !activeMedsMd) { setTile(tileEl, 'Offline', 'Obsidian unreachable'); return; }
  const activeCount = headingSections(activeMedsMd, 2).length;
  const entries = headingSections(complianceMd, 2).slice(0, 7);
  if (!entries.length) {
    setTile(tileEl, `${activeCount} active`, 'No compliance data yet');
    return;
  }
  let takenDays = 0;
  entries.forEach(e => {
    const total = (e.body.match(/\[[ x]\]/gi) || []).length;
    const taken = (e.body.match(/\[x\]/gi) || []).length;
    if (total && taken === total) takenDays += 1;
  });
  const pct = Math.round((takenDays / entries.length) * 100);
  setTile(tileEl, `${pct}%`, `${takenDays}/${entries.length} days full`);
}

// Build a map from exercise name → days-since-last-trained.
export function buildLastTrainedMap(trainingLogMd) {
  if (!trainingLogMd) return {};
  const sections = headingSections(trainingLogMd, 2);
  const today = new Date(TODAY());
  const map = {};
  sections.forEach(sec => {
    const m = sec.heading.match(/^(\d{4}-\d{2}-\d{2})/);
    if (!m) return;
    const daysAgo = Math.floor((today - new Date(m[1])) / 86_400_000);
    sec.body.split(/\r?\n/).forEach(line => {
      const ex = line.match(/^- \*\*(.+?)\*\*/) || line.match(/^Exercise:\s*(.+)/);
      if (ex) {
        const name = ex[1].trim();
        if (!(name in map) || map[name] > daysAgo) map[name] = daysAgo;
      }
    });
  });
  return map;
}
```

- [ ] **Step 13.7: Add the API-key banner to `dashboard.html`**

In `dashboard.html`, just inside `<body>` (above `.layout`):

```html
<div id="apiKeyBanner" style="display:none; position: fixed; top: 0; left: 240px; right: 0; background: #fff3cd; color: #856404; padding: var(--gap-sm) var(--gap); border-bottom: 1px solid #ffeeba; font-size: 14px; z-index: 10;">
  <strong>Obsidian API key missing.</strong>
  <input id="apiKeyInput" type="password" placeholder="paste bearer key" style="margin-left: 8px; padding: 4px 8px; border: 1px solid var(--border); border-radius: 6px; font: inherit; width: 280px;" />
  <button id="apiKeySave" style="margin-left: 8px; padding: 4px 12px; border: none; background: var(--blue); color: white; border-radius: 6px; cursor: pointer;">Save</button>
</div>
```

- [ ] **Step 13.8: Wire reads + banner + tile renderers**

Add to the module script in `dashboard.html`:

```javascript
import { readFile, setKey } from './js/obsidian-api.js';
import { renderTraining, renderNutrition, renderBodyComp, renderMeds, buildLastTrainedMap } from './js/tiles.js';
import { firstHeadingDate } from './js/md-parser.js';

const banner = document.getElementById('apiKeyBanner');
const keyInput = document.getElementById('apiKeyInput');
const keySave = document.getElementById('apiKeySave');
if (!localStorage.getItem('obsidian:apiKey')) banner.style.display = 'block';
keySave.addEventListener('click', () => {
  const k = keyInput.value.trim();
  if (!k) return;
  setKey(k);
  banner.style.display = 'none';
  window.location.reload();
});

async function loadAll() {
  const [training, program, nutrition, weekly, compliance, activeMeds] = await Promise.all([
    readFile('Data/health/training/training-log.md'),
    readFile('Data/health/training/program.md'),
    readFile('Data/health/nutrition/daily-log.md'),
    readFile('Data/health/weekly-snapshots.md'),
    readFile('Data/health/medications/compliance-log.md'),
    readFile('Data/health/medications/active-medications.md'),
  ]);

  if ([training, program, nutrition, weekly, compliance, activeMeds].some(r => r.status === 401)) {
    banner.style.display = 'block';
  }

  renderTraining(document.getElementById('tileTraining'), {
    trainingLogMd: training.ok ? training.data : null,
    programMd: program.ok ? program.data : null
  });
  renderNutrition(document.getElementById('tileNutrition'), {
    dailyLogMd: nutrition.ok ? nutrition.data : null
  });
  renderBodyComp(document.getElementById('tileBodyComp'), {
    weeklyMd: weekly.ok ? weekly.data : null
  });
  renderMeds(document.getElementById('tileMeds'), {
    complianceMd: compliance.ok ? compliance.data : null,
    activeMedsMd: activeMeds.ok ? activeMeds.data : null
  });

  const logMd = training.ok ? training.data : null;
  const daysSince = logMd ? (() => {
    const d = firstHeadingDate(logMd);
    return d ? Math.floor((Date.now() - new Date(d)) / 86_400_000) : null;
  })() : null;

  renderHero({
    scoreEl: document.getElementById('heroScore'),
    explainEl: document.getElementById('heroExplain'),
    statusEl: document.getElementById('heroStatusLabel'),
    inputs: { days: daysSince, rpe: null, load: null, sleep: null }
  });

  Object.assign(lastTrainedByExercise, buildLastTrainedMap(logMd));
}

loadAll();
```

Delete the earlier Task-12 `renderHero({...})` call (the placeholder-inputs one) so `loadAll`'s version is the only caller.

- [ ] **Step 13.9: Smoke test with Obsidian running**

```bash
cd ~/Desktop/health-dashboard
open Projects/health-fat-loss/dashboard.html
```

On first load, the banner appears. Paste the API key from Task 6, click Save.

Expected:
- Nutrition tile shows "950 / 1,900 cal · 70g protein · 2026-04-12 (Day 14)" (from the one populated day)
- Training tile shows "No sessions · Log your first workout"
- Body comp tile shows "No weigh-ins · Log your first weight"
- Meds tile shows "1 active · No compliance data yet"
- Hero stays grey "No Data"
- No console errors

- [ ] **Step 13.10: Smoke test with Obsidian stopped**

Quit Obsidian. Reload the dashboard.

Expected:
- All four tiles show "Offline · Obsidian unreachable"
- Hero stays grey
- No uncaught exceptions

Restart Obsidian.

- [ ] **Step 13.11: Commit**

```bash
cd ~/Desktop/health-dashboard
git add Projects/health-fat-loss/js/obsidian-api.js Projects/health-fat-loss/js/md-parser.js Projects/health-fat-loss/js/tiles.js Projects/health-fat-loss/tests/md-parser.test.html Projects/health-fat-loss/dashboard.html
git commit -m "feat: wire live tile reads via Local REST API"
```

---

### Task 14: Build AI-sphere FAB quick-log

**Goal:** Submit text from the FAB panel as a timestamped note to today's `Daily/YYYY-MM-DD.md` under a `## Quick Log` heading. Creates the heading if it doesn't exist.

**Files:**
- Create: `Projects/health-fat-loss/js/ai-sphere.js`
- Modify: `Projects/health-fat-loss/dashboard.html`

- [ ] **Step 14.1: Write the sphere module**

Write `Projects/health-fat-loss/js/ai-sphere.js`:

```javascript
import { appendUnderHeading, prependToFile, readFile } from './obsidian-api.js';

function todayPath() {
  const d = new Date();
  return `Daily/${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}.md`;
}

function nowStamp() {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export function initAiSphere({ sphereEl, panelEl, inputEl, submitEl, statusEl }) {
  sphereEl.addEventListener('click', () => {
    panelEl.classList.toggle('open');
    if (panelEl.classList.contains('open')) inputEl.focus();
  });

  submitEl.addEventListener('click', async () => {
    const text = inputEl.value.trim();
    if (!text) return;
    statusEl.textContent = 'Saving…';

    const path = todayPath();
    const line = `- ${nowStamp()} — ${text}`;

    const existing = await readFile(path);
    let res;
    if (!existing.ok) {
      res = { ok: false, error: existing.error || `HTTP_${existing.status}` };
    } else if (existing.data.includes('## Quick Log')) {
      res = await appendUnderHeading(path, 'Quick Log', line + '\n');
    } else {
      res = await prependToFile(path, `## Quick Log\n\n${line}\n\n`);
    }

    if (res.ok) {
      statusEl.textContent = 'Saved ✓';
      inputEl.value = '';
      setTimeout(() => { statusEl.textContent = ''; panelEl.classList.remove('open'); }, 800);
    } else {
      statusEl.textContent = `Failed: ${res.error || res.status}`;
    }
  });

  inputEl.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) submitEl.click();
    if (e.key === 'Escape') panelEl.classList.remove('open');
  });
}
```

- [ ] **Step 14.2: Wire in `dashboard.html`**

Remove the Task-9 minimal no-op sphere toggle. Add to module script:

```javascript
import { initAiSphere } from './js/ai-sphere.js';

initAiSphere({
  sphereEl: document.getElementById('aiSphere'),
  panelEl: document.getElementById('aiPanel'),
  inputEl: document.getElementById('aiInput'),
  submitEl: document.getElementById('aiSubmit'),
  statusEl: document.getElementById('aiStatus')
});
```

- [ ] **Step 14.3: End-to-end test**

Pre-create today's daily note in Obsidian (Calendar plugin or create via `Daily/2026-04-13.md`).

Reload dashboard. Click sphere → panel opens, textarea focused. Type `test from dashboard` → click Log.

Expected:
- Status briefly shows "Saving…" → "Saved ✓"
- Panel closes after ~0.8 s
- Open today's daily note in Obsidian → new line `- HH:MM — test from dashboard` appears under `## Quick Log`

Edge cases:
- Submit empty text → no-op
- Submit while Obsidian is quit → "Failed: OFFLINE"
- Submit when today's daily note doesn't exist → "Failed: HTTP_404" (acceptable V1; V2 could auto-create)

- [ ] **Step 14.4: Commit**

```bash
cd ~/Desktop/health-dashboard
git add Projects/health-fat-loss/js/ai-sphere.js Projects/health-fat-loss/dashboard.html
git commit -m "feat: AI-sphere FAB appends timestamped notes to today's daily note"
```

---

### Task 15: Quick-log writeback for structured data

**Goal:** Each tile's `+` button opens a domain-specific form that PATCHes the correct canonical markdown file. After submit, the tile refreshes from the new data and `/health` can read the writes without corruption.

**Files:**
- Create: `Projects/health-fat-loss/js/quicklog-forms.js`
- Modify: `Projects/health-fat-loss/dashboard.html`

- [ ] **Step 15.1: Add form modal markup to `dashboard.html`**

Append before `</body>`:

```html
<div id="formModal" class="form-modal" role="dialog" aria-modal="true" style="display:none;">
  <div class="form-modal-inner">
    <header>
      <h3 id="formTitle">Log</h3>
      <button class="close" id="formClose" aria-label="Close">×</button>
    </header>
    <form id="quickForm"></form>
    <div id="formStatus" class="status"></div>
  </div>
</div>
```

Append to the `<style>` block:

```css
.form-modal { position: fixed; inset: 0; background: rgba(4, 14, 32, 0.4); display: flex; align-items: center; justify-content: center; z-index: 20; }
.form-modal-inner { background: var(--canvas); border-radius: var(--radius-card); padding: var(--gap-lg); width: 480px; max-width: 90vw; box-shadow: var(--shadow-card); display: flex; flex-direction: column; gap: var(--gap); }
.form-modal-inner header { display: flex; justify-content: space-between; align-items: center; }
.form-modal-inner header h3 { margin: 0; font-family: var(--font-display); font-size: 20px; }
.form-modal-inner .close { background: transparent; border: none; font-size: 24px; cursor: pointer; color: var(--text-weak); }
.form-modal-inner form { display: flex; flex-direction: column; gap: var(--gap-sm); }
.form-modal-inner label { font-size: 12px; color: var(--text-weak); text-transform: uppercase; letter-spacing: var(--track-caption); }
.form-modal-inner input, .form-modal-inner select, .form-modal-inner textarea { padding: var(--gap-sm); border: 1px solid var(--border); border-radius: var(--radius-btn); font: 14px var(--font-body); }
.form-modal-inner button.primary { background: var(--blue); color: var(--canvas); border: none; padding: 10px 16px; border-radius: var(--radius-btn); cursor: pointer; font: 500 14px var(--font-body); margin-top: var(--gap-sm); }
.form-modal-inner .status { font-size: 12px; color: var(--text-weak); }
.form-modal-inner .row { display: grid; grid-template-columns: 1fr 1fr; gap: var(--gap-sm); }
```

- [ ] **Step 15.2: Write the forms module**

Write `Projects/health-fat-loss/js/quicklog-forms.js`:

```javascript
import { appendUnderHeading, prependToFile, readFile } from './obsidian-api.js';

function today() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function mondayOfThisWeek() {
  const d = new Date();
  const m = new Date(d);
  m.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return `${m.getFullYear()}-${String(m.getMonth() + 1).padStart(2, '0')}-${String(m.getDate()).padStart(2, '0')}`;
}

const FIELD = (label, name, type = 'text', extra = {}) => {
  const wrapper = document.createElement('div');
  const lab = document.createElement('label');
  lab.setAttribute('for', name);
  lab.textContent = label;
  const input = type === 'textarea' ? document.createElement('textarea') : document.createElement('input');
  if (type !== 'textarea') input.type = type;
  input.id = name;
  input.name = name;
  Object.entries(extra).forEach(([k, v]) => input.setAttribute(k, v));
  wrapper.appendChild(lab);
  wrapper.appendChild(input);
  return wrapper;
};

const ROW = (...children) => {
  const r = document.createElement('div');
  r.className = 'row';
  children.forEach(c => r.appendChild(c));
  return r;
};

const SPECS = {
  training: {
    title: 'Log workout set',
    fields: () => [
      FIELD('Exercise', 'exercise', 'text', { required: 'true' }),
      ROW(FIELD('Weight (lb)', 'weight', 'number', { min: '0', step: '0.5' }),
          FIELD('Reps', 'reps', 'number', { min: '0', step: '1' })),
      ROW(FIELD('Sets', 'sets', 'number', { min: '1', step: '1', value: '1' }),
          FIELD('RPE', 'rpe', 'number', { min: '1', max: '10', step: '0.5' })),
      FIELD('Notes', 'notes', 'textarea')
    ],
    submit: (form) => {
      const data = Object.fromEntries(new FormData(form).entries());
      const line = `- **${data.exercise}** — ${data.weight || '—'}lb × ${data.reps || '—'} × ${data.sets} sets @ RPE ${data.rpe || '—'}${data.notes ? ' · ' + data.notes : ''}`;
      return writeUnder('Data/health/training/training-log.md', today(), line);
    }
  },
  nutrition: {
    title: 'Log meal',
    fields: () => [
      FIELD('Meal description', 'meal', 'text', { required: 'true' }),
      ROW(FIELD('Calories', 'cal', 'number', { min: '0' }),
          FIELD('Protein (g)', 'protein', 'number', { min: '0' })),
      ROW(FIELD('Carbs (g)', 'carbs', 'number', { min: '0' }),
          FIELD('Fat (g)', 'fat', 'number', { min: '0' }))
    ],
    submit: (form) => {
      const data = Object.fromEntries(new FormData(form).entries());
      const line = `- **${data.meal}** — ${data.cal || '?'} cal · P ${data.protein || '?'}g · C ${data.carbs || '?'}g · F ${data.fat || '?'}g`;
      return writeUnder('Data/health/nutrition/daily-log.md', today(), line);
    }
  },
  bodycomp: {
    title: 'Log weigh-in',
    fields: () => [
      FIELD('Weight (lb)', 'weight', 'number', { min: '0', step: '0.1', required: 'true' }),
      FIELD('Body fat %', 'bf', 'number', { min: '0', max: '100', step: '0.1' }),
      FIELD('Notes', 'notes', 'textarea')
    ],
    submit: (form) => {
      const data = Object.fromEntries(new FormData(form).entries());
      const line = `- Weight: ${data.weight} lb${data.bf ? ' · BF: ' + data.bf + '%' : ''}${data.notes ? ' · ' + data.notes : ''}`;
      return writeUnder('Data/health/weekly-snapshots.md', `Week of ${mondayOfThisWeek()}`, line);
    }
  },
  meds: {
    title: 'Log med / supplement taken',
    fields: () => [
      FIELD('Item (e.g. Creatine, Retatrutide)', 'item', 'text', { required: 'true' }),
      FIELD('Notes', 'notes', 'textarea')
    ],
    submit: (form) => {
      const data = Object.fromEntries(new FormData(form).entries());
      const line = `- [x] ${data.item}${data.notes ? ' — ' + data.notes : ''}`;
      return writeUnder('Data/health/medications/compliance-log.md', today(), line);
    }
  }
};

async function writeUnder(path, heading, line) {
  const r = await readFile(path);
  if (!r.ok) return { ok: false, error: r.error || `HTTP_${r.status}` };
  if (r.data.includes(`## ${heading}`)) return appendUnderHeading(path, heading, line + '\n');
  return prependToFile(path, `## ${heading}\n\n${line}\n\n`);
}

export function initQuickLogForms({ modalEl, titleEl, formEl, statusEl, closeEl, refreshTiles }) {
  document.querySelectorAll('.tile .add-btn').forEach(btn => {
    btn.addEventListener('click', () => open(btn.dataset.tile));
  });
  closeEl.addEventListener('click', close);
  modalEl.addEventListener('click', (e) => { if (e.target === modalEl) close(); });

  function open(kind) {
    const spec = SPECS[kind];
    if (!spec) return;
    titleEl.textContent = spec.title;
    formEl.replaceChildren();
    spec.fields().forEach(f => formEl.appendChild(f));
    const submit = document.createElement('button');
    submit.type = 'submit';
    submit.className = 'primary';
    submit.textContent = 'Save';
    formEl.appendChild(submit);

    formEl.onsubmit = async (e) => {
      e.preventDefault();
      statusEl.textContent = 'Saving…';
      const res = await spec.submit(formEl);
      if (res.ok) {
        statusEl.textContent = 'Saved ✓';
        setTimeout(() => { close(); refreshTiles?.(); }, 500);
      } else {
        statusEl.textContent = `Failed: ${res.error || 'unknown'}`;
      }
    };
    statusEl.textContent = '';
    modalEl.style.display = 'flex';
  }

  function close() {
    modalEl.style.display = 'none';
    formEl.replaceChildren();
    statusEl.textContent = '';
  }
}
```

- [ ] **Step 15.3: Wire in `dashboard.html`**

Add to module script:

```javascript
import { initQuickLogForms } from './js/quicklog-forms.js';

initQuickLogForms({
  modalEl: document.getElementById('formModal'),
  titleEl: document.getElementById('formTitle'),
  formEl: document.getElementById('quickForm'),
  statusEl: document.getElementById('formStatus'),
  closeEl: document.getElementById('formClose'),
  refreshTiles: () => loadAll()
});
```

- [ ] **Step 15.4: Manual test each form**

For each tile:
1. Click `+` → form modal opens with correct fields.
2. Fill required fields, click Save.
3. Status shows "Saving…" → "Saved ✓" → modal closes and the tile refreshes.
4. Open the target markdown file in Obsidian — confirm the new line is under today's heading (or this week's heading for Body Comp).

Sample inputs:
- Training: `Barbell Bench Press`, 135, 8, 3, 7 → appends `- **Barbell Bench Press** — 135lb × 8 × 3 sets @ RPE 7`
- Nutrition: `Chicken rice bowl`, 450, 45 → appends under today
- Body Comp: 180 → lands under `## Week of <Monday>`
- Meds: `Creatine` → lands under today in `compliance-log.md`

- [ ] **Step 15.5: Verify `/health` agent round-trips**

In a Claude Code session at the vault:

```
/health-status
```

Expected: newly logged workout/meal/weigh-in/med appears in the agent's output. No parse errors.

If the agent can't read something: check the heading level + format against `specs/write-pattern-audit.md` (Task 1). Adjust the form's line generation if needed.

- [ ] **Step 15.6: Commit**

```bash
cd ~/Desktop/health-dashboard
git add Projects/health-fat-loss/js/quicklog-forms.js Projects/health-fat-loss/dashboard.html
git commit -m "feat: structured quick-log forms for all 4 domain tiles"
```

---

### Task 16: V1 acceptance check + README polish + final commit

**Goal:** Run the full acceptance checklist, fix anything that fails, update the project README and the write-pattern audit status.

**Files:**
- Modify: `Projects/health-fat-loss/README.md`
- Modify: `Projects/health-fat-loss/specs/write-pattern-audit.md`

- [ ] **Step 16.1: Run each acceptance item**

Walk through the "Verification — V1 Acceptance Criteria" section at the bottom of this file. Tick each box. Any unchecked box → fix, commit, retry.

- [ ] **Step 16.2: Update project README**

Read `Projects/health-fat-loss/README.md`. Ensure every file listed exists, every existing file is listed, and the 2D+3D + AI-sphere + live-read capabilities are documented. CC-BY attribution preserved.

- [ ] **Step 16.3: Flip audit status**

In `specs/write-pattern-audit.md`, update the frontmatter to `status: complete-dashboard-live`. Append a closing entry:

```markdown
## V1 complete — 2026-04-13
- Dashboard live at `Projects/health-fat-loss/dashboard.html`
- All 4 tiles read from canonical markdown; all 4 quick-log forms write back
- `/health-status` confirms agent-side read-back integrity
```

- [ ] **Step 16.4: Final commit**

```bash
cd ~/Desktop/health-dashboard
git add Projects/health-fat-loss/README.md Projects/health-fat-loss/specs/write-pattern-audit.md
git commit -m "docs: V1 complete — README + audit status updated"
```

- [ ] **Step 16.5: Tag the V1 release**

```bash
cd ~/Desktop/health-dashboard
git tag -a v1.0-dashboard -m "V1 unified health dashboard"
git log --oneline v1.0-dashboard~20..v1.0-dashboard
```

Expected: ~18–22 commits from Phase 0 Task 1 through Phase 2 Task 16.

**Phase 2 DONE gate:**
- All acceptance criteria met
- `git tag` shows `v1.0-dashboard`
- README and audit doc reflect the live state

---

## Critical Files

| File | Role |
|---|---|
| `Projects/health-fat-loss/specs/dashboard-design.md` | NEW — design spec (Task 8) |
| `Projects/health-fat-loss/specs/write-pattern-audit.md` | NEW — agent-write audit + schema map + GLB + REST API notes (Tasks 1, 2, 4, 6, 16) |
| `Projects/health-fat-loss/dashboard.html` | NEW — the dashboard (Tasks 9–15) |
| `Projects/health-fat-loss/js/*.js` | NEW — modules: bodymap-2d, bodymap-3d, bodymap-toggle, readiness, tiles, ai-sphere, quicklog-forms, md-parser, obsidian-api |
| `Projects/health-fat-loss/tests/readiness.test.html` | NEW — readiness formula tests (Task 12) |
| `Projects/health-fat-loss/tests/md-parser.test.html` | NEW — markdown parser tests (Task 13) |
| `Projects/health-fat-loss/components/body-map-2d.html` | NEW — standalone 2D SVG component (Task 3b) |
| `Projects/health-fat-loss/components/rest-api-probe.html` | NEW — REST API diagnostic page (Task 6) |
| `Projects/health-fat-loss/assets/body-male.glb` | NEW — Sketchfab Gadzhiev GLB, CC-BY 4.0 (Task 4) |
| `Projects/health-fat-loss/data/muscle-facts.json` | NEW — LLM-cached muscle facts (Task 11) |
| `Projects/health-fat-loss/data/hotspot-coordinates.json` | NEW — 16–22 hotspot pins (Task 5) |
| `Data/health/training/nippard-program.json` | NEW — extracted 48-exercise database (Task 3a) |
| `Data/health/training/training-log.md` | EXISTING (empty skeleton) — populated by Training tile quick-log |
| `Data/health/nutrition/daily-log.md` | EXISTING — read by Nutrition tile; written by its quick-log |
| `Data/health/medications/{active-medications,compliance-log}.md` | EXISTING — read by Meds tile; compliance-log written by Meds quick-log |
| `Data/health/weekly-snapshots.md` | EXISTING — read by Body Comp tile; written by its quick-log |
| `Daily/YYYY-MM-DD.md` | EXISTING (Obsidian vault) — AI-sphere writes under `## Quick Log` |
| `plugins/health-agent/` (+ `~/.claude/plugins/local/health-agent/`) | EXISTING — audited in Phase 0; coexists via heading-PATCH |
| `Projects/health-fat-loss/nippard-training-hub.html` | DELETED in Phase 0 step 7 after extraction verified |
| `Projects/health-fat-loss/README.md` | UPDATED — new layout + 3D module + CC-BY attribution |
| `scripts/verify-nippard-extract.sh` | NEW — extraction verification (Task 3a) |

---

## Existing utilities to reuse

- **`/research-pipeline`** — already used for both research vectors
- **`frontend-design`** skill — primary scaffolding tool for the new dashboard
- **`/health-status`** command — verifies dashboard writes are agent-readable
- **Obsidian CLI** (`obsidian read`, `obsidian search`, `obsidian daily:append`) — fallback bridge for reads
- **48-exercise database** extracted to `Data/health/training/nippard-program.json` (Task 3a)
- **11-region 2D SVG body map** extracted to `Projects/health-fat-loss/components/body-map-2d.html` (Task 3b); inlined in `dashboard.html` (Task 9)
- **`<model-viewer>`** — CDN, no install
- **`gltf-pipeline`** (via `npx`) — Draco compression if GLB > 8 MB

---

## Verification — V1 Acceptance Criteria

After Task 16 completes, ALL must be true:

**Dashboard core:**
- [ ] Open `dashboard.html` → today's training, calorie progress, body weight trend, meds compliance render automatically from `Data/health/`
- [ ] Hero readiness card displays 0–100 score + traffic light; handles all-null input gracefully ("No Data" grey)
- [ ] Each domain tile has structured "+" log → writes to correct markdown file via Local REST API
- [ ] `/health` agent reads any data the dashboard wrote with no corruption (verified via `/health-status`)
- [ ] All reads + writes via Local REST API (no `file://`, no hardcoded paths in production script)
- [ ] Visual matches Airtable design tokens (Haas font with fallback, navy text, Airtable Blue CTAs, 12 px button radius, blue-tinted shadows)
- [ ] `tests/readiness.test.html` shows "29 passed, 0 failed"
- [ ] `tests/md-parser.test.html` shows "8 passed, 0 failed"

**Body map (2D + 3D toggle):**
- [ ] 2D SVG: 11 regions render; heatmap toggles Volume ↔ Recovery; clicking a muscle shows side panel with count + up to 6 primary exercises sorted by least-recently-trained
- [ ] 3D model: Sketchfab Gadzhiev GLB loads in `<model-viewer>` (≤ 8 MB after any compression)
- [ ] 3D mode: mouse-drag rotates, scroll zooms; 16–22 hotspot pins visible
- [ ] 3D hotspot click: tooltip shows muscle name + 1–2-sentence fact + "X exercise(s) in your program"; camera zooms to that area
- [ ] 2D / 3D toggle works; default mode = 2D; mode persists via `localStorage`
- [ ] Auto-rotate is OFF (no hotspot flicker)
- [ ] iOS Safari tap on AR button launches Quick Look successfully (if AR smoke test was run)
- [ ] CC-BY attribution visible in footer: "3D model: Ruslan Gadzhiev / Sketchfab · CC-BY 4.0"
- [ ] No JavaScript console errors

**AI-sphere FAB:**
- [ ] Animated blue sphere visible bottom-right on every page load
- [ ] Click → text input panel opens, textarea focused
- [ ] Submit → appends `- HH:MM — <text>` to today's `Daily/YYYY-MM-DD.md` under `## Quick Log` (creates the heading if missing)
- [ ] `Cmd/Ctrl+Enter` submits; `Escape` closes panel

**Cleanup:**
- [ ] Old `nippard-training-hub.html` deleted
- [ ] `Projects/health-fat-loss/README.md` updated to reflect new layout
- [ ] Design spec at `Projects/health-fat-loss/specs/dashboard-design.md` current and matches what was built
- [ ] Write-pattern audit marked `status: complete-dashboard-live`
- [ ] Git tag `v1.0-dashboard` exists at the final commit

---

## End-to-End User Flow (post-V1)

The user should be able to:

1. Open `dashboard.html` → see today's readiness, 4 domain tiles populated, body map (2D default).
2. Toggle to 3D → spin the body model with mouse drag → click "biceps" hotspot → see anatomy fact + "3 exercises in your program" → camera zooms to that area.
3. On iPhone, tap AR button → see life-size body model in their room via Quick Look.
4. Toggle back to 2D → click "biceps" region → side panel shows full list of primary biceps exercises sorted by recency.
5. Click the AI-sphere FAB → type "ate 200g chicken + rice for lunch" → confirm appended to `Daily/2026-04-13.md` under `## Quick Log`.
6. Click "+" on the Training tile → log a structured workout set → confirm it lands in `Data/health/training/training-log.md`.
7. Open Obsidian / run `/health-status` → confirm dashboard writes are visible to the `/health` agent without corruption.

---

## V2 progressive enhancements (NOT V1)

- **Trends surface** (separate view; needs ≥ 4 weeks of data)
- **Active alert banner** (missed med, missing weigh-in, no workout ≥ 4 d)
- **Exercise GIF/WebP library** (ExerciseDB pipeline + Gymvisual fallback)
- **AI-sphere voice input** (Web Speech API or Whisper)
- **AI-sphere LLM parsing** (NL → structured log entries routed to correct files)
- **Mobile responsive** layout
- **Wearable integration** (hero's null slots already wired — plug in source)
- **3D body model — female gender toggle** (download Gadzhiev female GLB, add gender selector)
- **Per-muscle named-mesh highlighting in 3D** (only if Z-Anatomy + Blender prep is ever justified)




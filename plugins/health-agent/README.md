---
type: plugin-docs
plugin: health-agent
version: 2.0.0
---

## Overview

Scheduled health accountability agent. Daily iMessage check-ins covering nutrition, training, and medication/supplement tracking. Uses an Opus orchestrator + Sonnet sub-agent architecture to separate reasoning from data work.

- **Orchestrator (Opus)**: `health-coach` — owns persona voice (Miss Adeline), cross-domain reasoning, user-facing responses, escalation handling, setup interviews, and sub-agent dispatch.
- **Sub-agents (Sonnet)**: `nutrition-tracker`, `training-tracker`, `health-tracker` — handle data logging, calculations, and pattern detection. They never talk to the user directly.

Sub-agents return structured results plus escalations to `health-coach`, which synthesizes everything into one persona-voiced message.

---

## Quick Start

1. Restart Claude Code to register the plugin.
2. Run `/health-setup` — Miss Adeline interviews you in-character to build your profile.
3. Configure training: `/health-setup --domain training`
4. Configure medications: `/health-setup --domain health`
5. Check-ins start automatically at your scheduled times via cron.

---

## Commands

| Command | Purpose |
|---|---|
| `/health-setup` | Adaptive onboarding interview |
| `/health-setup --reset` | Start onboarding over from scratch |
| `/health-setup --domain training\|health` | Configure a single domain |
| `/health <input>` | Log food, workouts, or meds |
| `/health check-in\|morning\|evening\|weekly\|status` | Trigger a specific check-in flow |
| `/health-status` | View today/week/month stats in terminal |
| `/health-status --html` | Generate a visual HTML dashboard |
| `/health-status --domain nutrition\|training\|health` | Scope to one domain |
| `/health-persona list` | List available personas |
| `/health-persona <name>` | Switch active persona |

---

## Architecture

### Agents

```
agents/
  health-coach.md        — Opus orchestrator. Persona voice, dispatch, cross-domain intelligence.
  nutrition-tracker.md   — Sonnet sub-agent. Meals, macros, meal library, daily/weekly rollups.
  training-tracker.md    — Sonnet sub-agent. Workouts, volume per muscle group, PRs, program adherence.
  health-tracker.md      — Sonnet sub-agent. Medication/supplement compliance, side effects, adherence patterns.
```

### Skill and References

```
skills/health-agent/
  SKILL.md                           — Master orchestration skill (all check-in flows)
  references/
    accountability-rules.md          — Fixed behavioral rules across all domains
    escalation-rules.md              — Ghost streak levels and domain-specific triggers
    training-rules.md                — Volume calc, RPE scale, progression models, PR detection
    health-tracking.md               — Medication compliance, side effects, GLP-1 coaching
    macro-estimation.md              — Macro estimation rules
    common-meals.md                  — Cuisine-specific macro reference
    setup-interview.md               — Question bank, adaptive flow, file generation templates
    personas/miss-adeline.md         — Persona: voice, catchphrases, escalation modulation, relationship weights
```

### Commands

```
commands/
  health.md              — /health
  health-setup.md        — /health-setup
  health-status.md       — /health-status
  health-persona.md      — /health-persona
```

---

## Vault Data Structure

All runtime data lives in `~/Desktop/The Vault/Data/health/`.

```
Data/health/
  profile.md                   — User identity, targets, active persona
  check-in-config.md           — Schedule, active domains, delivery method
  avoidance-metrics.md         — Ghost streak, response rate, escalation level
  excuse-log.md                — Categorized excuses with frequency
  weekly-snapshots.md          — Cross-domain weekly summaries

  nutrition/
    daily-log.md               — Day-by-day meal log with macros
    meal-library.md            — Known meals with cached macros
    dashboards/                — HTML dashboard exports

  training/
    program.md                 — Current training program and schedule
    training-log.md            — Session-by-session workout log
    weekly-volume.md           — Sets per muscle group per week
    exercise-library.md        — Known exercises + PR history

  medications/
    active-medications.md      — Current meds and doses (read-only by sub-agents)
    supplement-stack.md        — Supplements and timing (read-only by sub-agents)
    compliance-log.md          — Daily med/supplement compliance
    side-effects-log.md        — Reported side effects with severity
```

Sub-agents read from and write to their respective subfolders. `active-medications.md` and `supplement-stack.md` are read-only for sub-agents — only the user or `health-coach` modifies them.

---

## Check-in Flows

### Morning (9am via cron → iMessage)

1. `health-coach` reads `profile.md`, `check-in-config.md`, `avoidance-metrics.md`, active persona.
2. Dispatches all active sub-agents in parallel for morning context.
3. Composes one unified persona-voiced message covering all active domains.
4. Sends via iMessage.

### Evening (10pm via cron → iMessage)

1. Checks which domains have data logged today.
2. Only prompts for unlogged domains.
3. On Sundays: runs weekly rollup first, includes cross-domain summary in the message.

### Response Processing (when user replies to iMessage)

1. `health-coach` classifies which domains the reply touches.
2. Dispatches relevant sub-agents in parallel.
3. Handles escalations using Opus reasoning.
4. Returns one synthesized response with running totals, gap analysis, and any cross-domain observations.

---

## Key Concepts

**Ghost streak**: Consecutive days without responding to any check-in. Escalation levels 0–3 modulate persona intensity — a higher streak triggers sharper, less patient language.

**Relationship weights**: Seven dimensions (warmth, directness, humor, patience, celebration, crude intensity, gym enthusiasm) that adjust automatically based on interaction history. Stored in `profile.md`.

**Self-improving references**: After each session, `health-coach` appends to learning logs in the reference files. Logs have character caps — oldest entries rotate out when the cap is hit.

**Cross-domain intelligence**: Only `health-coach` has visibility across all three domains. Examples: injection day correlating with gym misses, poor sleep correlating with high appetite, training load changes affecting supplement timing.

**Escalation protocol**: Sub-agents flag edge cases as structured escalations (e.g., missed medication streak, unusually low calorie day, exercise that may indicate injury). `health-coach` receives these and decides how to address them — whether in the current message or flagged for follow-up.

---

## Migration from nutrition-agent

On first load, the plugin auto-detects existing `nutrition-agent` data and migrates it:

- Copies nutrition data to `Data/health/nutrition/`
- Generates `profile.md` from `persona-config.md`
- Creates placeholder `training/` and `medications/` files
- The old `nutrition-agent` plugin and its data are preserved — nothing is deleted

---

## File Permissions Summary

| File | health-coach | nutrition-tracker | training-tracker | health-tracker |
|---|---|---|---|---|
| `profile.md` | read/write | read | read | read |
| `check-in-config.md` | read/write | read | read | read |
| `avoidance-metrics.md` | read/write | — | — | — |
| `nutrition/daily-log.md` | read | read/write | — | — |
| `nutrition/meal-library.md` | read | read/write | — | — |
| `training/training-log.md` | read | — | read/write | — |
| `training/weekly-volume.md` | read | — | read/write | — |
| `training/exercise-library.md` | read | — | read/write | — |
| `medications/active-medications.md` | read/write | — | — | read |
| `medications/supplement-stack.md` | read/write | — | — | read |
| `medications/compliance-log.md` | read | — | — | read/write |
| `medications/side-effects-log.md` | read | — | — | read/write |

---
name: health-status
description: View current health stats, trends, and compliance across all domains
argument-hint: [today|week|month] [--html] [--domain nutrition|training|health]
---

# /health-status — Multi-Domain Health Dashboard

Parse `$ARGUMENTS` for time range (default: today), flags, and optional domain filter.

If `--html` flag is present, generate a visual HTML dashboard via `/frontenddesign` instead of terminal output. Save to `~/Desktop/The Vault/Data/health/nutrition/dashboards/` and open in browser.

If `--domain` is specified, show only that domain's data.

Read these files:
1. `~/Desktop/The Vault/Data/health/profile.md` — targets
2. `~/Desktop/The Vault/Data/health/check-in-config.md` — active domains
3. `~/Desktop/The Vault/Data/health/avoidance-metrics.md` — current state
4. `~/Desktop/The Vault/Data/health/nutrition/daily-log.md` — nutrition entries
5. `~/Desktop/The Vault/Data/health/training/training-log.md` — training entries
6. `~/Desktop/The Vault/Data/health/training/weekly-volume.md` — volume data
7. `~/Desktop/The Vault/Data/health/medications/compliance-log.md` — med compliance
8. `~/Desktop/The Vault/Data/health/weekly-snapshots.md` — trend data

Display in the terminal (NOT via iMessage):

**Today view:**
- **Nutrition**: Today's logged meals + macros, gap to targets
- **Training**: Today's session (if logged) or expected session (if gym day)
- **Health**: Today's medication/supplement compliance
- **Cross-domain**: Current escalation level, ghost streak, response quality

**Week view:**
- **Nutrition**: 7-day averages vs targets, compliance %, top meals
- **Training**: Sessions completed vs scheduled, PRs, volume per muscle group
- **Health**: Weekly medication/supplement compliance per item
- **Cross-domain**: Overall compliance trajectory, behavioral patterns

**Month view:**
- **All domains**: 4-week trend from weekly-snapshots.md
- **Trajectory**: Improving / stalling / declining per domain
- **Patterns**: Cross-domain correlations

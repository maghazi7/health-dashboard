## Pre-Test Checklist

- [ ] Restart Claude Code to pick up plugin
- [ ] Verify `/health`, `/health-setup`, `/health-status`, `/health-persona` appear in available commands
- [ ] Verify vault data directory exists: `~/Desktop/The Vault/Data/health/`
- [ ] Verify all 15 data files exist under `Data/health/`: `profile.md`, `check-in-config.md`, `daily-log.md`, `training-log.md`, `compliance-log.md`, `weekly-snapshots.md`, `avoidance-metrics.md`, `weekly-volume.md`, `exercise-library.md`, `meal-library.md`, `session-notes.md`, `macro-targets.md`, `progress-metrics.md`, `pr-log.md`, `supplements-log.md`
- [ ] Verify marketplace symlink in settings.json: `health-agent@local-marketplace`
- [ ] Verify plugin manifest: `~/.claude/plugins/local/health-agent/.claude-plugin/plugin.json`
- [ ] Verify iMessage MCP plugin is connected
- [ ] Verify reference files exist under `~/.claude/plugins/local/health-agent/skills/health-agent/references/`

---

## Command Tests

### /health-setup

**Full setup (first time)**
- [ ] Run: `/health-setup`
- [ ] Expect: Interview flow starts, asks about active domains, schedule preferences, persona selection
- [ ] Check: `Data/health/profile.md` created with `active-persona`, `active-domains`, `targets` fields populated
- [ ] Check: `Data/health/check-in-config.md` created with morning/evening times
- [ ] Check: Crons scheduled for morning and evening check-ins, Sunday weekly rollup
- [ ] Check: iMessage confirmation sent on setup completion

**Single domain — training**
- [ ] Run: `/health-setup --domain training`
- [ ] Expect: Interview scoped to training only (schedule, workout split, goals)
- [ ] Check: `profile.md` has `training` in `active-domains`, training-specific targets populated
- [ ] Check: `check-in-config.md` updated with training check-in schedule

**Single domain — health**
- [ ] Run: `/health-setup --domain health`
- [ ] Expect: Interview scoped to health only (medications, sleep, supplements)
- [ ] Check: `profile.md` has `health` in `active-domains`
- [ ] Check: `supplements-log.md` seeded with configured supplement list

**Reset**
- [ ] Run: `/health-setup --reset`
- [ ] Expect: Confirmation prompt before wiping, then full interview restarts
- [ ] Check: Data files are cleared or rewritten from scratch
- [ ] Check: Old crons removed, new crons scheduled after re-setup

**Common failures**
- Profile not created: check that `Data/health/` directory exists and is writable
- Crons not scheduled: verify CronCreate tool is available in agent tool list
- iMessage not sent: verify imessage MCP plugin is connected and allowlisted chat exists

---

### /health

**Nutrition input**
- [ ] Run: `/health had a protein shake and chicken tikka for lunch`
- [ ] Expect: Coach acknowledges, estimates macros using `macro-estimation.md` reference, updates running totals
- [ ] Check: `Data/health/daily-log.md` has new entry with date, meal description, estimated P/C/F/cal
- [ ] Check: Running daily totals reflect the new entry
- [ ] Check: If meal matches a common-meals entry, uses those values

**Training input**
- [ ] Run: `/health did upper B, 55 min, felt good`
- [ ] Expect: Coach acknowledges, asks for set details if not provided (or uses defaults from training-rules), notes session quality
- [ ] Check: `Data/health/training-log.md` has new entry with date, split, duration, perceived effort
- [ ] Check: `Data/health/weekly-volume.md` updated with set counts at the exercise level

**Medication/supplement input**
- [ ] Run: `/health took creatine and D3, forgot omega-3`
- [ ] Expect: Coach acknowledges compliant items, notes missed omega-3 without excessive guilt, updates compliance
- [ ] Check: `Data/health/compliance-log.md` updated with date, taken list, missed list
- [ ] Check: `Data/health/supplements-log.md` updated if applicable
- [ ] Check: Compliance percentage recalculated correctly

**Mixed input**
- [ ] Run: `/health had a shake, went to the gym for upper day, took all my supplements`
- [ ] Expect: All three sub-agents dispatched in parallel (nutrition-tracker, training-tracker, health-tracker)
- [ ] Check: `daily-log.md`, `training-log.md`, and `compliance-log.md` all updated in same session
- [ ] Check: Coach response acknowledges all three domains

**Morning check-in trigger**
- [ ] Run: `/health morning`
- [ ] Expect: Miss Adeline delivers morning check-in in character, references previous day's data, sets intention for the day
- [ ] Check: iMessage sent with morning check-in content
- [ ] Check: `session-notes.md` or `daily-log.md` updated with check-in record

**Evening check-in trigger**
- [ ] Run: `/health evening`
- [ ] Expect: Miss Adeline reviews the day's data, delivers summary with commentary, flags gaps
- [ ] Check: iMessage sent with evening summary
- [ ] Check: Compliance and macro summaries accurate for the day

**Common failures**
- Sub-agents not dispatching: check agent `tools:` frontmatter includes Read and Write
- Macro estimates way off: check `references/macro-estimation.md` — may need common meal corrections
- Wrong file updated: check agent body for correct data file paths

---

### /health-status

**Today view**
- [ ] Run: `/health-status`
- [ ] Expect: Summary of today's logged meals, workouts, and supplement compliance with running totals
- [ ] Check: Values match what is in `daily-log.md`, `training-log.md`, `compliance-log.md` for today

**Week view**
- [ ] Run: `/health-status week`
- [ ] Expect: 7-day summary across all active domains
- [ ] Check: Totals match sum of daily entries in log files for the current week
- [ ] Check: Training volume matches `weekly-volume.md`

**Domain filter**
- [ ] Run: `/health-status --domain nutrition`
- [ ] Expect: Only nutrition data shown (meals, macros, calorie running total)
- [ ] Check: Training and supplement data not included in response

**HTML dashboard**
- [ ] Run: `/health-status --html`
- [ ] Expect: Styled HTML dashboard generated via `/frontenddesign` skill
- [ ] Check: Dashboard file saved to `Research/reports/` (per HTML centralization rule)
- [ ] Check: Visual layout matches existing report design system (IBM Plex Mono + Newsreader, dark theme)

**Common failures**
- Totals wrong: check that log file format matches what the status parser expects
- HTML not generated: verify `/frontenddesign` skill is available and accessible

---

### /health-persona

**List personas**
- [ ] Run: `/health-persona list`
- [ ] Expect: Lists available personas (currently only Miss Adeline)
- [ ] Check: Active persona is marked in the list
- [ ] Check: Brief description of each persona shown

**Switch persona**
- [ ] Run: `/health-persona miss-adeline`
- [ ] Expect: Confirmation that Miss Adeline is now active (or already active)
- [ ] Check: `Data/health/profile.md` `active-persona` field updated to `miss-adeline`

**Common failures**
- Profile not updated: check that Write tool is in orchestrator's tool list
- Wrong persona name: verify slug matches filename in `references/personas/`

---

## Agent Behavior Tests

**Persona voice**
- [ ] Run several `/health` commands and read the responses
- [ ] Verify: Miss Adeline's catchphrases appear naturally, not forced
- [ ] Verify: Tone matches `references/personas/miss-adeline.md` — southern warmth, firm accountability
- [ ] Verify: She does not break character in technical edge cases (e.g., unknown meal)

**Escalation levels — manual test**
- [ ] Open `Data/health/avoidance-metrics.md` and manually set ghost streak to `0`
- [ ] Run: `/health morning` — expect: normal warm tone
- [ ] Set ghost streak to `1`, run `/health morning` — expect: slight concern, gentle nudge
- [ ] Set ghost streak to `2`, run `/health morning` — expect: noticeable shift in urgency
- [ ] Set ghost streak to `3`, run `/health morning` — expect: direct escalation language per `references/escalation-rules.md`
- [ ] Verify: Each level matches the rules defined in escalation-rules.md

**Sub-agent parallel dispatch**
- [ ] Run: `/health had eggs and coffee, did lower A, took all supplements`
- [ ] Verify: Response reflects all three domains processed
- [ ] Verify: All three log files updated in the same session
- [ ] Check `session-notes.md` or console output for evidence of parallel dispatch

**Cross-domain intelligence**
- [ ] Log low protein for 3 days in a row via `/health`
- [ ] Log a hard training session on day 3
- [ ] Run: `/health evening`
- [ ] Verify: Coach connects the low protein to training recovery in her commentary

**Escalation handling — unknown meal**
- [ ] Run: `/health had some random homemade stew I made`
- [ ] Verify: Coach does not fail or return an error
- [ ] Verify: She makes a reasonable estimate and flags uncertainty
- [ ] Verify: She asks for clarification or uses fallback values from `macro-estimation.md`

**Self-improvement / learning log**
- [ ] Run a session where you correct a macro estimate
- [ ] Check: `references/macro-estimation.md` or `references/common-meals.md` updated with correction
- [ ] Check: Correction persists in next session

---

## Data Integrity Tests

**Meal logging format**
- [ ] Log 3 different meals via `/health`
- [ ] Read `Data/health/daily-log.md`
- [ ] Verify: Each entry has date, timestamp, meal description, estimated P/C/F/cal
- [ ] Verify: Running daily totals at bottom of file or in a totals section update correctly
- [ ] Verify: No duplicate entries for same meal

**Workout logging format**
- [ ] Log a workout via `/health`
- [ ] Read `Data/health/training-log.md`
- [ ] Verify: Entry has date, split label, duration, exercises (if provided), effort rating
- [ ] Read `Data/health/weekly-volume.md`
- [ ] Verify: Set counts updated at the exercise level (not just session level)

**Compliance logging format**
- [ ] Log supplements with one missed via `/health`
- [ ] Read `Data/health/compliance-log.md`
- [ ] Verify: Entry has date, taken list, missed list, daily compliance percentage
- [ ] Verify: Running compliance percentage across recent days is correct

**Weekly rollup**
- [ ] Run: `/health evening` on a Sunday (or manually trigger rollup)
- [ ] Read `Data/health/weekly-snapshots.md`
- [ ] Verify: New weekly entry appended with summary of all domains
- [ ] Verify: Previous week's data not modified

**PR detection**
- [ ] Look up a current max in `Data/health/exercise-library.md` for any lift
- [ ] Log a session via `/health` with a weight above that max
- [ ] Read `Data/health/pr-log.md`
- [ ] Verify: New PR entry recorded with date, exercise, weight

**Meal library auto-population**
- [ ] Log the same meal (exact or near-exact phrasing) 3+ times across separate `/health` calls
- [ ] Read `Data/health/meal-library.md`
- [ ] Verify: Meal added with average macro values
- [ ] Run `/health` with that meal again and verify: coach uses the library values instead of re-estimating

---

## Automated Check-in Tests (Cron)

- [ ] Run `/health-setup` and confirm crons are reported as scheduled
- [ ] Verify cron entries exist (check `~/.claude/settings.json` or cron store for scheduled agents)
- [ ] At scheduled morning time: verify iMessage received with morning check-in from Miss Adeline
- [ ] At scheduled evening time: verify iMessage received with evening summary
- [ ] On Sunday at weekly rollup time: verify `weekly-snapshots.md` updated before evening check-in runs
- [ ] Manual morning trigger test: run `/health morning`, verify iMessage sent immediately
- [ ] Manual evening trigger test: run `/health evening`, verify iMessage sent immediately

---

## Edge Case Tests

**Empty data files**
- [ ] Clear `Data/health/daily-log.md` completely
- [ ] Run: `/health-status`
- [ ] Verify: Graceful response ("no data logged today"), no crash or error

**Vague input**
- [ ] Run: `/health I ate fine today`
- [ ] Verify: Coach asks for specifics rather than making up numbers
- [ ] Run: `/health went to the gym`
- [ ] Verify: Coach asks what split and how it went, does not log incomplete data

**Excuse handling**
- [ ] Run: `/health I was too busy to eat well`
- [ ] Verify: Miss Adeline acknowledges without dismissing, pivots to accountability without shaming
- [ ] Run: `/health wasn't hungry so I skipped lunch`
- [ ] Verify: Coach flags this based on `accountability-rules.md` without excessive lecturing

**Ghost behavior (multi-day)**
- [ ] Do not run any `/health` commands for 3+ days
- [ ] Run: `/health morning` after the gap
- [ ] Verify: `avoidance-metrics.md` ghost streak reflects the actual days missed
- [ ] Verify: Escalation level in the response matches the streak level

**Target adjustment**
- [ ] Update protein target in `Data/health/macro-targets.md`
- [ ] Run: `/health` to trigger coach reading the file
- [ ] Verify: Coach acknowledges the new target
- [ ] Update protein target a second time within 14 days
- [ ] Verify: Coach surfaces a warning about frequent target changes per `accountability-rules.md`

**Migration from old nutrition data**
- [ ] Delete or rename `Data/health/` directory
- [ ] Verify: Plugin checks for `Data/nutrition/` as fallback
- [ ] Verify: Auto-migration runs and moves files to `Data/health/`
- [ ] Verify: Old `Data/nutrition/` directory is either archived or left untouched

---

## Feedback Collection

Use this template after each test session. Copy, fill in, and append to a running notes file or paste into a session log.

```markdown
## Test Session: YYYY-MM-DD

### What Worked
- [specific behavior that worked correctly]

### What Broke
- [specific failure with reproduction steps]
- File: [which file needs fixing]
- Expected: [what should happen]
- Actual: [what happened]

### Persona Quality
- In character? [yes/no/partially]
- Voice natural? [yes/no — note specific awkward phrases]
- Escalation appropriate? [yes/no — too harsh/too soft]
- Cross-domain observations? [yes/no — missed opportunities]

### Data Accuracy
- Macro estimates accurate? [yes/no — note specific corrections]
- Running totals correct? [yes/no]
- Compliance calculations correct? [yes/no]

### UX Issues
- Response too long/short? [specific examples]
- Missing information in responses? [what was missing]
- Unnecessary information? [what should be removed]

### Suggested Changes
- [specific change with rationale]
```

---

## Update Workflow

Changes take effect at different times depending on what you edit. No restart needed unless noted.

| What to change | File to edit | Restart needed? |
|---|---|---|
| Persona voice, catchphrases | `skills/health-agent/references/personas/miss-adeline.md` | No |
| Accountability rules | `skills/health-agent/references/accountability-rules.md` | No |
| Escalation rules | `skills/health-agent/references/escalation-rules.md` | No |
| Macro estimates | `skills/health-agent/references/macro-estimation.md` | No |
| Common meals | `skills/health-agent/references/common-meals.md` | No |
| Training logic | `skills/health-agent/references/training-rules.md` | No |
| Health tracking logic | `skills/health-agent/references/health-tracking.md` | No |
| Agent tool access or task routing | `agents/` (any agent file) | No |
| Data file paths in agents | `agents/` (agent body) | No |
| Main skill behavior | `skills/health-agent/SKILL.md` | No |
| Command flags or help text | `commands/` | **Yes** |
| Plugin manifest or marketplace registration | `.claude-plugin/plugin.json` | **Yes** |
| Vault data (direct corrections) | `~/Desktop/The Vault/Data/health/` | No |

After a Claude Code restart, re-run the pre-test checklist to confirm the plugin reloaded correctly.

---

## Test Priority Order

Run in this order for first-time setup. Each step depends on the one before it.

1. - [ ] Pre-test checklist (plugin loads, files exist)
2. - [ ] `/health-setup` full setup
3. - [ ] `/health` with nutrition input
4. - [ ] `/health-status` today view (verify nutrition was logged)
5. - [ ] `/health` with training input
6. - [ ] `/health` with medication/supplement input
7. - [ ] `/health` with mixed input (verify parallel dispatch)
8. - [ ] `/health morning` and `/health evening` manual triggers
9. - [ ] Escalation testing (manually set ghost streak, re-run morning check-in)
10. - [ ] Edge cases (vague input, empty files, excuse handling)
11. - [ ] Cron scheduling verification (last — depends on everything else working)

---

## Known Limitations

- Training and health domains start unconfigured. Run `/health-setup --domain training` and `/health-setup --domain health` before testing those flows.
- Cron scheduling requires the CronCreate tool to be available in the orchestrator's tool list. If crons are not created after setup, verify tool access.
- iMessage delivery requires the imessage MCP plugin to be connected and the target chat to be in the allowlist.
- HTML dashboard generation via `/health-status --html` requires the `/frontenddesign` skill to be available.
- Only Miss Adeline exists as a persona. `/health-persona list` will only show one entry. `/health-persona switch` is limited until additional personas are built.
- Weekly rollup in `weekly-snapshots.md` is only meaningful after 7+ days of logged data. Before that, the snapshot will be sparse.
- PR detection requires `exercise-library.md` to have baseline values for each lift. On first use, there are no PRs to beat — seed the file manually or let it populate over time.

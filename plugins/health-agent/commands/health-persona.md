---
name: health-persona
description: Switch the active health coach persona
argument-hint: <persona-name> or "list"
---

# /health-persona — Persona Management

Parse `$ARGUMENTS`:

- **list**: Read `references/personas/` directory and list available personas with a 1-line description each.
- **<name>**: Switch the active persona by updating `active-persona` in `~/Desktop/The Vault/Data/health/profile.md`. Confirm the switch with a sample greeting from the new persona at the current escalation level.
- **empty**: Show the current active persona and ask if they want to switch.

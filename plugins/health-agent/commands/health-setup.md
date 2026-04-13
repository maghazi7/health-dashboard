---
name: health-setup
description: Run the adaptive health profile setup interview. The active persona conducts the interview in-character.
argument-hint: [--reset] [--domain nutrition|training|health]
---

# /health-setup — Adaptive Onboarding Interview

Parse `$ARGUMENTS`:

- **No args**: Full interview (first time) or inform if profile already exists
- **--reset**: Wipe all `Data/health/` files and re-run the full interview from scratch
- **--domain nutrition|training|health**: Re-run only the specified domain's questions, keeping other profile data intact

Load the health-agent skill and execute the setup interview flow (type: setup).

The active persona conducts the interview — not a clinical form. The persona reads `references/setup-interview.md` for the question bank and adaptive rules, but uses its own voice and judgment for pacing, grouping, and tone.

---
name: health
description: Log food, workouts, or medications, or interact with your health coach
argument-hint: <what you ate / did / took> or "check-in" or "status"
---

# /health — Manual Health Interaction

Parse `$ARGUMENTS`:

- If it contains food descriptions → process as a response (type: response) using the health-agent skill — nutrition domain
- If it contains workout/gym descriptions → process as a response (type: response) — training domain
- If it contains medication/supplement mentions → process as a response (type: response) — health domain
- If it contains mixed content → process as response — multiple domains detected, dispatch accordingly
- If it says "check-in" or "morning" or "evening" → run the appropriate check-in flow
- If it says "status" → redirect to /health-status
- If it says "weekly" → run the weekly rollup
- If it says "setup" → redirect to /health-setup
- If empty → ask what they want to do

Load the health-agent skill and execute the appropriate flow.

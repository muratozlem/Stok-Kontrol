---
name: Expo Web Build Pattern
description: How to build and serve the Expo web app in this Replit environment
---

`expo start --web` permanently broken (Metro/freeport-async bug). Always use export+serve:

**Build:** `cd expo && bunx expo export -p web --output-dir dist`
- Takes ~2 minutes (2500+ modules)
- Must be run synchronously (not backgrounded) to avoid OOM kills
- Kill all existing processes first if Metro is already running

**Serve:** Workflow command: `cd expo && bunx serve dist -l 5000 --single`
- `--single` enables SPA routing (all paths serve index.html)

**Why not background:** Background builds get killed by OOM or SIGKILL before completing. Run synchronously with `timeout=120000`.

**Why kill first:** Multiple bun/metro processes fight for memory and cause stalls at ~67%.

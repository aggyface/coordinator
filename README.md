# LabCoordinator

A desktop-friendly web app for microscopy researchers to transfer sample
coordinates between multiple analytical instruments with different coordinate
systems.

## Setup

```bash
npm install
node scripts/generate-test-project.js   # generate test .labcoord for UI testing
sh scripts/setup-hooks.sh               # install git pre-commit guard
npm run dev                             # start dev server at localhost:5173
```

## Verification

```bash
node scripts/verify-engine.js   # run transform engine tests (must pass before committing)
npm run build                   # production build
```

## Working with gemini-cli

```bash
cd labcoordinator
gemini                  # GEMINI.md loads automatically
/memory show            # verify project context is loaded
/stats model            # check daily quota before long sessions
/restore                # list checkpoints if you need to roll back
```

## Documentation

| File | Purpose |
|---|---|
| `GEMINI.md` | Architectural rules — gemini-cli reads this automatically |
| `BRIEF.md` | Full specification — data model, component specs, build prompts |
| `IMPLEMENTATION_PLAN.md` | Build order and phase summary |

## Tech Stack

React · Vite · HTML5 Canvas · jszip · papaparse · bmp-js · utif

No backend. Fully client-side. Saves to local `.labcoord` ZIP files.

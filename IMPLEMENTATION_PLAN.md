# Implementation Plan: LabCoordinator

> See `BRIEF.md` for full specification. See `GEMINI.md` for architectural mandates.
> This file is the high-level build summary — use it to orient a new session quickly.

---

## 1. Rationale & Approach

- **No over-engineering.** Client-side React app for a working scientist. No
  enterprise boilerplate, no cloud services, no forced changelogs.
- **Strict separation of concerns.** Math lives purely in `src/engine/transform.js`
  (pure functions, no React). State lives purely in `src/hooks/useSession.js`.
  Components handle rendering and events only.
- **Derived state is never stored.** Reference status, calculated coordinates,
  and CSV type column are all derived at runtime — never persisted.
- **Tech stack:** ES2022 JavaScript, React (Vite), standard CSS. No TypeScript.
  No component libraries. No backend.
- **Data persistence:** Browser File API writes local `.labcoord` ZIP files.

---

## 2. Infrastructure (Pre-Build)

Complete these before any app code. Each is a self-contained gemini-cli session.

| Step | File | Purpose |
|---|---|---|
| Infra 1 | `scripts/verify-engine.js` | Standalone math validation — 32 named test cases |
| Infra 2 | `scripts/generate-test-project.js` | Generates dummy `.labcoord` for UI testing |
| Infra 3b | `.git/hooks/pre-commit` + `scripts/setup-hooks.sh` | Blocks commits if engine tests fail |

---

## 3. Build Phases

| Prompt | Scope | Verify with |
|---|---|---|
| 0 | Vite scaffold, deps, component stubs, git hook | `npm run dev` — zero console errors |
| 1 | `transform.js` — full engine + validation functions | `node scripts/verify-engine.js` — all pass |
| 2 | `useSession.js` — reactive state, derived reference status | verify-engine still passes |
| 3a | Image decode (BMP/JPG/TIFF), fit-to-window | Load test `.labcoord`, image shows |
| 3b | Zoom/pan (scroll, space+drag, middle mouse) | Smooth interaction, no jitter |
| 3c | Point overlay, markers, hull, scale bar, ghost marker | Markers visible, colors correct |
| 3d | Click handling per mode, PiP window | Select/AddPoint/Navigate clicks correct |
| 4 | `PointModal`, `PointList` — coordinate table design | Enter coords, table updates |
| 5 | `InstrumentQualityPanel`, `TagDrawer`, `Toolbar` | Instruments, tags, color-by |
| 6 | `NavigatePanel` — filters, PiP, dot indicator, notes | Step through all points |
| 7 | CSV export, annotated PNG export (OffscreenCanvas Web Worker) | Export files open correctly |
| 8 | Welcome screen, `NewProjectModal`, save/load, polish | Full end-to-end smoke test |

---

## 4. Session Start Template (Infra 3)

Paste at the start of every gemini-cli session:

```
We are working on [PROMPT NAME] for the LabCoordinator project.

Before starting:
1. Read GEMINI.md in this repo
2. Read the [SECTION] section of BRIEF.md
3. Run node scripts/verify-engine.js — confirm all tests pass

Scope: [PASTE PROMPT TEXT FROM BRIEF.md]

Constraints:
- Do not modify transform.js unless this prompt requires it
- Do not modify useSession.js unless this prompt requires it
- Do not refactor files outside this prompt's scope
- Run node scripts/verify-engine.js again when done

Ready? Start by reading GEMINI.md.
```

---

## 5. Rollback Strategy

gemini-cli checkpoints before every file edit:
- `/restore` — list available snapshots
- `/restore <n>` — roll back to before bad edits

If session is already closed: `git revert` to last commit.
Each completed prompt should be committed immediately as a permanent checkpoint.

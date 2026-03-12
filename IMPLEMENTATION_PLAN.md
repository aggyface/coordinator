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

---

## 6. Project Post-Mortem & Architecture Review

### Architectural Successes
1. **Isolated Math Engine (`transform.js`):** Building the least-squares similarity transform as a set of pure, framework-agnostic functions was highly successful. It allowed us to write a standalone Node.js verification script (`verify-engine.js`) that proved the math against real-world Excel data before a single React component was written. This established absolute trust in the core logic.
2. **Derived State Supremacy:** By strictly adhering to the rule "Derived state is never stored," we eliminated an entire category of desynchronization bugs. A point's "Reference" status is dynamically determined by the presence of `enteredCoords`, and all transformations are calculated on the fly in `useSession.js` via `useMemo`. This made the UI incredibly resilient to data edits.
3. **OffscreenCanvas Export:** Delegating the high-resolution annotated image generation to a Web Worker (`exportWorker.js`) was essential. Drawing hundreds of markers onto a 250MB ImageBitmap on the main thread would have frozen the UI. The background worker ensures a smooth experience.

### Challenges & Adaptations
1. **Small-Sample Statistics:** The original spec required flagging a transform as "blocked" if the RMSE was > 10x the median residual. During testing, we discovered that in a 4-point least-squares fit, a single massive outlier distorts the entire fit so heavily that *all* residuals become large, rendering the median-based ratio ineffective (yielding a ratio of ~1.02 instead of >10).
    *   *Adaptation:* We updated the engine to explicitly use "Leave-One-Out" (LOO) residual analysis to identify specific errors (e.g., "Likely X/Y axis swap" or "Misplaced point"). These specific diagnoses are now surfaced in the UI.
2. **React Layout Frustrations:** Complex nesting of Flexbox containers led to the classic "constricted grey frame" bug where the canvas refused to expand.
    *   *Adaptation:* Implemented strict `min-height: 0` and `flex: 1` boundaries on parent containers to ensure the `ImageCanvas` correctly consumed all available viewport space.
3. **Data Onboarding:** Initial UAT revealed that jumping straight to a "New Project" modal confused users if they hadn't loaded an image yet. 
    *   *Adaptation:* We refined the startup flow. The app now loads into a "Ready" state, allowing users to Open an image first, which then seamlessly triggers the project initialization modal. Extensive UI hints and onboarding text were added to empty states.

---

## 7. Current Known Issues (Pending Scientific Verification)

### Scale Bar & Proxy Derivation Precision
Currently, the scale bar and the "Pixel Proxy" estimates (displayed in grey italics) rely on calculating a global pixels-per-unit ratio derived from the linear distance between reference points. 

**The Problem:** In scenarios involving significant image rotation, sheer, or differing aspect ratios between the image capture hardware and the secondary instrument stage, this linear Euclidean distance calculation can introduce scale drift, resulting in inaccurate proxy coordinate predictions.

**Required Action:** 
To repair the scaling issue, we require more accurate empirical data from the instruments. 
1. **Data Needed:** Calibration grid mappings or specific known-distance stage movements.
2. **Potential Fixes:** 
    - Decouple the X-axis and Y-axis scaling factors (calculating scale independently for each vector).
    - If the instruments demonstrate severe non-uniform scaling, we may need to upgrade the mathematical engine from a **Similarity Transform** (Rotation + uniform Scale + Translation) to a full **Affine Transform** (Rotation + independent X/Y Scale + Sheer + Translation).

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

---

## 3. Build Phases

| Prompt | Scope | Verify with |
|---|---|---|
| 0 | Vite scaffold, deps, component stubs | `npm run dev` — zero console errors |
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

## 6. Project Post-Mortem & Architecture Review

### Architectural Successes
1. **Isolated Math Engine (`transform.js`):** Building the least-squares similarity transform as a set of pure, framework-agnostic functions was highly successful. It allowed us to write a standalone Node.js verification script (`verify-engine.js`) that proved the math against real-world Excel data before a single React component was written. This established absolute trust in the core logic.
2. **Derived State Supremacy:** By strictly adhering to the rule "Derived state is never stored," we eliminated an entire category of desynchronization bugs. A point's "Reference" status is dynamically determined by the presence of `enteredCoords`, and all transformations are calculated on the fly. This made the UI incredibly resilient to data edits.
3. **Atomic State Resets:** During UAT, we discovered that simple state resets left artifacts between different samples. We implemented an "Atomic Create" method in `useSession.js` that wipes points, instruments, and image buffers in a single operation, enabling a professional multi-sample workflow.
4. **Persistent File Access:** Integrating the **File System Access API** allowed for a true "Save" (overwrite) vs "Save As" workflow, behaving like a desktop application rather than a simple web downloader.

### Challenges & Adaptations
1. **Small-Sample Statistics:** The original spec required flagging a transform as "blocked" if the RMSE was > 10x the median residual. During testing, we discovered that in a 4-point least-squares fit, a single massive outlier distorts the entire fit so heavily that the median-based ratio is ineffective.
    *   *Adaptation:* We updated the engine to explicitly use **Leave-One-Out (LOO) residual analysis** to identify specific errors like "Likely X/Y axis swap".
2. **Export Encoding:** CSV exports originally corrupted the `µm` symbol in Excel.
    *   *Adaptation:* Implemented Byte Order Mark (BOM) prepending to the CSV blob, ensuring UTF-8 compatibility with Microsoft Excel.
3. **Large-Scale Rendering:** Rendering 250MB microscopy assets was freezing the UI during export.
    *   *Adaptation:* Delegated the annotated image generation to an **OffscreenCanvas Web Worker**, ensuring the live interface remains responsive.

---

## 7. Current Known Issues (Pending Scientific Verification)

### Scale Bar & Proxy Derivation Precision
Currently, the scale bar and the "Pixel Proxy" estimates (displayed in grey italics) rely on calculating a global pixels-per-unit ratio derived from the linear distance between reference points. 

**The Problem:** In scenarios involving significant image rotation, sheer, or differing aspect ratios between the image capture hardware and the secondary instrument stage, this linear Euclidean distance calculation can introduce scale drift.

**Required Action:** 
To repair the scaling issue, we require more accurate empirical data from the instruments. 
1. **Data Needed:** Calibration grid mappings or specific known-distance stage movements.
2. **Potential Fixes:** 
    - Decouple the X-axis and Y-axis scaling factors.
    - Upgrade the math engine to a full **Affine Transform** if non-uniform scaling is confirmed.

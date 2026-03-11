# Implementation Plan: LabCoordinator (Bespoke Scientific Build)

## 1. Rationale & Approach
- **No Over-engineering:** We are building a client-side React app for a working scientist. No enterprise boilerplate, no complex logging services, no forced CHANGELOGs.
- **Strict Separation of Concerns:** Math lives purely in `src/engine/transform.js`. State lives purely in `src/hooks/useSession.js`. Components handle rendering and events.
- **Tech Stack:** ES2022 JavaScript, React (Vite), standard CSS. No TypeScript. No component libraries. No backends.
- **Data Persistence:** The File API writes local `.labcoord` ZIP files.

## 2. Infrastructure (Pre-Build)
- **Infra 1:** Write `scripts/verify-engine.js` (Standalone math validation).
- **Infra 2:** Write `scripts/generate-test-project.js` (Creates dummy `.labcoord` for testing UI without manual entry).
- **Infra 3:** Implement git pre-commit hook to block commits if `verify-engine.js` fails.

## 3. Implementation Phases
- **Prompt 0: Scaffold:** Vite setup, dependency installation (`jszip`, `papaparse`, `bmp-js`, `utif`), component stubbing.
- **Prompt 1: Transform Engine:** Implement the core least-squares similarity transform math and validation rules. Must pass the verification script.
- **Prompt 2: State Management:** Implement `useSession.js` for reactive data flow, deriving reference status directly from `enteredCoords`.
- **Prompt 3: Interactive Canvas:** Image decoding/caching, semantic zoom/pan, marker overlay, and mode-specific click behaviors.
- **Prompt 4 & 5: Core UI:** `PointModal`, `PointList`, `InstrumentQualityPanel`, and the `TagDrawer` slide-in.
- **Prompt 6 & 7: Polish & Export:** `NavigatePanel` (PiP), CSV export, annotated high-res PNG export using an OffscreenCanvas Web Worker.
- **Prompt 8: Welcome Flow:** Drag-and-drop file detection and "New Project" modal configuration.

## 4. Verification
- Math logic is verified constantly via `node scripts/verify-engine.js`.
- UI interactions are verified iteratively by loading the dummy `.labcoord` generated in Infra 2.

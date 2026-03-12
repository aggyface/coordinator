# LabCoordinator

A specialized, desktop-friendly web application for microscopy researchers. LabCoordinator bridges the gap between disparate analytical instruments (e.g., Optical Microscope → SEM → EPMA) by allowing users to map points of interest on a high-resolution image and dynamically calculate coordinate transformations using a least-squares similarity mathematical model.

## Core Capabilities

- **High-Performance Canvas:** Navigate massive microscopy assets (BMP, TIFF, JPG) using a hardware-accelerated canvas featuring semantic pan/zoom (up to 50x) and pixel-perfect marker rendering.
- **Scientific Math Engine:** Pure functional implementation of Least-Squares Similarity Transforms. Includes outlier detection and geometric degeneracy warnings (e.g., collinearity or tight clustering).
- **Reactive Workflow:** Zero "stale state" bugs. The application never stores derived coordinates. Transforms and target estimates are calculated on the fly as reference data is entered.
- **"Navigate" Mode:** A specialized view for the active laboratory setting. Features a Picture-in-Picture (PiP) viewport, tag-based filtering, and a progress tracker to systematically step through analysis targets.
- **Publication-Ready Export:** 
  - **Data:** Unit-aware CSV exports with explicit reliability flagging (Manual vs Calculated vs Proxy) and BOM encoding for Excel compatibility.
  - **Visuals:** High-resolution annotated PNG export processed via Web Workers, ensuring the main UI remains responsive during heavy renders. Includes dynamic legends and scale bars.

## Project Setup

This application is designed as a bespoke, fully client-side tool. It requires no backend database or cloud infrastructure, ensuring data privacy and offline capability in restricted laboratory environments.

```bash
# 1. Install dependencies
npm install

# 2. Start the local development server
npm run dev

# 3. Open your browser to http://localhost:5173
```

## The Scientific Workflow

1. **Initialize:** Open the app and create a New Project. Define your primary "Source Instrument" (e.g., SEM) and its units.
2. **Load Asset:** Click `Open` to load your baseline microscopy image (e.g., a `.bmp` file).
3. **Stage Targets:** Switch to `Add Point` mode. Click features on the image to place markers (yellow ◎).
4. **Calibrate:** Switch to `Select` mode. Click at least 3 distinct, widely-spaced markers and enter their known coordinates for your Source Instrument. They will convert to references (cyan ◆).
5. **Chain Instruments:** Use the sidebar to `+ Add` a secondary instrument (e.g., EPMA). Enter coordinates for your reference points in this new system. The app will immediately calculate the RMSE and transform quality.
6. **Execute:** Switch to `Navigate` mode while sitting at the secondary instrument. Use the calculated "Proxy" coordinates and the PiP view to locate your uncalibrated targets. Mark them as "Analysed" as you proceed.
7. **Archive:** Click `Save` to bundle the image and session data into a portable `.labcoord` ZIP file.

## Current Known Issues

### 1. Scale Bar & Proxy Derivation Precision
Currently, the scale bar and the "Pixel Proxy" estimates rely on calculating a global pixels-per-unit ratio derived from the distance between reference points. In scenarios involving significant image rotation, sheer, or differing aspect ratios between the image capture and the instrument stage, this linear distance calculation can introduce scale drift. 

**Required Action:** To repair the scaling issue, we require more accurate empirical data from the instruments (specifically, calibration grids or known-distance stage movements) to decouple the X-axis and Y-axis scaling factors, or to move from a Similarity Transform to a full Affine Transform model if the instruments demonstrate non-uniform scaling.

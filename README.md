# LabCoordinator

A specialized, desktop-friendly web application for microscopy researchers.

## 🚀 How to Use (For Students & Researchers)

You do **not** need to install anything to use this tool. Simply open the link below in Chrome or Edge:

👉 **[https://aggyface.github.io/coordinator/](https://aggyface.github.io/coordinator/)**

---

## 🛠 For Project Owners (Deployment)

To update the live website with your latest changes:

1.  **Build the project:**
    ```bash
    npm run build
    ```
2.  **Deploy to GitHub:**
    ```bash
    npm run deploy
    ```
    *The app will be updated at the URL above within a few minutes.*

---

## Core Capabilities

- **High-Performance Canvas:** Navigate massive microscopy assets (BMP, TIFF, JPG) with semantic pan/zoom (up to 50x).
- **Scientific Math Engine:** Least-Squares Similarity Transforms with outlier detection and geometric warnings.
- **"Navigate" Mode:** Specialized view for lab workflows featuring PiP viewport and progress tracking.
- **Export:** Unit-aware CSVs and high-resolution annotated PNGs.

## The Scientific Workflow

1. **Initialize:** Click `New` to name the project and define your source instrument.
2. **Load Image:** Click `Open` to load your baseline microscopy image.
3. **Stage Targets:** Use `Add Point` mode to place markers (yellow ◎).
4. **Calibrate:** Use `Select` mode to enter instrument coordinates for at least 3 markers (cyan ◆).
5. **Add Instrument:** Use the sidebar to add your target instrument (e.g., EPMA).
6. **Execute:** Switch to `Navigate` mode to find your targets using the calculated "Proxy" coordinates.
7. **Export:** Use `CSV` or `Image` buttons to save your results.

## Technical Post-Mortem & Known Issues
See `IMPLEMENTATION_PLAN.md` for a detailed architectural review and notes on the current scaling drift issue.

# LabCoordinator

A high-precision coordinate transformation tool for microscopy researchers. LabCoordinator bridges the gap between disparate analytical instruments (e.g., Optical Microscope → SEM → EPMA) by allowing users to map points of interest on a high-resolution image and dynamically calculate coordinate transformations using a least-squares similarity mathematical model.

---

## 🚀 Instant Access (Online & Offline)

### 1. Direct Web Link
Simply open the link below in Chrome or Edge. The app runs entirely in your browser; your lab data never leaves your computer.
👉 **[https://aggyface.github.io/coordinator/](https://aggyface.github.io/coordinator/)**

### 2. Standalone USB Version
For lab computers with no internet access:
1. Copy the `dist/index.html` file to a USB stick.
2. Double-click the file on any computer to open the app instantly.

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

## 🛠 The Scientific Workflow (Step-by-Step)

### Phase 1: Project & Asset Setup
1.  **Initialize:** Click `New` in the top toolbar. Enter your **Project Name** and **Sample ID**.
2.  **Source Instrument:** Define your baseline instrument (e.g., SEM) and its unit system (µm, mm, or Custom).
3.  **Load Image:** Click `Open` and select your microscopy asset (BMP, TIFF, JPG). A "Loading..." screen will appear while the asset is processed.

### Phase 2: Feature Mapping
4.  **Place Targets:** Switch to **Add Point** mode. Click features on the image to place markers (yellow ◎).
5.  **Calibrate Source:** Switch to **Select** mode. Click a marker and enter its verified coordinates for your **Source Instrument**. Once 3 points have coordinates, they become **References (cyan ◆)**.
6.  **Verify Baseline:** Check the sidebar for the Source Instrument. Since this is the baseline, precision is perfect, and coordinates appear in Cyan.

### Phase 3: Instrument Transformation
7.  **Add Target Instrument:** Click `+ Add` in the sidebar. Select your target instrument (e.g., EPMA) and choose the Source Instrument from the "Transform From" dropdown.
8.  **Enter References:** Enter the coordinates for your cyan reference points in the new instrument's coordinate system.
9.  **Monitor Quality:** The sidebar will display the **RMSE (Root Mean Square Error)**. If the value turns **RED**, check for "Likely X/Y axis swaps" or misplaced points in the alert box.

### Phase 4: Execution & Navigation
10. **Analyze Targets:** Switch to **Navigate** mode while at the target instrument.
11. **Use Proxies:** For uncalibrated targets, the app will show **grey italic** estimated coordinates derived from the transform.
12. **Track Progress:** Mark features as "Analysed" using the checkbox. A green checkmark (✓) will appear in the main list.

### Phase 5: Export & Archive
13. **Data Export:** Click `CSV` to download a detailed table including a "Reliability" column (Verified vs Transform vs Proxy).
14. **Visual Export:** Click `Image` to generate a high-resolution PNG with all markers, labels, legends, and scale bars perfectly overlaid.
15. **Save Project:** Click `Save` to bundle everything into a portable `.labcoord` file.

---

## ⌨️ Keyboard & Navigation Shortcuts

| Action | Shortcut |
| :--- | :--- |
| **Pan Image** | `Arrow Keys` or `Middle-Mouse Drag` |
| **Zoom In/Out** | `+` / `-` or `Scroll Wheel` |
| **Reset View** | `0` (Zero) — Fits image to screen |
| **Quick Center** | Click the `◎` button next to any point in the list |

---

## ⚠ Technical Notes & Known Issues

### Coordinate Reliability Colors
- **Cyan:** Verified Manual entry or Inside the reference hull (Highest Reliability).
- **Yellow:** Near or just outside the reference hull (Extrapolated).
- **Red:** Far from references (Unreliable).

### Scaling Drift
The current "Pixel Proxy" logic uses a linear Euclidean distance model. In cases of significant image sheer or non-uniform instrument stage scaling, slight drift may occur. For maximum precision, always ensure your analysis targets are contained **inside** the cyan dashed boundary (the Convex Hull) of your reference points.

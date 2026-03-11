# Implementation Plan: LabCoordinator (Detailed Architecture Guide)

## Objective
Build **LabCoordinator**, a desktop-friendly, client-side web application for microscopy researchers. The app allows researchers to load large stitched microscopy images, visually place points of interest, and automatically calculate the complex mathematical transformations needed to find those same points on different analytical instruments (which have different coordinate systems).

This document serves as both a roadmap and an architectural guide, explaining *why* we are making specific technical choices to ensure the program is robust, reliable, and maintainable.

---

## 1. Architectural Foundation & Framework

### The Framework: React scaffolded with Vite
* **What it is:** React is a library for building user interfaces using discrete, reusable "components". Vite is a modern, extremely fast build tool that bundles our code for the browser.
* **Why this choice:** React's component model allows us to break down complex UI (like a sidebar, a canvas, and modal popups) into isolated, manageable pieces. Vite provides instant feedback during development (hot module replacement), which drastically speeds up the building process compared to older tools like Webpack.
* **Reliability benefit:** By organizing UI into components, a bug in the "Add Point" panel is isolated and less likely to crash the "Canvas" rendering.

### Styling: Plain CSS / CSS Modules
* **What it is:** Using standard Cascading Style Sheets (CSS), scoped locally to individual components using CSS Modules, rather than a large utility framework like Tailwind.
* **Why this choice:** As per our project mandates, the focus is on functionality over aesthetics. CSS Modules automatically generate unique class names (e.g., `PointModal_button_x8f9a`). 
* **Reliability benefit:** This prevents "style leaking" where a CSS rule written for one button accidentally changes the appearance of a completely unrelated button elsewhere in the app. It ensures encapsulation.

---

## 2. Core Engine & State Management

### The Core Engine: Pure Functional JavaScript (`src/engine/transform.js`)
* **What it is:** The mathematical heart of the app that handles Least-Squares Similarity Transforms. It is written as "pure functions"—functions that take inputs, do math, and return outputs without changing any outside state or interacting with the UI.
* **Why this choice:** Coordinate math is the most critical part of this application; a wrong calculation wastes expensive lab time. Keeping the math entirely separate from the React UI means we can test the math independently. 
* **Reliability benefit:** A "pure" function is 100% predictable. Given the same coordinates, it will always return the exact same transform. This makes it trivial to write automated tests that guarantee the math is flawless, even if we completely rewrite the user interface later.

### Data Model Rules: The Principle of "Single Source of Truth"
* **What it is:** The app stores *only* what the user explicitly enters (e.g., "I typed X: 10, Y: 20 for the SEM"). It **does not** explicitly store whether a point is a "Reference" or an "Analysis" point, nor does it save the calculated coordinates. 
* **Why this choice:** Reference status and calculated coordinates are *derived* from the entered coordinates. We calculate them instantly on the fly whenever needed.
* **Reliability benefit:** This eliminates a massive category of software bugs called "state desynchronization". If we stored calculated coordinates in a database, and the user updated an input, we would have to remember to update the stored calculations. By calculating on the fly, it is physically impossible for the displayed calculations to be out of sync with the inputs.

---

## 3. Storage & Rendering

### Storage: Fully Client-Side & `.labcoord` ZIP containers
* **What it is:** The app has no backend server and no database. Everything runs in the user's browser. When saving, the app uses `jszip` to bundle the user's microscopy image and a `session.json` (containing their points and tags) into a single `.labcoord` file downloaded to their computer.
* **Why this choice:** 
    1. **Privacy/Security:** Lab data often cannot be uploaded to random cloud servers.
    2. **Reliability:** Lab computers sometimes have spotty or no internet access. A fully client-side app works offline forever.
    3. **Portability:** A single `.labcoord` file is easy to email or put on a USB drive, containing both the data and the image it relies on.

### Rendering: HTML5 Canvas
* **What it is:** Instead of rendering the image and points using standard HTML tags (`<img>`, `<div>`), we draw them programmatically onto an HTML5 `<canvas>` element.
* **Why this choice:** Microscopy images are massive. Rendering an image and overlaying hundreds of individual point markers using standard HTML nodes would cause the browser to stutter and freeze when zooming or panning. 
* **Reliability benefit:** Canvas provides hardware-accelerated, pixel-level control, ensuring silky-smooth zooming (0.05x to 40x) and panning regardless of how many points are on the screen.

---

## 4. Quality Assurance Infrastructure

### Automated Testing & Git Pre-commit Hooks
* **What it is:** We will build a standalone Node.js script (`scripts/verify-engine.js`) that automatically tests the math engine against known good data (e.g., checking that specific points result in exactly 0.009 RMSE). We will also set up a "Git Pre-commit Hook".
* **Why this choice:** A pre-commit hook is a script that runs automatically every time a developer tries to save their code to version control (`git commit`). If the `verify-engine.js` script fails, the hook *blocks* the save.
* **Reliability benefit:** This acts as an automated bouncer. It guarantees that no developer (human or AI) can ever accidentally introduce broken math into the project history. The `main` branch of the code is mathematically guaranteed to be correct at all times.

---

## Phased Implementation Sequence

To manage complexity, we will build the app in strict phases. We will not move to the next phase until the current one is fully tested.

### Phase 0: Pre-Build Infrastructure
* **Focus:** Establishing our safety nets.
* **Tasks:** Write the `verify-engine.js` test suite, generate a dummy test project, and set up the Git pre-commit hook.

### Phase 1: Scaffold & Component Stubs (Prompt 0)
* **Focus:** Setting up the skeleton.
* **Tasks:** Initialize React/Vite, install libraries (`jszip`, `papaparse`, `bmp-js`), and create empty "stub" files for all UI components so the app runs without crashing immediately.

### Phase 2: Core Transform Engine (Prompt 1)
* **Focus:** The heavy math.
* **Tasks:** Implement `src/engine/transform.js` (similarity transforms, residuals, outlier detection). Run against `verify-engine.js` until perfect.

### Phase 3: Global State Management (Prompt 2)
* **Focus:** How data flows.
* **Tasks:** Build `useSession.js` to manage the in-memory state of points, instruments, and tags. Wire up the auto-computation logic. Implement the saving/loading of `.labcoord` files.

### Phase 4: Interactive Canvas (Prompts 3a–3d)
* **Focus:** The visual interface.
* **Tasks:** Build image loading (handling BMP/TIFF nuances), implement smooth pan/zoom, and draw the complex point markers onto the canvas.

### Phase 5: Core UI Implementation (Prompts 4–5)
* **Focus:** User interaction.
* **Tasks:** Build the sidebars and modals where users type in coordinates, manage their tags, and view the transform quality (RMSE) for their instruments.

### Phase 6: Navigation, Export, & Polish (Prompts 6–8)
* **Focus:** Workflow completion.
* **Tasks:** Implement "Navigate Mode" (for actively finding points at the microscope), high-resolution annotated image export, and CSV data export.

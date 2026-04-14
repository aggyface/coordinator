# LabCoordinator — Build Brief
Version 6 — Final pre-build specification (gemini-cli)

---

## Application Overview

LabCoordinator is a desktop-friendly web app for microscopy researchers to transfer
sample coordinates between multiple analytical instruments with different coordinate
systems. Users load a stitched image from a source instrument, place points visually,
then register additional instruments one at a time as their analytical workflow
progresses.

A point becomes a reference for an instrument the moment the student enters
coordinates for it there — no pre-classification required. The transform is computed
automatically from all entered coordinate pairs. Students can redefine which points
serve as references on the fly based on what is physically accessible at each
instrument.

The entire project — image, points, tags, instrument definitions — is saved as a
single `.labcoord` file (a ZIP container) that is fully self-contained and portable
between Windows and Mac.

The app has three modes — Select, Add Point, Navigate — each restricting available
actions to prevent user error at the instrument.

---

## Key Design Decisions (do not deviate)

1. **A point is a reference for instrument X iff it has entered coordinates for X.**
   No `roles` object. No pre-classification. Reference status is derived at runtime.
   `computeAllCoords` uses entered coords as the reference set automatically.

2. **No cos²+sin² diagnostic anywhere.** Transforms accommodate different units
   between instruments. RMSE is the only quality metric shown.

3. **Transforms recompute silently** whenever entered coordinates change.

4. **Instruments transform from a user-chosen source.** Star, chain, or mixed
   topology all supported.

5. **Auto-generated point names are suggestions only** — always editable.

6. **The `.labcoord` file always embeds the image.** Fully self-contained ZIP.

7. **Three modes: Select, Add Point, Navigate.** Always visually distinct.
   Escape always returns to Select.

8. **New project flow is a single scrollable dialog** — no wizard steps.
   Tags section collapsed by default. Image decoded on file selection, not on Create.

9. **Supported image formats: BMP, JPG/JPEG, TIFF.** BMP is primary.

10. **Filenames:** `{projectName}_{sampleId}_{descriptor}_{YYYY-MM-DD}.ext`

11. **Tag system: one value per category per point.** Tags are planning hints only —
    the app never reads tag values for any logic or transform computation.

12. **Point colors driven by one designated color category.** Switchable from
    toolbar "Color by" dropdown at any time.

13. **Pixel proxy coordinates** are derived from reference pairs using local scale
    estimation (C2 approach). Units are specified per instrument. Scale bar shown
    on canvas when derivable. Proxy coordinates labelled in UI and CSV.

14. **Transform quality threshold: RMSE > 10× median residual = blocked.**
    Per-instrument override available with acknowledgment. Warning row added to
    CSV export when override is active.

15. **Save triggers:** Save button, Cmd/Ctrl+S, Save As (Cmd/Ctrl+Shift+S).
    Warn on close via `window.beforeunload` if unsaved changes.

16. **Annotated image export renders at full image resolution.** User specifies
    marker and label size at export time. Legend bottom-right. Worker logic is
    hardened with explicit context acquisition and data guards for robustness.

17. **CSV type column is derived at export time** from entered coordinates —
    never stored. Units appear in column headers: `epma_x (µm)`.

18. **Welcome screen detects file type on drag-drop.** `.labcoord` opens directly;
    BMP/JPG/TIFF starts new project with image pre-loaded.

19. **Non-passive event listeners for zoom:** To ensure compatibility with Chrome,
    the `wheel` listener in `ImageCanvas` is added manually with `{ passive: false }`
    to allow `preventDefault()` for custom zoom math.

---

## Tech Stack

- **React** (Vite scaffold)
- **HTML5 Canvas** — image rendering, zoom/pan, point overlay, PiP, scale bar
- **`jszip`** — `.labcoord` ZIP container
- **`bmp-js`** — BMP decode
- **`utif`** — TIFF decode
- **`papaparse`** — CSV export
- No backend. Fully client-side via browser File API.

```bash
npm create vite@latest labcoordinator -- --template react
npm install jszip papaparse bmp-js utif
```

---

## File Structure

```
labcoordinator/
├── src/
│   ├── App.jsx
│   ├── components/
│   │   ├── ImageCanvas.jsx        # Image render, zoom/pan, overlay, PiP, scale bar
│   │   ├── PointModal.jsx         # Add/edit point — coordinate table design
│   │   ├── PointList.jsx          # Sidebar point tables (Select mode)
│   │   ├── InstrumentQualityPanel.jsx  # Merged instrument list + transform status
│   │   ├── NavigatePanel.jsx      # Navigate mode sidebar
│   │   ├── AddPointPanel.jsx      # Add Point mode sidebar
│   │   ├── TagDrawer.jsx          # Slide-in tag management drawer
│   │   ├── TagPresets.js          # Built-in preset definitions (data only)
│   │   ├── NewProjectModal.jsx    # New project creation dialog
│   │   └── Toolbar.jsx
│   ├── engine/
│   │   └── transform.js           # Pure functions only — no React
│   └── hooks/
│       └── useSession.js
├── BRIEF.md
├── GEMINI.md
└── package.json
```

---

## Data Model

### session.json (inside .labcoord ZIP)

```json
{
  "version": 6,
  "projectName": "Thesis Run 4",
  "sampleId": "TH-004",
  "tagPresetName": "Mineralogy + Priority + Texture",
  "instruments": [
    {
      "id": "inst-uuid-1",
      "name": "SEM",
      "isSource": true,
      "transformFrom": null,
      "units": "µm",
      "transform": null,
      "qualityOverridden": false
    },
    {
      "id": "inst-uuid-2",
      "name": "EPMA",
      "isSource": false,
      "transformFrom": "inst-uuid-1",
      "units": "µm",
      "transform": {
        "cosTheta": 0.000852,
        "sinTheta": -0.000854,
        "dx": -105.2,
        "dy": 36.8,
        "thetaDeg": -0.049,
        "rmse": 0.009
      },
      "qualityOverridden": false
    },
    {
      "id": "inst-uuid-3",
      "name": "Laser Ablation",
      "isSource": false,
      "transformFrom": "inst-uuid-1",
      "units": "mm",
      "transform": null,
      "qualityOverridden": false
    }
  ],
  "tagCategories": [
    {
      "id": "tag-uuid-1",
      "name": "Mineral",
      "isColorCategory": true,
      "values": [
        { "label": "Pyrite",    "color": "#FFC107" },
        { "label": "Albite",    "color": "#4CAF50" },
        { "label": "Zircon",    "color": "#F44336" },
        { "label": "Feldspar",  "color": "#2196F3" },
        { "label": "Quartz",    "color": "#9C27B0" }
      ]
    },
    {
      "id": "tag-uuid-2",
      "name": "Priority",
      "isColorCategory": false,
      "values": [
        { "label": "Priority 1", "color": null },
        { "label": "Priority 2", "color": null },
        { "label": "Priority 3", "color": null }
      ]
    },
    {
      "id": "tag-uuid-3",
      "name": "Texture",
      "isColorCategory": false,
      "values": [
        { "label": "Rim",        "color": null },
        { "label": "Core",       "color": null },
        { "label": "Matrix",     "color": null },
        { "label": "Alteration", "color": null },
        { "label": "Inclusion",  "color": null },
        { "label": "Vein",       "color": null }
      ]
    }
  ],
  "points": [
    {
      "id": "pt-uuid-1",
      "name": "Ref-1",
      "pixelCoords": { "x": 1024, "y": 768 },
      "enteredCoords": {
        "inst-uuid-1": { "x": 62127.91,  "y": -1598.304 },
        "inst-uuid-2": { "x": -52.6729,  "y": 35.5296 }
      },
      "pixelProxy": [],
      "tags": { "Mineral": "Albite", "Priority": "Priority 1", "Texture": "Core" },
      "notes": "NE corner inclusion"
    }
  ]
}
```

### Key rules

**Instruments:**
- Exactly one instrument has `isSource: true`
- Source instrument coords come from pixel position (user-overridable in PointModal)
- `units`: dropdown options µm, mm, nm, px, or any free-text string. Used in CSV
  column headers and scale derivation. Never used for unit conversion.
- `qualityOverridden`: set to true when student explicitly overrides a blocked
  transform. Resets to false when any entered coordinate for this instrument changes.
- `transform`: null if fewer than 3 entered coordinate pairs exist

**Points:**
- `enteredCoords`: sparse — only instruments where student has manually typed coords.
  Source instrument coords are always present (pixel position or override).
  A point is a reference for instrument X iff `enteredCoords[X]` exists.
  Calculated coords are NEVER stored — always derived at runtime by `computeAllCoords`.
- `pixelProxy`: array of instrument IDs where pixel proxy was used.
  Informational only — used to label coordinates in UI and CSV.
- `tags`: one string value per category name, or absent if unset.

**Project metadata:**
- `projectName` and `sampleId`: both always editable inline in toolbar.
  Used in all export filenames.
- `tagPresetName`: informational only — records which preset was chosen at
  project creation. Does not constrain the current tagCategories.

---

## Transform Math

Least-squares similarity transform. Replicate this Excel formula exactly:

```
A=Σ(x²_old)+Σ(y²_old)   B=Σ(x_old)   C=Σ(y_old)   D=n
E=Σ(x_old·x_new)+Σ(y_old·y_new)
F=Σ(y_old·x_new)-Σ(x_old·y_new)
G=Σ(x_new)   H=Σ(y_new)

det = A·D - B² - C²
cosTheta = (D·E - B·G - C·H) / det
sinTheta = (D·F - C·G + B·H) / det
dx       = (-B·E - C·F + A·G) / det
dy       = (-C·E + B·F + A·H) / det

Forward: x_new = x_old·cosTheta + y_old·sinTheta  + dx
         y_new = -x_old·sinTheta + y_old·cosTheta + dy
```

`computeAllCoords` topologically sorts instruments by `transformFrom` dependency
so chained transforms resolve in the correct order.

### Reference test data (RMSE must be ~0.009)

| x_old      | y_old      | x_new     | y_new   |
|------------|------------|-----------|---------|
| 62127.91   | -1598.304  | -52.6729  | 35.5296 |
| 53311.28   | -1450.848  | -43.8859  | 35.0774 |
| 53716.784  |  7217.312  | -44.5791  | 26.4321 |
| 61629.232  |  7340.192  | -52.4636  | 26.5906 |

---

## Engine Exports (src/engine/transform.js — pure functions, no React)

### Core math
```js
computeTransform(referencePairs)
  // → { cosTheta, sinTheta, dx, dy, thetaDeg, rmse } | null
  // Returns null if <3 pairs, collinear, or any output is non-finite
  // NEVER returns NaN or Infinity — sanitize all outputs

applyTransform(oldCoord, transform)
  // → { x, y }

computeResiduals(referencePairs, transform)
  // → [{ id, oldCoord, newCoord, calculated, residual }]

computeAllCoords(session)
  // → Map<pointId, Map<instrumentId, { x, y, isProxy }>>
  // For each non-source instrument:
  //   referencePairs = points where enteredCoords[instId] exists
  //   calculatedCoords = applyTransform for all other points
  // Topologically sorted by transformFrom
```

### Validation
```js
checkGeometry(referencePairs)
  // → { status: 'ok'|'warning'|'degenerate', message: string }
  // degenerate: |det| < 1e-10 (collinear points)
  // warning: hull area < 1% of point spread squared (clustered)

detectOutliers(referencePairs)
  // → [{ id, looResidual, isOutlier }]
  // Leave-one-out analysis. Requires ≥4 pairs. Empty array if <4.
  // isOutlier: looResidual > 3× median

assessTransformQuality(referencePairs, transform)
  // → { status: 'ok'|'warning'|'blocked', rmse, medianResidual, ratio }
  // blocked: rmse > 10× medianResidual
  // warning: rmse > 5× medianResidual

classifyPointLocation(coord, referencePairs)
  // → { status: 'inside'|'near'|'outside'|'far', distanceOutside }

computeChainedRMSE(instrumentId, instruments, transforms)
  // → { localRMSE, chainRMSE, chainDescription } | null
  // chainRMSE = sqrt(sum of squared RMSEs along chain)

computeConvexHull(coords)       // → hull polygon array
isInsideConvexHull(coord, hull) // → boolean
```

### Pixel proxy
```js
computeLocalScale(pixelCoord, referencePairs, instrumentUnits)
  // Derives µm-equivalent/px from nearest reference pairs
  // referencePairs must include both pixel coords and instrument coords
  // Returns { scale, confidence: 'good'|'estimated'|'none', pairsUsed }
  // confidence 'none' if <2 reference pairs available

applyPixelProxy(pixelCoord, referencePairs, instrument)
  // → { x, y, label: string, confidence }
  // label examples: "~62.1 µm/px (proxy)", "unscaled px (proxy)"
```

### Coordinate input
```js
parseCoordinate(rawInput, expectedUnits)
  // → { value: number|null, error?: string, warning?: string }
  // Handles: European comma decimal, unit suffix stripping,
  //          scientific notation, empty input
```

---

## App Modes

```
┌──────────────┬──────────────────────────────────────────────────────────────┐
│ Select       │ Default. Click points to select/edit via PointModal. Delete  │
│              │ points. Manage instruments. All sidebar panels visible.       │
├──────────────┼──────────────────────────────────────────────────────────────┤
│ Add Point    │ Click stages ghost marker → AddPointPanel form → Confirm.    │
│              │ Reclick repositions ghost. Pan/zoom always work. No deletion. │
├──────────────┼──────────────────────────────────────────────────────────────┤
│ Navigate     │ Step through filtered points. Only notes editable. No        │
│              │ placement, no deletion. Export CSV/Image still available.     │
└──────────────┴──────────────────────────────────────────────────────────────┘
```

Escape always returns to Select. Mode always visible in toolbar.

---

## Marker Symbols

Drawn at fixed screen size regardless of zoom level.

| Point type | Marker | Color |
|---|---|---|
| Analysis only | Filled diamond ◆ | Color category value, or orange default |
| Reference (for active instrument) | Concentric circles ◎ | Color category value, or blue default |
| Both reference and analysis | Diamond inside concentric circles | Color category value |
| Selected | Yellow highlight ring around normal marker | Always yellow |
| Ghost (Add Point mode) | Translucent pulsing version of analysis marker | — |
| Outlier-flagged reference | Pulsing orange ring added to normal marker | — |

In Navigate mode "All" view, references and analysis points are always
distinguishable by marker shape regardless of color category setting.

---

## Image Loading

Accept BMP, JPG/JPEG, TIFF. Decode on file selection (not on Create/Open).
Cache as `ImageBitmap`. Retain original `ArrayBuffer` for re-embedding in .labcoord.
Never re-decode after initial load.

```js
async function loadImage(file) {
  const buffer = await file.arrayBuffer();
  const ext = file.name.split('.').pop().toLowerCase();

  if (!['bmp','jpg','jpeg','tif','tiff'].includes(ext)) {
    throw { code: 'WRONG_FORMAT' };
  }
  if (file.size === 0) throw { code: 'EMPTY_FILE' };

  let imageBitmap;
  if (ext === 'bmp') {
    const decoded = bmp.decode(Buffer.from(buffer));
    const imageData = new ImageData(
      new Uint8ClampedArray(decoded.data), decoded.width, decoded.height
    );
    const canvas = new OffscreenCanvas(decoded.width, decoded.height);
    canvas.getContext('2d').putImageData(imageData, 0, 0);
    imageBitmap = await createImageBitmap(canvas);
  } else if (ext === 'tif' || ext === 'tiff') {
    const ifd = UTIF.decode(buffer);
    UTIF.decodeImage(buffer, ifd[0]);
    const rgba = UTIF.toRGBA8(ifd[0]);
    const imageData = new ImageData(
      new Uint8ClampedArray(rgba), ifd[0].width, ifd[0].height
    );
    const canvas = new OffscreenCanvas(ifd[0].width, ifd[0].height);
    canvas.getContext('2d').putImageData(imageData, 0, 0);
    imageBitmap = await createImageBitmap(canvas);
  } else {
    const blob = new Blob([buffer], { type: file.type });
    imageBitmap = await createImageBitmap(blob);
  }

  if (!imageBitmap || imageBitmap.width === 0 || imageBitmap.height === 0) {
    throw { code: 'IMAGE_EMPTY' };
  }
  return { imageBitmap, buffer, width: imageBitmap.width, height: imageBitmap.height };
}
```

### Error messages (shown inline, never as alert dialogs)

| Code | Message |
|---|---|
| WRONG_FORMAT | "Unsupported format. Please use BMP, JPG, or TIFF." |
| EMPTY_FILE | "This file appears to be empty." |
| IMAGE_EMPTY | "Image decoded but has no content. Try opening it in another app to verify." |
| CORRUPT_FILE | "Could not read this file. It may be corrupt or an unsupported variant." |
| OUT_OF_MEMORY | "Not enough memory to load this image. Try closing other browser tabs." |
| >500MB | Confirm dialog before decode (not an error — just a warning) |

If .labcoord image fails to load on reopen: show dismissible banner, load rest of
session fully (points/instruments/tags intact), show grey canvas placeholder.

---

## ImageCanvas Component

### Zoom and pan
- Zoom: scroll wheel, range 0.05×–40×, centred on cursor
- Pan: space+drag or middle-mouse drag
- Fit to window: double-click canvas background or toolbar button

### Point overlay
- Point color: `getPointColor(point, session)` — single source of truth
  used by canvas, Navigate mode, and annotated image export
- Markers drawn at fixed screen size regardless of zoom
- Convex hull overlay: faint dashed polygon, toggleable via toolbar
- Ghost marker in Add Point mode: translucent pulsing diamond at staged position

### Picture-in-Picture (Navigate mode)
- Toggle button in NavigatePanel
- Fixed bottom-right of canvas, 25% canvas width
- 4× zoom relative to main canvas zoom
- Crosshair at exact point location

### Scale bar
- Shown when `computeLocalScale` returns confidence 'good' or 'estimated'
- Bottom-left of canvas, fixed screen size
- Shows computed scale with confidence indicator:
  `~48 µm/px` (good) or `~48 µm/px (estimated)` (low confidence)
- Updates as more reference pairs are added

---

## Welcome Screen

Centred, drag-drop zone accepts any file. App detects type:
- `.labcoord` → open project directly
- BMP / JPG / TIFF → start New Project flow with image pre-loaded,
  file picker pre-filled, sample ID pre-populated from filename stem
- Anything else → show format error inline

Two explicit buttons also available: **Open .labcoord** and **New Project**.

---

## New Project Flow

Single scrollable dialog. No wizard steps.

```
┌──────────────────────────────────────────────┐
│  New Project                              ✕  │
│  ──────────────────────────────────────────  │
│  Project name:  [Thesis Run 4____________]   │
│  Sample ID:     [TH-004__________________]   │
│                 (auto-filled from filename)  │
│                                              │
│  Image file:    [Choose file…]  BMP JPG TIFF │
│                 ✓ TH004_SEM_overview.bmp     │
│                                              │
│  Source instrument                           │
│  Name:  [SEM ▾ / Custom: ___]               │
│  Units: [µm ▾ / Custom: ___]                │
│                                              │
│  Tags ▶  (click to expand)                   │
│  ──────────────────────────────────────────  │
│  [Cancel]              [Create Project]      │
└──────────────────────────────────────────────┘
```

When Tags expanded:
```
│  Tags ▼                                      │
│  Preset: [Mineralogy + Priority + Texture ▾] │
│  ▼ Mineral  (color category)                 │
│    [●Pyrite][●Zircon][●Albite][+ Add]        │
│  ▼ Priority                                  │
│    [P1][P2][P3][+ Add]                       │
│  ▼ Texture                                   │
│    [Rim][Core][Matrix][+ Add]                │
│  [+ Add Category]                            │
```

- Tags section collapsed by default — students who want defaults never open it
- [Create Project] disabled until: project name non-empty AND image decoded successfully
- Inline validation: red outline + message below field on Create if invalid
- On Create: image already decoded, initialise session, enter Select mode

---

## Toolbar

```
[Open][Save●][Save As] | [Mode: Select▾] | [+Point][Navigate] | [Export CSV][Export Image][Tags⚙] | Color by:[Mineral▾] | Project:[___] Sample:[___]
```

- **Open**: load `.labcoord`, decode image, restore session, recompute all coords
- **Save**: Cmd/Ctrl+S. Overwrites. First save on new project → Save As.
- **Save As**: Cmd/Ctrl+Shift+S. Always prompts for location.
- **Dirty indicator (●)**: on Save button when unsaved changes exist. Clears on save.
- **window.beforeunload**: warns if dirty on tab/window close.
- **Mode switcher**: Select / Add Point / Navigate. Escape returns to Select.
- **+Point**: shortcut to Add Point mode.
- **Navigate**: shortcut to Navigate mode.
- **Export CSV**: exports active instrument file. Toast on success (3s dismissible).
- **Export Image**: opens annotated image export dialog.
- **Tags ⚙**: opens/closes TagDrawer slide-in panel.
- **Color by [category▾]**: dropdown of all tag categories + "(none)". Switches
  color category instantly. Updates all point colors on canvas in real time.
  This is the fast path — TagDrawer is for managing definitions, not switching.
- **Project / Sample**: always-editable inline fields.

### Save with proxy coordinates
When saving with pixel proxy points present AND new references have been added
since last compute, show dialog:
```
Some points use pixel proxy coordinates.
New references were added — recompute proxies with improved scale estimates?
[Skip]    [Recompute & Save]
```

---

## InstrumentQualityPanel Component

Merged instrument list and transform status. Replaces separate InstrumentPanel
and TransformStatus components.

```
┌──────────────────────────────────────────────┐
│  Instruments                      [+ Add]    │
├──────────────────────────────────────────────┤
│  ● SEM           source    µm         [✏]   │
│  ○ EPMA  ←SEM   4 refs   RMSE:0.009  ✓ [✏🗑]│
│  ○ Laser ←SEM   1 ref    RMSE:—      ⚠ [✏🗑]│
├──────────────────────────────────────────────┤
│  Active: EPMA                                │
│  Transform:  SEM → EPMA                      │
│  θ: -0.049°   X: -105.2   Y: 36.8           │
│  RMSE: 0.009  [?]                            │
│  Chain RMSE: n/a (direct)                    │
└──────────────────────────────────────────────┘
```

When transform quality is BLOCKED (RMSE > 10× median):
```
│  ⛔ Transform blocked — quality too low      │
│  RMSE 4.823 is 47× median (threshold: 10×)  │
│  Likely outlier: Ref-2 (flagged ⚠)          │
│  [Fix References]  [Override — I understand] │
```

- **[Fix References]**: scrolls PointList to references, highlights flagged point
- **[Override]**: sets `qualityOverridden: true`, unblocks Navigate mode for this
  instrument. Resets on any coordinate change. Adds warning row to CSV export.
- **Status badges**: ✓ (RMSE ok, ≥3 refs), ⚠ (< 3 refs or warning threshold),
  ⛔ (blocked), 🔓 (overridden)
- **Add instrument dialog**:
  ```
  Name:  [SEM ▾ / Custom: ___________]
  Units: [µm ▾ / Custom: ___________]
  Transform from: [dropdown of existing instruments]
  ```
  Unit options: µm, mm, nm, px, Custom (free text)
- **Delete**: blocked if any points have entered coords for that instrument.
  Show affected point names.
- **RMSE tooltip [?]**: "Root mean square error — average distance between entered
  reference coordinates and model prediction. Lower is better. Depends on instrument
  precision."

---

## PointModal Component

Opens on point click (Select mode) or Confirm in AddPointPanel.
Clean coordinate table — no radio buttons, no mode switching.

```
┌──────────────────────────────────────────────────┐
│  Pt-007                                       ✕  │
│  Name: [Pt-007_________]                         │
│  ──────────────────────────────────────────────  │
│  Tags:  Mineral [Zircon▾]  Priority [P1▾]        │
│         Texture [Rim▾]                           │
│  Notes: [________________________________]       │
│  ──────────────────────────────────────────────  │
│  Coordinates                                     │
│  ┌──────────────┬────────────┬────────────┬────┐ │
│  │ Instrument   │ X          │ Y          │    │ │
│  ├──────────────┼────────────┼────────────┼────┤ │
│  │ SEM (source) │ 62127.91   │ -1598.30   │[✏] │ │
│  │ EPMA         │ -52.6729   │  35.5296   │[✏][×]│
│  │              │ ← reference (entered)   │    │ │
│  │ Laser Abl.   │ —          │ —          │    │ │
│  │              │ [Enter coords] [Pixel Proxy]  │ │
│  └──────────────┴────────────┴────────────┴────┘ │
│  ──────────────────────────────────────────────  │
│  hull status: inside (EPMA)                      │
│  [Save]                              [Delete]    │
└──────────────────────────────────────────────────┘
```

**Coordinate table rules:**
- Entered coords: show values, [✏] edit, [×] clear (removes from enteredCoords,
  point is no longer a reference for that instrument)
- Blank / calculated: show "—", [Enter coords] button opens inline coord input,
  [Pixel Proxy] button
- Source instrument: always has coords (pixel position or override). [✏] opens
  inline edit. No [×] — source coords cannot be cleared.
- Pixel proxy indicator: proxy values shown with label e.g. `-44.2 (~48µm/px proxy)`
- Residual shown inline for entered coords: small grey text below X/Y values
- Outlier flagged: ⚠ icon + orange highlight on the row

**Pixel Proxy button behavior:**
1. Call `applyPixelProxy(point.pixelCoords, referencePairs, instrument)`
2. If confidence 'none' (< 2 refs): show warning "Not enough references to estimate
   scale. Proxy will use raw pixel values. Continue?" [Cancel] [Use Pixel Values]
3. Fill X/Y fields with proxy values — do NOT auto-save. Student sees the values
   and can edit before saving.
4. Label the fields visually as proxy values until saved.
5. On Save: add instrument ID to point's `pixelProxy` array.

**parseCoordinate()** called on every X/Y input blur:
- European comma → period
- Strip unit suffixes (µm, mm, nm, etc.)
- Scientific notation accepted
- Show inline warning if stripped/converted: "Interpreted as 62127.91"
- Show inline error if invalid: "Not a valid number"

---

## AddPointPanel Component

Sidebar shown in Add Point mode (~240px wide).

```
┌────────────────────────────┐
│  + Add Point            ✕  │
│  ──────────────────────── │
│  Click image to place…     │
│                            │
│  Name: [Pt-017__________]  │
│                            │
│  Mineral:  [Zircon     ▾]  │
│  Priority: [Priority 1 ▾]  │
│  Texture:  [Rim        ▾]  │
│                            │
│  Notes: [______________]   │
│                            │
│  [Clear]  [Confirm & Next] │
└────────────────────────────┘
```

- No "Intended role" field — role is determined by coordinate entry, not planning
- Tags and name are sticky between confirms; notes clear each confirm
- Name auto-increments: Pt-NNN and Ref-NNN tracked separately by prefix
- Ghost marker: translucent pulsing diamond at staged pixel position
- Canvas clicks → setStagedPixel() — NEVER the normal select handler
- Pan (space+drag, middle mouse) and zoom NEVER trigger setStagedPixel()
- Confirm & Next: validate name non-empty → addPoint() → increment name → clear notes
- Clear: clear staged pixel, reset name to next auto-increment
- Escape/✕ with staged point: "Discard unsaved point?" confirm

---

## NavigatePanel Component

Sidebar shown in Navigate mode (~240px wide).

```
┌────────────────────────────┐
│  Navigate               ✕  │
│  ──────────────────────── │
│  [All]  [References]       │  ← persistent quick filters
│  ──────────────────────── │
│  Filter by tag:            │
│  [Mineral: All ▾]          │
│  [Priority: All ▾]         │
│  [Texture: All ▾]          │
│  ──────────────────────── │
│  3 / 12 matching           │
│  [● ● ○ ○ ○ ○ ○ ○ ○ ○ ○ ○] │
│  ──────────────────────── │
│  Pt-003                    │
│  Zircon · Rim · Priority 1 │
│                            │
│  EPMA (µm)                 │
│  X   -44.2134    [⎘ Copy]  │
│  Y    31.0921    [⎘ Copy]  │
│  hull: inside              │
│                            │
│  Notes:                    │
│  ┌──────────────────────┐  │
│  │                      │  │
│  └──────────────────────┘  │
│  [⊞ PiP]                   │
│  ──────────────────────── │
│  ◀ Prev          Next ▶    │
│  Jump to: [Pt-003 ▾]       │
│  ──────────────────────── │
│  [Export CSV]              │
└────────────────────────────┘
```

- **[All]** and **[References]** are always-visible toggle buttons above tag filters.
  [All] = all points. [References] = points with enteredCoords for active instrument.
  These are the primary filter — tag dropdowns refine within the selection.
- **[References]** means references for the active instrument only.
- Tag filter dropdowns: one per category. "All" option in each. AND logic.
- **No entry barrier** — Navigate mode can be entered at any time.
  If active instrument has no entered coords: show banner "No references entered
  for EPMA yet — coordinates will show as —. You can still navigate to scout points."
- If transform quality is BLOCKED and not overridden: show banner
  "Transform blocked for EPMA — coordinates may be unreliable.
  [View details]  [Override]"
- Notes: auto-save to session on change. Manual .labcoord save still required.
- Visited dots: session-only, not persisted.
- Canvas auto-pans to centre active point on Prev/Next.
- PiP: bottom-right, 25% canvas width, 4× zoom, crosshair at point.
- Separate Copy buttons for X and Y.

---

## Tag Preset System

### Built-in presets (hardcoded in TagPresets.js)

| Preset | Categories |
|---|---|
| Mineralogy + Priority + Texture | Mineral (color cat.), Priority, Texture |
| Priority Only | Priority |
| Generic | Priority, Type (Reference/Analysis/Check — planning only) |

Built-in Mineral values: Pyrite, Albite, Zircon, Feldspar, Quartz, Calcite,
Biotite, Muscovite, Hornblende, Olivine, Pyroxene, Magnetite, Ilmenite.
Priority: Priority 1, Priority 2, Priority 3.
Texture: Rim, Core, Matrix, Alteration, Inclusion, Vein, Groundmass, Phenocryst.
Type (Generic): Reference, Analysis, Check — **planning hints only, zero app logic.**

### User presets
- Stored in localStorage key `"labcoordinator_tag_presets"`
- Also exportable/importable as `.tags.json`

### .tags.json format
```json
{
  "version": 1,
  "presetName": "Dr. Smith Lab Minerals",
  "tagCategories": [
    {
      "id": "uuid",
      "name": "Mineral",
      "isColorCategory": true,
      "values": [
        { "label": "Zircon",   "color": "#F44336" },
        { "label": "Monazite", "color": "#FF9800" }
      ]
    }
  ]
}
```

---

## TagDrawer Component

Slide-in from right (~280px). Non-blocking — toolbar remains interactive.
Opened by "Tags ⚙" button. Identical tag editing to New Project Tags section.

Note: **Color category designation** is also accessible here, but the fastest
way to switch color category is the "Color by" dropdown in the toolbar.
TagDrawer is for managing tag definitions (values, colors, categories).

---

## PointList Component (Select mode)

Two collapsible sections. Active instrument context.

**References** — points with enteredCoords for active instrument:
| Name | [FromInstr] coords | [ActiveInstr] entered | Residual | |
|---|---|---|---|---|
| Ref-1 | 62127.9, -1598.3 | -52.67, 35.53 | 0.008 | ✏🗑 |

**Analysis Points** — all other points:
| Name | [Source] coords | [ActiveInstr] calculated | hull | |
|---|---|---|---|---|
| Pt-001 | 2200.0, 1400.0 | -44.21, 31.09 | inside | ✏🗑 |

- Outlier refs: ⚠ icon, orange highlight on row
- Calculated shows "—" if no transform or transform blocked
- Double-click name → inline rename
- Click row → select point and pan canvas
- Tag chips as small colored pills below name
- Notes 📝 icon if non-empty; hover shows first 80 chars

---

## CSV Export

One file per instrument. Always exports the active instrument.

### Schema
```
name, type, x ({units}), y ({units}), residual, hull_status,
  [category_1], [category_2], ..., pixel_proxy, notes
```

- `type`: derived at export time — `"reference"` if enteredCoords[inst] exists,
  `"analysis"` otherwise. Never stored.
- `x ({units})` / `y ({units})`: unit string from instrument definition in header,
  e.g. `x (µm)`, `y (mm)`, `x (stage units)`
- `residual`: populated for references only
- `hull_status`: populated for analysis points only
- `[category cols]`: one column per tag category, lowercase name, spaces → underscores
- `pixel_proxy`: `"yes"` if this instrument is in point's pixelProxy array, else blank
- Analysis points with no transform: include row, blank coords, prefix name `#`
- Warn before export if no transform exists for active instrument

### Warning rows in CSV
If `qualityOverridden` is true for the exported instrument, prepend:
```
# WARNING: Transform quality override was active at export time.
# RMSE ratio was NNN× threshold. Verify coordinates independently.
```

### Filename
`{projectName}_{sampleId}_{InstrumentName}_{YYYY-MM-DD}.csv`
Instrument name sanitized for filename: spaces + special chars → underscores.

### Example (EPMA, µm)
```csv
# WARNING: Transform quality override was active at export time.
# RMSE ratio was 47× threshold. Verify coordinates independently.
name,type,x (µm),y (µm),residual,hull_status,mineral,priority,texture,pixel_proxy,notes
Ref-1,reference,-52.6729,35.5296,0.008,,Albite,Priority 1,Core,,NE corner
Ref-2,reference,-43.8859,35.0774,0.006,,Zircon,Priority 1,,,
Pt-001,analysis,-44.21,31.09,,inside,Zircon,Priority 2,Rim,,
Pt-002,analysis,-48.33,28.74,,near,Albite,,Matrix,yes,proxy — check scale
#Pt-003,analysis,,,,,Zircon,Priority 1,,,
```

---

## Annotated Image Export

Dialog opened from Toolbar "Export Image" button.

```
┌──────────────────────────────────────────────────┐
│  Export Annotated Image                          │
│  Marker size:   [32] px    Label size:  [24] px  │
│  Show: ☑ Point names  ☑ Coordinates  ☑ Legend   │
│  Instrument: [EPMA ▾]  (defaults to active)      │
│  [Cancel]                        [Export PNG]    │
└──────────────────────────────────────────────────┘
```

- Renders to offscreen canvas at **full image resolution**
- `getPointColor(point, session)` shared with live canvas — never duplicate
- Markers at user-specified size; same symbol set as canvas
- Labels: name + coords below marker, white text + dark shadow
- Legend: bottom-right, semi-transparent dark background, only used values shown
- Filename: `{projectName}_{sampleId}_annotated_{YYYY-MM-DD}.png`
- Large canvas PNG encode runs in Web Worker to avoid freezing UI
- Show progress indicator during export

---

## Failure Modes and Validation

### Geometry failures
- `checkGeometry` called whenever reference set changes
- `degenerate`: block transform, red warning in InstrumentQualityPanel, all
  calculated coords show "—"
- `warning`: compute transform, yellow warning

### Outlier detection
- `detectOutliers` called whenever reference set changes (requires ≥4 refs)
- Flagged points: ⚠ in PointList, pulsing orange ring on canvas, ⚠ in PointModal row
- Message: "Ref-2 has unusually large error — check coordinate entry"
- Never auto-remove — student decides

### Transform quality threshold
- `assessTransformQuality` called after every transform compute
- `blocked` (RMSE > 10× median): block Navigate mode, show ⛔ in panel
  Student must [Fix References] or [Override]
- Override sets `qualityOverridden: true`, warning row in CSV, resets on coord change
- `warning` (5–10×): yellow indicator, Navigate allowed with banner

### Coordinate input
- `parseCoordinate` on every X/Y blur in PointModal and AddPointPanel
- Inline error/warning below field — never alert dialogs

### NaN/Infinity sanitization
- `computeTransform` returns null if ANY output is non-finite
- `computeAllCoords` treats null transform as no-transform — shows "—" for all
  calculated coords, never propagates NaN

### Collinear reference test cases
```js
// Perfectly collinear — should return degenerate
expect(checkGeometry(collinearRefs).status).toBe('degenerate')
// Good geometry
expect(checkGeometry(validRefs).status).toBe('ok')
// Identical points — computeTransform returns null
expect(computeTransform(identicalRefs)).toBeNull()
// Reference test data — RMSE must be ~0.009
expect(computeTransform(validRefs).rmse).toBeCloseTo(0.009, 2)
```

---

## Build Prompt Sequence

### Prompt 0 — Scaffold
```
Create React/Vite app "labcoordinator". Install jszip, papaparse, bmp-js, utif.
Create placeholder files for every component in the file structure.
Verify dev server runs (`npm run dev` — should start with no errors).
Create .geminiignore (exclude node_modules/, dist/, .git/, *.labcoord).
Commit.
```

### Prompt 1 — Transform Engine (complete)
```
Implement src/engine/transform.js with ALL exports listed in the spec:
Core: computeTransform, applyTransform, computeResiduals, computeAllCoords
Validation: checkGeometry, detectOutliers, assessTransformQuality,
            classifyPointLocation, computeChainedRMSE,
            computeConvexHull, isInsideConvexHull
Proxy: computeLocalScale, applyPixelProxy
Input: parseCoordinate

Key rules:
- computeAllCoords: reference set = points where enteredCoords[instId] exists
  (no roles object). Topological sort by transformFrom.
- computeTransform: return null (never NaN/Infinity) for any degenerate input
- assessTransformQuality: blocked if RMSE > 10× median residual

Write full test suite. All tests must pass:
- Reference data RMSE ~0.009
- Collinear refs → degenerate
- Identical points → null
- Outlier with dropped digit → flagged by detectOutliers
- assessTransformQuality blocked/warning/ok thresholds
- parseCoordinate: comma decimal, unit suffix, scientific notation, empty, invalid
```

### Prompt 2 — State Management (useSession)
```
Implement src/hooks/useSession.js:
- Session state matching data model (version 6)
- Instruments CRUD (add/edit/delete with validation)
- Points CRUD (add/edit/delete, auto-naming Pt-NNN / Ref-NNN)
- Tags CRUD (categories and values, rename propagation to all points)
- Color category management (one active at a time)
- qualityOverridden flag management
- pixelProxy tracking on points
- computeAllCoords called automatically whenever enteredCoords or instruments change
- .labcoord save/load (JSZip: session.json + image file)
- Session dirty tracking
```

### Prompt 3 — Canvas
```
3a: Image loading (BMP/JPG/TIFF via loadImage()), decode on file select,
    ImageBitmap cache, error handling per error table, fit-to-window.

3b: Zoom (0.05×–40×, scroll wheel, centred on cursor) and pan
    (space+drag, middle mouse). Double-click background → fit to window.

3c: Point overlay. Marker symbols per spec (diamond/concentric circles/combined).
    getPointColor(point, session) for colors. Convex hull dashed overlay (toggleable).
    Scale bar (bottom-left) when computeLocalScale returns usable scale.
    Ghost marker in Add Point mode (translucent pulsing diamond).

3d: Click handling. In Select mode: click point → select, click background → deselect.
    In Add Point mode: click → setStagedPixel() only — never select handler.
    Pan triggers must NEVER call setStagedPixel().
    In Navigate mode: all clicks disabled except pan/zoom.
    PiP window in Navigate mode (bottom-right, 25% width, 4× zoom, crosshair).
```

### Prompt 4 — Core UI Components
```
Implement PointModal.jsx:
- Coordinate table design per spec (no radio buttons)
- Entered coords: values + [✏] edit + [×] clear
- Empty coords: [Enter coords] + [Pixel Proxy] button
- Pixel Proxy: call applyPixelProxy, show warning if confidence 'none',
  fill fields (don't auto-save), label as proxy until saved
- parseCoordinate on every input blur, inline error/warning
- Outlier rows: ⚠ icon + orange highlight
- Hull status shown per instrument
- Tag dropdowns, notes, name edit

Implement PointList.jsx:
- References and Analysis sections (collapsible)
- Derived type (reference = has enteredCoords for active inst)
- Outlier highlighting, calculated "—" when blocked
- Double-click rename, click → select + pan, tag chips, notes tooltip

Implement AddPointPanel.jsx:
- Ghost marker staging, sticky form, auto-increment name
- No intended role field
- Confirm & Next, Clear, Escape/✕ with discard confirm
```

### Prompt 5 — Instrument Panel + Tags
```
Implement InstrumentQualityPanel.jsx (merged):
- Instrument list: active selection, status badges (✓/⚠/⛔/🔓)
- Add dialog: name presets (SEM/EPMA/Laser Ablation/Optical/Custom),
  units dropdown (µm/mm/nm/px/Custom), transformFrom dropdown
- Inline transform details for active instrument
- Blocked state: ⛔ banner, [Fix References], [Override] with qualityOverridden
- Delete blocked if points have enteredCoords for that instrument

Implement TagDrawer.jsx:
- Slide-in non-blocking drawer
- Built-in presets from TagPresets.js, user presets from localStorage
- Save as preset: name prompt → localStorage + offer .tags.json download
- Color swatches with native <input type="color"> on color category values
- Add/rename/delete values and categories with use-warnings
- Export/import .tags.json

Implement TagPresets.js:
- BUILT_IN_PRESETS array: "Mineralogy + Priority + Texture", "Priority Only", "Generic"
```

### Prompt 6 — Navigate Mode
```
Implement NavigatePanel.jsx:
- [All] / [References] persistent toggle buttons (References = active instrument)
- Tag filter dropdowns per category (AND logic)
- Point display: name, tag chips, coords with separate X/Y copy buttons,
  hull status, notes textarea (auto-saves to session)
- Dot progress indicator (session-only visited state, clickable)
- Jump-to dropdown (filtered points only)
- PiP toggle
- Entry banners: no-refs banner, quality-blocked banner with [Override]
- Export CSV button
Canvas in Navigate mode:
- Auto-pan to centre active point on Prev/Next/jump
- PiP window rendering
- All click interactions disabled except pan/zoom
```

### Prompt 7 — Annotated Image Export + CSV
```
Implement CSV export:
- Active instrument only
- Schema per spec: derived type, units in headers, per-category tag columns,
  pixel_proxy column, hull_status, warning rows if qualityOverridden
- Warn before export if no transform
- Toast notification on success

Implement annotated image export dialog:
- Marker/label size inputs, show checkboxes, instrument dropdown
- Offscreen canvas at full image resolution
- Web Worker for PNG encoding (keep UI responsive)
- Progress indicator
- getPointColor shared with canvas renderer
- Legend: bottom-right, semi-transparent, used values only
```

### Prompt 8 — Welcome Screen + New Project + Polish
```
Welcome screen:
- Drag-drop zone: detects .labcoord vs image file
- "Open .labcoord" and "New Project" buttons
- Image dropped → pre-populate New Project dialog

New Project dialog (NewProjectModal.jsx):
- Project name, sample ID (auto-fill from filename stem)
- Image file picker with immediate decode + inline errors per error table
- Source instrument name + units
- Tags section (collapsed by default): preset dropdown + inline tag editor
- [Create Project] disabled until name + valid image

Toolbar wiring:
- Save / Save As / dirty indicator / beforeunload
- Mode switcher (Escape → Select)
- Color by dropdown (updates color category in real time)
- Proxy recompute dialog on save when applicable

Polish:
- Keyboard: Escape → Select; Delete → remove selected point (with confirm
  if point has entered coords for any instrument)
- Empty states in PointList
- Responsive layout minimum 1280px
- End-to-end smoke test: load 4 reference pairs, verify RMSE ~0.009,
  navigate to first analysis point, export CSV
```

---

## Cross-Platform Notes

The app is a web app — runs identically in Chrome/Edge/Firefox on Windows and Mac.
Safari desktop is supported for `window.beforeunload` and File System Access API.
The `.labcoord` file is a ZIP — fully portable between platforms.
File System Access API (for save location picker) has full support on Chrome/Edge.
Firefox and Safari fall back to standard download (no save-location picker) — handle
this gracefully: detect API availability, fall back silently.


---

## Pre-Build Infrastructure

Complete these four tasks before starting Prompt 0. They are not part of the app
itself — they are build tools that make every subsequent prompt faster, cheaper,
and more reliable. Each is a self-contained gemini-cli session.

---

### Infra 1 — Transform Engine Verification Script

**Purpose:** A standalone Node.js script that imports `transform.js` and runs every
engine function against known test data. Run after every session that touches
`transform.js`. Human-readable pass/fail output. Takes under 5 seconds.

**File:** `scripts/verify-engine.js`

**Prompt to give gemini-cli:**

```
Create scripts/verify-engine.js — a standalone Node.js verification script for
the LabCoordinator transform engine.

The script imports src/engine/transform.js and runs all of the following test
cases. It does NOT use a test framework — just console.log with ✓ / ✗ and a
final summary. Exit code 0 if all pass, 1 if any fail.

=== Reference data (RMSE must be ~0.009) ===
const REF_PAIRS = [
  { id:'r1', oldCoord:{x:62127.91,  y:-1598.304}, newCoord:{x:-52.6729, y:35.5296} },
  { id:'r2', oldCoord:{x:53311.28,  y:-1450.848}, newCoord:{x:-43.8859, y:35.0774} },
  { id:'r3', oldCoord:{x:53716.784, y:7217.312},  newCoord:{x:-44.5791, y:26.4321} },
  { id:'r4', oldCoord:{x:61629.232, y:7340.192},  newCoord:{x:-52.4636, y:26.5906} },
];

=== Tests to implement ===

GROUP: computeTransform
  ✓ reference data produces RMSE within 0.001 of 0.009
  ✓ returns null for fewer than 3 pairs
  ✓ returns null for 3 identical points
  ✓ returns null when det is zero (perfectly collinear points)
  ✓ all output values are finite (no NaN, no Infinity)
  ✓ handles very large coordinates (multiply all old coords by 1e6) without overflow

GROUP: applyTransform
  ✓ round-trips reference pair r1 to within 0.01 units
  ✓ round-trips reference pair r3 to within 0.01 units

GROUP: computeResiduals
  ✓ returns one entry per reference pair
  ✓ residual for each of the 4 known refs is < 0.02

GROUP: checkGeometry
  ✓ returns 'ok' for the 4 reference pairs
  ✓ returns 'degenerate' for 3 collinear points (all on y=0)
  ✓ returns 'degenerate' for 4 collinear points
  ✓ returns 'warning' for 4 tightly clustered points (within 1 unit of each other)

GROUP: detectOutliers
  ✓ returns empty array for fewer than 4 pairs
  ✓ returns empty array for the 4 good reference pairs (no outliers)
  ✓ flags exactly one outlier when r1's oldCoord.x is changed to 6212.791
    (dropped digit — 10× scale error)
  ✓ does not flag any of the 3 good points in the above test

GROUP: assessTransformQuality
  ✓ returns 'ok' for the 4 reference pairs
  ✓ returns 'blocked' when one coord has a 10× scale error (same as outlier test)
  ✓ ratio field reflects RMSE / medianResidual correctly

GROUP: classifyPointLocation
  ✓ point at centroid of refs returns 'inside'
  ✓ point at centroid but offset 200% of hull diameter returns 'far'
  ✓ point just outside hull returns 'near' or 'outside' (not 'inside' or 'far')

GROUP: computeChainedRMSE
  ✓ returns null for source instrument (no transformFrom)
  ✓ returns localRMSE == chainRMSE for a direct single-hop transform
  ✓ returns sqrt(a²+b²) for a two-hop chain with known RMSEs 0.009 and 0.005

GROUP: parseCoordinate
  ✓ '62127.91'       → value 62127.91,  no error
  ✓ '62127,91'       → value 62127.91,  warning about comma conversion
  ✓ '62127.91 µm'    → value 62127.91,  warning about unit strip
  ✓ '62127.91 mm'    → value 62127.91,  warning about unit strip
  ✓ '-1.23e4'        → value -12300,    no error
  ✓ ''               → value null,      error 'Required'
  ✓ 'abc'            → value null,      error contains 'not a valid number'
  ✓ '  62127.91  '   → value 62127.91,  handles whitespace

=== Output format ===
GROUP: computeTransform
  ✓ reference data RMSE ~0.009 (got 0.00912)
  ✗ returns null for identical points (got { cosTheta: NaN ... })
  ...
SUMMARY: 31/32 passed
(exit code 1 if any failures)

After writing the script, run it with: node scripts/verify-engine.js
Fix any issues with the script itself (not transform.js — that doesn't exist yet)
so it is ready to use once transform.js is implemented in Prompt 1.
The script should handle ImportError gracefully if transform.js doesn't exist yet:
print "transform.js not found — run Prompt 1 first" and exit 0.
```

---

### Infra 2 — Sample .labcoord Generator

**Purpose:** Generates a valid `.labcoord` ZIP file containing known test data.
Used to test every UI component from Prompt 3 onwards without manual data entry.
Run once, commit the output, use it in every subsequent session.

**Files:**
- `scripts/generate-test-project.js` — the generator
- `test-data/test-project.labcoord` — committed output (regenerate if spec changes)

**Prompt to give gemini-cli:**

```
Create scripts/generate-test-project.js — a Node.js script that generates a
valid LabCoordinator test project file at test-data/test-project.labcoord.

The output is a ZIP file (use the jszip package) containing:
  session.json   — test session data (spec below)
  image.bmp      — a programmatically generated BMP (spec below)

=== Image ===
Generate a 1200×900 pixel BMP programmatically — no external image needed.
The image should be useful for testing point placement and navigation:
- White background (#FFFFFF)
- A 60px grey border (#CCCCCC)
- A faint grid of lines every 100px (#EEEEEE)
- 6 distinct "features" — small filled circles (radius 8px, colour #333333)
  at these pixel positions (these correspond to the reference and analysis points):
  (180, 135), (810, 135), (810, 765), (180, 765),   ← 4 reference points (corners)
  (495, 450), (300, 450)                              ← 2 analysis points
- A scale bar: horizontal line from (60, 860) to (260, 860), label "200px"
Use the bmp-js package to encode the pixel data as a BMP buffer.

=== session.json ===
Generate valid JSON matching the LabCoordinator data model version 6:

{
  "version": 6,
  "projectName": "Test Project",
  "sampleId": "TEST-001",
  "tagPresetName": "Mineralogy + Priority + Texture",
  "instruments": [
    {
      "id": "inst-sem",
      "name": "SEM",
      "isSource": true,
      "transformFrom": null,
      "units": "µm",
      "transform": null,
      "qualityOverridden": false
    },
    {
      "id": "inst-epma",
      "name": "EPMA",
      "isSource": false,
      "transformFrom": "inst-sem",
      "units": "µm",
      "transform": null,
      "qualityOverridden": false
    }
  ],
  "tagCategories": [
    {
      "id": "tc-mineral",
      "name": "Mineral",
      "isColorCategory": true,
      "values": [
        { "label": "Pyrite",   "color": "#FFC107" },
        { "label": "Albite",   "color": "#4CAF50" },
        { "label": "Zircon",   "color": "#F44336" },
        { "label": "Feldspar", "color": "#2196F3" }
      ]
    },
    {
      "id": "tc-priority",
      "name": "Priority",
      "isColorCategory": false,
      "values": [
        { "label": "Priority 1", "color": null },
        { "label": "Priority 2", "color": null },
        { "label": "Priority 3", "color": null }
      ]
    },
    {
      "id": "tc-texture",
      "name": "Texture",
      "isColorCategory": false,
      "values": [
        { "label": "Rim",    "color": null },
        { "label": "Core",   "color": null },
        { "label": "Matrix", "color": null }
      ]
    }
  ],
  "points": [
    {
      "id": "pt-ref1",
      "name": "Ref-1",
      "pixelCoords": { "x": 180, "y": 135 },
      "enteredCoords": {
        "inst-sem":  { "x": 62127.91,  "y": -1598.304 },
        "inst-epma": { "x": -52.6729,  "y": 35.5296   }
      },
      "pixelProxy": [],
      "tags": { "Mineral": "Albite", "Priority": "Priority 1", "Texture": "Core" },
      "notes": "NE corner reference — use if accessible"
    },
    {
      "id": "pt-ref2",
      "name": "Ref-2",
      "pixelCoords": { "x": 810, "y": 135 },
      "enteredCoords": {
        "inst-sem":  { "x": 53311.28,  "y": -1450.848 },
        "inst-epma": { "x": -43.8859,  "y": 35.0774   }
      },
      "pixelProxy": [],
      "tags": { "Mineral": "Zircon", "Priority": "Priority 1" },
      "notes": ""
    },
    {
      "id": "pt-ref3",
      "name": "Ref-3",
      "pixelCoords": { "x": 810, "y": 765 },
      "enteredCoords": {
        "inst-sem":  { "x": 53716.784, "y": 7217.312 },
        "inst-epma": { "x": -44.5791,  "y": 26.4321  }
      },
      "pixelProxy": [],
      "tags": { "Mineral": "Feldspar" },
      "notes": ""
    },
    {
      "id": "pt-ref4",
      "name": "Ref-4",
      "pixelCoords": { "x": 180, "y": 765 },
      "enteredCoords": {
        "inst-sem":  { "x": 61629.232, "y": 7340.192 },
        "inst-epma": { "x": -52.4636,  "y": 26.5906  }
      },
      "pixelProxy": [],
      "tags": { "Mineral": "Pyrite", "Priority": "Priority 2", "Texture": "Rim" },
      "notes": ""
    },
    {
      "id": "pt-001",
      "name": "Pt-001",
      "pixelCoords": { "x": 495, "y": 450 },
      "enteredCoords": {
        "inst-sem": { "x": 57500.0, "y": 2800.0 }
      },
      "pixelProxy": [],
      "tags": { "Mineral": "Zircon", "Priority": "Priority 1", "Texture": "Rim" },
      "notes": "Primary target — high priority zircon"
    },
    {
      "id": "pt-002",
      "name": "Pt-002",
      "pixelCoords": { "x": 300, "y": 450 },
      "enteredCoords": {
        "inst-sem": { "x": 60200.0, "y": 2900.0 }
      },
      "pixelProxy": [],
      "tags": { "Mineral": "Albite", "Texture": "Matrix" },
      "notes": "Secondary target"
    }
  ]
}

=== After generating ===
1. Create test-data/ directory if it doesn't exist
2. Write the ZIP to test-data/test-project.labcoord
3. Print file size and confirm both session.json and image.bmp are in the ZIP
4. Validate the session.json parses correctly and has the right number of points
5. Print a summary:
   ✓ test-project.labcoord generated (NNNkb)
   ✓ session.json valid (6 points, 2 instruments, 3 tag categories)
   ✓ image.bmp present (1200×900)

Run with: node scripts/generate-test-project.js
Commit both the script and test-data/test-project.labcoord to the repo.
Add test-data/*.labcoord to .gitignore exemptions if needed.
```

---

### Infra 3 — GEMINI.md Prompt Injection Habit

**Purpose:** Not a script — a workflow pattern. Ensures each gemini-cli session
stays focused on its prompt and doesn't drift into unrelated refactoring.

**Template to use at the start of every gemini-cli session:**

```
We are working on [PROMPT NAME] for the LabCoordinator project.

Before starting:
1. Read GEMINI.md in this repo
2. Read the relevant section of BRIEF.md: [PASTE SECTION HEADER]
3. Run node scripts/verify-engine.js and confirm all tests pass (skip if
   we haven't reached Prompt 1 yet)

Scope for this session:
[PASTE THE FULL PROMPT TEXT FROM BRIEF.md]

Constraints:
- Do not modify transform.js unless this prompt explicitly requires it
- Do not modify useSession.js unless this prompt explicitly requires it
- Do not refactor files outside the scope of this prompt
- After completing the work, run node scripts/verify-engine.js again
  and confirm all tests still pass

Ready? Start by reading GEMINI.md.
```

**Why this matters:** gemini-cli will see the full GEMINI.md and the relevant
brief section in its context. The explicit "do not touch X" constraints prevent
it from helpfully refactoring the transform engine while trying to fix a CSS issue.

**Adapt the constraints per prompt:**
- Prompts 0–1: no constraints needed (building from scratch)
- Prompt 2+: always protect transform.js
- Prompts 4+: also protect transform.js and useSession.js
- Prompts 6+: also protect all previously completed components

---

### Infra 3b — Git Pre-Commit Hook (transform engine guard)

**Purpose:** Hard-blocks any `git commit` if `verify-engine.js` tests fail.
Enforces transform correctness at commit time automatically — no relying on
convention or remembering to run the script manually.

**Add this to the end of the Prompt 0 instructions:**

```
Set up a git pre-commit hook that runs the transform engine verification script
before every commit.

Create .git/hooks/pre-commit with the following content:

#!/bin/sh
# LabCoordinator — transform engine guard
# Blocks commit if verify-engine.js tests fail

# Skip if transform.js doesn't exist yet (early scaffold commits are fine)
if [ ! -f "src/engine/transform.js" ]; then
  echo "⚠ transform.js not found — skipping engine check"
  exit 0
fi

echo "Running transform engine verification..."
node scripts/verify-engine.js

if [ $? -ne 0 ]; then
  echo ""
  echo "✗ Transform engine tests failed. Commit blocked."
  echo "  Fix failing tests before committing."
  echo "  To skip this check (not recommended): git commit --no-verify"
  exit 1
fi

echo "✓ Transform engine OK — proceeding with commit"
exit 0

Make it executable: chmod +x .git/hooks/pre-commit

Also create scripts/setup-hooks.sh so any fresh clone can reinstall the hook:

#!/bin/sh
cp scripts/pre-commit-hook .git/hooks/pre-commit
chmod +x .git/hooks/pre-commit
echo "✓ Git hooks installed"

And copy the hook content to scripts/pre-commit-hook (committed to repo)
so it survives a fresh clone (git hooks are not tracked by default).

Add to README:
## Setup
npm install
node scripts/generate-test-project.js
sh scripts/setup-hooks.sh       ← installs the pre-commit guard

## Running with gemini-cli
cd labcoordinator
gemini                           ← GEMINI.md loads automatically
/memory show                     ← verify project context loaded
/stats model                     ← check daily quota before long sessions

Verify: make a trivial change to a non-JS file and commit — hook should
run and pass. Then temporarily break transform.js (add return null at top
of computeTransform) and try to commit — should be blocked.
```

---

### Infra 4 — Component Stubs (part of Prompt 0)

**Purpose:** Properly typed React component stubs for every file in the file
structure. Not blank files — stubs with correct prop signatures and a visible
placeholder render. Prevents import errors from halting the dev server during
incremental development.

**This is built as part of Prompt 0, not a separate session.**

**Add this to the Prompt 0 text:**

```
After scaffolding the file structure, create a stub for every component file.
Each stub should:
1. Export a default React component with the correct display name
2. Accept the props it will eventually need (use the brief's component specs
   to determine prop names — types can be 'any' for now)
3. Render a visible placeholder showing the component name and its props as JSON
4. Not throw any errors when rendered with empty/null props

Example stub pattern:
  export default function PointModal({ point, session, onSave, onClose }) {
    return (
      <div style={{ border: '2px dashed #ccc', padding: 16, margin: 8 }}>
        <strong>PointModal [stub]</strong>
        <pre style={{ fontSize: 10 }}>{JSON.stringify({ point, session }, null, 2)}</pre>
      </div>
    );
  }

Stubs to create (in addition to App.jsx which should render all stubs in a grid):
  ImageCanvas        props: session, mode, activeInstrumentId, onPointClick,
                            onCanvasClick, selectedPointId
  PointModal         props: point, session, onSave, onClose
  PointList          props: session, activeInstrumentId, selectedPointId, onSelect
  InstrumentQualityPanel  props: session, activeInstrumentId, onSetActive,
                                  onOverride, onAddInstrument
  NavigatePanel      props: session, activeInstrumentId, onClose, onExportCSV
  AddPointPanel      props: session, onConfirm, onClear, onClose
  TagDrawer          props: session, isOpen, onClose, onUpdateTags
  NewProjectModal    props: isOpen, onCreate, onCancel
  Toolbar            props: session, mode, onModeChange, onSave, onOpen, onNew,
                            onExportCSV, onExportImage, onTagsOpen

App.jsx should:
  - Import and render all stubs in a responsive grid
  - Show a mode selector at top (Select / Add Point / Navigate)
  - Import useSession and pass its output to all stubs
  - Dev server must start with zero console errors

Verify: npm run dev starts, browser shows all stubs, no console errors.
```

---

### Infra — Recommended Session Order

```
Infra 1 (verify script)    → commit
Infra 2 (test project)     → commit  
Prompt 0 (scaffold + stubs) using Infra 3 template + Infra 4 stub instructions
Prompt 1 (transform engine) → run verify script → all tests pass → commit
Prompt 2 (useSession)      → run verify script → commit
Prompt 3a–3d (canvas)      → load test-project.labcoord to verify each step
Prompts 4–8                → use Infra 3 template, run verify after each
```

Each commit is a permanent checkpoint. If a session produces broken output:
- First try gemini-cli's built-in checkpointing: `/restore` to list snapshots,
  `/restore <n>` to roll back to before the bad edits
- If the session is already closed, revert to the last git commit
Then retry with the Infra 3 template and tighter scope constraints.

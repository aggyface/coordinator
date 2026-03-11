# LabCoordinator — Project Context
> *"It coordinates your lab coordinates."*

## What This App Does
**LabCoordinator** is a research tool for microscopy students to transfer sample
coordinates between multiple analytical instruments (SEM, EPMA, Laser Ablation,
Optical, etc.) with different coordinate systems. Students load a stitched image,
place points visually, then enter measured coordinates at each instrument to compute
a transform and navigate to analysis targets.

## Full Specification
**Read `BRIEF.md` before making any significant design decision.**
When in doubt, the brief wins.

## Commands
```bash
npm run dev     # dev server (localhost:5173)
npm test        # run transform engine tests
node scripts/verify-engine.js   # run after ANY change to transform.js
npm run build   # production build
```

**All verify-engine.js tests must pass before committing past Prompt 1.**

---

## The Most Important Rule

**A point is a reference for instrument X iff `enteredCoords[X]` exists.**
There is no `roles` object. Reference status is derived, never stored.
`computeAllCoords` uses entered coords as the reference set automatically.
Do not add a roles field. Do not store calculated coordinates.

---

## Data Model Version: 6

```js
// Point
{
  id, name, pixelCoords,
  enteredCoords: { [instrumentId]: { x, y } },  // reference set — sparse
  pixelProxy: [instrumentId, ...],               // informational only
  tags: { [categoryName]: string },              // one value per category
  notes: string
}

// Instrument
{ id, name, isSource, transformFrom, units, transform, qualityOverridden }

// Tag category
{ id, name, isColorCategory, values: [{ label, color }] }
```

---

## Key Architecture Rules

**Tags:** ONE value per category per point. Tags are planning hints only —
the app NEVER reads tag values for any logic or transform computation.

**Color:** `getPointColor(point, session)` is the single source of truth.
Used by canvas, Navigate mode, and annotated image export — never duplicated.
"Color by" toolbar dropdown switches color category in real time.

**Transform quality:** `assessTransformQuality` returns blocked if
RMSE > 10× median residual. Blocked = Navigate mode requires override.
`qualityOverridden: true` → warning rows prepended to CSV export.

**Pixel proxy:** `computeLocalScale` derives scale from nearest reference pairs.
Proxy values shown with label, not auto-saved — student verifies before committing.

**CSV type column:** DERIVED at export time from enteredCoords — never stored.

**Units in CSV headers:** `x (µm)`, `y (mm)` — never a separate column.

---

## Modes
- **Select** — default, full sidebar, click to edit points
- **Add Point** — crosshair, ghost marker, AddPointPanel form
- **Navigate** — step through filtered points, notes editable only
- Escape always returns to Select

## Marker Symbols
- Analysis: filled diamond ◆
- Reference (active instrument): concentric circles ◎
- Both: diamond inside concentric circles
- Selected: yellow ring
- Ghost: translucent pulsing diamond
- Outlier-flagged: pulsing orange ring added to normal marker

## Components
- `InstrumentQualityPanel` — merged instrument list + transform status (NOT separate)
- `TagDrawer` — slide-in non-blocking drawer (NOT a modal)
- `AddPointPanel` — NO "Intended role" field
- `NavigatePanel` — [All] / [References] persistent buttons above tag filters

---

## Save Rules
- Cmd/Ctrl+S → Save (first save on new project → Save As)
- Cmd/Ctrl+Shift+S → Save As
- `window.beforeunload` → warn if dirty
- File System Access API for save dialog; Firefox/Safari → standard download fallback

## Image Loading
- Decode on file select, NOT on Create button
- BMP (bmp-js), TIFF (utif), JPG (native createImageBitmap)
- Errors shown inline — never alert dialogs
- Cache ImageBitmap, retain ArrayBuffer, never re-decode

## What NOT to Build
- No backend, no auth, no database
- No cos²+sin² display
- No autosave, no undo/redo (v1)
- No unit conversion between instruments
- No external color picker library (use native `<input type="color">`)
- No roles object on points
- No stored calculated coordinates

---

## Modular Context Files

For deep dives on specific areas, import these files using `@filename` syntax
or ask gemini to read them directly:

- `@BRIEF.md` — full specification (data model, all component specs, build prompts)
- `@scripts/verify-engine.js` — transform engine test suite (read to understand
  expected behaviour before implementing transform.js)

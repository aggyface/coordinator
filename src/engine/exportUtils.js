/**
 * LabCoordinator — Export Utilities (Offline-Optimized).
 * Inlined the Web Worker logic to ensure 100% standalone portability.
 */

import Papa from 'papaparse';
import { applyPixelProxy } from './transform';

/**
 * Worker Code as a String.
 * Contains its own logic for scale estimation and marker rendering.
 */
const WORKER_CODE = `
  self.onmessage = async (e) => {
    try {
      const { imageBitmap, points, activeInstrumentId, tagCategories, colors, showLegend, showScaleBar, transforms, units, instruments } = e.data;

      const canvas = new OffscreenCanvas(imageBitmap.width, imageBitmap.height);
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error("Could not acquire 2D context for OffscreenCanvas");

      // 1. Draw base image
      ctx.drawImage(imageBitmap, 0, 0);

      // 2. Marker Styling (scaled to image size)
      const baseSize = Math.max(imageBitmap.width, imageBitmap.height) * 0.005;
      ctx.lineWidth = baseSize * 0.2;

      points.forEach(point => {
        const { x, y } = point.pixelCoords;
        const isReference = !!point.enteredCoords[activeInstrumentId];
        
        if (isReference) {
          ctx.beginPath();
          ctx.moveTo(x, y - baseSize); ctx.lineTo(x + baseSize, y);
          ctx.lineTo(x, y + baseSize); ctx.lineTo(x - baseSize, y);
          ctx.closePath(); ctx.strokeStyle = colors.reference; ctx.stroke();
        } else {
          let categoryColor = colors.analysis;
          const colorCat = tagCategories.find(c => c.isColorCategory);
          if (colorCat && point.tags[colorCat.name]) {
            const val = colorCat.values.find(v => v.label === point.tags[colorCat.name]);
            if (val) categoryColor = val.color;
          }
          ctx.beginPath(); ctx.arc(x, y, baseSize, 0, Math.PI * 2);
          ctx.strokeStyle = categoryColor; ctx.stroke();
          ctx.beginPath(); ctx.arc(x, y, baseSize / 4, 0, Math.PI * 2);
          ctx.fillStyle = categoryColor; ctx.fill();
        }
        ctx.fillStyle = '#ffffff';
        ctx.font = "bold " + Math.round(baseSize * 1.5) + "px sans-serif";
        ctx.fillText(point.name, x + baseSize * 1.2, y + baseSize * 0.5);
      });

      // 3. Render Legend
      const colorCat = tagCategories.find(c => c.isColorCategory);
      if (showLegend && colorCat && colorCat.values.length > 0) {
        const margin = baseSize * 4; const padding = baseSize * 2;
        const rowHeight = baseSize * 3; const legendWidth = baseSize * 25;
        const legendHeight = rowHeight * (colorCat.values.length + 1) + padding;
        const lx = imageBitmap.width - legendWidth - margin; const ly = margin;
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)'; ctx.fillRect(lx, ly, legendWidth, legendHeight);
        ctx.strokeStyle = '#ffffff'; ctx.lineWidth = baseSize * 0.1; ctx.strokeRect(lx, ly, legendWidth, legendHeight);
        ctx.fillStyle = '#ffffff';
        ctx.font = "bold " + Math.round(baseSize * 1.8) + "px sans-serif";
        ctx.fillText(colorCat.name, lx + padding, ly + rowHeight);
        colorCat.values.forEach((v, i) => {
          const rx = lx + padding; const ry = ly + rowHeight * (i + 2);
          ctx.beginPath(); ctx.arc(rx + baseSize, ry - baseSize * 0.5, baseSize * 0.8, 0, Math.PI * 2);
          ctx.fillStyle = v.color; ctx.fill();
          ctx.fillStyle = '#ffffff';
          ctx.font = Math.round(baseSize * 1.5) + "px sans-serif";
          ctx.fillText(v.label, rx + baseSize * 3, ry);
        });
      }

      // 4. Render Scale Bar
      if (showScaleBar) {
        let finalScale = null;
        const transform = transforms ? transforms[activeInstrumentId] : null;
        const activeInst = instruments ? instruments.find(i => i.id === activeInstrumentId) : null;
        const isSource = activeInst?.isSource;

        if (!isSource && transform) {
          // Option A: Use existing similarity transform to get pixels per unit
          finalScale = Math.sqrt(Math.pow(transform.cosTheta, 2) + Math.pow(transform.sinTheta, 2));
        } else if (activeInst) {
          // Option B: Compute local scale estimation for source instrument (or fallback)
          const refs = points.filter(p => p.enteredCoords[activeInstrumentId]);
          if (refs.length >= 2) {
            const scales = [];
            for (let i = 0; i < refs.length; i++) {
              for (let j = i + 1; j < refs.length; j++) {
                const p1 = refs[i]; const p2 = refs[j];
                if (!p1.enteredCoords[activeInstrumentId] || !p2.enteredCoords[activeInstrumentId]) continue;
                const dPx = Math.sqrt(Math.pow(p1.pixelCoords.x - p2.pixelCoords.x, 2) + Math.pow(p1.pixelCoords.y - p2.pixelCoords.y, 2));
                const dIn = Math.sqrt(Math.pow(p1.enteredCoords[activeInstrumentId].x - p2.enteredCoords[activeInstrumentId].x, 2) + Math.pow(p1.enteredCoords[activeInstrumentId].y - p2.enteredCoords[activeInstrumentId].y, 2));
                if (dPx > 1) scales.push(dIn / dPx);
              }
            }
            if (scales.length > 0) {
              finalScale = scales.sort((a, b) => a - b)[Math.floor(scales.length / 2)];
            }
          }
        }

        if (finalScale && finalScale > 0) {
          const pxPerUnit = 1 / finalScale;
          const targetWidthUnits = imageBitmap.width * 0.1 / pxPerUnit;
          if (targetWidthUnits <= 0) return;

          const magnitude = Math.pow(10, Math.floor(Math.log10(targetWidthUnits)));
          const firstDigit = targetWidthUnits / magnitude;
          let niceUnits = magnitude;
          if (firstDigit > 5) niceUnits = 5 * magnitude; else if (firstDigit > 2) niceUnits = 2 * magnitude;
          
          const barWidthPx = niceUnits * pxPerUnit; const margin = baseSize * 4;
          ctx.save(); ctx.translate(margin, imageBitmap.height - margin);
          ctx.strokeStyle = '#fff'; ctx.lineWidth = baseSize * 0.4;
          ctx.beginPath(); ctx.moveTo(0, -baseSize); ctx.lineTo(0, 0); ctx.lineTo(barWidthPx, 0); ctx.lineTo(barWidthPx, -baseSize); ctx.stroke();
          ctx.fillStyle = '#fff';
          ctx.font = "bold " + Math.round(baseSize * 2) + "px sans-serif";
          ctx.textAlign = 'center'; ctx.fillText(niceUnits + " " + (units || 'units'), barWidthPx / 2, baseSize * 3);
          ctx.restore();
        }
      }

      const blob = await canvas.convertToBlob({ type: 'image/png' });
      self.postMessage({ blob });
    } catch (err) {
      self.postMessage({ error: err.message });
    }
  };
`;

/**
 * Generates an annotated high-resolution PNG via an inlined Web Worker.
 */
export async function generateAnnotatedImage(imageBitmap, points, activeInstrumentId, tagCategories, showLegend, showScaleBar, transforms, units, instruments) {
  return new Promise((resolve, reject) => {
    // CRITICAL: Convert Map to plain object for worker serialization
    const transformsObj = {};
    if (transforms instanceof Map) {
      transforms.forEach((v, k) => { transformsObj[k] = v; });
    } else if (transforms) {
      Object.assign(transformsObj, transforms);
    }

    const blob = new Blob([WORKER_CODE], { type: 'text/javascript' });
    const workerURL = URL.createObjectURL(blob);
    const worker = new Worker(workerURL);

    worker.onmessage = (e) => {
      if (e.data.error) {
        reject(new Error(e.data.error));
      } else {
        resolve(e.data.blob);
      }
      worker.terminate();
      URL.revokeObjectURL(workerURL);
    };

    worker.onerror = (err) => {
      reject(err);
      worker.terminate();
      URL.revokeObjectURL(workerURL);
    };

    const colors = { reference: '#00ffff', analysis: '#ffeb3b' };

    worker.postMessage({
      imageBitmap,
      points,
      activeInstrumentId,
      tagCategories,
      colors,
      showLegend,
      showScaleBar,
      transforms: transformsObj,
      units,
      instruments
    }, [imageBitmap]); 
  });
}


/**
 * Generates a scientific CSV for the active instrument.
 */
export function generateCSV(session, computedCoords, transforms, activeInstrumentId) {
  const activeInst = session.instruments.find(i => i.id === activeInstrumentId);
  const transform = transforms instanceof Map ? transforms.get(activeInstrumentId) : transforms[activeInstrumentId];
  const data = [];

  if (transform && (transform.rmse > 0.1 || transform.status !== 'ok')) {
    data.push({
      "Point Name": "!!! WARNING !!!",
      "Type": "QUALITY ALERT",
      "Reliability": "LOW PRECISION",
      "Analysed": "",
      [`X (${activeInst?.units || 'units'})`]: "High Error",
      [`Y (${activeInst?.units || 'units'})`]: "Check References",
      "Notes": `RMSE: ${transform?.rmse?.toFixed(4)}. Geometry may be degenerate.`
    });
  }

  session.points.forEach(point => {
    const manualCoords = point.enteredCoords[activeInstrumentId];
    const computedResult = computedCoords?.get(point.id)?.get(activeInstrumentId);
    let x = "N/A", y = "N/A", reliability = "Uncalibrated";

    if (manualCoords) {
      x = manualCoords.x.toFixed(6); y = manualCoords.y.toFixed(6); reliability = "Verified (Manual)";
    } else if (computedResult) {
      x = computedResult.x.toFixed(6); y = computedResult.y.toFixed(6); reliability = "Transform (Calculated)";
    } else if (activeInst) {
      const refs = session.points.filter(p => p.enteredCoords[activeInstrumentId]).map(p => ({ oldCoord: p.pixelCoords, newCoord: p.enteredCoords[activeInstrumentId] }));
      const proxy = applyPixelProxy(point.pixelCoords, refs, activeInst);
      if (proxy.confidence !== 'none') {
        x = proxy.x.toFixed(6); y = proxy.y.toFixed(6); reliability = `Proxy (${proxy.confidence})`;
      }
    }
    
    const row = {
      "Point Name": point.name,
      "Type": manualCoords ? "Reference" : "Target",
      "Reliability": reliability,
      "Analysed": point.isAnalysed ? "YES" : "NO",
      [`X (${activeInst?.units || 'units'})`]: x,
      [`Y (${activeInst?.units || 'units'})`]: y,
      "Notes": point.notes || ""
    };
    session.tagCategories.forEach(cat => { row[cat.name] = point.tags[cat.name] || ""; });
    data.push(row);
  });

  return Papa.unparse(data);
}

/**
 * Triggers a browser download.
 */
export function triggerDownload(content, fileName, type = 'text/csv') {
  let blob;
  if (type.includes('csv') && typeof content === 'string') {
    const BOM = '\uFEFF';
    blob = new Blob([BOM + content], { type: 'text/csv;charset=utf-8;' });
  } else {
    blob = content instanceof Blob ? content : new Blob([content], { type });
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = fileName;
  document.body.appendChild(a); a.click();
  document.body.removeChild(a); URL.revokeObjectURL(url);
}

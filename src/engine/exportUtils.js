/**
 * LabCoordinator — Export Utilities.
 * Handles the conversion of project state into portable CSV and Image formats.
 */

import Papa from 'papaparse';
import { applyPixelProxy } from './transform';

/**
 * Generates an annotated high-resolution PNG via Web Worker.
 */
export async function generateAnnotatedImage(imageBitmap, points, activeInstrumentId, tagCategories, showLegend, showScaleBar, transforms) {
  return new Promise((resolve, reject) => {
    const worker = new Worker(new URL('./exportWorker.js', import.meta.url), { type: 'module' });

    worker.onmessage = (e) => {
      resolve(e.data.blob);
      worker.terminate();
    };

    worker.onerror = (err) => {
      reject(err);
      worker.terminate();
    };

    const colors = {
      reference: '#00ffff',
      analysis: '#ffeb3b'
    };

    worker.postMessage({
      imageBitmap,
      points,
      activeInstrumentId,
      tagCategories,
      colors,
      showLegend,
      showScaleBar,
      transforms
    }, [imageBitmap]); 
  });
}

/**
 * Generates a scientific CSV for the active instrument.
 * Includes Reliability column and Proxy fallbacks.
 */
export function generateCSV(session, computedCoords, transforms, activeInstrumentId) {
  const activeInst = session.instruments.find(i => i.id === activeInstrumentId);
  const transform = transforms instanceof Map ? transforms.get(activeInstrumentId) : transforms[activeInstrumentId];
  
  const data = [];

  // 1. Prepend Quality Warning if necessary
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

  // 2. Process Points
  session.points.forEach(point => {
    const manualCoords = point.enteredCoords[activeInstrumentId];
    const computedResult = computedCoords?.get(point.id)?.get(activeInstrumentId);
    
    let x = "N/A", y = "N/A", reliability = "Uncalibrated";

    if (manualCoords) {
      x = manualCoords.x.toFixed(6);
      y = manualCoords.y.toFixed(6);
      reliability = "Verified (Manual)";
    } else if (computedResult) {
      x = computedResult.x.toFixed(6);
      y = computedResult.y.toFixed(6);
      reliability = "Transform (Calculated)";
    } else if (activeInst) {
      // Fallback to Proxy
      const refs = session.points
        .filter(p => p.enteredCoords[activeInstrumentId])
        .map(p => ({ oldCoord: p.pixelCoords, newCoord: p.enteredCoords[activeInstrumentId] }));
      const proxy = applyPixelProxy(point.pixelCoords, refs, activeInst);
      if (proxy.confidence !== 'none') {
        x = proxy.x.toFixed(6);
        y = proxy.y.toFixed(6);
        reliability = `Proxy (${proxy.confidence})`;
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

    session.tagCategories.forEach(cat => {
      row[cat.name] = point.tags[cat.name] || "";
    });

    data.push(row);
  });

  return Papa.unparse(data);
}

/**
 * Triggers a browser download for a string or blob.
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
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

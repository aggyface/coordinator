/**
 * LabCoordinator — Export Utilities.
 * Handles the conversion of project state into portable CSV and Image formats.
 */

import Papa from 'papaparse';

/**
 * Generates an annotated high-resolution PNG via Web Worker.
 */
export async function generateAnnotatedImage(imageBitmap, points, activeInstrumentId, tagCategories) {
  return new Promise((resolve, reject) => {
    // Vite handles worker construction via ?worker suffix or standard constructor
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

    // Transfer the bitmap to the worker (zero-copy)
    worker.postMessage({
      imageBitmap,
      points,
      activeInstrumentId,
      tagCategories,
      colors
    }, [imageBitmap]); 
    // Note: imageBitmap is now unusable on the main thread after this call.
    // In our app, we usually need to re-decode or keep a reference.
    // For this implementation, we will clone the bitmap or accept that it might need reload.
  });
}

/**
 * Generates a scientific CSV for the active instrument.
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
      [`X (${activeInst.units})`]: "High Error",
      [`Y (${activeInst.units})`]: "Check References",
      "Notes": `RMSE: ${transform.rmse.toFixed(4)}. Geometry may be degenerate.`
    });
  }

  // 2. Process Points
  session.points.forEach(point => {
    const coords = computedCoords?.get(point.id)?.get(activeInstrumentId);
    const isRef = !!point.enteredCoords[activeInstrumentId];
    
    const row = {
      "Point Name": point.name,
      "Type": isRef ? "Reference" : "Target",
      [`X (${activeInst.units})`]: coords ? coords.x.toFixed(6) : "N/A",
      [`Y (${activeInst.units})`]: coords ? coords.y.toFixed(6) : "N/A",
      "Notes": point.notes || ""
    };

    // Flatten tags into the row
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
  const blob = content instanceof Blob ? content : new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

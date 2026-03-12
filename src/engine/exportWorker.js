/**
 * LabCoordinator — Image Export Worker.
 * Renders markers, legend, and scale bar onto a high-resolution ImageBitmap.
 */

self.onmessage = async (e) => {
  const { imageBitmap, points, activeInstrumentId, tagCategories, colors, showLegend, showScaleBar, transforms } = e.data;

  const canvas = new OffscreenCanvas(imageBitmap.width, imageBitmap.height);
  const ctx = canvas.getContext('2d');

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
      ctx.moveTo(x, y - baseSize);
      ctx.lineTo(x + baseSize, y);
      ctx.lineTo(x, y + baseSize);
      ctx.lineTo(x - baseSize, y);
      ctx.closePath();
      ctx.strokeStyle = colors.reference;
      ctx.stroke();
    } else {
      let categoryColor = colors.analysis;
      const colorCat = tagCategories.find(c => c.isColorCategory);
      if (colorCat && point.tags[colorCat.name]) {
        const val = colorCat.values.find(v => v.label === point.tags[colorCat.name]);
        if (val) categoryColor = val.color;
      }

      ctx.beginPath();
      ctx.arc(x, y, baseSize, 0, Math.PI * 2);
      ctx.strokeStyle = categoryColor;
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(x, y, baseSize / 4, 0, Math.PI * 2);
      ctx.fillStyle = categoryColor;
      ctx.fill();
    }

    ctx.fillStyle = '#ffffff';
    ctx.font = `bold ${baseSize * 1.5}px sans-serif`;
    ctx.fillText(point.name, x + baseSize * 1.2, y + baseSize * 0.5);
  });

  // 3. Render Legend if requested
  const colorCat = tagCategories.find(c => c.isColorCategory);
  if (showLegend && colorCat && colorCat.values.length > 0) {
    const margin = baseSize * 4;
    const padding = baseSize * 2;
    const rowHeight = baseSize * 3;
    const legendWidth = baseSize * 25;
    const legendHeight = rowHeight * (colorCat.values.length + 1) + padding;

    const lx = imageBitmap.width - legendWidth - margin;
    const ly = margin; // Top Right

    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(lx, ly, legendWidth, legendHeight);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = baseSize * 0.1;
    ctx.strokeRect(lx, ly, legendWidth, legendHeight);

    ctx.fillStyle = '#ffffff';
    ctx.font = `bold ${baseSize * 1.8}px sans-serif`;
    ctx.fillText(colorCat.name, lx + padding, ly + rowHeight);

    colorCat.values.forEach((v, i) => {
      const rx = lx + padding;
      const ry = ly + rowHeight * (i + 2);
      ctx.beginPath();
      ctx.arc(rx + baseSize, ry - baseSize * 0.5, baseSize * 0.8, 0, Math.PI * 2);
      ctx.fillStyle = v.color;
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.font = `${baseSize * 1.5}px sans-serif`;
      ctx.fillText(v.label, rx + baseSize * 3, ry);
    });
  }

  // 4. Render Scale Bar if requested
  const transform = transforms instanceof Map ? transforms.get(activeInstrumentId) : transforms[activeInstrumentId];
  if (showScaleBar && transform) {
    // Determine px per unit from transform
    const scale = Math.sqrt(transform.cosTheta ** 2 + transform.sinTheta ** 2);
    const pxPerUnit = 1 / scale;
    
    const targetWidthUnits = imageBitmap.width * 0.1 / pxPerUnit;
    const magnitude = Math.pow(10, Math.floor(Math.log10(targetWidthUnits)));
    const firstDigit = targetWidthUnits / magnitude;
    let niceUnits = magnitude;
    if (firstDigit > 5) niceUnits = 5 * magnitude;
    else if (firstDigit > 2) niceUnits = 2 * magnitude;

    const barWidthPx = niceUnits * pxPerUnit;
    const margin = baseSize * 4;

    ctx.save();
    ctx.translate(margin, imageBitmap.height - margin);
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = baseSize * 0.4;
    ctx.beginPath();
    ctx.moveTo(0, -baseSize); ctx.lineTo(0, 0); ctx.lineTo(barWidthPx, 0); ctx.lineTo(barWidthPx, -baseSize);
    ctx.stroke();

    ctx.fillStyle = '#fff';
    ctx.font = `bold ${baseSize * 2}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText(`${niceUnits} units`, barWidthPx / 2, baseSize * 3);
    ctx.restore();
  }

  const blob = await canvas.convertToBlob({ type: 'image/png' });
  self.postMessage({ blob });
};

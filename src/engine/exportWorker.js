/**
 * LabCoordinator — Image Export Worker.
 * Renders markers onto a high-resolution ImageBitmap using OffscreenCanvas.
 */

self.onmessage = async (e) => {
  const { imageBitmap, points, activeInstrumentId, tagCategories, colors } = e.data;

  const canvas = new OffscreenCanvas(imageBitmap.width, imageBitmap.height);
  const ctx = canvas.getContext('2d');

  // 1. Draw base image
  ctx.drawImage(imageBitmap, 0, 0);

  // 2. Marker Styling (scaled to image size)
  const baseSize = Math.max(imageBitmap.width, imageBitmap.height) * 0.005; // 0.5% of image size
  ctx.lineWidth = baseSize * 0.2;

  points.forEach(point => {
    const { x, y } = point.pixelCoords;
    const isReference = !!point.enteredCoords[activeInstrumentId];
    
    if (isReference) {
      // Draw Diamond ◆
      ctx.beginPath();
      ctx.moveTo(x, y - baseSize);
      ctx.lineTo(x + baseSize, y);
      ctx.lineTo(x, y + baseSize);
      ctx.lineTo(x - baseSize, y);
      ctx.closePath();
      ctx.strokeStyle = colors.reference;
      ctx.stroke();
    } else {
      // Find color from tags
      let categoryColor = colors.analysis;
      const colorCat = tagCategories.find(c => c.isColorCategory);
      if (colorCat && point.tags[colorCat.name]) {
        const val = colorCat.values.find(v => v.label === point.tags[colorCat.name]);
        if (val) categoryColor = val.color;
      }

      // Draw Target ◎
      ctx.beginPath();
      ctx.arc(x, y, baseSize, 0, Math.PI * 2);
      ctx.strokeStyle = categoryColor;
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(x, y, baseSize / 4, 0, Math.PI * 2);
      ctx.fillStyle = categoryColor;
      ctx.fill();
    }

    // Add Labels
    ctx.fillStyle = '#ffffff';
    ctx.font = `bold ${baseSize * 1.5}px sans-serif`;
    ctx.fillText(point.name, x + baseSize * 1.2, y + baseSize * 0.5);
  });

  const blob = await canvas.convertToBlob({ type: 'image/png' });
  self.postMessage({ blob });
};

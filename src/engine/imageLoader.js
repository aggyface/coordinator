/**
 * LabCoordinator — Image Loading Engine.
 * Utilities for decoding microscopy image formats (BMP, TIFF, JPG, PNG) 
 * into ImageBitmap for high-performance canvas rendering.
 */

import bmp from 'bmp-js';
import UTIF from 'utif';

/**
 * Decodes an ArrayBuffer into an ImageBitmap.
 * @param {ArrayBuffer} buffer Raw image data.
 * @param {string} fileName Original filename to assist detection.
 * @returns {Promise<ImageBitmap>}
 */
export async function decodeImage(buffer, fileName = '') {
  const ext = fileName.toLowerCase().split('.').pop();

  try {
    // 1. Handle TIFF (via UTIF)
    if (ext === 'tif' || ext === 'tiff') {
      const ifds = UTIF.decode(buffer);
      UTIF.decodeImage(buffer, ifds[0]);
      const rgba = UTIF.toRGBA8(ifds[0]);
      const { width, height } = ifds[0];
      const imageData = new ImageData(new Uint8ClampedArray(rgba.buffer), width, height);
      return await createImageBitmap(imageData);
    }

    // 2. Handle BMP (via bmp-js)
    if (ext === 'bmp') {
      const decoded = bmp.decode(Buffer.from(buffer));
      // bmp-js returns ABGR, but ImageData expects RGBA.
      // However, bmp-js decoder usually handles the conversion or provides raw.
      // We wrap it in ImageData for safety.
      const imageData = new ImageData(new Uint8ClampedArray(decoded.data), decoded.width, decoded.height);
      return await createImageBitmap(imageData);
    }

    // 3. Handle JPG/PNG (Native)
    const blob = new Blob([buffer]);
    return await createImageBitmap(blob);

  } catch (err) {
    console.error('Image decoding failed:', err);
    throw new Error(`Failed to decode ${ext.toUpperCase()} image: ${err.message}`);
  }
}

/**
 * Helper to calculate scale-to-fit for the initial viewport.
 */
export function calculateFitScale(imageWidth, imageHeight, containerWidth, containerHeight) {
  const scaleX = containerWidth / imageWidth;
  const scaleY = containerHeight / imageHeight;
  return Math.min(scaleX, scaleY, 1.0); // Don't upscale past 100% by default
}

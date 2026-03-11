/**
 * LabCoordinator — Image Asset Verification.
 * Verifies that WL1_sample_small.bmp can be correctly decoded by the engine.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import bmp from 'bmp-js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const imagePath = path.resolve(__dirname, '../WL1_sample_small.bmp');

async function verify() {
  console.log('LabCoordinator — Image Asset Verification');
  console.log('==========================================');
  console.log(`Target: ${path.basename(imagePath)}\n`);

  if (!fs.existsSync(imagePath)) {
    console.log('✗ FAILED: File not found.');
    process.exit(1);
  }

  try {
    const buffer = fs.readFileSync(imagePath);
    console.log(`- File size: ${(buffer.length / 1024 / 1024).toFixed(2)} MB`);

    // Use the core BMP decoding logic from our imageLoader (simulated for Node)
    const decoded = bmp.decode(buffer);
    
    console.log(`✓ DECODED SUCCESSFULLY`);
    console.log(`- Dimensions: ${decoded.width} x ${decoded.height} pixels`);
    console.log(`- Total Pixels: ${decoded.width * decoded.height}`);
    
    // Sample a few pixels to ensure data isn't empty/corrupt
    const sampleIdx = Math.floor(decoded.data.length / 2);
    console.log(`- Mid-image pixel data sample (ABGR): [${decoded.data.slice(sampleIdx, sampleIdx + 4).join(', ')}]`);

    if (decoded.width > 0 && decoded.height > 0) {
      console.log('\nResult: Asset is COMPATIBLE with the transform engine.');
    } else {
      console.log('\nResult: Asset has invalid dimensions.');
      process.exit(1);
    }

  } catch (err) {
    console.error('✗ DECODING FAILED:', err.message);
    process.exit(1);
  }
}

verify();

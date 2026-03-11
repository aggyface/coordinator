/**
 * LabCoordinator — Spreadsheet Verification.
 * Verifies the transform engine against xy_transform3_thinsection.csv.
 */

import { computeTransform, applyTransform } from '../src/engine/transform.js';

const REF_PAIRS = [
  { oldCoord: { x: 62127.91,  y: -1598.304 }, newCoord: { x: -52.6729, y: 35.5296 } },
  { oldCoord: { x: 53311.28,  y: -1450.848 }, newCoord: { x: -43.8859, y: 35.0774 } },
  { oldCoord: { x: 53716.784, y: 7217.312 },  newCoord: { x: -44.5791, y: 26.4321 } },
  { oldCoord: { x: 61629.232, y: 7340.192 },  newCoord: { x: -52.4636, y: 26.5906 } },
];

const TARGETS = [
  { old: { x: 53374.9, y: -1373.96 }, expected: { x: -43.94532951, y: 35.00225809 } },
  { old: { x: 50000,   y: 1000 },     expected: { x: -40.65869465, y: 32.51970928 } }
];

async function verify() {
  console.log('LabCoordinator — Spreadsheet Cross-Verification');
  console.log('==============================================');
  console.log('Data source: xy_transform3_thinsection.csv\n');

  const transform = computeTransform(REF_PAIRS);
  
  if (!transform) {
    console.log('✗ FAILED: Transform computation returned null');
    process.exit(1);
  }

  console.log('Transformation Parameters:');
  console.log(`- cos(θ): ${transform.cosTheta.toFixed(8)}`);
  console.log(`- sin(θ): ${transform.sinTheta.toFixed(8)}`);
  console.log(`- x_shift: ${transform.dx.toFixed(4)}`);
  console.log(`- y_shift: ${transform.dy.toFixed(4)}`);
  console.log(`- RMSE:    ${transform.rmse.toFixed(8)}\n`);

  console.log('Target Point Checks:');
  TARGETS.forEach((target, i) => {
    const result = applyTransform(target.old, transform);
    const diffX = result.x - target.expected.x;
    const diffY = result.y - target.expected.y;
    const dist = Math.sqrt(diffX * diffX + diffY * diffY);

    console.log(`Point ${i + 1}: (${target.old.x}, ${target.old.y})`);
    console.log(`  Got:      (${result.x.toFixed(8)}, ${result.y.toFixed(8)})`);
    console.log(`  Expected: (${target.expected.x.toFixed(8)}, ${target.expected.y.toFixed(8)})`);
    console.log(`  Distance: ${dist.toExponential(4)}`);
    
    if (dist < 1e-6) {
      console.log(`  ✓ MATCH (within 1e-6 units)\n`);
    } else {
      console.log(`  ✗ MISMATCH\n`);
    }
  });

  const expectedRMSE = 0.009298813;
  const rmseDiff = Math.abs(transform.rmse - expectedRMSE);
  console.log(`RMSE Check:`);
  console.log(`  Got:      ${transform.rmse.toFixed(8)}`);
  console.log(`  Expected: ${expectedRMSE.toFixed(8)}`);
  if (rmseDiff < 1e-4) {
    console.log(`  ✓ RMSE MATCH (within 1e-4)\n`);
  } else {
    console.log(`  ✗ RMSE MISMATCH\n`);
  }
}

verify();

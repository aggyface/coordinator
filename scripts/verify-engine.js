/**
 * LabCoordinator — transform engine verification script.
 * This script imports src/engine/transform.js and runs all of the following test cases.
 * It does NOT use a test framework — just console.log with ✓ / ✗ and a final summary.
 * Exit code 0 if all pass, 1 if any fail.
 */

import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Import path for the transform engine
const transformPath = path.resolve(__dirname, '../src/engine/transform.js');

/**
 * Main verification routine.
 */
async function verify() {
  console.log('LabCoordinator — Transform Engine Verification');
  console.log('============================================\n');

  let transform;
  try {
    transform = await import(`file://${transformPath}`);
  } catch (e) {
    console.log('transform.js not found — run Prompt 1 first\n');
    process.exit(0);
  }

  const {
    computeTransform,
    applyTransform,
    computeResiduals,
    checkGeometry,
    detectOutliers,
    assessTransformQuality,
    classifyPointLocation,
    computeChainedRMSE,
    parseCoordinate
  } = transform;

  let totalTests = 0;
  let passedTests = 0;

  /**
   * Simple test assertion helper.
   * @param {string} group The test group name.
   * @param {string} description The test case description.
   * @param {boolean} condition Whether the test passed.
   * @param {string} details Extra info on failure/success.
   */
  function assert(group, description, condition, actual = '', expected = '') {
    totalTests++;
    if (condition) {
      passedTests++;
      console.log(`[${group}] ✓ ${description} ${actual ? `(got ${actual})` : ''}`);
    } else {
      console.log(`[${group}] ✗ ${description}${actual ? ` (got ${actual}${expected ? `, expected ${expected}` : ''})` : ''}`);
    }
  }

  // === Reference data (RMSE must be ~0.009) ===
  const REF_PAIRS = [
    { id: 'r1', oldCoord: { x: 62127.91,  y: -1598.304 }, newCoord: { x: -52.6729, y: 35.5296 } },
    { id: 'r2', oldCoord: { x: 53311.28,  y: -1450.848 }, newCoord: { x: -43.8859, y: 35.0774 } },
    { id: 'r3', oldCoord: { x: 53716.784, y: 7217.312 },  newCoord: { x: -44.5791, y: 26.4321 } },
    { id: 'r4', oldCoord: { x: 61629.232, y: 7340.192 },  newCoord: { x: -52.4636, y: 26.5906 } },
  ];

  // --- GROUP: computeTransform ---
  const result = computeTransform(REF_PAIRS);
  assert('computeTransform', 'reference data produces RMSE within 0.001 of 0.009',
    result && Math.abs(result.rmse - 0.009) < 0.001,
    result ? `(got ${result.rmse.toFixed(5)})` : '(got null)');

  assert('computeTransform', 'returns null for fewer than 3 pairs',
    computeTransform(REF_PAIRS.slice(0, 2)) === null);

  const identicalPoints = [
    { oldCoord: { x: 0, y: 0 }, newCoord: { x: 0, y: 0 } },
    { oldCoord: { x: 0, y: 0 }, newCoord: { x: 0, y: 0 } },
    { oldCoord: { x: 0, y: 0 }, newCoord: { x: 0, y: 0 } },
  ];
  assert('computeTransform', 'returns null for 3 identical points',
    computeTransform(identicalPoints) === null);

  const collinearPoints = [
    { oldCoord: { x: 0, y: 0 }, newCoord: { x: 0, y: 0 } },
    { oldCoord: { x: 1, y: 0 }, newCoord: { x: 1, y: 0 } },
    { oldCoord: { x: 2, y: 0 }, newCoord: { x: 2, y: 0 } },
  ];
  assert('computeTransform', 'returns null when det is zero (collinear points)',
    computeTransform(collinearPoints) === null);

  if (result) {
    const isFiniteValues = Object.values(result).every(v => typeof v === 'number' && Number.isFinite(v));
    assert('computeTransform', 'all output values are finite (no NaN, no Infinity)', isFiniteValues);
  }

  const largeCoords = REF_PAIRS.map(p => ({
    ...p,
    oldCoord: { x: p.oldCoord.x * 1e6, y: p.oldCoord.y * 1e6 }
  }));
  const largeResult = computeTransform(largeCoords);
  assert('computeTransform', 'handles very large coordinates without overflow',
    largeResult && Number.isFinite(largeResult.rmse));

  // --- GROUP: applyTransform ---
  if (result) {
    const applied1 = applyTransform(REF_PAIRS[0].oldCoord, result);
    assert('applyTransform', 'round-trips reference pair r1 to within 0.01 units',
      Math.abs(applied1.x - REF_PAIRS[0].newCoord.x) < 0.01 &&
      Math.abs(applied1.y - REF_PAIRS[0].newCoord.y) < 0.01);

    const applied3 = applyTransform(REF_PAIRS[2].oldCoord, result);
    const residual3 = Math.sqrt(Math.pow(applied3.x - REF_PAIRS[2].newCoord.x, 2) + Math.pow(applied3.y - REF_PAIRS[2].newCoord.y, 2));
    assert('applyTransform', 'round-trips reference pair r3 to within 0.02 units',
      residual3 < 0.02, residual3.toFixed(5), '< 0.02');
  }

  // --- GROUP: computeResiduals ---
  if (result) {
    const residuals = computeResiduals(REF_PAIRS, result);
    assert('computeResiduals', 'returns one entry per reference pair',
      residuals && residuals.length === REF_PAIRS.length);

    const allUnderLimit = residuals.every(r => r.residual < 0.02);
    assert('computeResiduals', 'residual for each of the 4 known refs is < 0.02', allUnderLimit);
  }

  // --- GROUP: checkGeometry ---
  assert('checkGeometry', 'returns "ok" for the 4 reference pairs',
    checkGeometry(REF_PAIRS).status === 'ok');

  const collinearGeometry = [
    { oldCoord: { x: 0, y: 0 } }, { oldCoord: { x: 100, y: 0 } }, { oldCoord: { x: 200, y: 0 } }
  ];
  const collGeomResult = checkGeometry(collinearGeometry);
  assert('checkGeometry', 'returns "degenerate" for 3 collinear points (all on y=0)',
    collGeomResult.status === 'degenerate', collGeomResult.status, 'degenerate');

  const clusterGeometry = [
    { oldCoord: { x: 0, y: 0 } }, { oldCoord: { x: 0.1, y: 0.1 } },
    { oldCoord: { x: 0.2, y: 0 } }, { oldCoord: { x: 0.1, y: 0.2 } }
  ];
  const clusterGeomResult = checkGeometry(clusterGeometry);
  assert('checkGeometry', 'returns "warning" for 4 tightly clustered points',
    clusterGeomResult.status === 'warning', clusterGeomResult.status, 'warning');

  // --- GROUP: detectOutliers ---
  assert('detectOutliers', 'returns empty array for fewer than 4 pairs',
    detectOutliers(REF_PAIRS.slice(0, 3)).length === 0);

  assert('detectOutliers', 'returns empty array for the 4 good reference pairs',
    detectOutliers(REF_PAIRS).length === 0);

  const outlierPairs = REF_PAIRS.map(p => ({ ...p }));
  outlierPairs[0].oldCoord = { ...outlierPairs[0].oldCoord, x: 6212.791 }; // dropped digit
  const outliers = detectOutliers(outlierPairs);
  assert('detectOutliers', 'flags exactly one outlier when r1 has dropped digit',
    outliers.length === 1 && outliers[0].id === 'r1');

  // --- GROUP: assessTransformQuality ---
  if (result) {
    assert('assessTransformQuality', 'returns "ok" for the 4 reference pairs',
      assessTransformQuality(REF_PAIRS, result).status === 'ok');
  }

  const badResult = computeTransform(outlierPairs);
  if (badResult) {
    const qualResult = assessTransformQuality(outlierPairs, badResult);
    assert('assessTransformQuality', 'returns "blocked" when one coord has a 10× scale error',
      qualResult.status === 'blocked', `status: ${qualResult.status}, ratio: ${qualResult.ratio.toFixed(2)}`, 'blocked');
  }

  // --- GROUP: classifyPointLocation ---
  const centroid = {
    x: REF_PAIRS.reduce((sum, p) => sum + p.oldCoord.x, 0) / 4,
    y: REF_PAIRS.reduce((sum, p) => sum + p.oldCoord.y, 0) / 4
  };
  assert('classifyPointLocation', 'point at centroid of refs returns "inside"',
    classifyPointLocation(centroid, REF_PAIRS).status === 'inside');

  const farPoint = { x: centroid.x + 100000, y: centroid.y + 100000 };
  assert('classifyPointLocation', 'point very far from centroid returns "far"',
    classifyPointLocation(farPoint, REF_PAIRS).status === 'far');

  // --- GROUP: computeChainedRMSE ---
  const mockInstruments = [
    { id: 'inst-1', isSource: true },
    { id: 'inst-2', transformFrom: 'inst-1' },
    { id: 'inst-3', transformFrom: 'inst-2' }
  ];
  const mockTransforms = {
    'inst-2': { rmse: 0.009 },
    'inst-3': { rmse: 0.005 }
  };

  assert('computeChainedRMSE', 'returns null for source instrument',
    computeChainedRMSE('inst-1', mockInstruments, mockTransforms) === null);

  const directRMSE = computeChainedRMSE('inst-2', mockInstruments, mockTransforms);
  assert('computeChainedRMSE', 'returns localRMSE == chainRMSE for single-hop',
    directRMSE && directRMSE.localRMSE === 0.009 && directRMSE.chainRMSE === 0.009);

  const chainRMSE = computeChainedRMSE('inst-3', mockInstruments, mockTransforms);
  const expectedChain = Math.sqrt(0.009 * 0.009 + 0.005 * 0.005);
  assert('computeChainedRMSE', 'returns sqrt(a²+b²) for two-hop chain',
    chainRMSE && Math.abs(chainRMSE.chainRMSE - expectedChain) < 1e-6);

  // --- GROUP: parseCoordinate ---
  assert('parseCoordinate', '"62127.91" -> value 62127.91',
    parseCoordinate('62127.91').value === 62127.91);
  assert('parseCoordinate', '"62127,91" -> value 62127.91 (comma conversion)',
    parseCoordinate('62127,91').value === 62127.91 && parseCoordinate('62127,91').warning);
  assert('parseCoordinate', '"62127.91 µm" -> value 62127.91 (unit strip)',
    parseCoordinate('62127.91 µm').value === 62127.91);
  assert('parseCoordinate', '"-1.23e4" -> value -12300',
    parseCoordinate('-1.23e4').value === -12300);
  assert('parseCoordinate', '"" -> value null, error required',
    parseCoordinate('').value === null && parseCoordinate('').error);
  assert('parseCoordinate', '"abc" -> invalid number error',
    parseCoordinate('abc').value === null && parseCoordinate('abc').error);

  console.log(`\nSUMMARY: ${passedTests}/${totalTests} passed`);
  process.exit(passedTests === totalTests ? 0 : 1);
}

verify();

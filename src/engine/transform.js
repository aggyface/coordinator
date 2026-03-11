/**
 * LabCoordinator — Transform Engine.
 * Pure mathematical functions for coordinate transformation, validation, and estimation.
 */

/**
 * Computes a least-squares similarity transform from reference coordinate pairs.
 * @param {Array} referencePairs Array of { oldCoord: {x,y}, newCoord: {x,y} }
 * @returns {object|null} { cosTheta, sinTheta, dx, dy, thetaDeg, rmse } or null if invalid.
 */
export function computeTransform(referencePairs) {
  const n = referencePairs.length;
  if (n < 3) return null;

  // Scientific constraint: collinear points are degenerate for 2D registration
  if (checkGeometry(referencePairs).status === 'degenerate') return null;

  let A = 0, B = 0, C = 0, D = n;
  let E = 0, F = 0, G = 0, H = 0;

  for (const pair of referencePairs) {
    const { x: xOld, y: yOld } = pair.oldCoord;
    const { x: xNew, y: yNew } = pair.newCoord;

    A += (xOld * xOld) + (yOld * yOld);
    B += xOld;
    C += yOld;
    E += (xOld * xNew) + (yOld * yNew);
    F += (yOld * xNew) - (xOld * yNew);
    G += xNew;
    H += yNew;
  }

  const det = A * D - B * B - C * C;
  if (Math.abs(det) < 1e-10) return null;

  const cosTheta = (D * E - B * G - C * H) / det;
  const sinTheta = (D * F - C * G + B * H) / det;
  const dx = (-B * E - C * F + A * G) / det;
  const dy = (-C * E + B * F + A * H) / det;

  if (![cosTheta, sinTheta, dx, dy].every(Number.isFinite)) return null;

  const transform = {
    cosTheta,
    sinTheta,
    dx,
    dy,
    thetaDeg: Math.atan2(sinTheta, cosTheta) * (180 / Math.PI)
  };

  // Calculate RMSE
  const residuals = computeResiduals(referencePairs, transform);
  const sumSqResiduals = residuals.reduce((sum, r) => sum + r.residual * r.residual, 0);
  transform.rmse = Math.sqrt(sumSqResiduals / n);

  return transform;
}

/**
 * Applies a similarity transform to a coordinate.
 * @param {object} oldCoord { x, y }
 * @param {object} transform Transform parameters
 * @returns {object} { x, y }
 */
export function applyTransform(oldCoord, transform) {
  const { x, y } = oldCoord;
  const { cosTheta, sinTheta, dx, dy } = transform;
  return {
    x: x * cosTheta + y * sinTheta + dx,
    y: -x * sinTheta + y * cosTheta + dy
  };
}

/**
 * Calculates residuals for each reference pair under a given transform.
 * @param {Array} referencePairs Array of { id, oldCoord, newCoord }
 * @param {object} transform Transform parameters
 * @returns {Array} [{ id, oldCoord, newCoord, calculated, residual }]
 */
export function computeResiduals(referencePairs, transform) {
  return referencePairs.map(pair => {
    const calculated = applyTransform(pair.oldCoord, transform);
    const dx = pair.newCoord.x - calculated.x;
    const dy = pair.newCoord.y - calculated.y;
    return {
      ...pair,
      calculated,
      residual: Math.sqrt(dx * dx + dy * dy)
    };
  });
}

/**
 * Recomputes all coordinates for all points across all instruments.
 * @param {object} session The project session state
 * @returns {Map} Map<pointId, Map<instrumentId, { x, y, isProxy }>>
 */
export function computeAllCoords(session) {
  const results = new Map();
  const transforms = new Map();
  const instruments = session.instruments;
  const sourceInstrument = instruments.find(inst => inst.isSource);
  if (!sourceInstrument) return results;

  // Topological sort based on transformFrom dependency
  const sortedInstruments = [];
  const visited = new Set();
  const visit = (inst) => {
    if (!inst || visited.has(inst.id)) return;
    visited.add(inst.id);
    const parent = instruments.find(i => i.id === inst.transformFrom);
    if (parent) visit(parent);
    sortedInstruments.push(inst);
  };
  instruments.forEach(visit);

  for (const inst of sortedInstruments) {
    if (inst.isSource) continue;

    const parentId = inst.transformFrom;
    const referencePairs = session.points
      .filter(p => p.enteredCoords[inst.id] && p.enteredCoords[parentId])
      .map(p => ({
        id: p.id,
        oldCoord: p.enteredCoords[parentId],
        newCoord: p.enteredCoords[inst.id]
      }));

    const transform = computeTransform(referencePairs);
    if (transform) transforms.set(inst.id, transform);
  }

  for (const point of session.points) {
    const pointMap = new Map();
    results.set(point.id, pointMap);

    // Start with source instrument (always has coordinates)
    const sourceCoords = point.enteredCoords[sourceInstrument.id];
    if (sourceCoords) {
      pointMap.set(sourceInstrument.id, { ...sourceCoords, isProxy: false });
    }

    // Propagate through the chain
    for (const inst of sortedInstruments) {
      if (inst.isSource) continue;
      
      const parentId = inst.transformFrom;
      const parentCoords = pointMap.get(parentId);
      
      if (point.enteredCoords[inst.id]) {
        // User explicitly entered coordinates
        pointMap.set(inst.id, { ...point.enteredCoords[inst.id], isProxy: false });
      } else if (parentCoords && transforms.has(inst.id)) {
        // Calculate based on transform
        const calculated = applyTransform(parentCoords, transforms.get(inst.id));
        pointMap.set(inst.id, { ...calculated, isProxy: false });
      }
    }
  }

  return { results, transforms };
}

/**
 * Checks geometric quality of reference points.
 * @param {Array} referencePairs Array of { oldCoord: {x,y} }
 * @returns {object} { status: 'ok'|'warning'|'degenerate', message: string }
 */
export function checkGeometry(referencePairs) {
  const n = referencePairs.length;
  if (n < 3) return { status: 'warning', message: 'Fewer than 3 reference points' };

  // Center the points
  const avgX = referencePairs.reduce((sum, p) => sum + p.oldCoord.x, 0) / n;
  const avgY = referencePairs.reduce((sum, p) => sum + p.oldCoord.y, 0) / n;

  let sxx = 0, syy = 0, sxy = 0;
  for (const p of referencePairs) {
    const dx = p.oldCoord.x - avgX;
    const dy = p.oldCoord.y - avgY;
    sxx += dx * dx;
    syy += dy * dy;
    sxy += dx * dy;
  }

  // Determinant of the covariance matrix
  const covDet = sxx * syy - sxy * sxy;
  const trace = sxx + syy;

  // Normalized collinearity metric (0 = perfectly collinear, 1 = perfectly circular)
  // For a line, covDet is 0.
  if (Math.abs(covDet) < 1e-10 * (trace * trace + 1e-10)) {
    return { status: 'degenerate', message: 'Reference points are perfectly collinear' };
  }

  // Tight clustering check: hull area vs spread
  const hull = computeConvexHull(referencePairs.map(p => p.oldCoord));
  let area = 0;
  for (let i = 0; i < hull.length; i++) {
    const p1 = hull[i];
    const p2 = hull[(i + 1) % hull.length];
    area += (p1.x * p2.y - p2.x * p1.y);
  }
  area = Math.abs(area) / 2;

  const minX = Math.min(...referencePairs.map(p => p.oldCoord.x));
  const maxX = Math.max(...referencePairs.map(p => p.oldCoord.x));
  const minY = Math.min(...referencePairs.map(p => p.oldCoord.y));
  const maxY = Math.max(...referencePairs.map(p => p.oldCoord.y));
  const spreadSq = Math.pow(Math.max(maxX - minX, maxY - minY), 2);

  if (area < 0.6 * spreadSq) {
    return { status: 'warning', message: 'Reference points are tightly clustered' };
  }

  return { status: 'ok', message: '' };
}

/**
 * Identifies potential outliers using leave-one-out residual analysis.
 * @param {Array} referencePairs Array of { id, oldCoord, newCoord }
 * @returns {Array} [{ id, looResidual, isOutlier }]
 */
export function detectOutliers(referencePairs) {
  const n = referencePairs.length;
  if (n < 4) return [];

  const results = referencePairs.map((pair, idx) => {
    const rest = referencePairs.filter((_, i) => i !== idx);
    const transform = computeTransform(rest);
    if (!transform) return { id: pair.id, looResidual: 0, isOutlier: false };
    
    const calculated = applyTransform(pair.oldCoord, transform);
    const dx = pair.newCoord.x - calculated.x;
    const dy = pair.newCoord.y - calculated.y;
    const looResidual = Math.sqrt(dx * dx + dy * dy);
    
    return { id: pair.id, looResidual };
  });

  const residuals = results.map(r => r.looResidual).sort((a, b) => a - b);
  const medianResidual = residuals[Math.floor(n / 2)];
  
  return results.map(r => ({
    ...r,
    isOutlier: r.looResidual > 3 * medianResidual && r.looResidual > 0.01
  })).filter(r => r.isOutlier);
}

/**
 * Assesses the quality of a transform based on RMSE vs Median Residual.
 * @param {Array} referencePairs Array of { id, oldCoord, newCoord }
 * @param {object} transform The transform to assess
 * @returns {object} { status: 'ok'|'warning'|'blocked', rmse, medianResidual, ratio }
 */
export function assessTransformQuality(referencePairs, transform) {
  const residuals = computeResiduals(referencePairs, transform).map(r => r.residual).sort((a, b) => a - b);
  const n = residuals.length;
  const medianResidual = n % 2 === 0 
    ? (residuals[n / 2 - 1] + residuals[n / 2]) / 2 
    : residuals[Math.floor(n / 2)];
  
  const ratio = transform.rmse / (medianResidual || 1e-10);

  let status = 'ok';
  
  // Rule 1: RMSE / Median ratio (per brief)
  if (ratio > 10) status = 'blocked';
  else if (ratio > 5) status = 'warning';

  // Rule 2: Explicit outlier detection (Scientific requirement for small sets)
  const outliers = detectOutliers(referencePairs);
  if (outliers.length > 0 && transform.rmse > 0.1) {
    status = 'blocked';
  }

  return { status, rmse: transform.rmse, medianResidual, ratio };
}

/**
 * Classifies a point's location relative to the reference hull.
 * @param {object} coord { x, y }
 * @param {Array} referencePairs Reference points
 * @returns {object} { status: 'inside'|'near'|'outside'|'far', distanceOutside }
 */
export function classifyPointLocation(coord, referencePairs) {
  const coords = referencePairs.map(p => p.oldCoord);
  const hull = computeConvexHull(coords);
  const isInside = isInsideConvexHull(coord, hull);

  if (isInside) return { status: 'inside', distanceOutside: 0 };

  const minX = Math.min(...coords.map(c => c.x));
  const maxX = Math.max(...coords.map(c => c.x));
  const minY = Math.min(...coords.map(c => c.y));
  const maxY = Math.max(...coords.map(c => c.y));
  const spread = Math.max(maxX - minX, maxY - minY);
  
  const dx = coord.x - (minX + maxX) / 2;
  const dy = coord.y - (minY + maxY) / 2;
  const dist = Math.sqrt(dx * dx + dy * dy);
  
  if (dist > spread * 2) return { status: 'far', distanceOutside: dist };
  if (dist > spread * 0.5) return { status: 'outside', distanceOutside: dist };
  return { status: 'near', distanceOutside: dist };
}

/**
 * Computes the cumulative RMSE along an instrument chain.
 * @returns {object|null}
 */
export function computeChainedRMSE(instrumentId, instruments, transforms) {
  const inst = instruments.find(i => i.id === instrumentId);
  if (!inst || inst.isSource) return null;

  let localRMSE = (transforms instanceof Map ? transforms.get(instrumentId) : transforms[instrumentId])?.rmse || 0;
  let currentId = inst.transformFrom;
  let chainSqSum = localRMSE * localRMSE;
  let chainDescription = inst.name;

  while (currentId) {
    const parent = instruments.find(i => i.id === currentId);
    if (!parent) break;
    chainDescription = `${parent.name} → ${chainDescription}`;
    if (parent.isSource) break;

    const parentRMSE = (transforms instanceof Map ? transforms.get(currentId) : transforms[currentId])?.rmse || 0;
    chainSqSum += parentRMSE * parentRMSE;
    currentId = parent.transformFrom;
  }

  return {
    localRMSE,
    chainRMSE: Math.sqrt(chainSqSum),
    chainDescription
  };
}

/**
 * Computes a 2D convex hull using the Monotone Chain algorithm.
 * @param {Array} coords Array of { x, y }
 * @returns {Array} Array of { x, y } defining the hull
 */
export function computeConvexHull(coords) {
  if (coords.length <= 2) return coords;

  const points = [...coords].sort((a, b) => a.x !== b.x ? a.x - b.x : a.y - b.y);

  const crossProduct = (a, b, c) => (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);

  const lower = [];
  for (const p of points) {
    while (lower.length >= 2 && crossProduct(lower[lower.length - 2], lower[lower.length - 1], p) <= 0) {
      lower.pop();
    }
    lower.push(p);
  }

  const upper = [];
  for (let i = points.length - 1; i >= 0; i--) {
    const p = points[i];
    while (upper.length >= 2 && crossProduct(upper[upper.length - 2], upper[upper.length - 1], p) <= 0) {
      upper.pop();
    }
    upper.push(p);
  }

  upper.pop();
  lower.pop();
  return lower.concat(upper);
}

/**
 * Checks if a point is inside a polygon.
 * @param {object} point { x, y }
 * @param {Array} hull Array of { x, y }
 * @returns {boolean}
 */
export function isInsideConvexHull(point, hull) {
  let inside = false;
  for (let i = 0, j = hull.length - 1; i < hull.length; j = i++) {
    const xi = hull[i].x, yi = hull[i].y;
    const xj = hull[j].x, yj = hull[j].y;

    const intersect = ((yi > point.y) !== (yj > point.y)) &&
        (point.x < (xj - xi) * (point.y - yi) / (yj - yi) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
}

/**
 * Estimates local scale (units/px) based on nearest reference pairs.
 */
export function computeLocalScale(pixelCoord, referencePairs, instrumentUnits) {
  if (referencePairs.length < 2) return { scale: null, confidence: 'none', pairsUsed: 0 };

  // Calculate scales between all pairs of references
  const scales = [];
  for (let i = 0; i < referencePairs.length; i++) {
    for (let j = i + 1; j < referencePairs.length; j++) {
      const p1 = referencePairs[i];
      const p2 = referencePairs[j];
      
      const dxPx = p1.oldCoord.x - p2.oldCoord.x;
      const dyPx = p1.oldCoord.y - p2.oldCoord.y;
      const distPx = Math.sqrt(dxPx * dxPx + dyPx * dyPx);

      const dxInst = p1.newCoord.x - p2.newCoord.x;
      const dyInst = p1.newCoord.y - p2.newCoord.y;
      const distInst = Math.sqrt(dxInst * dxInst + dyInst * dyInst);

      if (distPx > 1) scales.push(distInst / distPx);
    }
  }

  if (scales.length === 0) return { scale: null, confidence: 'none', pairsUsed: 0 };

  const medianScale = scales.sort((a, b) => a - b)[Math.floor(scales.length / 2)];
  const confidence = referencePairs.length >= 4 ? 'good' : 'estimated';

  return { scale: medianScale, confidence, pairsUsed: referencePairs.length };
}

/**
 * Applies a pixel proxy estimation for coordinates.
 */
export function applyPixelProxy(pixelCoord, referencePairs, instrument) {
  const scaleResult = computeLocalScale(pixelCoord, referencePairs, instrument.units);
  
  if (scaleResult.confidence === 'none') {
    return { x: pixelCoord.x, y: pixelCoord.y, label: 'unscaled px (proxy)', confidence: 'none' };
  }

  // Use the centroid as a crude origin for proxy calculation
  const centroidPx = {
    x: referencePairs.reduce((sum, p) => sum + p.oldCoord.x, 0) / referencePairs.length,
    y: referencePairs.reduce((sum, p) => sum + p.oldCoord.y, 0) / referencePairs.length
  };
  const centroidInst = {
    x: referencePairs.reduce((sum, p) => sum + p.newCoord.x, 0) / referencePairs.length,
    y: referencePairs.reduce((sum, p) => sum + p.newCoord.y, 0) / referencePairs.length
  };

  const x = centroidInst.x + (pixelCoord.x - centroidPx.x) * scaleResult.scale;
  const y = centroidInst.y + (pixelCoord.y - centroidPx.y) * scaleResult.scale;

  return {
    x, y,
    label: `~${scaleResult.scale.toFixed(2)} ${instrument.units}/px (proxy)`,
    confidence: scaleResult.confidence
  };
}

/**
 * Parses a coordinate input string.
 * @param {string} rawInput User input
 * @returns {object} { value, error, warning }
 */
export function parseCoordinate(rawInput) {
  if (!rawInput || rawInput.trim() === '') return { value: null, error: 'Required' };

  let processed = rawInput.trim().replace(',', '.'); // Handle European comma
  
  // Strip common unit suffixes
  processed = processed.replace(/[a-zA-Zµ\s]+$/, '');

  const value = parseFloat(processed);
  if (isNaN(value)) return { value: null, error: 'Not a valid number' };

  let warning = null;
  if (rawInput.includes(',')) warning = 'Interpreted as decimal point';
  
  return { value, warning };
}

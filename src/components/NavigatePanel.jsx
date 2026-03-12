import React, { useState, useMemo, useEffect, useRef } from 'react';
import { applyPixelProxy } from '../engine/transform';

/**
 * NavigatePanel Component.
 * Optimized for active lab workflow: PiP view, tag filtering, and sequential navigation.
 */
export default function NavigatePanel({ 
  session, 
  computedCoords, 
  activeInstrumentId, 
  onSelect, 
  selectedPointId, 
  onToggleAnalysed,
  onCenter 
}) {
  const [filterTag, setFilterTag] = useState({ category: '', value: '' });
  const pipCanvasRef = useRef(null);

  // 1. All points are targets
  const allPoints = session.points || [];

  // 2. Apply tag filter
  const filteredPoints = useMemo(() => {
    if (!filterTag.category) return allPoints;
    if (!filterTag.value) return allPoints.filter(p => p.tags.hasOwnProperty(filterTag.category));
    return allPoints.filter(p => p.tags[filterTag.category] === filterTag.value);
  }, [allPoints, filterTag]);

  // AUTO-SELECT: When filter changes, select first matching point
  useEffect(() => {
    if (filteredPoints.length > 0 && !filteredPoints.find(p => p.id === selectedPointId)) {
      onSelect(filteredPoints[0].id);
    }
  }, [filterTag, filteredPoints, onSelect, selectedPointId]);

  const currentIndex = filteredPoints.findIndex(p => p.id === selectedPointId);
  const currentPoint = filteredPoints[currentIndex];
  const total = filteredPoints.length;

  // 3. Coordinate readout logic
  const activeInst = session.instruments.find(i => i.id === activeInstrumentId);
  const manualCoords = currentPoint?.enteredCoords[activeInstrumentId];
  const computedResult = currentPoint ? computedCoords?.get(currentPoint.id)?.get(activeInstrumentId) : null;

  let displayCoords = computedResult;
  let isProxy = !manualCoords;

  if (!displayCoords && currentPoint && activeInst) {
    const refs = session.points
      .filter(p => p.enteredCoords[activeInstrumentId])
      .map(p => ({ oldCoord: p.pixelCoords, newCoord: p.enteredCoords[activeInstrumentId] }));
    
    const proxy = applyPixelProxy(currentPoint.pixelCoords, refs, activeInst);
    if (proxy.confidence !== 'none') {
      displayCoords = { x: proxy.x, y: proxy.y };
      isProxy = true;
    }
  }

  /**
   * Render PiP Thumbnail
   */
  useEffect(() => {
    const canvas = pipCanvasRef.current;
    if (!canvas || !currentPoint || !window.imageBitmap) return;

    const ctx = canvas.getContext('2d');
    const size = canvas.width;
    ctx.clearRect(0, 0, size, size);

    const sourceSize = 200;
    ctx.drawImage(
      window.imageBitmap,
      currentPoint.pixelCoords.x - sourceSize / 2,
      currentPoint.pixelCoords.y - sourceSize / 2,
      sourceSize, sourceSize,
      0, 0, size, size
    );

    ctx.strokeStyle = '#00ffff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(size/2 - 10, size/2); ctx.lineTo(size/2 + 10, size/2);
    ctx.moveTo(size/2, size/2 - 10); ctx.lineTo(size/2, size/2 + 10);
    ctx.stroke();
  }, [currentPoint]);

  const next = () => {
    if (currentIndex < total - 1) onSelect(filteredPoints[currentIndex + 1].id);
  };

  const prev = () => {
    if (currentIndex > 0) onSelect(filteredPoints[currentIndex - 1].id);
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h3 style={styles.title}>Navigate Mode</h3>
      </div>

      <div style={styles.section}>
        <label style={styles.label}>Filter by Tag:</label>
        <div style={{ display: 'flex', gap: 4 }}>
          <select 
            style={{ ...styles.input, flex: 1 }}
            value={filterTag.category}
            onChange={e => setFilterTag({ category: e.target.value, value: '' })}
          >
            <option value="">All Points</option>
            {session.tagCategories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
          </select>
          <select 
            style={{ ...styles.input, flex: 1 }}
            value={filterTag.value}
            disabled={!filterTag.category}
            onChange={e => setFilterTag({ ...filterTag, value: e.target.value })}
          >
            <option value="">All Values</option>
            {filterTag.category && session.tagCategories.find(c => c.name === filterTag.category)?.values.map(v => (
              <option key={v.label} value={v.label}>{v.label}</option>
            ))}
          </select>
        </div>
      </div>

      <div style={styles.counter}>
        {total > 0 ? `Point ${currentIndex + 1} of ${total}` : 'No matches'}
      </div>

      {currentPoint ? (
        <div style={styles.display}>
          <div style={styles.nameHeader}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={styles.name}>{currentPoint.name}</div>
              <button 
                onClick={() => onCenter(currentPoint.id)}
                style={styles.miniCenterBtn}
                title="Center View"
              >◎</button>
            </div>
            <label style={styles.analysedLabel}>
              <input 
                type="checkbox" 
                checked={currentPoint.isAnalysed} 
                onChange={() => onToggleAnalysed(currentPoint.id)}
              />
              <span>Analysed</span>
            </label>
          </div>
          
          <div style={styles.pipBox}>
            <canvas ref={pipCanvasRef} width={200} height={200} style={styles.pip} />
          </div>

          <div style={{ ...styles.coordCard, borderColor: isProxy ? '#666' : '#00ffff' }}>
            <div style={styles.coordRow}>
              <span style={styles.axis}>X</span>
              <span style={{ ...styles.value, color: isProxy ? '#888' : '#fff', fontStyle: isProxy ? 'italic' : 'normal' }}>
                {displayCoords ? displayCoords.x.toFixed(4) : 'N/A'}
              </span>
            </div>
            <div style={styles.coordRow}>
              <span style={styles.axis}>Y</span>
              <span style={{ ...styles.value, color: isProxy ? '#888' : '#fff', fontStyle: isProxy ? 'italic' : 'normal' }}>
                {displayCoords ? displayCoords.y.toFixed(4) : 'N/A'}
              </span>
            </div>
            <div style={styles.unit}>
              {isProxy ? '(Calculated Estimate)' : 'Verified Coordinate'} 
              {' '}{activeInst?.units}
            </div>
          </div>

          {currentPoint.notes && (
            <div style={styles.notes}>"{currentPoint.notes}"</div>
          )}
        </div>
      ) : (
        <div style={styles.empty}>No points match your selection.</div>
      )}

      <div style={{ flex: 1 }} />

      <div style={styles.footer}>
        <button onClick={prev} disabled={currentIndex <= 0} style={styles.navBtn}>Previous</button>
        <button onClick={next} disabled={currentIndex >= total - 1 || total === 0} style={styles.navBtn}>Next Point</button>
      </div>
    </div>
  );
}

const styles = {
  container: { display: 'flex', flexDirection: 'column', gap: 16, height: '100%' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  title: { margin: 0, fontSize: 18, color: '#00ffff' },
  section: { display: 'flex', flexDirection: 'column', gap: 6 },
  label: { fontSize: 11, color: '#888', textTransform: 'uppercase' },
  input: { backgroundColor: '#1a1a1a', color: '#fff', border: '1px solid #444', padding: 6, borderRadius: 4, fontSize: 12 },
  counter: { fontSize: 12, color: '#aaa', textAlign: 'center', backgroundColor: '#333', padding: '4px 0', borderRadius: 4 },
  display: { display: 'flex', flexDirection: 'column', gap: 16, alignItems: 'center' },
  nameHeader: { alignSelf: 'stretch', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  name: { fontSize: 24, fontWeight: 'bold', color: '#fff' },
  analysedLabel: { display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#4caf50', cursor: 'pointer' },
  miniCenterBtn: { 
    background: 'none', border: 'none', color: '#00ffff', cursor: 'pointer', 
    fontSize: 20, padding: 0, lineHeight: 1, opacity: 0.7 
  },
  pipBox: { border: '2px solid #444', borderRadius: 8, overflow: 'hidden', backgroundColor: '#000', width: 200, height: 200 },
  pip: { display: 'block' },
  coordCard: { 
    backgroundColor: '#1a1a1a', border: '1px solid #00ffff', borderRadius: 8, padding: 16, 
    width: '100%', display: 'flex', flexDirection: 'column', gap: 8 
  },
  coordRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' },
  axis: { fontSize: 14, color: '#00ffff', fontWeight: 'bold' },
  value: { fontSize: 22, fontFamily: 'monospace', color: '#fff' },
  unit: { fontSize: 10, alignSelf: 'flex-end', color: '#666' },
  notes: { fontSize: 12, fontStyle: 'italic', color: '#aaa', textAlign: 'center', padding: '0 10px' },
  empty: { textAlign: 'center', color: '#666', marginTop: 40 },
  footer: { display: 'flex', gap: 10 },
  navBtn: { flex: 1, padding: 12, borderRadius: 6, border: 'none', backgroundColor: '#444', color: '#fff', fontWeight: 'bold' }
};

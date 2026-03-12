import React from 'react';
import { classifyPointLocation } from '../engine/transform';

/**
 * PointList Component.
 * Categorized sidebar list of Reference vs Analysis points.
 */
export default function PointList({ 
  session, 
  imageLoaded,
  computedCoords, 
  activeInstrumentId, 
  selectedPointId, 
  hoveredPointId,
  onSelect,
  onHover,
  onCenter
}) {
  const points = session?.points || [];
  
  // Categorize points
  const references = points.filter(p => p.enteredCoords[activeInstrumentId]);
  const analysis = points.filter(p => !p.enteredCoords[activeInstrumentId]);

  const getReliabilityColor = (point) => {
    if (point.enteredCoords[activeInstrumentId]) return '#00ffff';
    const refs = points.filter(p => p.enteredCoords[activeInstrumentId]).map(p => ({ oldCoord: p.pixelCoords }));
    if (refs.length < 3) return '#888';
    const classification = classifyPointLocation(point.pixelCoords, refs);
    if (classification.status === 'inside') return '#00ffff';
    if (classification.status === 'far') return '#ff4d4d';
    return '#ffeb3b';
  };

  const renderPoint = (point) => {
    const isSelected = point.id === selectedPointId;
    const isHovered = point.id === hoveredPointId;
    const coords = computedCoords?.get(point.id)?.get(activeInstrumentId);
    const color = getReliabilityColor(point);

    return (
      <div 
        key={point.id} 
        onClick={() => onSelect(point.id)}
        onMouseEnter={() => onHover(point.id)}
        onMouseLeave={() => onHover(null)}
        style={{
          ...styles.pointRow,
          backgroundColor: isSelected ? '#2a2a2a' : (isHovered ? '#333' : 'transparent'),
          borderColor: isSelected ? '#00ffff' : (isHovered ? '#666' : '#444'),
        }}
      >
        <div style={styles.pointHeader}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            {point.isAnalysed && <span style={{ color: '#4caf50', fontSize: 10 }}>✓</span>}
            <span style={styles.pointName}>{point.name}</span>
          </div>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <span style={styles.pointType}>
              {point.enteredCoords[activeInstrumentId] ? 'REF' : 'TARGET'}
            </span>
            <button 
              onClick={(e) => { e.stopPropagation(); onCenter(point.id); }}
              style={styles.miniCenterBtn}
              title="Center View"
            >◎</button>
          </div>
        </div>
        
        <div style={{ ...styles.coordPreview, color: coords ? color : '#888' }}>
          {coords ? (
            `X: ${coords.x.toFixed(2)}, Y: ${coords.y.toFixed(2)}`
          ) : (
            <span>Uncalibrated</span>
          )}
        </div>
      </div>
    );
  };

  return (
    <div style={styles.container}>
      <div style={styles.section}>
        <h4 style={styles.sectionTitle}>Reference Points ({references.length})</h4>
        {references.length === 0 && points.length > 0 && (
          <div style={styles.empty}>None calibrated for this instrument.</div>
        )}
        {references.map(renderPoint)}
      </div>

      <div style={styles.section}>
        <h4 style={styles.sectionTitle}>Analysis Targets ({analysis.length})</h4>
        {analysis.length === 0 && points.length === 0 ? (
          <div style={styles.onboarding}>
            <div style={styles.onboardingTitle}>Getting Started:</div>
            <ol style={styles.onboardingList}>
              {!imageLoaded && <li>Click <strong>Open</strong> to load your source microscopy image.</li>}
              <li>Switch to <strong>Add Point</strong> mode in the top bar.</li>
              <li>Click features on your image to place markers.</li>
              <li>Switch back to <strong>Select</strong> to enter coordinates.</li>
              <li>Add more instruments at the bottom to calculate transforms.</li>
              <li>Use <strong>Navigate</strong> mode at the target instrument.</li>
            </ol>
          </div>
        ) : (
          analysis.length === 0 && <div style={styles.empty}>All points are used as references.</div>
        )}
        {analysis.map(renderPoint)}
      </div>
    </div>
  );
}

const styles = {
  container: { flex: 1, overflowY: 'auto', overflowX: 'hidden', display: 'flex', flexDirection: 'column', gap: 20 },
  section: { display: 'flex', flexDirection: 'column', gap: 8 },
  sectionTitle: { fontSize: 11, color: '#888', textTransform: 'uppercase', letterSpacing: 1, margin: 0 },
  pointRow: { 
    padding: '10px 12px', borderRadius: 6, border: '1px solid #444', cursor: 'pointer',
    display: 'flex', flexDirection: 'column', gap: 4, transition: 'background 0.2s',
    boxSizing: 'border-box', margin: '0 2px'
  },
  pointHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  pointName: { fontSize: 14, fontWeight: 'bold', color: '#eee', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  pointType: { fontSize: 9, padding: '2px 4px', borderRadius: 3, backgroundColor: '#222', color: '#aaa' },
  coordPreview: { fontSize: 11, fontFamily: 'monospace' },
  empty: { fontSize: 12, color: '#666', fontStyle: 'italic', paddingLeft: 4 },
  onboarding: { 
    backgroundColor: '#1a1a1a', border: '1px dashed #444', borderRadius: 8, padding: 16, marginTop: 8 
  },
  onboardingTitle: { fontSize: 13, fontWeight: 'bold', color: '#00ffff', marginBottom: 8 },
  onboardingList: { margin: 0, paddingLeft: 20, fontSize: 12, color: '#aaa', lineHeight: 1.6 },
  miniCenterBtn: { 
    background: 'none', border: 'none', color: '#00ffff', cursor: 'pointer', 
    fontSize: 16, padding: 0, lineHeight: 1, opacity: 0.7 
  }
};

import React from 'react';

/**
 * PointList Component.
 * Categorized sidebar list of Reference vs Analysis points.
 */
export default function PointList({ session, computedCoords, activeInstrumentId, selectedPointId, onSelect }) {
  const points = session?.points || [];
  
  // Categorize points
  const references = points.filter(p => p.enteredCoords[activeInstrumentId]);
  const analysis = points.filter(p => !p.enteredCoords[activeInstrumentId]);

  const renderPoint = (point) => {
    const isSelected = point.id === selectedPointId;
    const coords = computedCoords?.get(point.id)?.get(activeInstrumentId);

    return (
      <div 
        key={point.id} 
        onClick={() => onSelect(point.id)}
        style={{
          ...styles.pointRow,
          backgroundColor: isSelected ? '#444' : 'transparent',
          borderColor: isSelected ? '#00ffff' : '#555'
        }}
      >
        <div style={styles.pointHeader}>
          <span style={styles.pointName}>{point.name}</span>
          <span style={styles.pointType}>
            {point.enteredCoords[activeInstrumentId] ? 'REF' : 'TARGET'}
          </span>
        </div>
        
        <div style={styles.coordPreview}>
          {coords ? (
            `X: ${coords.x.toFixed(2)}, Y: ${coords.y.toFixed(2)}`
          ) : (
            <span style={{ color: '#888' }}>Uncalibrated</span>
          )}
        </div>
      </div>
    );
  };

  return (
    <div style={styles.container}>
      <div style={styles.section}>
        <h4 style={styles.sectionTitle}>Reference Points ({references.length})</h4>
        {references.length === 0 && <div style={styles.empty}>None placed yet</div>}
        {references.map(renderPoint)}
      </div>

      <div style={styles.section}>
        <h4 style={styles.sectionTitle}>Analysis Targets ({analysis.length})</h4>
        {analysis.length === 0 && <div style={styles.empty}>None placed yet</div>}
        {analysis.map(renderPoint)}
      </div>
    </div>
  );
}

const styles = {
  container: { flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 20 },
  section: { display: 'flex', flexDirection: 'column', gap: 8 },
  sectionTitle: { fontSize: 11, color: '#888', textTransform: 'uppercase', letterSpacing: 1, margin: 0 },
  pointRow: { 
    padding: '10px 12px', borderRadius: 6, border: '1px solid #555', cursor: 'pointer',
    display: 'flex', flexDirection: 'column', gap: 4, transition: 'all 0.2s'
  },
  pointHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  pointName: { fontSize: 14, fontWeight: 'bold', color: '#eee' },
  pointType: { fontSize: 9, padding: '2px 4px', borderRadius: 3, backgroundColor: '#222', color: '#aaa' },
  coordPreview: { fontSize: 11, fontFamily: 'monospace', color: '#00ffff' },
  empty: { fontSize: 12, color: '#666', fontStyle: 'italic', paddingLeft: 4 }
};

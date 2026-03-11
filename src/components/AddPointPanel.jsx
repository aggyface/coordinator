import React from 'react';

/**
 * AddPointPanel Component.
 * Sidebar instructions and controls for staging new markers.
 */
export default function AddPointPanel({ session, onClose }) {
  const pointsCount = session?.points?.length || 0;

  return (
    <div style={styles.container}>
      <h3 style={styles.title}>Add Points</h3>
      
      <p style={styles.help}>
        Click anywhere on the image to place a new coordinate marker.
      </p>

      <div style={styles.statusBox}>
        <div style={styles.statusLabel}>Project Points</div>
        <div style={styles.statusValue}>{pointsCount}</div>
      </div>

      <div style={styles.instruction}>
        <strong>Tip:</strong> You can edit coordinates and tags for each point later in Select mode.
      </div>

      <div style={{ flex: 1 }} />

      <button onClick={onClose} style={styles.doneBtn}>
        Done Placing Points
      </button>
    </div>
  );
}

const styles = {
  container: { display: 'flex', flexDirection: 'column', gap: 20, height: '100%' },
  title: { margin: 0, fontSize: 18, color: '#ffeb3b' },
  help: { fontSize: 13, color: '#aaa', lineHeight: 1.4 },
  statusBox: { 
    backgroundColor: '#333', padding: 12, borderRadius: 8, border: '1px solid #444',
    display: 'flex', justifyContent: 'space-between', alignItems: 'center'
  },
  statusLabel: { fontSize: 11, color: '#888', textTransform: 'uppercase' },
  statusValue: { fontSize: 18, fontWeight: 'bold', color: '#fff' },
  instruction: { fontSize: 12, color: '#666', fontStyle: 'italic' },
  doneBtn: { 
    backgroundColor: '#ffeb3b', color: '#000', border: 'none', 
    padding: '12px', borderRadius: 6, fontWeight: 'bold', width: '100%' 
  }
};

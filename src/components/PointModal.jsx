import React from 'react';

/**
 * PointModal Stub.
 * Dialog for entering instrument coordinates for a selected point.
 */
export default function PointModal({ point, session, onSave, onClose }) {
  if (!point) return null;
  return (
    <div style={{ position: 'fixed', top: '20%', left: '30%', border: '2px solid #ccc', padding: 20, backgroundColor: '#333', color: '#fff' }}>
      <strong>PointModal [stub]</strong>
      <pre>{JSON.stringify({ pointId: point.id, name: point.name }, null, 2)}</pre>
      <button onClick={onClose}>Close</button>
    </div>
  );
}

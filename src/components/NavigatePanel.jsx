import React from 'react';

/**
 * NavigatePanel Stub.
 * Sidebar shown in Navigate mode for stepping through analysis points.
 */
export default function NavigatePanel({ session, activeInstrumentId, onClose, onExportCSV }) {
  return (
    <div style={{ border: '2px solid #555', padding: 10, backgroundColor: '#222' }}>
      <strong>NavigatePanel [stub]</strong>
      <button onClick={onClose}>Exit Navigate</button>
    </div>
  );
}

import React from 'react';

/**
 * AddPointPanel Stub.
 * Sidebar shown in Add Point mode for staging new markers.
 */
export default function AddPointPanel({ session, onConfirm, onClear, onClose }) {
  return (
    <div style={{ border: '2px solid #555', padding: 10, backgroundColor: '#222' }}>
      <strong>AddPointPanel [stub]</strong>
      <button onClick={onClose}>Exit Add Mode</button>
    </div>
  );
}

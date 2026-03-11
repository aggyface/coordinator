import React from 'react';

/**
 * TagDrawer Stub.
 * Slide-in management for tag categories and colors.
 */
export default function TagDrawer({ session, isOpen, onClose, onUpdateTags }) {
  if (!isOpen) return null;
  return (
    <div style={{ position: 'fixed', right: 0, top: 0, height: '100%', width: 300, borderLeft: '2px solid #444', backgroundColor: '#333', padding: 20 }}>
      <strong>TagDrawer [stub]</strong>
      <button onClick={onClose}>Close</button>
    </div>
  );
}

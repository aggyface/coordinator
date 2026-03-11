import React from 'react';

/**
 * PointList Stub.
 * Sidebar list of all points categorized by Reference vs Analysis.
 */
export default function PointList({ session, activeInstrumentId, selectedPointId, onSelect }) {
  return (
    <div style={{ border: '1px solid #444', padding: 10, minWidth: 200 }}>
      <strong>PointList [stub]</strong>
      <div style={{ fontSize: 12 }}>Points: {session?.points?.length || 0}</div>
    </div>
  );
}

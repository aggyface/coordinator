import React from 'react';

/**
 * ImageCanvas Stub.
 * Renders the microscopy image and marker overlays.
 * @param {object} session The current session state.
 * @param {string} mode Current app mode (Select/Add Point/Navigate).
 */
export default function ImageCanvas({ session, mode, activeInstrumentId, onPointClick, onCanvasClick, selectedPointId }) {
  return (
    <div style={{ border: '2px dashed #666', padding: 20, flex: 1, backgroundColor: '#1a1a1a' }}>
      <strong>ImageCanvas [stub]</strong>
      <div>Mode: {mode}</div>
    </div>
  );
}

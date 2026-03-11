import React from 'react';

/**
 * InstrumentQualityPanel Stub.
 * Combined instrument management and transform status display.
 */
export default function InstrumentQualityPanel({ session, activeInstrumentId, onSetActive, onOverride, onAddInstrument }) {
  return (
    <div style={{ border: '1px solid #444', padding: 10, marginTop: 10 }}>
      <strong>InstrumentQualityPanel [stub]</strong>
      <div style={{ fontSize: 12 }}>Active: {activeInstrumentId}</div>
    </div>
  );
}

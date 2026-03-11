import React, { useState } from 'react';

/**
 * NewProjectModal Component.
 * Initializes a new project with a name, sample ID, and source instrument.
 */
export default function NewProjectModal({ isOpen, onCreate, onCancel }) {
  const [projectName, setProjectName] = useState('New Project');
  const [sampleId, setSampleId] = useState('SAMPLE-001');
  const [instrumentName, setInstrumentName] = useState('SEM');
  const [units, setUnits] = useState('µm');

  if (!isOpen) return null;

  const handleCreate = () => {
    onCreate({
      projectName,
      sampleId,
      sourceInstrument: {
        name: instrumentName,
        units,
        isSource: true
      }
    });
  };

  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>
        <h2 style={styles.title}>Initialize New Project</h2>
        
        <div style={styles.field}>
          <label style={styles.label}>Project Name</label>
          <input 
            value={projectName} 
            onChange={e => setProjectName(e.target.value)} 
            style={styles.input} 
          />
        </div>

        <div style={styles.field}>
          <label style={styles.label}>Sample ID</label>
          <input 
            value={sampleId} 
            onChange={e => setSampleId(e.target.value)} 
            style={styles.input} 
          />
        </div>

        <hr style={styles.hr} />
        <h4 style={styles.subTitle}>Source Instrument (Reference Frame)</h4>
        
        <div style={{ display: 'flex', gap: 12 }}>
          <div style={{ ...styles.field, flex: 2 }}>
            <label style={styles.label}>Instrument Name</label>
            <input 
              value={instrumentName} 
              onChange={e => setInstrumentName(e.target.value)} 
              style={styles.input} 
            />
          </div>
          <div style={{ ...styles.field, flex: 1 }}>
            <label style={styles.label}>Units</label>
            <select value={units} onChange={e => setUnits(e.target.value)} style={styles.input}>
              <option value="µm">µm</option>
              <option value="mm">mm</option>
              <option value="px">pixels</option>
            </select>
          </div>
        </div>

        <div style={styles.footer}>
          <button onClick={onCancel} style={styles.cancelBtn}>Cancel</button>
          <button onClick={handleCreate} style={styles.createBtn}>Create Project</button>
        </div>
      </div>
    </div>
  );
}

const styles = {
  overlay: {
    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center',
    zIndex: 2000
  },
  modal: {
    backgroundColor: '#333', color: '#fff', borderRadius: 12, padding: 32,
    width: '450px', display: 'flex', flexDirection: 'column', gap: 16
  },
  title: { margin: '0 0 8px 0', fontSize: 24 },
  subTitle: { margin: '8px 0', fontSize: 14, color: '#aaa', textTransform: 'uppercase' },
  field: { display: 'flex', flexDirection: 'column', gap: 6 },
  label: { fontSize: 12, color: '#888' },
  input: { 
    backgroundColor: '#1a1a1a', color: '#fff', border: '1px solid #555', 
    padding: '10px 12px', borderRadius: 6, fontSize: 14 
  },
  hr: { border: 'none', borderTop: '1px solid #444', margin: '8px 0' },
  footer: { marginTop: 24, display: 'flex', gap: 12, justifyContent: 'flex-end' },
  createBtn: { backgroundColor: '#4caf50', border: 'none', padding: '10px 20px', borderRadius: 6, fontWeight: 'bold' },
  cancelBtn: { backgroundColor: 'transparent', color: '#888', border: 'none' }
};

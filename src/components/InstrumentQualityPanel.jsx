import React, { useState } from 'react';
import { computeChainedRMSE } from '../engine/transform';

/**
 * InstrumentQualityPanel Component.
 * Manages instrument list, active selection, and transform quality readouts.
 */
export default function InstrumentQualityPanel({ session, transforms, activeInstrumentId, onSetActive, onAddInstrument }) {
  const [isAdding, setIsAdding] = useState(false);
  const [newInst, setNewInst] = useState({ name: '', units: 'µm', transformFrom: '' });

  const handleAdd = () => {
    if (!newInst.name || !newInst.transformFrom) return;
    onAddInstrument({
      name: newInst.name,
      units: newInst.units,
      transformFrom: newInst.transformFrom,
      isSource: false
    });
    setIsAdding(false);
    setNewInst({ name: '', units: 'µm', transformFrom: '' });
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h4 style={styles.title}>Instruments</h4>
        <button onClick={() => setIsAdding(!isAdding)} style={styles.addBtn}>
          {isAdding ? 'Cancel' : '+ Add'}
        </button>
      </div>

      {isAdding && (
        <div style={styles.addForm}>
          <input 
            placeholder="Instrument Name (e.g. EPMA)" 
            value={newInst.name}
            onChange={e => setNewInst({...newInst, name: e.target.value})}
            style={styles.input}
          />
          <div style={{ display: 'flex', gap: 8 }}>
            <select 
              value={newInst.units} 
              onChange={e => setNewInst({...newInst, units: e.target.value})}
              style={{ ...styles.input, flex: 1 }}
            >
              <option value="µm">µm</option>
              <option value="mm">mm</option>
            </select>
            <select 
              value={newInst.transformFrom} 
              onChange={e => setNewInst({...newInst, transformFrom: e.target.value})}
              style={{ ...styles.input, flex: 2 }}
            >
              <option value="">Transform From...</option>
              {session.instruments.map(i => (
                <option key={i.id} value={i.id}>{i.name}</option>
              ))}
            </select>
          </div>
          <button onClick={handleAdd} style={styles.saveBtn} disabled={!newInst.name || !newInst.transformFrom}>
            Create Instrument
          </button>
        </div>
      )}

      <div style={styles.list}>
        {session.instruments.map(inst => {
          const isActive = inst.id === activeInstrumentId;
          const chained = computeChainedRMSE(inst.id, session.instruments, transforms);
          const transform = transforms instanceof Map ? transforms.get(inst.id) : transforms[inst.id];

          return (
            <div 
              key={inst.id} 
              onClick={() => onSetActive(inst.id)}
              style={{
                ...styles.instRow,
                borderColor: isActive ? '#00ffff' : '#444',
                backgroundColor: isActive ? '#2a2a2a' : 'transparent'
              }}
            >
              <div style={styles.instHeader}>
                <span style={styles.instName}>{inst.name}</span>
                <span style={styles.instType}>{inst.isSource ? 'SOURCE' : 'TRANSFORM'}</span>
              </div>

              {!inst.isSource && (
                <div style={styles.qualityInfo}>
                  <div style={styles.rmseRow}>
                    <span>RMSE:</span>
                    <span style={{ color: transform ? '#4caf50' : '#888' }}>
                      {transform ? transform.rmse.toFixed(4) : 'N/A'}
                    </span>
                  </div>
                  {chained && chained.localRMSE !== chained.chainRMSE && (
                    <div style={styles.chainRow}>
                      Chain Error: {chained.chainRMSE.toFixed(4)} {inst.units}
                    </div>
                  )}
                </div>
              )}
              
              {inst.isSource && (
                <div style={styles.sourceDesc}>Primary reference frame</div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

const styles = {
  container: { marginTop: 20, display: 'flex', flexDirection: 'column', gap: 12 },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  title: { margin: 0, fontSize: 11, color: '#888', textTransform: 'uppercase', letterSpacing: 1 },
  addBtn: { fontSize: 10, padding: '2px 8px', background: '#444' },
  addForm: { 
    backgroundColor: '#333', padding: 12, borderRadius: 8, border: '1px solid #555',
    display: 'flex', flexDirection: 'column', gap: 8 
  },
  input: { backgroundColor: '#1a1a1a', color: '#fff', border: '1px solid #444', padding: 6, borderRadius: 4, fontSize: 12 },
  saveBtn: { backgroundColor: '#4caf50', border: 'none', padding: 8, borderRadius: 4, fontWeight: 'bold', fontSize: 12 },
  list: { display: 'flex', flexDirection: 'column', gap: 8 },
  instRow: { 
    padding: 12, borderRadius: 8, border: '1px solid #444', cursor: 'pointer',
    display: 'flex', flexDirection: 'column', gap: 4, transition: 'all 0.2s'
  },
  instHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  instName: { fontSize: 14, fontWeight: 'bold' },
  instType: { fontSize: 9, color: '#aaa', backgroundColor: '#222', padding: '2px 4px', borderRadius: 3 },
  qualityInfo: { marginTop: 4, display: 'flex', flexDirection: 'column', gap: 2 },
  rmseRow: { display: 'flex', justifyContent: 'space-between', fontSize: 11, fontFamily: 'monospace' },
  chainRow: { fontSize: 10, color: '#ff9800', fontStyle: 'italic' },
  sourceDesc: { fontSize: 11, color: '#666', fontStyle: 'italic' }
};

import React, { useState, useEffect } from 'react';
import { computeChainedRMSE } from '../engine/transform';

/**
 * InstrumentQualityPanel Component.
 * Manages instrument list, active selection, and transform quality readouts.
 */
export default function InstrumentQualityPanel({ session, transforms, activeInstrumentId, onSetActive, onAddInstrument, onUpdateInstrument }) {
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({ name: '', units: 'µm', transformFrom: '' });

  useEffect(() => {
    if (isAdding) {
      const source = session.instruments.find(i => i.isSource);
      if (source) setFormData(prev => ({ ...prev, transformFrom: source.id }));
    }
  }, [isAdding, session.instruments]);

  const handleAdd = () => {
    if (!formData.name || (!formData.transformFrom && session.instruments.length > 0)) return;
    onAddInstrument({
      name: formData.name,
      units: formData.units,
      transformFrom: formData.transformFrom || null,
      isSource: session.instruments.length === 0
    });
    setIsAdding(false);
    resetForm();
  };

  const handleUpdate = () => {
    onUpdateInstrument(editingId, { name: formData.name, units: formData.units });
    setEditingId(null);
    resetForm();
  };

  const resetForm = () => setFormData({ name: '', units: 'µm', transformFrom: '' });

  const startEdit = (e, inst) => {
    e.stopPropagation();
    setEditingId(inst.id);
    setFormData({ name: inst.name, units: inst.units, transformFrom: inst.transformFrom });
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h4 style={styles.title}>Instruments</h4>
        <button onClick={() => setIsAdding(!isAdding)} style={styles.addBtn}>
          {isAdding ? 'Cancel' : '+ Add'}
        </button>
      </div>

      {(isAdding || editingId) && (
        <div style={styles.addForm}>
          <div style={{ fontSize: 11, color: '#aaa', marginBottom: 4 }}>
            {editingId ? 'Edit Instrument' : 'New Instrument'}
          </div>
          <input 
            placeholder="Name (e.g. EPMA)" 
            value={formData.name}
            onChange={e => setFormData({...formData, name: e.target.value})}
            style={styles.input}
          />
          <div style={{ display: 'flex', gap: 8 }}>
            <select 
              value={formData.units} 
              onChange={e => setFormData({...formData, units: e.target.value})}
              style={{ ...styles.input, flex: 1 }}
            >
              <option value="µm">µm</option>
              <option value="mm">mm</option>
              <option value="px">px</option>
              <option value="Custom">Custom</option>
            </select>
            {!editingId && (
              <select 
                value={formData.transformFrom} 
                onChange={e => setFormData({...formData, transformFrom: e.target.value})}
                style={{ ...styles.input, flex: 2 }}
              >
                <option value="">Transform From...</option>
                {session.instruments.map(i => (
                  <option key={i.id} value={i.id}>{i.name}</option>
                ))}
              </select>
            )}
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
            <button onClick={editingId ? handleUpdate : handleAdd} style={styles.saveBtn}>
              {editingId ? 'Save Changes' : 'Create'}
            </button>
            {editingId && <button onClick={() => setEditingId(null)} style={{ ...styles.saveBtn, background: '#666' }}>Cancel</button>}
          </div>
        </div>
      )}

      <div style={styles.list}>
        {session.instruments.map(inst => {
          const isActive = inst.id === activeInstrumentId;
          const chained = computeChainedRMSE(inst.id, session.instruments, transforms);
          const transform = transforms instanceof Map ? transforms.get(inst.id) : transforms[inst.id];
          const outliers = transform?.outliers || [];

          return (
            <div 
              key={inst.id} 
              onClick={() => onSetActive(inst.id)}
              style={{
                ...styles.instRow,
                borderColor: outliers.length > 0 ? '#ff4d4d' : (isActive ? '#00ffff' : '#444'),
                backgroundColor: isActive ? '#2a2a2a' : 'transparent'
              }}
            >
              <div style={styles.instHeader}>
                <span style={styles.instName}>{inst.name}</span>
                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                  <span style={styles.instType}>{inst.isSource ? 'SOURCE' : 'TRANSFORM'}</span>
                  <button onClick={(e) => startEdit(e, inst)} style={styles.miniEditBtn}>✎</button>
                </div>
              </div>

              {!inst.isSource && (
                <div style={styles.qualityInfo}>
                  <div style={styles.rmseRow}>
                    <span>RMSE:</span>
                    <span style={{ color: outliers.length > 0 ? '#ff4d4d' : (transform ? '#4caf50' : '#888') }}>
                      {transform ? transform.rmse.toFixed(4) : 'N/A'}
                    </span>
                  </div>
                  
                  {/* Outlier / Diagnosis Alerts */}
                  {outliers.length > 0 && (
                    <div style={styles.errorBox}>
                      <div style={styles.errorTitle}>⚠ QUALITY ALERT</div>
                      {outliers.map(o => {
                        const pt = session.points.find(p => p.id === o.id);
                        return (
                          <div key={o.id} style={styles.errorRow}>
                            <strong>{pt?.name}:</strong> {o.diagnosis || 'High error'}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {chained && chained.localRMSE !== chained.chainRMSE && (
                    <div style={styles.chainRow}>
                      Chain Error: {chained.chainRMSE.toFixed(4)} {inst.units}
                    </div>
                  )}
                </div>
              )}
              
              {inst.isSource && <div style={styles.sourceDesc}>Units: {inst.units} (Source)</div>}
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
  saveBtn: { backgroundColor: '#4caf50', border: 'none', padding: 8, borderRadius: 4, fontWeight: 'bold', fontSize: 12, flex: 1 },
  list: { display: 'flex', flexDirection: 'column', gap: 8 },
  instRow: { 
    padding: 12, borderRadius: 8, border: '1px solid #444', cursor: 'pointer',
    display: 'flex', flexDirection: 'column', gap: 4, transition: 'all 0.2s', borderLeftWidth: 4
  },
  instHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  instName: { fontSize: 14, fontWeight: 'bold' },
  instType: { fontSize: 9, color: '#aaa', backgroundColor: '#222', padding: '2px 4px', borderRadius: 3 },
  miniEditBtn: { background: 'none', border: 'none', color: '#888', cursor: 'pointer', fontSize: 12, padding: 0 },
  qualityInfo: { marginTop: 4, display: 'flex', flexDirection: 'column', gap: 2 },
  rmseRow: { display: 'flex', justifyContent: 'space-between', fontSize: 11, fontFamily: 'monospace' },
  errorBox: { 
    marginTop: 8, padding: 8, backgroundColor: 'rgba(255, 77, 77, 0.1)', 
    borderRadius: 4, border: '1px solid rgba(255, 77, 77, 0.3)' 
  },
  errorTitle: { fontSize: 9, fontWeight: 'bold', color: '#ff4d4d', marginBottom: 4 },
  errorRow: { fontSize: 10, color: '#eee', lineHeight: 1.3 },
  chainRow: { fontSize: 10, color: '#ff9800', fontStyle: 'italic', marginTop: 4 },
  sourceDesc: { fontSize: 11, color: '#666', fontStyle: 'italic' }
};

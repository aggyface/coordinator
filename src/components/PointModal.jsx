import React, { useState, useEffect, useMemo } from 'react';
import { parseCoordinate, applyPixelProxy } from '../engine/transform';

/**
 * PointModal Component.
 * The primary editor for point-specific data, coordinates, and tags.
 */
export default function PointModal({ point, session, onSave, onClose, onDelete }) {
  const [formData, setEditData] = useState(null);

  useEffect(() => {
    if (point) {
      setEditData({
        name: point.name,
        notes: point.notes || '',
        tags: { ...point.tags },
        enteredCoords: { ...point.enteredCoords }
      });
    }
  }, [point]);

  if (!point || !formData) return null;

  const handleInputChange = (instrumentId, axis, rawValue) => {
    setEditData(prev => ({
      ...prev,
      enteredCoords: {
        ...prev.enteredCoords,
        [instrumentId]: {
          ...(prev.enteredCoords[instrumentId] || { x: null, y: null }),
          [axis]: rawValue
        }
      }
    }));
  };

  const save = () => {
    const processedCoords = {};
    Object.entries(formData.enteredCoords).forEach(([instId, coords]) => {
      const parsedX = parseCoordinate(String(coords.x || ''));
      const parsedY = parseCoordinate(String(coords.y || ''));
      if (parsedX.value !== null || parsedY.value !== null) {
        processedCoords[instId] = { x: parsedX.value, y: parsedY.value };
      }
    });

    onSave({
      name: formData.name,
      notes: formData.notes,
      tags: formData.tags,
      enteredCoords: processedCoords
    });
    onClose();
  };

  return (
    <div className="modal-overlay" style={styles.overlay}>
      <div className="modal-content" style={styles.modal}>
        <div style={styles.header}>
          <input 
            value={formData.name} 
            onChange={e => setEditData({ ...formData, name: e.target.value })}
            style={styles.nameInput}
          />
          <button onClick={onClose} style={styles.closeBtn}>✕</button>
        </div>

        <div style={styles.body}>
          <section style={styles.section}>
            <h4 style={styles.sectionTitle}>Instrument Coordinates</h4>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th>Instrument</th>
                  <th>X Coordinate</th>
                  <th>Y Coordinate</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {session.instruments.map(inst => {
                  const entry = formData.enteredCoords[inst.id] || {};
                  const isEntered = entry.x !== null && entry.x !== undefined && entry.x !== '';
                  
                  // Calculate proxy if not entered
                  const refs = session.points
                    .filter(p => p.enteredCoords[inst.id])
                    .map(p => ({ oldCoord: p.pixelCoords, newCoord: p.enteredCoords[inst.id] }));
                  
                  let proxy = !isEntered ? applyPixelProxy(point.pixelCoords, refs, inst) : null;

                  // Rationale: If this is the SOURCE instrument and no coords are entered,
                  // default the proxy to the raw pixel coordinates to assist initialization.
                  if (!isEntered && inst.isSource && (!proxy || proxy.confidence === 'none')) {
                    proxy = { x: point.pixelCoords.x, y: point.pixelCoords.y, confidence: 'pixel-match' };
                  }

                  return (
                    <tr key={inst.id}>
                      <td style={styles.tdLabel}>
                        {inst.name} <span style={styles.unit}>({inst.units})</span>
                      </td>
                      <td>
                        <div style={{ position: 'relative' }}>
                          <input 
                            value={entry.x ?? ''} 
                            onChange={e => handleInputChange(inst.id, 'x', e.target.value)}
                            style={styles.coordInput}
                          />
                          {!isEntered && proxy?.confidence !== 'none' && (
                            <span style={styles.proxyHint}>{proxy.x.toFixed(2)}</span>
                          )}
                        </div>
                      </td>
                      <td>
                        <div style={{ position: 'relative' }}>
                          <input 
                            value={entry.y ?? ''} 
                            onChange={e => handleInputChange(inst.id, 'y', e.target.value)}
                            style={styles.coordInput}
                          />
                          {!isEntered && proxy?.confidence !== 'none' && (
                            <span style={styles.proxyHint}>{proxy.y.toFixed(2)}</span>
                          )}
                        </div>
                      </td>
                      <td style={{ fontSize: 11, color: isEntered ? '#4caf50' : '#888' }}>
                        {isEntered ? 'Manual' : (proxy?.confidence !== 'none' ? `Proxy (${proxy.confidence})` : 'No Data')}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </section>

          <div style={styles.row}>
            <section style={{ ...styles.section, flex: 1 }}>
              <h4 style={styles.sectionTitle}>Tags</h4>
              
              {session.tagCategories.length === 0 ? (
                <div style={styles.tagOnboarding}>
                  <strong>Tip:</strong> No tags defined yet. Use the <strong>Tags ⚙</strong> button in the top bar to create categories like Mineralogy or Priority.
                </div>
              ) : (
                <div style={styles.tagGrid}>
                  {session.tagCategories.map(cat => (
                    <div key={cat.id} style={styles.tagGroup}>
                      <label style={styles.tagLabel}>{cat.name}</label>
                      <select 
                        value={formData.tags[cat.name] || ''} 
                        onChange={e => setEditData({
                          ...formData,
                          tags: { ...formData.tags, [cat.name]: e.target.value }
                        })}
                        style={styles.tagSelect}
                      >
                        <option value="">(None)</option>
                        {cat.values.map(val => (
                          <option key={val.label} value={val.label}>{val.label}</option>
                        ))}
                      </select>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section style={{ ...styles.section, flex: 1 }}>
              <h4 style={styles.sectionTitle}>Notes</h4>
              <textarea 
                value={formData.notes}
                onChange={e => setEditData({ ...formData, notes: e.target.value })}
                placeholder="Observation details..."
                style={styles.notesArea}
              />
            </section>
          </div>
        </div>

        <div style={styles.footer}>
          <button onClick={() => onDelete(point.id)} style={styles.deleteBtn}>Delete Point</button>
          <div style={{ flex: 1 }} />
          <button onClick={onClose}>Cancel</button>
          <button onClick={save} style={styles.saveBtn}>Save Changes</button>
        </div>
      </div>
    </div>
  );
}

const styles = {
  overlay: {
    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center',
    zIndex: 1000
  },
  modal: {
    backgroundColor: '#333', color: '#fff', borderRadius: 8, width: '80%', maxWidth: 800,
    display: 'flex', flexDirection: 'column', maxHeight: '90vh'
  },
  header: { padding: 16, borderBottom: '1px solid #444', display: 'flex', alignItems: 'center', gap: 12 },
  nameInput: { 
    fontSize: 20, fontWeight: 'bold', backgroundColor: 'transparent', color: '#fff', 
    border: 'none', borderBottom: '1px dashed #666', outline: 'none', flex: 1 
  },
  closeBtn: { background: 'none', border: 'none', color: '#888', fontSize: 20, cursor: 'pointer' },
  body: { padding: 20, overflowY: 'auto' },
  section: { marginBottom: 24 },
  sectionTitle: { margin: '0 0 12px 0', fontSize: 12, textTransform: 'uppercase', color: '#aaa', letterSpacing: 1 },
  table: { width: '100%', borderCollapse: 'collapse' },
  tdLabel: { fontSize: 14, padding: '8px 0' },
  unit: { color: '#888', fontSize: 12 },
  coordInput: { 
    backgroundColor: '#1a1a1a', color: '#fff', border: '1px solid #555', 
    padding: '6px 8px', borderRadius: 4, width: '100%', fontFamily: 'monospace',
    boxSizing: 'border-box'
  },
  proxyHint: {
    position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)',
    color: '#888', fontStyle: 'italic', fontSize: 12, pointerEvents: 'none',
    opacity: 0.6
  },
  tagOnboarding: {
    backgroundColor: '#1a1a1a', border: '1px dashed #555', borderRadius: 6,
    padding: 12, fontSize: 12, color: '#aaa', lineHeight: 1.4
  },
  row: { display: 'flex', gap: 24 },
  tagGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 12 },
  tagGroup: { display: 'flex', flexDirection: 'column', gap: 4 },
  tagLabel: { fontSize: 11, color: '#aaa' },
  tagSelect: { backgroundColor: '#1a1a1a', color: '#fff', border: '1px solid #555', padding: 4, borderRadius: 4 },
  notesArea: { 
    width: '100%', height: 100, backgroundColor: '#1a1a1a', color: '#fff', 
    border: '1px solid #555', borderRadius: 4, padding: 8, boxSizing: 'border-box' 
  },
  footer: { padding: 16, borderTop: '1px solid #444', display: 'flex', gap: 12 },
  saveBtn: { backgroundColor: '#007bff', border: 'none', color: '#fff', padding: '10px 20px', borderRadius: 4, cursor: 'pointer' },
  deleteBtn: { backgroundColor: 'transparent', color: '#ff4d4d', border: '1px solid #ff4d4d', padding: '10px 20px', borderRadius: 4, cursor: 'pointer' }
};

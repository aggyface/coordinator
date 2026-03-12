import React, { useState } from 'react';

const MINERAL_PRESET = [
  {
    id: "tc-mineral",
    name: "Mineral",
    isColorCategory: true,
    values: [
      { label: "Pyrite",   color: "#FFC107" },
      { label: "Albite",   color: "#4CAF50" },
      { label: "Zircon",   color: "#F44336" },
      { label: "Feldspar", color: "#2196F3" }
    ]
  },
  {
    id: "tc-priority",
    name: "Priority",
    isColorCategory: false,
    values: [
      { label: "Priority 1", color: null },
      { label: "Priority 2", color: null },
      { label: "Priority 3", color: null }
    ]
  },
  {
    id: "tc-texture",
    name: "Texture",
    isColorCategory: false,
    values: [
      { label: "Rim",    color: null },
      { label: "Core",   color: null },
      { label: "Matrix", color: null }
    ]
  }
];

/**
 * TagDrawer Component.
 * Slide-in management for project-wide tag categories and value colors.
 */
export default function TagDrawer({ session, isOpen, onClose, onUpdateTags }) {
  if (!isOpen) return null;

  const categories = session.tagCategories || [];

  const handleAddCategory = () => {
    const name = prompt("Category Name:");
    if (!name) return;
    onUpdateTags([...categories, {
      id: crypto.randomUUID(),
      name,
      isColorCategory: categories.length === 0,
      values: []
    }]);
  };

  const handleAddValue = (catId) => {
    const label = prompt("Tag Value (e.g. Zircon):");
    if (!label) return;
    onUpdateTags(categories.map(c => {
      if (c.id !== catId) return c;
      return { ...c, values: [...c.values, { label, color: c.isColorCategory ? '#ffffff' : null }] };
    }));
  };

  const handleSetColor = (catId, valLabel, color) => {
    onUpdateTags(categories.map(c => {
      if (c.id !== catId) return c;
      return {
        ...c,
        values: c.values.map(v => v.label === valLabel ? { ...v, color } : v)
      };
    }));
  };

  const handleToggleColorCategory = (catId) => {
    onUpdateTags(categories.map(c => ({
      ...c,
      isColorCategory: c.id === catId
    })));
  };

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.drawer} onClick={e => e.stopPropagation()}>
        <div style={styles.header}>
          <h3 style={styles.title}>Tag Management</h3>
          <button onClick={onClose} style={styles.closeBtn}>✕</button>
        </div>

        <div style={styles.body}>
          <div style={styles.presetSection}>
            <button onClick={() => onUpdateTags(MINERAL_PRESET)} style={styles.presetBtn}>
              Load Mineralogy Presets
            </button>
          </div>

          <div style={styles.list}>
            {categories.map(cat => (
              <div key={cat.id} style={styles.catBox}>
                <div style={styles.catHeader}>
                  <div style={styles.catTitleGroup}>
                    <span style={styles.catName}>{cat.name}</span>
                    <label style={styles.colorToggle}>
                      <input 
                        type="radio" 
                        checked={cat.isColorCategory} 
                        onChange={() => handleToggleColorCategory(cat.id)}
                      />
                      <span>Canvas Colors</span>
                    </label>
                  </div>
                  <button 
                    onClick={() => onUpdateTags(categories.filter(c => c.id !== cat.id))}
                    style={styles.delBtn}
                  >Remove</button>
                </div>

                <div style={styles.valueList}>
                  {cat.values.map(val => (
                    <div key={val.label} style={styles.valRow}>
                      <span style={styles.valLabel}>{val.label}</span>
                      {cat.isColorCategory && (
                        <input 
                          type="color" 
                          value={val.color || '#ffffff'} 
                          onChange={(e) => handleSetColor(cat.id, val.label, e.target.value)}
                          style={styles.colorInput}
                        />
                      )}
                      <button 
                        onClick={() => onUpdateTags(categories.map(c => c.id === cat.id ? { ...c, values: c.values.filter(v => v.label !== val.label) } : c))}
                        style={styles.miniDel}
                      >×</button>
                    </div>
                  ))}
                  <button onClick={() => handleAddValue(cat.id)} style={styles.addValBtn}>+ Add Value</button>
                </div>
              </div>
            ))}
          </div>

          <button onClick={handleAddCategory} style={styles.addCatBtn}>+ New Category</button>
        </div>
      </div>
    </div>
  );
}

const styles = {
  overlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1500 },
  drawer: { 
    position: 'absolute', right: 0, top: 0, bottom: 0, width: 350, 
    backgroundColor: '#333', color: '#fff', display: 'flex', flexDirection: 'column',
    boxShadow: '-4px 0 15px rgba(0,0,0,0.5)'
  },
  header: { padding: 20, borderBottom: '1px solid #444', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  title: { margin: 0, fontSize: 18 },
  closeBtn: { background: 'none', border: 'none', color: '#888', fontSize: 20, cursor: 'pointer' },
  body: { padding: 20, overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: 24 },
  presetSection: { paddingBottom: 16, borderBottom: '1px solid #444' },
  presetBtn: { width: '100%', backgroundColor: '#444', border: '1px solid #555', padding: 10, borderRadius: 6 },
  list: { display: 'flex', flexDirection: 'column', gap: 20 },
  catBox: { backgroundColor: '#222', borderRadius: 8, border: '1px solid #444', overflow: 'hidden' },
  catHeader: { padding: 12, backgroundColor: '#2a2a2a', borderBottom: '1px solid #444', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  catTitleGroup: { display: 'flex', flexDirection: 'column', gap: 4 },
  catName: { fontSize: 14, fontWeight: 'bold' },
  colorToggle: { fontSize: 10, display: 'flex', alignItems: 'center', gap: 4, color: '#aaa' },
  delBtn: { fontSize: 10, padding: '2px 6px', backgroundColor: 'transparent', border: '1px solid #666', color: '#888' },
  valueList: { padding: 12, display: 'flex', flexDirection: 'column', gap: 8 },
  valRow: { display: 'flex', alignItems: 'center', gap: 10, backgroundColor: '#1a1a1a', padding: '4px 8px', borderRadius: 4 },
  valLabel: { flex: 1, fontSize: 13 },
  colorInput: { width: 24, height: 24, padding: 0, border: 'none', backgroundColor: 'transparent', cursor: 'pointer' },
  miniDel: { background: 'none', border: 'none', color: '#666', cursor: 'pointer' },
  addValBtn: { alignSelf: 'flex-start', fontSize: 11, color: '#00ffff', background: 'none', border: 'none', padding: 0, cursor: 'pointer', marginTop: 4 },
  addCatBtn: { marginTop: 12, backgroundColor: '#007bff', border: 'none', padding: 12, borderRadius: 6, fontWeight: 'bold' }
};

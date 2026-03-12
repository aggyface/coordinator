import React, { useRef } from 'react';

/**
 * Toolbar Component.
 * Top bar housing mode selection, saving, and global actions.
 */
export default function Toolbar({ 
  session, 
  mode, 
  showLegend,
  showScaleBar,
  onToggleLegend,
  onToggleScaleBar,
  onModeChange, 
  onSave, 
  onSaveAs,
  onOpen, 
  onNew, 
  onEditMetadata,
  onExportCSV, 
  onExportImage, 
  onTagsOpen 
}) {
  const fileInputRef = useRef(null);

  const handleOpenClick = () => {
    fileInputRef.current.click();
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file && onOpen) {
      onOpen(file);
    }
    e.target.value = '';
  };

  return (
    <div style={{ borderBottom: '1px solid #444', padding: '8px 16px', display: 'flex', gap: 12, alignItems: 'center', backgroundColor: '#333', zIndex: 100 }}>
      <div style={{ fontWeight: 'bold', marginRight: 16 }}>LabCoordinator</div>
      
      <button onClick={onNew}>New</button>
      
      <button onClick={handleOpenClick}>Open</button>
      <input 
        type="file" 
        ref={fileInputRef} 
        style={{ display: 'none' }} 
        accept=".labcoord,.bmp,.tif,.tiff,.jpg,.jpeg,.png"
        onChange={handleFileChange}
      />

      {/* Split Save Button Group */}
      <div style={{ display: 'flex', gap: 1 }}>
        <button 
          onClick={onSave} 
          disabled={!session} 
          style={{ borderTopRightRadius: 0, borderBottomRightRadius: 0, borderRight: '1px solid #222' }}
          title="Save Project (Overwrite)"
        >
          Save
        </button>
        <button 
          onClick={onSaveAs} 
          disabled={!session} 
          style={{ borderTopLeftRadius: 0, borderBottomLeftRadius: 0, padding: '4px 6px' }}
          title="Save Project As..."
        >
          ▼
        </button>
      </div>
      
      <div style={{ borderLeft: '1px solid #555', height: 24, margin: '0 8px' }} />

      <label style={{ fontSize: 13 }}>Mode:</label>
      <select 
        value={mode} 
        onChange={(e) => onModeChange(e.target.value)}
        style={{ padding: '4px 8px', borderRadius: 4, backgroundColor: '#1a1a1a', color: '#fff', border: '1px solid #555' }}
      >
        <option value="Select">Select</option>
        <option value="Add Point">Add Point</option>
        <option value="Navigate">Navigate</option>
      </select>

      {/* Project & Sample Indicators */}
      <div 
        style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 20, cursor: 'pointer' }}
        onClick={onEditMetadata}
        title="Click to edit project metadata"
      >
        {session.projectName && (
          <div style={styles.metaGroup}>
            <span style={styles.metaLabel}>Project ✎</span>
            <span style={styles.metaValueProject}>{session.projectName}</span>
          </div>
        )}
        {session.sampleId && (
          <div style={styles.metaGroup}>
            <span style={styles.metaLabel}>Sample ID</span>
            <span style={styles.metaValueSample}>{session.sampleId}</span>
          </div>
        )}
      </div>

      {/* View Overlays */}
      <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
        <button 
          onClick={onToggleLegend} 
          style={{ ...styles.toggleBtn, borderColor: showLegend ? '#00ffff' : '#555', color: showLegend ? '#00ffff' : '#fff' }}
        >
          Legend
        </button>
        <button 
          onClick={onToggleScaleBar} 
          style={{ ...styles.toggleBtn, borderColor: showScaleBar ? '#00ffff' : '#555', color: showScaleBar ? '#00ffff' : '#fff' }}
        >
          Scale
        </button>
      </div>

      <button onClick={onTagsOpen}>Tags ⚙</button>
      <button onClick={() => onExportCSV && onExportCSV()}>CSV</button>
      <button onClick={() => onExportImage && onExportImage()}>Image</button>
    </div>
  );
}

const styles = {
  metaGroup: { display: 'flex', flexDirection: 'column', alignItems: 'center' },
  metaLabel: { fontSize: 10, color: '#888', textTransform: 'uppercase' },
  metaValueProject: { fontSize: 14, fontWeight: 'bold', color: '#00ffff' },
  metaValueSample: { fontSize: 14, fontWeight: 'bold', color: '#fff' },
  toggleBtn: {
    fontSize: 10,
    padding: '4px 8px',
    border: '1px solid #555',
    borderRadius: 4,
    backgroundColor: '#444',
    width: 60
  }
};

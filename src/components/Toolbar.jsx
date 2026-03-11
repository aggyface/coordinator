import React, { useRef } from 'react';

/**
 * Toolbar Component.
 * Top bar housing mode selection, saving, and global actions.
 */
export default function Toolbar({ 
  session, 
  mode, 
  onModeChange, 
  onSave, 
  onOpen, 
  onNew, 
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
    // Reset input so the same file can be opened twice if needed
    e.target.value = '';
  };

  return (
    <div style={{ borderBottom: '1px solid #444', padding: '8px 16px', display: 'flex', gap: 12, alignItems: 'center', backgroundColor: '#333' }}>
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

      <button onClick={onSave} disabled={!session}>Save</button>
      
      <div style={{ borderLeft: '1px solid #555', height: 24, margin: '0 8px' }} />

      <label style={{ fontSize: 13 }}>Mode:</label>
      <select 
        value={mode} 
        onChange={(e) => onModeChange(e.target.value)}
        style={{ padding: '4px 8px', borderRadius: 4 }}
      >
        <option value="Select">Select</option>
        <option value="Add Point">Add Point</option>
        <option value="Navigate">Navigate</option>
      </select>

      <div style={{ flex: 1 }} />

      <button onClick={onTagsOpen}>Tags ⚙</button>
      <button onClick={onExportCSV}>CSV</button>
      <button onClick={onExportImage}>Image</button>
    </div>
  );
}

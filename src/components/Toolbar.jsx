import React from 'react';

/**
 * Toolbar Stub.
 * Top bar housing mode selection, saving, and global actions.
 */
export default function Toolbar({ session, mode, onModeChange, onSave, onOpen, onNew, onExportCSV, onExportImage, onTagsOpen }) {
  return (
    <div style={{ borderBottom: '1px solid #444', padding: 10, display: 'flex', gap: 10, alignItems: 'center' }}>
      <strong>Toolbar [stub]</strong>
      <button onClick={onNew}>New</button>
      <button onClick={onOpen}>Open</button>
      <button onClick={onSave}>Save</button>
      <select value={mode} onChange={(e) => onModeChange(e.target.value)}>
        <option value="Select">Select Mode</option>
        <option value="Add Point">Add Point Mode</option>
        <option value="Navigate">Navigate Mode</option>
      </select>
      <button onClick={onTagsOpen}>Tags ⚙</button>
    </div>
  );
}

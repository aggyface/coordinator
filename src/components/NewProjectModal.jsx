import React from 'react';

/**
 * NewProjectModal Stub.
 * The scrollable dialog for initializing a new microscopy project.
 */
export default function NewProjectModal({ isOpen, onCreate, onCancel }) {
  if (!isOpen) return null;
  return (
    <div style={{ position: 'fixed', top: '10%', left: '20%', border: '2px solid #ccc', padding: 20, backgroundColor: '#333', width: '60%' }}>
      <strong>NewProjectModal [stub]</strong>
      <div style={{ marginTop: 20 }}>
        <button onClick={onCreate}>Create Project</button>
        <button onClick={onCancel}>Cancel</button>
      </div>
    </div>
  );
}

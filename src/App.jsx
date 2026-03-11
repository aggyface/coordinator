import React, { useState, useEffect } from 'react';
import useSession from './hooks/useSession';
import { decodeImage } from './engine/imageLoader';
import Toolbar from './components/Toolbar';
import ImageCanvas from './components/ImageCanvas';
import PointList from './components/PointList';
import InstrumentQualityPanel from './components/InstrumentQualityPanel';
import NavigatePanel from './components/NavigatePanel';
import AddPointPanel from './components/AddPointPanel';
import TagDrawer from './components/TagDrawer';
import PointModal from './components/PointModal';
import NewProjectModal from './components/NewProjectModal';

/**
 * LabCoordinator — Main Application Shell.
 * Orchestrates modes, session state, and component visibility.
 */
export default function App() {
  const {
    session,
    computedCoords,
    transforms,
    isDirty,
    imageBitmap,
    setImageBitmap,
    imageBuffer,
    setImageBuffer,
    addInstrument,
    updateInstrument,
    deleteInstrument,
    addPoint,
    updatePoint,
    deletePoint,
    updateTagCategories,
    saveSession,
    loadSession,
    setSessionMetadata
  } = useSession();

  const [mode, setMode] = useState('Select');
  const [activeInstrumentId, setActiveInstrumentId] = useState(null);
  const [selectedPointId, setSelectedPointId] = useState(null);
  const [isTagDrawerOpen, setIsTagDrawerOpen] = useState(false);
  const [isNewProjectOpen, setIsNewProjectOpen] = useState(false);

  // Automatic image decoding whenever the buffer changes (e.g. after loading a .labcoord)
  useEffect(() => {
    if (imageBuffer && !imageBitmap) {
      decodeImage(imageBuffer).then(setImageBitmap).catch(console.error);
    }
  }, [imageBuffer, imageBitmap, setImageBitmap]);

  const handleCreateProject = (data) => {
    setSessionMetadata(data.projectName, data.sampleId);
    addInstrument(data.sourceInstrument);
    // Find the instrument ID after creation (it's generated in the hook)
    setIsNewProjectOpen(false);
  };

  // Sync activeInstrumentId when instruments are added if none is selected
  useEffect(() => {
    if (!activeInstrumentId && session.instruments.length > 0) {
      setActiveInstrumentId(session.instruments[0].id);
    }
  }, [session.instruments, activeInstrumentId]);

  const selectedPoint = session.points.find(p => p.id === selectedPointId);

  const handleFileOpen = async (file) => {
    if (file.name.endsWith('.labcoord')) {
      await loadSession(file);
    } else {
      // Treat as raw image import
      const buffer = await file.arrayBuffer();
      setImageBuffer(buffer);
      const bitmap = await decodeImage(buffer, file.name);
      setImageBitmap(bitmap);
    }
  };

  const handleSave = async () => {
    try {
      const blob = await saveSession();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${session.projectName || 'project'}.labcoord`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Save failed:', err);
      alert('Failed to save project. See console for details.');
    }
  };

  return (
    <div className="app-layout" style={{ display: 'flex', flexDirection: 'column', height: '100vh', backgroundColor: '#242424', color: '#fff' }}>
      <Toolbar 
        session={session} 
        mode={mode} 
        onModeChange={setMode}
        onTagsOpen={() => setIsTagDrawerOpen(true)}
        onNew={() => setIsNewProjectOpen(true)}
        onSave={handleSave}
        onOpen={handleFileOpen}
      />

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        <div className="sidebar" style={{ width: 300, borderRight: '1px solid #444', display: 'flex', flexDirection: 'column', padding: 10 }}>
          {mode === 'Select' && (
            <>
              <PointList 
                session={session} 
                computedCoords={computedCoords}
                activeInstrumentId={activeInstrumentId}
                selectedPointId={selectedPointId}
                onSelect={setSelectedPointId}
              />
              <InstrumentQualityPanel 
                session={session}
                activeInstrumentId={activeInstrumentId}
                onSetActive={setActiveInstrumentId}
                onAddInstrument={addInstrument}
              />
            </>
          )}
          {mode === 'Navigate' && (
            <NavigatePanel 
              session={session}
              activeInstrumentId={activeInstrumentId}
              onClose={() => setMode('Select')}
            />
          )}
          {mode === 'Add Point' && (
            <AddPointPanel 
              session={session}
              onConfirm={addPoint}
              onClose={() => setMode('Select')}
            />
          )}
        </div>

      <ImageCanvas 
        session={session}
        mode={mode}
        activeInstrumentId={activeInstrumentId}
        selectedPointId={selectedPointId}
        onPointClick={setSelectedPointId}
        onCanvasClick={(coords) => {
          if (mode === 'Add Point') {
            addPoint({ pixelCoords: coords });
          }
        }}
        imageBitmap={imageBitmap}
        setImageBitmap={setImageBitmap}
        imageBuffer={imageBuffer}
      />
    </div>

    <TagDrawer 
      session={session}
      isOpen={isTagDrawerOpen}
      onClose={() => setIsTagDrawerOpen(false)}
      onUpdateTags={updateTagCategories}
    />

    <PointModal 
      point={selectedPoint}
      session={session}
      onSave={(updates) => updatePoint(selectedPointId, updates)}
      onDelete={(id) => {
        deletePoint(id);
        setSelectedPointId(null);
      }}
      onClose={() => setSelectedPointId(null)}
    />

      <NewProjectModal 
        isOpen={isNewProjectOpen}
        onCreate={handleCreateProject}
        onCancel={() => setIsNewProjectOpen(false)}
      />
    </div>
  );
}

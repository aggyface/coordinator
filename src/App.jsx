import React, { useState } from 'react';
import useSession from './hooks/useSession';
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

  const selectedPoint = session.points.find(p => p.id === selectedPointId);

  return (
    <div className="app-layout" style={{ display: 'flex', flexDirection: 'column', height: '100vh', backgroundColor: '#242424', color: '#fff' }}>
      <Toolbar 
        session={session} 
        mode={mode} 
        onModeChange={setMode}
        onTagsOpen={() => setIsTagDrawerOpen(true)}
        onNew={() => setIsNewProjectOpen(true)}
        onSave={saveSession}
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
        onClose={() => setSelectedPointId(null)}
      />

      <NewProjectModal 
        isOpen={isNewProjectOpen}
        onCancel={() => setIsNewProjectOpen(false)}
      />
    </div>
  );
}

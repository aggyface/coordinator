import React, { useState, useEffect, useCallback } from 'react';
import useSession from './hooks/useSession';
import { decodeImage } from './engine/imageLoader';
import { generateCSV, triggerDownload, generateAnnotatedImage } from './engine/exportUtils';
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
    toggleAnalysed,
    updateTagCategories,
    saveSession,
    loadSession,
    setSessionMetadata,
    createNewProject,
    resetSession
  } = useSession();

  const [mode, setMode] = useState('Select');
  const [activeInstrumentId, setActiveInstrumentId] = useState(null);
  const [selectedPointId, setSelectedPointId] = useState(null);
  const [hoveredPointId, setHoveredPointId] = useState(null);
  const [isTagDrawerOpen, setIsTagDrawerOpen] = useState(false);
  const [isNewProjectOpen, setIsNewProjectOpen] = useState(false);
  const [isEditingMetadata, setIsEditingMetadata] = useState(false);
  const [isImageLoading, setIsImageLoading] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [showLegend, setShowLegend] = useState(true);
  const [showScaleBar, setShowScaleBar] = useState(true);
  const [fileHandle, setFileHandle] = useState(null);
  
  const canvasControlRef = React.useRef(null);

  // Automatic image decoding whenever the buffer changes
  useEffect(() => {
    if (imageBuffer && !imageBitmap) {
      setIsImageLoading(true); // Start loading
      setTimeout(() => {
        decodeImage(imageBuffer).then(bitmap => {
          setImageBitmap(bitmap);
          window.imageBitmap = bitmap;
          // Note: isImageLoading will be cleared by the Canvas via onImageLoad callback
        }).catch(err => {
          console.error(err);
          setIsImageLoading(false);
          alert("Failed to decode image.");
        });
      }, 50);
    }
  }, [imageBuffer, imageBitmap, setImageBitmap]);

  const handleCreateProject = (data) => {
    if (isEditingMetadata) {
      setSessionMetadata(data.projectName, data.sampleId);
    } else {
      createNewProject(data);
      setFileHandle(null);
      setActiveInstrumentId(null);
      setSelectedPointId(null);
    }
    setIsNewProjectOpen(false);
    setIsEditingMetadata(false);
  };

  // Sync activeInstrumentId
  useEffect(() => {
    if (!activeInstrumentId && session.instruments.length > 0) {
      setActiveInstrumentId(session.instruments[0].id);
    }
  }, [session.instruments, activeInstrumentId]);

  const selectedPoint = session.points.find(p => p.id === selectedPointId);

  const handleFileOpen = async (file) => {
    if (file.name.endsWith('.labcoord')) {
      await loadSession(file);
      setActiveInstrumentId(null);
      if ('FileSystemFileHandle' in window && file instanceof FileSystemFileHandle) {
        setFileHandle(file);
      }
    } else {
      const buffer = await file.arrayBuffer();
      setImageBuffer(buffer);
      if (session.instruments.length === 0) {
        setIsNewProjectOpen(true);
      }
    }
  };

  const handleSave = async () => {
    if (!fileHandle) {
      return handleSaveAs();
    }
    try {
      const blob = await saveSession();
      const writable = await fileHandle.createWritable();
      await writable.write(blob);
      await writable.close();
    } catch (err) {
      console.error('Persistent save failed, falling back to download:', err);
      handleSaveAs();
    }
  };

  const handleSaveAs = async () => {
    try {
      const blob = await saveSession();
      if ('showSaveFilePicker' in window) {
        try {
          const handle = await window.showSaveFilePicker({
            suggestedName: `${session.projectName || 'project'}.labcoord`,
            types: [{ description: 'LabCoordinator Project', accept: { 'application/zip': ['.labcoord'] } }],
          });
          const writable = await handle.createWritable();
          await writable.write(blob);
          await writable.close();
          setFileHandle(handle);
          return;
        } catch (e) {}
      }
      triggerDownload(blob, `${session.projectName || 'project'}.labcoord`, 'application/zip');
    } catch (err) {
      console.error('Save failed:', err);
      alert('Failed to save project.');
    }
  };

  const handleExportCSV = () => {
    if (!activeInstrumentId) return;
    const csv = generateCSV(session, computedCoords, transforms, activeInstrumentId);
    const inst = session.instruments.find(i => i.id === activeInstrumentId);
    triggerDownload(csv, `${session.projectName}_${inst.name}_Export.csv`);
  };

  const handleExportImage = async () => {
    if (!imageBitmap) return;
    setIsExporting(true);
    try {
      const clone = await createImageBitmap(imageBitmap);
      const blob = await generateAnnotatedImage(
        clone, 
        session.points, 
        activeInstrumentId, 
        session.tagCategories, 
        showLegend, 
        showScaleBar,
        transforms
      );
      triggerDownload(blob, `${session.projectName}_Annotated.png`, 'image/png');
    } catch (err) {
      console.error('Image export failed:', err);
      alert('Failed to export image.');
    } finally {
      setIsExporting(false);
    }
  };

  const centerOnPoint = useCallback((pointId) => {
    const point = session.points.find(p => p.id === pointId);
    if (point && canvasControlRef.current) {
      canvasControlRef.current.centerOn(point.pixelCoords.x, point.pixelCoords.y);
    }
  }, [session.points]);

  return (
    <div className="app-layout" style={{ display: 'flex', flexDirection: 'column', height: '100vh', backgroundColor: '#242424', color: '#fff', overflow: 'hidden' }}>
      <Toolbar 
        session={session} 
        mode={mode} 
        showLegend={showLegend}
        showScaleBar={showScaleBar}
        onToggleLegend={() => setShowLegend(!showLegend)}
        onToggleScaleBar={() => setShowScaleBar(!showScaleBar)}
        onModeChange={(newMode) => {
          setMode(newMode);
          if (mode === 'Navigate' && newMode === 'Select') {
            setSelectedPointId(null);
          }
        }}
        onTagsOpen={() => setIsTagDrawerOpen(true)}
        onNew={() => setIsNewProjectOpen(true)}
        onEditMetadata={() => setIsEditingMetadata(true)}
        onSave={handleSave}
        onSaveAs={handleSaveAs}
        onOpen={handleFileOpen}
        onExportCSV={handleExportCSV}
        onExportImage={handleExportImage}
      />

      <div style={{ display: 'flex', flex: 1, minHeight: 0, overflow: 'hidden' }}>
        <div className="sidebar" style={{ width: 320, borderRight: '1px solid #444', display: 'flex', flexDirection: 'column', padding: 10 }}>
          {mode === 'Select' && (
            <>
              <PointList 
                session={session} 
                imageLoaded={!!imageBitmap}
                computedCoords={computedCoords}
                activeInstrumentId={activeInstrumentId}
                selectedPointId={selectedPointId}
                hoveredPointId={hoveredPointId}
                onSelect={setSelectedPointId}
                onHover={setHoveredPointId}
                onCenter={centerOnPoint}
              />
              <InstrumentQualityPanel 
                session={session}
                transforms={transforms}
                activeInstrumentId={activeInstrumentId}
                onSetActive={setActiveInstrumentId}
                onAddInstrument={addInstrument}
                onUpdateInstrument={updateInstrument}
              />
            </>
          )}
          {mode === 'Navigate' && imageBitmap && (
            <NavigatePanel 
              session={session}
              computedCoords={computedCoords}
              activeInstrumentId={activeInstrumentId}
              selectedPointId={selectedPointId}
              onSelect={setSelectedPointId}
              onToggleAnalysed={toggleAnalysed}
              onCenter={centerOnPoint}
              onExportCSV={handleExportCSV}
              onClose={() => setMode('Select')}
            />
          )}
          {mode === 'Add Point' && imageBitmap && (
            <AddPointPanel 
              session={session}
              onConfirm={addPoint}
              onClose={() => setMode('Select')}
            />
          )}
        </div>

        <div style={{ flex: 1, position: 'relative', display: 'flex', minWidth: 0 }}>
          <ImageCanvas 
            session={session}
            mode={mode}
            activeInstrumentId={activeInstrumentId}
            selectedPointId={selectedPointId}
            hoveredPointId={hoveredPointId}
            showLegend={showLegend}
            showScaleBar={showScaleBar}
            onPointClick={setSelectedPointId}
            onHover={setHoveredPointId}
            onCanvasClick={(coords) => {
              if (mode === 'Add Point') {
                addPoint({ pixelCoords: coords });
              }
            }}
            imageBitmap={imageBitmap}
            onOpen={handleFileOpen}
            onImageLoad={() => setIsImageLoading(false)} // Clear loading only when canvas scales
            ref={canvasControlRef}
          />
          
          {isImageLoading && (
            <div style={styles.overlay}>
              <div style={styles.loaderTitle}>Loading Asset...</div>
              <div style={styles.loaderSub}>Decoding microscopy data</div>
            </div>
          )}

          {isExporting && (
            <div style={styles.exportIndicator}>
              Generating High-Res Image...
            </div>
          )}
        </div>
      </div>

      <TagDrawer 
        session={session}
        isOpen={isTagDrawerOpen}
        onClose={() => setIsTagDrawerOpen(false)}
        onUpdateTags={updateTagCategories}
      />

      {mode !== 'Navigate' && (
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
      )}

      <NewProjectModal 
        isOpen={isNewProjectOpen || isEditingMetadata}
        session={session}
        isEdit={isEditingMetadata}
        onCreate={handleCreateProject}
        onCancel={() => {
          setIsNewProjectOpen(false);
          setIsEditingMetadata(false);
        }}
      />
    </div>
  );
}

const styles = {
  overlay: { 
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, 
    backgroundColor: 'rgba(0,0,0,0.85)', display: 'flex', flexDirection: 'column', 
    alignItems: 'center', justifyContent: 'center', zIndex: 1000 
  },
  loaderTitle: { fontSize: 24, fontWeight: 'bold', color: '#00ffff' },
  loaderSub: { fontSize: 14, color: '#aaa', marginTop: 8 },
  exportIndicator: {
    position: 'absolute', top: 20, right: 20, backgroundColor: 'rgba(0, 255, 255, 0.2)',
    border: '1px solid #00ffff', padding: '8px 16px', borderRadius: 20, fontSize: 12,
    fontWeight: 'bold', color: '#00ffff', backdropFilter: 'blur(4px)', zIndex: 1100
  }
};

/**
 * LabCoordinator — Session Management Hook.
 * Centralized logic for the Version 6 Data Model, CRUD operations, 
 * and automated transform orchestration.
 */

import { useState, useMemo, useCallback, useEffect } from 'react';
import JSZip from 'jszip';
import { computeAllCoords } from '../engine/transform';

const INITIAL_SESSION = {
  version: 6,
  projectName: "Untitled Project",
  sampleId: "SAMPLE-001",
  tagPresetName: "Generic",
  instruments: [],
  tagCategories: [],
  points: []
};

/**
 * useSession Hook.
 * @returns {object} The session state and management methods.
 */
export default function useSession() {
  const [session, setSession] = useState(INITIAL_SESSION);
  const [imageBuffer, setImageBuffer] = useState(null); // Raw ArrayBuffer for ZIP
  const [imageBitmap, setImageBitmap] = useState(null); // Decoded for Canvas
  const [isDirty, setIsDirty] = useState(false);

  // Derived state: recompute all coordinates whenever points or instruments change
  const { results: computedCoords, transforms } = useMemo(() => {
    return computeAllCoords(session);
  }, [session.points, session.instruments]);

  /**
   * Internal helper to update session and mark as dirty.
   */
  const updateSession = useCallback((updater) => {
    setSession(prev => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      setIsDirty(true);
      return { ...next };
    });
  }, []);

  // --- Instrument CRUD ---

  const addInstrument = useCallback((inst) => {
    updateSession(prev => ({
      ...prev,
      instruments: [...prev.instruments, {
        id: crypto.randomUUID(),
        qualityOverridden: false,
        transform: null,
        ...inst
      }]
    }));
  }, [updateSession]);

  const updateInstrument = useCallback((id, updates) => {
    updateSession(prev => ({
      ...prev,
      instruments: prev.instruments.map(inst => 
        inst.id === id ? { ...inst, ...updates } : inst
      )
    }));
  }, [updateSession]);

  const deleteInstrument = useCallback((id) => {
    // Validation: prevent deletion if points have coordinates for this instrument
    const inUse = session.points.some(p => p.enteredCoords[id]);
    if (inUse) {
      throw new Error(`Cannot delete instrument: it is being used as a reference by some points.`);
    }
    updateSession(prev => ({
      ...prev,
      instruments: prev.instruments.filter(inst => inst.id !== id)
    }));
  }, [session.points, updateSession]);

  // --- Point CRUD ---

  const addPoint = useCallback((pointData) => {
    updateSession(prev => {
      // Auto-naming Pt-NNN / Ref-NNN logic
      const prefix = pointData.isReference ? "Ref" : "Pt";
      const existing = prev.points.filter(p => p.name.startsWith(prefix));
      const nextNum = existing.length + 1;
      const defaultName = `${prefix}-${String(nextNum).padStart(3, '0')}`;

      return {
        ...prev,
        points: [...prev.points, {
          id: crypto.randomUUID(),
          name: pointData.name || defaultName,
          pixelCoords: pointData.pixelCoords,
          enteredCoords: pointData.enteredCoords || {},
          pixelProxy: [],
          tags: pointData.tags || {},
          notes: pointData.notes || "",
          isAnalysed: false
        }]
      };
    });
  }, [updateSession]);

  const toggleAnalysed = useCallback((id) => {
    updateSession(prev => ({
      ...prev,
      points: prev.points.map(p => 
        p.id === id ? { ...p, isAnalysed: !p.isAnalysed } : p
      )
    }));
  }, [updateSession]);

  const updatePoint = useCallback((id, updates) => {
    updateSession(prev => ({
      ...prev,
      points: prev.points.map(p => 
        p.id === id ? { ...p, ...updates } : p
      )
    }));
  }, [updateSession]);

  const deletePoint = useCallback((id) => {
    updateSession(prev => ({
      ...prev,
      points: prev.points.filter(p => p.id !== id)
    }));
  }, [updateSession]);

  // --- Tag CRUD ---

  const updateTagCategories = useCallback((categories) => {
    updateSession(prev => ({
      ...prev,
      tagCategories: categories
    }));
  }, [updateSession]);

  // --- Persistence (.labcoord ZIP) ---

  /**
   * Saves the current session and image to a .labcoord file.
   */
  const saveSession = useCallback(async () => {
    const zip = new JSZip();
    zip.file("session.json", JSON.stringify(session, null, 2));
    if (imageBuffer) {
      zip.file("image.data", imageBuffer); // Generic name for the embedded asset
    }
    
    const blob = await zip.generateAsync({ type: "blob" });
    setIsDirty(false);
    return blob;
  }, [session, imageBuffer]);

  /**
   * Loads a .labcoord file into the session.
   */
  const loadSession = useCallback(async (file) => {
    const zip = await JSZip.loadAsync(file);
    const sessionJson = await zip.file("session.json").async("string");
    const loadedSession = JSON.parse(sessionJson);
    
    // Attempt to load the image if it exists
    const imageFile = zip.file("image.data");
    if (imageFile) {
      const buffer = await imageFile.async("arraybuffer");
      setImageBuffer(buffer);
      // Actual ImageBitmap decoding should happen in the Canvas loader logic
    }

    setSession(loadedSession);
    setIsDirty(false);
  }, []);

  return {
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
    setSessionMetadata: (projectName, sampleId) => updateSession(prev => ({ ...prev, projectName, sampleId }))
  };
}

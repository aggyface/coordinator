import React, { useRef, useEffect, useState, useCallback, useImperativeHandle, forwardRef } from 'react';
import { decodeImage, calculateFitScale } from '../engine/imageLoader';
import { computeConvexHull, computeLocalScale } from '../engine/transform';

const COLORS = {
  reference: '#00ffff',
  analysis: '#ffeb3b',
  selected: '#ffffff',
  hull: 'rgba(0, 255, 255, 0.3)',
  hover: 'rgba(255, 255, 255, 0.25)'
};

/**
 * ImageCanvas Component.
 * High-performance microscopy image renderer with pan/zoom and marker overlays.
 */
const ImageCanvas = forwardRef(({ 
  session, 
  mode, 
  activeInstrumentId, 
  onPointClick, 
  onCanvasClick, 
  selectedPointId,
  hoveredPointId,
  showLegend,
  showScaleBar,
  onHover,
  imageBitmap,
  onOpen,
  onImageLoad
}, ref) => {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  
  // Viewport state
  const [viewport, setViewport] = useState({ x: 0, y: 0, scale: 1 });
  const [isPanning, setIsPanning] = useState(false);
  const lastMousePos = useRef({ x: 0, y: 0 });

  /**
   * Expose controls to parent via ref.
   */
  useImperativeHandle(ref, () => ({
    centerOn: (imageX, imageY) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      setViewport(prev => ({
        ...prev,
        x: rect.width / 2 - imageX * prev.scale,
        y: rect.height / 2 - imageY * prev.scale
      }));
    }
  }));

  /**
   * Helper to fit image to viewport and signal load complete.
   */
  const fitImage = useCallback(() => {
    if (imageBitmap && containerRef.current) {
      const { width, height } = containerRef.current.getBoundingClientRect();
      const scale = calculateFitScale(imageBitmap.width, imageBitmap.height, width, height);
      setViewport({
        x: (width - imageBitmap.width * scale) / 2,
        y: (height - imageBitmap.height * scale) / 2,
        scale
      });
      // CRITICAL: Notify parent that initial rendering/layout is complete
      if (onImageLoad) onImageLoad();
    }
  }, [imageBitmap, onImageLoad]);

  useEffect(() => {
    fitImage();
  }, [imageBitmap, fitImage]);

  /**
   * Keyboard Shortcuts.
   */
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) return;

      const panStep = 50 / viewport.scale;
      switch(e.key) {
        case 'ArrowUp':    setViewport(v => ({ ...v, y: v.y + 50 })); break;
        case 'ArrowDown':  setViewport(v => ({ ...v, y: v.y - 50 })); break;
        case 'ArrowLeft':  setViewport(v => ({ ...v, x: v.x + 50 })); break;
        case 'ArrowRight': setViewport(v => ({ ...v, x: v.x - 50 })); break;
        case '+':
        case '=':          adjustZoom(1.2); break;
        case '-':
        case '_':          adjustZoom(1 / 1.2); break;
        case '0':          fitImage(); break;
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [viewport.scale, fitImage]);

  const adjustZoom = (factor) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    setViewport(prev => {
      const newScale = Math.max(0.01, Math.min(prev.scale * factor, 50));
      const actualFactor = newScale / prev.scale;
      return {
        scale: newScale,
        x: centerX - (centerX - prev.x) * actualFactor,
        y: centerY - (centerY - prev.y) * actualFactor
      };
    });
  };

  /**
   * Marker Rendering Helpers.
   */
  const drawReferenceMarker = (ctx, x, y, size, isSelected) => {
    ctx.beginPath();
    ctx.moveTo(x, y - size);
    ctx.lineTo(x + size, y);
    ctx.lineTo(x, y + size);
    ctx.lineTo(x - size, y);
    ctx.closePath();
    ctx.strokeStyle = isSelected ? COLORS.selected : COLORS.reference;
    ctx.lineWidth = isSelected ? 3 : 2;
    ctx.stroke();
    if (isSelected) {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
      ctx.fill();
    }
  };

  const drawAnalysisMarker = (ctx, x, y, size, color, isSelected) => {
    ctx.beginPath();
    ctx.arc(x, y, size, 0, Math.PI * 2);
    ctx.strokeStyle = isSelected ? COLORS.selected : (color || COLORS.analysis);
    ctx.lineWidth = isSelected ? 3 : 2;
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(x, y, size / 4, 0, Math.PI * 2);
    ctx.fillStyle = isSelected ? COLORS.selected : (color || COLORS.analysis);
    ctx.fill();
  };

  /**
   * Scale Bar Rendering.
   */
  const renderScaleBar = (ctx, canvasWidth, canvasHeight) => {
    const activeInst = session.instruments.find(i => i.id === activeInstrumentId);
    if (!activeInst || activeInst.units === 'Custom') return; // Skip if custom/unknown units

    const refs = session.points
      .filter(p => p.enteredCoords[activeInstrumentId])
      .map(p => ({ oldCoord: p.pixelCoords, newCoord: p.enteredCoords[activeInstrumentId] }));

    const scaleResult = computeLocalScale({ x: 0, y: 0 }, refs, activeInst.units);
    if (!scaleResult.scale) return;

    const screenPxPerUnit = viewport.scale / scaleResult.scale;
    const targetBarWidthPx = 150;
    const units = targetBarWidthPx / screenPxPerUnit;
    
    const magnitude = Math.pow(10, Math.floor(Math.log10(units)));
    const firstDigit = units / magnitude;
    let niceUnits = magnitude;
    if (firstDigit > 5) niceUnits = 5 * magnitude;
    else if (firstDigit > 2) niceUnits = 2 * magnitude;
    
    const barWidthPx = niceUnits * screenPxPerUnit;

    ctx.save();
    ctx.translate(30, canvasHeight - 40);
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, -5); ctx.lineTo(0, 0); ctx.lineTo(barWidthPx, 0); ctx.lineTo(barWidthPx, -5);
    ctx.stroke();

    ctx.fillStyle = '#fff';
    ctx.font = 'bold 12px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`${niceUnits} ${activeInst.units}`, barWidthPx / 2, 15);
    ctx.restore();
  };

  /**
   * Legend Rendering.
   */
  const renderLegend = (ctx, canvasWidth, canvasHeight) => {
    const colorCat = session.tagCategories.find(c => c.isColorCategory);
    if (!showLegend || !colorCat || colorCat.values.length === 0) return;

    const rowHeight = 20;
    const padding = 12;
    const width = 150;
    const height = (colorCat.values.length + 1) * rowHeight + padding * 2;

    ctx.save();
    ctx.translate(canvasWidth - width - 20, 20); // Top Right
    
    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.fillRect(0, 0, width, height);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.strokeRect(0, 0, width, height);

    ctx.fillStyle = '#aaa';
    ctx.font = 'bold 10px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(colorCat.name.toUpperCase(), padding, padding + 10);

    colorCat.values.forEach((v, i) => {
      const y = padding + 25 + (i * rowHeight);
      ctx.beginPath();
      ctx.arc(padding + 5, y - 4, 5, 0, Math.PI * 2);
      ctx.fillStyle = v.color;
      ctx.fill();
      
      ctx.fillStyle = '#fff';
      ctx.font = '12px sans-serif';
      ctx.fillText(v.label, padding + 18, y);
    });

    ctx.restore();
  };

  /**
   * Main Rendering Loop.
   */
  const render = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const rect = containerRef.current.getBoundingClientRect();
    if (canvas.width !== rect.width || canvas.height !== rect.height) {
      canvas.width = rect.width;
      canvas.height = rect.height;
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (imageBitmap) {
      ctx.save();
      ctx.translate(viewport.x, viewport.y);
      ctx.scale(viewport.scale, viewport.scale);
      ctx.imageSmoothingEnabled = viewport.scale < 1.0;
      ctx.drawImage(imageBitmap, 0, 0);
      
      const refPoints = session.points.filter(p => p.enteredCoords[activeInstrumentId]);
      if (refPoints.length >= 3) {
        const hull = computeConvexHull(refPoints.map(p => p.pixelCoords));
        ctx.beginPath();
        ctx.moveTo(hull[0].x, hull[0].y);
        hull.forEach(p => ctx.lineTo(p.x, p.y));
        ctx.closePath();
        ctx.strokeStyle = COLORS.reference;
        ctx.setLineDash([5 / viewport.scale, 5 / viewport.scale]);
        ctx.lineWidth = 1 / viewport.scale;
        ctx.stroke();
        ctx.setLineDash([]);
      }
      ctx.restore();

      const markerSize = 10;
      session.points.forEach(point => {
        const screenX = point.pixelCoords.x * viewport.scale + viewport.x;
        const screenY = point.pixelCoords.y * viewport.scale + viewport.y;
        if (screenX < -20 || screenX > canvas.width + 20 || screenY < -20 || screenY > canvas.height + 20) return;

        const isReference = !!point.enteredCoords[activeInstrumentId];
        const isSelected = point.id === selectedPointId;
        const isHovered = point.id === hoveredPointId;

        if (isHovered && !isSelected) {
          ctx.beginPath();
          ctx.arc(screenX, screenY, markerSize + 6, 0, Math.PI * 2);
          ctx.fillStyle = COLORS.hover;
          ctx.fill();
        }

        if (isReference) {
          drawReferenceMarker(ctx, screenX, screenY, markerSize, isSelected);
        } else {
          let categoryColor = null;
          const colorCat = session.tagCategories.find(c => c.isColorCategory);
          if (colorCat && point.tags[colorCat.name]) {
            const val = colorCat.values.find(v => v.label === point.tags[colorCat.name]);
            if (val) categoryColor = val.color;
          }
          drawAnalysisMarker(ctx, screenX, screenY, markerSize, categoryColor, isSelected);
        }
      });

      if (showScaleBar) renderScaleBar(ctx, canvas.width, canvas.height);
      renderLegend(ctx, canvas.width, canvas.height);
    }
  }, [imageBitmap, viewport, session, activeInstrumentId, selectedPointId, hoveredPointId, showLegend, showScaleBar]);

  useEffect(() => {
    const frame = requestAnimationFrame(render);
    return () => cancelAnimationFrame(frame);
  }, [render]);

  /**
   * Interaction Handlers.
   */
  const handleMouseDown = (e) => {
    if (e.button === 1 || (e.button === 0 && mode !== 'Add Point') || e.shiftKey) {
      setIsPanning(true);
      lastMousePos.current = { x: e.clientX, y: e.clientY };
      e.preventDefault();
    }
  };

  const handleMouseMove = (e) => {
    if (!canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    if (isPanning) {
      const dx = e.clientX - lastMousePos.current.x;
      const dy = e.clientY - lastMousePos.current.y;
      setViewport(prev => ({ ...prev, x: prev.x + dx, y: prev.y + dy }));
      lastMousePos.current = { x: e.clientX, y: e.clientY };
    } else {
      const threshold = 15;
      let hoveredId = null;
      session.points.forEach(point => {
        const screenX = point.pixelCoords.x * viewport.scale + viewport.x;
        const screenY = point.pixelCoords.y * viewport.scale + viewport.y;
        const dist = Math.sqrt(Math.pow(mouseX - screenX, 2) + Math.pow(mouseY - screenY, 2));
        if (dist < threshold) hoveredId = point.id;
      });
      onHover(hoveredId);
    }
  };

  /**
   * Global Drag & Drop Prevention.
   */
  useEffect(() => {
    const preventDefault = (e) => {
      e.preventDefault();
      e.stopPropagation();
    };
    window.addEventListener('dragover', preventDefault);
    window.addEventListener('drop', preventDefault);
    return () => {
      window.removeEventListener('dragover', preventDefault);
      window.removeEventListener('drop', preventDefault);
    };
  }, []);

  const handleMouseUp = () => setIsPanning(false);

  const handleWheel = (e) => {
    e.preventDefault();
    const factor = Math.pow(1.1, -e.deltaY / 100);
    const rect = canvasRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    setViewport(prev => {
      const newScale = Math.max(0.01, Math.min(prev.scale * factor, 50));
      const actualFactor = newScale / prev.scale;
      return { scale: newScale, x: mouseX - (mouseX - prev.x) * actualFactor, y: mouseY - (mouseY - prev.y) * actualFactor };
    });
  };

  const handleClick = (e) => {
    if (isPanning || !imageBitmap || e.button !== 0) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const threshold = 15;
    let clickedPoint = null;
    let minDist = threshold;

    session.points.forEach(point => {
      const screenX = point.pixelCoords.x * viewport.scale + viewport.x;
      const screenY = point.pixelCoords.y * viewport.scale + viewport.y;
      const dist = Math.sqrt(Math.pow(mouseX - screenX, 2) + Math.pow(mouseY - screenY, 2));
      if (dist < minDist) { minDist = dist; clickedPoint = point; }
    });

    if (clickedPoint) {
      onPointClick(clickedPoint.id);
    } else if (mode === 'Add Point') {
      const px = (mouseX - viewport.x) / viewport.scale;
      const py = (mouseY - viewport.y) / viewport.scale;
      if (px >= 0 && px <= imageBitmap.width && py >= 0 && py <= imageBitmap.height) {
        onCanvasClick({ x: px, y: py });
      }
    } else {
      onPointClick(null);
    }
  };

  return (
    <div 
      ref={containerRef} 
      className="canvas-container" 
      style={{ flex: 1, position: 'relative', overflow: 'hidden', backgroundColor: '#1a1a1a', cursor: isPanning ? 'grabbing' : (mode === 'Add Point' ? 'crosshair' : 'default') }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={() => { handleMouseUp(); onHover(null); }}
      onWheel={handleWheel}
      onClick={handleClick}
      onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
      onDrop={(e) => { e.preventDefault(); e.stopPropagation(); const file = e.dataTransfer.files[0]; if (file && onOpen) onOpen(file); }}
    >
      <canvas ref={canvasRef} style={{ display: 'block' }} />
      
      <div style={styles.navOverlay}>
        <div style={styles.pad}>
          <button 
            onClick={(e) => { e.stopPropagation(); setViewport(v => ({ ...v, y: v.y + 100 })); }} 
            style={styles.navBtn}
          >▲</button>
          <div style={{ display: 'flex', gap: 4 }}>
            <button 
              onClick={(e) => { e.stopPropagation(); setViewport(v => ({ ...v, x: v.x + 100 })); }} 
              style={styles.navBtn}
            >◀</button>
            <button 
              onClick={(e) => { e.stopPropagation(); fitImage(); }} 
              style={{ ...styles.navBtn, color: '#00ffff' }}
            >◎</button>
            <button 
              onClick={(e) => { e.stopPropagation(); setViewport(v => ({ ...v, x: v.x - 100 })); }} 
              style={styles.navBtn}
            >▶</button>
          </div>
          <button 
            onClick={(e) => { e.stopPropagation(); setViewport(v => ({ ...v, y: v.y - 100 })); }} 
            style={styles.navBtn}
          >▼</button>
        </div>
        <div style={{ ...styles.pad, marginTop: 12 }}>
          <button 
            onClick={(e) => { e.stopPropagation(); adjustZoom(1.5); }} 
            style={styles.navBtn}
          >+</button>
          <button 
            onClick={(e) => { e.stopPropagation(); adjustZoom(1/1.5); }} 
            style={styles.navBtn}
          >-</button>
        </div>
      </div>
    </div>
  );
});

const styles = {
  navOverlay: {
    position: 'absolute', bottom: 20, right: 20, display: 'flex', flexDirection: 'column', alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)', padding: 12, borderRadius: 12, backdropFilter: 'blur(4px)', border: '1px solid #444'
  },
  pad: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 },
  navBtn: { 
    width: 32, height: 32, padding: 0, margin: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#333', border: '1px solid #555', color: '#fff', borderRadius: 4, cursor: 'pointer', fontSize: 14
  }
};

export default ImageCanvas;

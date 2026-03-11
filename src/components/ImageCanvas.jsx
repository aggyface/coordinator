import React, { useRef, useEffect, useState, useCallback } from 'react';
import { decodeImage, calculateFitScale } from '../engine/imageLoader';
import { computeConvexHull } from '../engine/transform';

const COLORS = {
  reference: '#00ffff',
  analysis: '#ffeb3b',
  selected: '#ffffff',
  hull: 'rgba(0, 255, 255, 0.3)'
};

/**
 * ImageCanvas Component.
 * High-performance microscopy image renderer with pan/zoom and marker overlays.
 */
export default function ImageCanvas({ 
  session, 
  mode, 
  activeInstrumentId, 
  onPointClick, 
  onCanvasClick, 
  selectedPointId,
  imageBitmap,
  onOpen
}) {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  
  // Viewport state
  const [viewport, setViewport] = useState({ x: 0, y: 0, scale: 1 });
  const [isPanning, setIsPanning] = useState(false);
  const [hoveredPointId, setHoveredPointId] = useState(null);
  const lastMousePos = useRef({ x: 0, y: 0 });

  /**
   * Helper to fit image to viewport.
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
    }
  }, [imageBitmap]);

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
        case 'ArrowUp':    setViewport(v => ({ ...v, y: v.y + panStep * v.scale })); break;
        case 'ArrowDown':  setViewport(v => ({ ...v, y: v.y - panStep * v.scale })); break;
        case 'ArrowLeft':  setViewport(v => ({ ...v, x: v.x + panStep * v.scale })); break;
        case 'ArrowRight': setViewport(v => ({ ...v, x: v.x - panStep * v.scale })); break;
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
          ctx.arc(screenX, screenY, markerSize + 5, 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
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
    }
  }, [imageBitmap, viewport, session, activeInstrumentId, selectedPointId]);

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
    const rect = canvasRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    if (isPanning) {
      const dx = e.clientX - lastMousePos.current.x;
      const dy = e.clientY - lastMousePos.current.y;
      setViewport(prev => ({ ...prev, x: prev.x + dx, y: prev.y + dy }));
      lastMousePos.current = { x: e.clientX, y: e.clientY };
    } else {
      // Hit testing for hover
      const threshold = 15;
      let hoveredId = null;
      session.points.forEach(point => {
        const screenX = point.pixelCoords.x * viewport.scale + viewport.x;
        const screenY = point.pixelCoords.y * viewport.scale + viewport.y;
        const dist = Math.sqrt(Math.pow(mouseX - screenX, 2) + Math.pow(mouseY - screenY, 2));
        if (dist < threshold) hoveredId = point.id;
      });
      setHoveredPointId(hoveredId);
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
      onCanvasClick({ x: (mouseX - viewport.x) / viewport.scale, y: (mouseY - viewport.y) / viewport.scale });
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
      onMouseLeave={handleMouseUp}
      onWheel={handleWheel}
      onClick={handleClick}
      onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
      onDrop={(e) => { e.preventDefault(); e.stopPropagation(); const file = e.dataTransfer.files[0]; if (file && onOpen) onOpen(file); }}
    >
      <canvas ref={canvasRef} style={{ display: 'block' }} />
      
      {/* Navigation Controls Overlay */}
      <div style={styles.navOverlay}>
        <div style={styles.pad}>
          <button onClick={() => setViewport(v => ({ ...v, y: v.y + 100 }))} style={styles.navBtn}>▲</button>
          <div style={{ display: 'flex', gap: 4 }}>
            <button onClick={() => setViewport(v => ({ ...v, x: v.x + 100 }))} style={styles.navBtn}>◀</button>
            <button onClick={fitImage} style={{ ...styles.navBtn, color: '#00ffff' }}>◎</button>
            <button onClick={() => setViewport(v => ({ ...v, x: v.x - 100 }))} style={styles.navBtn}>▶</button>
          </div>
          <button onClick={() => setViewport(v => ({ ...v, y: v.y - 100 }))} style={styles.navBtn}>▼</button>
        </div>
        <div style={{ ...styles.pad, marginTop: 12 }}>
          <button onClick={() => adjustZoom(1.5)} style={styles.navBtn}>+</button>
          <button onClick={() => adjustZoom(1/1.5)} style={styles.navBtn}>-</button>
        </div>
      </div>
    </div>
  );
}

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

import React, { useState, useRef, useEffect } from 'react';
import './VisualMicPositioning.css';

/**
 * VisualMicPositioning - Interactive mic positioning interface
 * 
 * Features:
 * - Visual speaker cone
 * - Draggable mic position
 * - Distance/Angle/Height sliders
 * - Real-time parameter display
 */

const VisualMicPositioning = ({ cabinet, onPositionChange }) => {
  const [distance, setDistance] = useState(cabinet?.distance ?? 3);
  const [angle, setAngle] = useState(cabinet?.angle ?? 0);
  const [height, setHeight] = useState(cabinet?.height ?? 0);
  const [isDragging, setIsDragging] = useState(false);
  
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  
  useEffect(() => {
    drawVisualization();
  }, [distance, angle, height]);
  
  /**
   * Draw speaker cone and mic position
   */
  const drawVisualization = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    const centerX = width / 2;
    const centerY = height / 2;
    
    // Clear canvas
    ctx.clearRect(0, 0, width, height);
    
    // Background
    ctx.fillStyle = 'rgba(20, 20, 25, 0.95)';
    ctx.fillRect(0, 0, width, height);
    
    // Grid
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.lineWidth = 1;
    for (let i = 0; i < width; i += 20) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i, height);
      ctx.stroke();
    }
    for (let i = 0; i < height; i += 20) {
      ctx.beginPath();
      ctx.moveTo(0, i);
      ctx.lineTo(width, i);
      ctx.stroke();
    }
    
    // Speaker cone (4x12 cabinet)
    const speakerRadius = 80;
    
    // Shadow
    ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
    ctx.shadowBlur = 20;
    ctx.shadowOffsetX = 5;
    ctx.shadowOffsetY = 5;
    
    // Speaker outer ring
    ctx.fillStyle = '#2a2a2a';
    ctx.beginPath();
    ctx.arc(centerX, centerY, speakerRadius, 0, Math.PI * 2);
    ctx.fill();
    
    // Speaker cone
    ctx.shadowColor = 'transparent';
    ctx.fillStyle = '#1a1a1a';
    ctx.beginPath();
    ctx.arc(centerX, centerY, speakerRadius - 10, 0, Math.PI * 2);
    ctx.fill();
    
    // Cone detail (dust cap)
    const gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, 30);
    gradient.addColorStop(0, '#333333');
    gradient.addColorStop(1, '#1a1a1a');
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(centerX, centerY, 30, 0, Math.PI * 2);
    ctx.fill();
    
    // Speaker edge detail
    ctx.strokeStyle = '#ff6b35';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(centerX, centerY, speakerRadius, 0, Math.PI * 2);
    ctx.stroke();
    
    // Distance circles
    ctx.strokeStyle = 'rgba(255, 107, 53, 0.2)';
    ctx.lineWidth = 1;
    for (let r = speakerRadius + 20; r < width / 2; r += 30) {
      ctx.beginPath();
      ctx.arc(centerX, centerY, r, 0, Math.PI * 2);
      ctx.stroke();
    }
    
    // Calculate mic position
    const angleRad = (angle * Math.PI) / 180;
    const distancePixels = speakerRadius + (distance / 50) * 100;
    const micX = centerX + Math.cos(angleRad) * distancePixels;
    const micY = centerY + Math.sin(angleRad) * distancePixels;
    
    // Mic beam (shows direction)
    ctx.strokeStyle = 'rgba(255, 107, 53, 0.3)';
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.moveTo(centerX, centerY);
    ctx.lineTo(micX, micY);
    ctx.stroke();
    ctx.setLineDash([]);
    
    // Mic icon
    ctx.shadowColor = 'rgba(255, 107, 53, 0.8)';
    ctx.shadowBlur = 15;
    
    // Mic body
    ctx.fillStyle = '#ff6b35';
    ctx.beginPath();
    ctx.arc(micX, micY, 12, 0, Math.PI * 2);
    ctx.fill();
    
    // Mic direction indicator
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(micX, micY);
    ctx.lineTo(micX - 8 * Math.cos(angleRad), micY - 8 * Math.sin(angleRad));
    ctx.lineTo(micX - 8 * Math.cos(angleRad + 0.5), micY - 8 * Math.sin(angleRad + 0.5));
    ctx.fill();
    
    ctx.shadowColor = 'transparent';
    
    // Labels
    ctx.fillStyle = '#ffffff';
    ctx.font = '12px SF Mono, monospace';
    ctx.textAlign = 'center';
    
    // Distance label
    ctx.fillText(`${distance}cm`, micX, micY + 30);
    
    // Angle indicator
    ctx.strokeStyle = 'rgba(255, 107, 53, 0.5)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(centerX, centerY, speakerRadius + 15, 0, angleRad);
    ctx.stroke();
    
    // Angle label
    ctx.fillText(`${Math.round(angle)}°`, centerX + 80, centerY - 80);
  };
  
  /**
   * Handle canvas click/drag
   */
  const handleCanvasInteraction = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    
    // Calculate distance and angle from center
    const dx = x - centerX;
    const dy = y - centerY;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const ang = Math.atan2(dy, dx) * (180 / Math.PI);
    
    const speakerRadius = 80;
    const newDistance = Math.max(0, Math.min(50, ((dist - speakerRadius) / 100) * 50));
    // Limit angle to 0-90° (backend constraint)
    const newAngle = Math.max(0, Math.min(90, (ang + 360) % 360));
    
    setDistance(Math.round(newDistance));
    setAngle(Math.round(newAngle));
    
    if (onPositionChange) {
      onPositionChange({
        distance: Math.round(newDistance),
        angle: Math.round(newAngle),
        height
      });
    }
  };
  
  const handleMouseDown = (e) => {
    setIsDragging(true);
    handleCanvasInteraction(e);
  };
  
  const handleMouseMove = (e) => {
    if (isDragging) {
      handleCanvasInteraction(e);
    }
  };
  
  const handleMouseUp = () => {
    setIsDragging(false);
  };
  
  const handleDistanceChange = (e) => {
    const newDistance = parseInt(e.target.value);
    setDistance(newDistance);
    if (onPositionChange) {
      onPositionChange({ distance: newDistance, angle, height });
    }
  };
  
  const handleAngleChange = (e) => {
    const newAngle = parseInt(e.target.value);
    setAngle(newAngle);
    if (onPositionChange) {
      onPositionChange({ distance, angle: newAngle, height });
    }
  };
  
  const handleHeightChange = (e) => {
    const newHeight = parseInt(e.target.value);
    setHeight(newHeight);
    if (onPositionChange) {
      onPositionChange({ distance, angle, height: newHeight });
    }
  };
  
  // Preset positions (0-90° range)
  const presetPositions = [
    { name: 'Center', distance: 3, angle: 0, height: 0 },
    { name: 'Edge', distance: 8, angle: 30, height: 0 },
    { name: 'Off-Axis', distance: 15, angle: 60, height: 0 },
    { name: 'Room', distance: 30, angle: 45, height: 1 }
  ];
  
  const loadPresetPosition = (preset) => {
    setDistance(preset.distance);
    setAngle(preset.angle);
    setHeight(preset.height);
    if (onPositionChange) {
      onPositionChange(preset);
    }
  };
  
  return (
    <div className="visual-mic-positioning" ref={containerRef}>
      <div className="mic-positioning-header">
        <h3>🎙️ Mic Positioning</h3>
        <div className="positioning-presets">
          {presetPositions.map((preset) => (
            <button
              key={preset.name}
              className="preset-btn"
              onClick={() => loadPresetPosition(preset)}
            >
              {preset.name}
            </button>
          ))}
        </div>
      </div>
      
      <div className="mic-canvas-container">
        <canvas
          ref={canvasRef}
          width={400}
          height={400}
          className="mic-positioning-canvas"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        />
        
        <div className="mic-position-info">
          <div className="info-item">
            <span className="info-label">Distance:</span>
            <span className="info-value">{distance}cm</span>
          </div>
          <div className="info-item">
            <span className="info-label">Angle:</span>
            <span className="info-value">{Math.round(angle)}°</span>
          </div>
          <div className="info-item">
            <span className="info-label">Proximity:</span>
            <span className="info-value">+{((50 - distance) / 10).toFixed(1)}dB</span>
          </div>
        </div>
      </div>
      
      <div className="mic-controls">
        <div className="control-row">
          <label>Distance (0-50cm)</label>
          <input
            type="range"
            min="0"
            max="50"
            value={distance}
            onChange={handleDistanceChange}
            className="mic-slider"
          />
          <span className="control-value">{distance}cm</span>
        </div>
        
        <div className="control-row">
          <label>Angle (0-90°)</label>
          <input
            type="range"
            min="0"
            max="90"
            value={angle}
            onChange={handleAngleChange}
            className="mic-slider"
          />
          <span className="control-value">{Math.round(angle)}°</span>
        </div>
        
        <div className="control-row">
          <label>Height</label>
          <select
            value={height}
            onChange={handleHeightChange}
            className="mic-select"
          >
            <option value="-1">Low (Bottom)</option>
            <option value="0">Center</option>
            <option value="1">High (Top)</option>
          </select>
        </div>
      </div>
      
      <div className="mic-positioning-tips">
        <p><strong>💡 Tips:</strong></p>
        <ul>
          <li><strong>Center (0-5cm, 0°):</strong> Maximum proximity, bright & aggressive</li>
          <li><strong>Edge (5-15cm, 20-40°):</strong> Balanced tone, less bass</li>
          <li><strong>Off-Axis (15-30cm, 50-90°):</strong> Darker, smoother tone</li>
          <li><strong>Room (30-50cm):</strong> Natural, airy sound with air loss</li>
          <li><strong>Angle:</strong> 0° = on-axis (bright), 90° = off-axis (dark)</li>
        </ul>
      </div>
    </div>
  );
};

export default VisualMicPositioning;


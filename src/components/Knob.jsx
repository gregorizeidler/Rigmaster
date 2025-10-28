import React, { useState, useRef } from 'react';
import './Knob.css';

const Knob = ({ label, value, onChange, min = 0, max = 100, unit = '', color, pointerColor }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);
  const knobRef = useRef(null);
  const startYRef = useRef(0);
  const startValueRef = useRef(0);
  const velocityRef = useRef(0);
  const lastYRef = useRef(0);
  const lastTimeRef = useRef(0);
  const momentumIntervalRef = useRef(null);

  const handleMouseDown = (e) => {
    setIsDragging(true);
    startYRef.current = e.clientY;
    startValueRef.current = value;
    e.preventDefault();
  };

  const handleMouseMove = React.useCallback((e) => {
    if (!isDragging) return;
    
    const currentTime = Date.now();
    const deltaY = startYRef.current - e.clientY;
    const sensitivity = 0.5;
    const change = (deltaY * sensitivity);
    
    // Calculate velocity for momentum
    if (lastTimeRef.current > 0) {
      const timeDelta = currentTime - lastTimeRef.current;
      const yDelta = e.clientY - lastYRef.current;
      velocityRef.current = timeDelta > 0 ? -yDelta / timeDelta : 0;
    }
    
    lastYRef.current = e.clientY;
    lastTimeRef.current = currentTime;
    
    let newValue = startValueRef.current + change;
    newValue = Math.max(min, Math.min(max, newValue));
    
    onChange(Math.round(newValue));
  }, [isDragging, min, max, onChange]);

  const applyMomentum = React.useCallback(() => {
    if (momentumIntervalRef.current) {
      clearInterval(momentumIntervalRef.current);
    }

    let currentVelocity = velocityRef.current * 50; // Amplify for visibility
    const friction = 0.92; // Deceleration factor
    const threshold = 0.1; // Stop when velocity is too low
    
    if (Math.abs(currentVelocity) < threshold) return;

    momentumIntervalRef.current = setInterval(() => {
      if (Math.abs(currentVelocity) < threshold) {
        clearInterval(momentumIntervalRef.current);
        momentumIntervalRef.current = null;
        return;
      }

      const currentValue = value;
      let newValue = currentValue + currentVelocity * 0.5;
      newValue = Math.max(min, Math.min(max, newValue));
      
      if (newValue !== currentValue) {
        onChange(Math.round(newValue));
      }
      
      currentVelocity *= friction;
    }, 16); // ~60fps
  }, [value, min, max, onChange]);

  const handleMouseUp = () => {
    setIsDragging(false);
    applyMomentum();
    // Reset tracking vars
    velocityRef.current = 0;
    lastYRef.current = 0;
    lastTimeRef.current = 0;
  };

  React.useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove]);

  // Cleanup momentum interval on unmount
  React.useEffect(() => {
    return () => {
      if (momentumIntervalRef.current) {
        clearInterval(momentumIntervalRef.current);
      }
    };
  }, []);

  const rotation = ((value - min) / (max - min)) * 270 - 135;
  const percentage = ((value - min) / (max - min)) * 100;

  // Determine unit display
  const getUnitDisplay = () => {
    if (unit) return unit;
    // Auto-detect common units based on label
    const lowerLabel = label.toLowerCase();
    if (lowerLabel.includes('time') || lowerLabel.includes('delay')) return 'ms';
    if (lowerLabel.includes('rate') || lowerLabel.includes('speed')) return 'Hz';
    if (lowerLabel.includes('freq')) return 'Hz';
    return '%';
  };

  const displayUnit = getUnitDisplay();

  return (
    <div className="knob-container">
      <div
        ref={knobRef}
        className={`knob ${isDragging ? 'dragging' : ''}`}
        onMouseDown={handleMouseDown}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        style={{ 
          '--rotation': `${rotation}deg`,
          '--knob-color': color,
          '--knob-pointer-color': pointerColor
        }}
      >
        <div className="knob-indicator"></div>
        <div className="knob-label-value">{Math.round(value)}</div>
        
        {/* TOOLTIP */}
        {showTooltip && (
          <div className="knob-tooltip">
            <div className="tooltip-header">
              <span className="tooltip-icon">🎚️</span>
              <span className="tooltip-title">{label}</span>
            </div>
            <div className="tooltip-divider"></div>
            <div className="tooltip-value">
              <span className="value-number">{Math.round(value)}</span>
              <span className="value-unit">{displayUnit}</span>
            </div>
            <div className="tooltip-range">
              <span className="range-label">Range:</span>
              <span className="range-values">{min} - {max} {displayUnit}</span>
            </div>
            <div className="tooltip-bar">
              <div 
                className="tooltip-bar-fill" 
                style={{ width: `${percentage}%` }}
              ></div>
            </div>
          </div>
        )}
      </div>
      <div className="knob-label">{label}</div>
    </div>
  );
};

export default Knob;


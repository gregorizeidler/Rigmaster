import React, { useState, useRef } from 'react';
import Tooltip from './Tooltip';
import './Knob.css';

const Knob = ({ label, value, onChange, min = 0, max = 100, unit = '', color, pointerColor, defaultValue = 50, description }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);
  const [showInput, setShowInput] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const knobRef = useRef(null);
  const inputRef = useRef(null);
  const startYRef = useRef(0);
  const startValueRef = useRef(0);
  const velocityRef = useRef(0);
  const lastYRef = useRef(0);
  const lastTimeRef = useRef(0);
  const momentumIntervalRef = useRef(null);
  const lastClickTimeRef = useRef(0);

  const handleMouseDown = (e) => {
    // Detect double-click
    const currentTime = Date.now();
    const timeSinceLastClick = currentTime - lastClickTimeRef.current;
    
    if (timeSinceLastClick < 300) {
      // Double-click detected - show input
      e.preventDefault();
      setShowInput(true);
      setInputValue(value.toString());
      lastClickTimeRef.current = 0;
      return;
    }
    
    lastClickTimeRef.current = currentTime;
    setIsDragging(true);
    startYRef.current = e.clientY;
    startValueRef.current = value;
    e.preventDefault();
  };

  const handleRightClick = (e) => {
    e.preventDefault();
    // Reset to default value
    onChange(defaultValue);
  };

  const handleInputSubmit = () => {
    const numValue = parseFloat(inputValue);
    if (!isNaN(numValue)) {
      const clampedValue = Math.max(min, Math.min(max, numValue));
      onChange(Math.round(clampedValue));
    }
    setShowInput(false);
  };

  const handleInputKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleInputSubmit();
    } else if (e.key === 'Escape') {
      setShowInput(false);
    }
  };

  // Auto-focus input when it appears
  React.useEffect(() => {
    if (showInput && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [showInput]);

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
  }, [isDragging, handleMouseMove, handleMouseUp]);

  // Cleanup momentum interval on unmount
  React.useEffect(() => {
    return () => {
      if (momentumIntervalRef.current) {
        clearInterval(momentumIntervalRef.current);
      }
    };
  }, []);

  const rotation = ((value - min) / (max - min)) * 270 - 135;

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
      <Tooltip
        content={label}
        value={`${Math.round(value)}${displayUnit}`}
        description={description || `Double-click for precise input • Right-click to reset (${defaultValue}${displayUnit})`}
        visible={showTooltip && !showInput}
      >
        <div
          ref={knobRef}
          className={`knob ${isDragging ? 'dragging' : ''}`}
          onMouseDown={handleMouseDown}
          onContextMenu={handleRightClick}
          onMouseEnter={() => setShowTooltip(true)}
          onMouseLeave={() => setShowTooltip(false)}
          style={{ 
            '--rotation': `${rotation}deg`,
            '--knob-color': color,
            '--knob-pointer-color': pointerColor
          }}
        >
          <div className="knob-indicator"></div>
          {!showInput ? (
            <div className="knob-label-value">{Math.round(value)}</div>
          ) : (
            <input
              ref={inputRef}
              type="number"
              className="knob-numeric-input"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onBlur={handleInputSubmit}
              onKeyDown={handleInputKeyDown}
              min={min}
              max={max}
              step={1}
            />
          )}
        </div>
      </Tooltip>
      <div className="knob-label">{label}</div>
    </div>
  );
};

export default Knob;


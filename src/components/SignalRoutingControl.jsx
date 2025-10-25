import React, { useState } from 'react';
import './SignalRoutingControl.css';

/**
 * SignalRoutingControl - Controls for advanced signal routing
 * 
 * Features:
 * - Series/Parallel/A/B/Y mode switching
 * - Path A/B mix control
 * - Visual routing diagram
 * - Effects loop assignment
 */

const SignalRoutingControl = ({ router, effects, onModeChange, onMixChange, onAssignEffect }) => {
  const [routingMode, setRoutingMode] = useState('series');
  const [pathMix, setPathMix] = useState(50);
  const [showRouting, setShowRouting] = useState(false);
  
  const handleModeChange = (mode) => {
    setRoutingMode(mode);
    if (onModeChange) {
      onModeChange(mode);
    }
  };
  
  const handleMixChange = (value) => {
    setPathMix(value);
    if (onMixChange) {
      onMixChange(value);
    }
  };
  
  const renderRoutingDiagram = () => {
    switch (routingMode) {
      case 'series':
        return (
          <div className="routing-diagram">
            <div className="routing-flow">
              <div className="flow-node">🎸 Input</div>
              <div className="flow-arrow">→</div>
              <div className="flow-node">Effect 1</div>
              <div className="flow-arrow">→</div>
              <div className="flow-node">Effect 2</div>
              <div className="flow-arrow">→</div>
              <div className="flow-node">Effect N</div>
              <div className="flow-arrow">→</div>
              <div className="flow-node">🔈 Output</div>
            </div>
          </div>
        );
        
      case 'parallel':
        return (
          <div className="routing-diagram parallel">
            <div className="parallel-flow">
              <div className="flow-node">🎸 Input</div>
              <div className="split-junction">
                <div className="split-line" />
                <div className="split-paths">
                  <div className="path-container path-a">
                    <div className="path-label">Path A ({Math.round(Math.cos(pathMix / 100 * Math.PI / 2) * 100)}%)</div>
                    <div className="path-flow">
                      <div className="flow-node small">Effect A1</div>
                      <div className="flow-arrow">→</div>
                      <div className="flow-node small">Effect A2</div>
                    </div>
                  </div>
                  <div className="path-container path-b">
                    <div className="path-label">Path B ({Math.round(Math.sin(pathMix / 100 * Math.PI / 2) * 100)}%)</div>
                    <div className="path-flow">
                      <div className="flow-node small">Effect B1</div>
                      <div className="flow-arrow">→</div>
                      <div className="flow-node small">Effect B2</div>
                    </div>
                  </div>
                </div>
                <div className="merge-line" />
              </div>
              <div className="flow-node">🔈 Output</div>
            </div>
          </div>
        );
        
      case 'aby':
        return (
          <div className="routing-diagram aby">
            <div className="aby-flow">
              <div className="flow-node">🎸 Input</div>
              <div className="split-junction">
                <div className="split-line" />
                <div className="split-paths">
                  <div className="path-container path-a">
                    <div className="path-label">Path A (Amp 1)</div>
                    <div className="path-flow">
                      <div className="flow-node small">🔊 Marshall</div>
                    </div>
                  </div>
                  <div className="path-container path-b">
                    <div className="path-label">Path B (Amp 2)</div>
                    <div className="path-flow">
                      <div className="flow-node small">🔊 Fender</div>
                    </div>
                  </div>
                </div>
                <div className="merge-line" />
              </div>
              <div className="flow-node">🔈 Output</div>
            </div>
          </div>
        );
        
      default:
        return null;
    }
  };
  
  return (
    <div className="signal-routing-control">
      <div className="routing-header">
        <div className="header-left">
          <h3>🔀 Signal Routing</h3>
          <span className="routing-mode-badge">{routingMode.toUpperCase()}</span>
        </div>
        <button
          className="toggle-routing-btn"
          onClick={() => setShowRouting(!showRouting)}
        >
          {showRouting ? '▼ Hide' : '▶ Show'} Routing
        </button>
      </div>
      
      {showRouting && (
        <>
          {/* MODE SELECTOR */}
          <div className="routing-mode-selector">
            <div className="mode-options">
              <button
                className={`mode-option ${routingMode === 'series' ? 'active' : ''}`}
                onClick={() => handleModeChange('series')}
              >
                <div className="mode-icon">━━━</div>
                <div className="mode-name">Series</div>
                <div className="mode-desc">Traditional chain</div>
              </button>
              
              <button
                className={`mode-option ${routingMode === 'parallel' ? 'active' : ''}`}
                onClick={() => handleModeChange('parallel')}
              >
                <div className="mode-icon">╪</div>
                <div className="mode-name">Parallel</div>
                <div className="mode-desc">Dual path blend</div>
              </button>
              
              <button
                className={`mode-option ${routingMode === 'aby' ? 'active' : ''}`}
                onClick={() => handleModeChange('aby')}
              >
                <div className="mode-icon">Y</div>
                <div className="mode-name">A/B/Y</div>
                <div className="mode-desc">Dual amp setup</div>
              </button>
            </div>
          </div>
          
          {/* ROUTING DIAGRAM */}
          {renderRoutingDiagram()}
          
          {/* PARALLEL CONTROLS */}
          {(routingMode === 'parallel' || routingMode === 'aby') && (
            <div className="parallel-controls">
              <div className="control-section">
                <label>Path Mix (A ← → B)</label>
                <div className="mix-slider-container">
                  <span className="mix-label">A {Math.round(Math.cos(pathMix / 100 * Math.PI / 2) * 100)}%</span>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={pathMix}
                    onChange={(e) => handleMixChange(parseInt(e.target.value))}
                    className="mix-slider"
                  />
                  <span className="mix-label">B {Math.round(Math.sin(pathMix / 100 * Math.PI / 2) * 100)}%</span>
                </div>
              </div>
              
              <div className="path-assignment">
                <div className="path-column">
                  <h4>📍 Path A Effects</h4>
                  <div className="effect-dropzone path-a-zone">
                    <p>Drag effects here</p>
                  </div>
                </div>
                
                <div className="path-column">
                  <h4>📍 Path B Effects</h4>
                  <div className="effect-dropzone path-b-zone">
                    <p>Drag effects here</p>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {/* TIPS */}
          <div className="routing-tips">
            <h4>💡 Routing Tips</h4>
            <div className="tips-grid">
              <div className="tip-card">
                <strong>Series Mode:</strong>
                <p>Traditional pedal chain. Signal flows through each effect sequentially.</p>
              </div>
              
              <div className="tip-card">
                <strong>Parallel Mode:</strong>
                <p>Split signal into 2 paths. Perfect for Dry/Wet blends or different effect chains.</p>
              </div>
              
              <div className="tip-card">
                <strong>A/B/Y Mode:</strong>
                <p>Send signal to 2 different amps simultaneously. Classic dual-amp setup.</p>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default SignalRoutingControl;


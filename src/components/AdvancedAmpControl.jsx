import React, { useState } from 'react';
import './AdvancedAmpControl.css';
import VisualMicPositioning from './VisualMicPositioning';

/**
 * AdvancedAmpControl - Component-level amp modeling controls
 */

const AdvancedAmpControl = ({ amp, onUpdate, onRemove }) => {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showMicPositioning, setShowMicPositioning] = useState(false);
  const [showCabinetSettings, setShowCabinetSettings] = useState(false);
  
  const handleUpdate = (param, value) => {
    if (onUpdate) {
      onUpdate(amp.id, param, value);
    }
  };
  
  const handleMicPositionChange = (position) => {
    handleUpdate('micDistance', position.distance);
    handleUpdate('micAngle', position.angle);
    handleUpdate('micHeight', position.height);
  };
  
  return (
    <div className="advanced-amp-control">
      <div className="amp-control-header">
        <div className="amp-type-selector">
          <h3>🎸 Advanced Amplifier</h3>
          <select
            value={amp.ampType || 'clean'}
            onChange={(e) => handleUpdate('type', e.target.value)}
            className="amp-type-select"
          >
            <option value="clean">Clean (Fender Twin)</option>
            <option value="crunch">Crunch (Marshall Plexi)</option>
            <option value="lead">Lead (Mesa Boogie)</option>
            <option value="metal">Metal (ENGL)</option>
          </select>
        </div>
        
        <div className="amp-header-buttons">
          <button
            className="advanced-toggle"
            onClick={() => setShowAdvanced(!showAdvanced)}
          >
            {showAdvanced ? '▼' : '▶'} Advanced
          </button>
          <button className="remove-btn" onClick={() => onRemove(amp.id)}>
            🗑️
          </button>
        </div>
      </div>
      
      {/* BASIC CONTROLS */}
      <div className="amp-section basic-controls">
        <h4>⚙️ Tone Stack</h4>
        <div className="knobs-row">
          <div className="knob-control">
            <label>Gain</label>
            <input
              type="range"
              min="0"
              max="100"
              defaultValue="50"
              onChange={(e) => handleUpdate('gain', e.target.value)}
              className="amp-slider"
            />
          </div>
          
          <div className="knob-control">
            <label>Bass</label>
            <input
              type="range"
              min="0"
              max="100"
              defaultValue="50"
              onChange={(e) => handleUpdate('bass', e.target.value)}
              className="amp-slider"
            />
          </div>
          
          <div className="knob-control">
            <label>Mid</label>
            <input
              type="range"
              min="0"
              max="100"
              defaultValue="50"
              onChange={(e) => handleUpdate('mid', e.target.value)}
              className="amp-slider"
            />
          </div>
          
          <div className="knob-control">
            <label>Treble</label>
            <input
              type="range"
              min="0"
              max="100"
              defaultValue="50"
              onChange={(e) => handleUpdate('treble', e.target.value)}
              className="amp-slider"
            />
          </div>
          
          <div className="knob-control">
            <label>Master</label>
            <input
              type="range"
              min="0"
              max="100"
              defaultValue="80"
              onChange={(e) => handleUpdate('master', e.target.value)}
              className="amp-slider"
            />
          </div>
        </div>
      </div>
      
      {/* ADVANCED CONTROLS */}
      {showAdvanced && (
        <>
          {/* PREAMP SECTION */}
          <div className="amp-section advanced-section">
            <h4>🔥 Preamp Stage</h4>
            <div className="control-grid">
              <div className="control-item">
                <label>Preamp Tube</label>
                <select
                  onChange={(e) => handleUpdate('preampTube', e.target.value)}
                  className="component-select"
                  defaultValue="12AX7"
                >
                  <option value="12AX7">12AX7 (High Gain)</option>
                  <option value="ECC83">ECC83 (Balanced)</option>
                  <option value="12AT7">12AT7 (Medium Gain)</option>
                  <option value="12AY7">12AY7 (Low Gain, Bright)</option>
                </select>
              </div>
              
              <div className="control-item">
                <label>Bias</label>
                <input
                  type="range"
                  min="0"
                  max="100"
                  defaultValue="50"
                  onChange={(e) => handleUpdate('bias', e.target.value)}
                  className="component-slider"
                />
                <span className="control-hint">Cold ← → Hot</span>
              </div>
            </div>
          </div>
          
          {/* POWER AMP SECTION */}
          <div className="amp-section advanced-section">
            <h4>⚡ Power Amp Stage</h4>
            <div className="control-grid">
              <div className="control-item">
                <label>Power Tube</label>
                <select
                  onChange={(e) => handleUpdate('powerTube', e.target.value)}
                  className="component-select"
                  defaultValue="EL34"
                >
                  <option value="EL34">EL34 (25W, Warm)</option>
                  <option value="6L6">6L6 (30W, Balanced)</option>
                  <option value="KT88">KT88 (50W, Tight)</option>
                  <option value="EL84">EL84 (12W, Bright)</option>
                </select>
              </div>
              
              <div className="control-item">
                <label>Class</label>
                <select
                  onChange={(e) => handleUpdate('powerAmpClass', e.target.value)}
                  className="component-select"
                  defaultValue="AB"
                >
                  <option value="A">Class A (Warm, Low Headroom)</option>
                  <option value="AB">Class AB (Balanced)</option>
                  <option value="B">Class B (Tight, High Headroom)</option>
                </select>
              </div>
              
              <div className="control-item">
                <label>Sag Amount</label>
                <input
                  type="range"
                  min="0"
                  max="100"
                  defaultValue="50"
                  onChange={(e) => handleUpdate('sag', e.target.value)}
                  className="component-slider"
                />
                <span className="control-hint">Compression/Dynamics</span>
              </div>
              
              <div className="control-item">
                <label>Presence</label>
                <input
                  type="range"
                  min="0"
                  max="100"
                  defaultValue="50"
                  onChange={(e) => handleUpdate('presence', e.target.value)}
                  className="component-slider"
                />
                <span className="control-hint">High-freq boost</span>
              </div>
              
              <div className="control-item">
                <label>Resonance</label>
                <input
                  type="range"
                  min="0"
                  max="100"
                  defaultValue="50"
                  onChange={(e) => handleUpdate('resonance', e.target.value)}
                  className="component-slider"
                />
                <span className="control-hint">Low-freq response</span>
              </div>
              
              <div className="control-item">
                <label>Negative Feedback</label>
                <input
                  type="range"
                  min="0"
                  max="100"
                  defaultValue="50"
                  onChange={(e) => handleUpdate('negativeFeedback', e.target.value)}
                  className="component-slider"
                />
                <span className="control-hint">Tightness control</span>
              </div>
            </div>
          </div>
          
          {/* TRANSFORMER/SPEAKER SECTION */}
          <div className="amp-section advanced-section">
            <h4>🔌 Transformer & Speaker</h4>
            <div className="control-grid">
              <div className="control-item">
                <label>Speaker Impedance</label>
                <select
                  onChange={(e) => handleUpdate('impedance', e.target.value)}
                  className="component-select"
                  defaultValue="8"
                >
                  <option value="4">4 Ω (Darker)</option>
                  <option value="8">8 Ω (Balanced)</option>
                  <option value="16">16 Ω (Brighter)</option>
                </select>
              </div>
              
              <div className="control-item">
                <label>Damping</label>
                <input
                  type="range"
                  min="0"
                  max="100"
                  defaultValue="50"
                  onChange={(e) => handleUpdate('damping', e.target.value)}
                  className="component-slider"
                />
                <span className="control-hint">Cone control</span>
              </div>
            </div>
          </div>
        </>
      )}
      
      {/* CABINET SECTION */}
      <div className="amp-section cabinet-section">
        <div className="section-header" onClick={() => setShowCabinetSettings(!showCabinetSettings)}>
          <h4>📦 Cabinet Simulator</h4>
          <button className="toggle-btn">
            {showCabinetSettings ? '▼' : '▶'}
          </button>
        </div>
        
        {showCabinetSettings && (
          <>
            <div className="cabinet-mode-selector">
              <button className="mode-btn active">Single Cabinet</button>
              <button className="mode-btn">Dual Cabinet</button>
              <button className="mode-btn">IR Loader</button>
            </div>
            
            <div className="cabinet-controls">
              <div className="control-item">
                <label>Cabinet Type</label>
                <select
                  onChange={(e) => handleUpdate('cabinetType', e.target.value)}
                  className="cabinet-select"
                  defaultValue="4x12-v30"
                >
                  <option value="1x12-open">1x12" Open (Fender)</option>
                  <option value="1x12-closed">1x12" Closed</option>
                  <option value="2x12-open">2x12" Open (Vox)</option>
                  <option value="2x12-closed">2x12" Closed (Marshall)</option>
                  <option value="4x12-v30">4x12" V30</option>
                  <option value="4x12-greenback">4x12" Greenback</option>
                  <option value="4x10-bassman">4x10" Bassman</option>
                </select>
              </div>
              
              <div className="control-item">
                <label>Microphone</label>
                <select
                  onChange={(e) => handleUpdate('micType', e.target.value)}
                  className="cabinet-select"
                  defaultValue="sm57"
                >
                  <option value="sm57">SM57 (Bright, Focused)</option>
                  <option value="sm7b">SM7B (Smooth, Warm)</option>
                  <option value="ribbon">Royer R-121 (Dark, Smooth)</option>
                  <option value="u87">Neumann U87 (Detailed, Airy)</option>
                  <option value="md421">Sennheiser MD421 (Full-range)</option>
                  <option value="e906">Sennheiser e906 (Aggressive)</option>
                </select>
              </div>
              
              <button
                className="mic-positioning-btn"
                onClick={() => setShowMicPositioning(!showMicPositioning)}
              >
                🎙️ {showMicPositioning ? 'Hide' : 'Show'} Mic Positioning
              </button>
            </div>
          </>
        )}
      </div>
      
      {/* VISUAL MIC POSITIONING */}
      {showMicPositioning && (
        <div className="mic-positioning-panel">
          <VisualMicPositioning
            cabinet={amp.cabinet}
            onPositionChange={handleMicPositionChange}
          />
        </div>
      )}
    </div>
  );
};

export default AdvancedAmpControl;


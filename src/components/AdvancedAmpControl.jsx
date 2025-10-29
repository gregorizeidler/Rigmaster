import React, { useState, useEffect } from 'react';
import './AdvancedAmpControl.css';
import VisualMicPositioning from './VisualMicPositioning';
import useKeyboardShortcuts from '../hooks/useKeyboardShortcuts';

/**
 * AdvancedAmpControl - Component-level amp modeling controls
 * UPDATED: All Cabinet Simulator features exposed
 */

const AdvancedAmpControl = ({ amp, onUpdate, onRemove, cabinetSimulator }) => {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showMicPositioning, setShowMicPositioning] = useState(false);
  const [showCabinetSettings, setShowCabinetSettings] = useState(false);
  const [showRoomSettings, setShowRoomSettings] = useState(false);
  const [showDualSettings, setShowDualSettings] = useState(false);
  const [showIRLoader, setShowIRLoader] = useState(false);
  const [showKeyboardHints, setShowKeyboardHints] = useState(false);
  
  // Cabinet mode state
  const [cabinetMode, setCabinetMode] = useState('single');
  
  // Value states for sliders
  const [dryWetValue, setDryWetValue] = useState(100);
  const [outputGainValue, setOutputGainValue] = useState(-6);
  const [dualMixValue, setDualMixValue] = useState(50);
  const [stereoSpreadValue, setStereoSpreadValue] = useState(30);
  const [microDelayValue, setMicroDelayValue] = useState(0.6);
  const [roomSizeValue, setRoomSizeValue] = useState(23);
  const [roomFeedbackValue, setRoomFeedbackValue] = useState(25);
  const [roomToneValue, setRoomToneValue] = useState(4000);
  const [roomMixValue, setRoomMixValue] = useState(15);
  
  // Cabinet A & B configs
  const [cabinetAType, setCabinetAType] = useState('4x12_vintage');
  const [micAType, setMicAType] = useState('sm57');
  const [cabinetBType, setCabinetBType] = useState('4x12_greenback');
  const [micBType, setMicBType] = useState('royer121');
  
  // Get available cabinets and mics from backend
  const [availableCabinets, setAvailableCabinets] = useState([]);
  const [availableMics, setAvailableMics] = useState([]);
  const [micPositionInfo, setMicPositionInfo] = useState(null);
  
  useEffect(() => {
    // Load cabinet/mic lists from backend API
    if (cabinetSimulator) {
      setAvailableCabinets(cabinetSimulator.getCabinets());
      setAvailableMics(cabinetSimulator.getMicrophones());
      updateMicPositionInfo();
    }
  }, [cabinetSimulator]);
  
  const handleUpdate = (param, value) => {
    if (onUpdate) {
      onUpdate(amp.id, param, value);
    }
  };
  
  const updateMicPositionInfo = () => {
    if (cabinetSimulator) {
      setMicPositionInfo(cabinetSimulator.getMicPositionInfo('A'));
    }
  };
  
  const handleMicPositionChange = (position) => {
    handleUpdate('micDistance', position.distance);
    handleUpdate('micAngle', position.angle);
    handleUpdate('micHeight', position.height);
    
    // Update backend
    if (cabinetSimulator) {
      if (cabinetMode === 'single' || cabinetMode === 'dual') {
        cabinetSimulator.setMicPositionA(position.distance, position.angle, position.height);
        updateMicPositionInfo();
      }
    }
  };
  
  const handleMicPositionChangeB = (position) => {
    if (cabinetSimulator && cabinetMode === 'dual') {
      cabinetSimulator.setMicPositionB(position.distance, position.angle, position.height);
    }
  };
  
  const handleCabinetModeChange = (mode) => {
    setCabinetMode(mode);
    if (cabinetSimulator) {
      cabinetSimulator.setMode(mode);
    }
    handleUpdate('cabinetMode', mode);
  };
  
  const handleCabinetATypeChange = (type) => {
    setCabinetAType(type);
    if (cabinetSimulator) {
      cabinetSimulator.setCabinetAType(type);
    }
    handleUpdate('cabinetAType', type);
  };
  
  const handleMicATypeChange = (type) => {
    setMicAType(type);
    if (cabinetSimulator) {
      cabinetSimulator.setMicAType(type);
      updateMicPositionInfo();
    }
    handleUpdate('micAType', type);
  };
  
  const handleCabinetBTypeChange = (type) => {
    setCabinetBType(type);
    if (cabinetSimulator) {
      cabinetSimulator.setCabinetBType(type);
    }
    handleUpdate('cabinetBType', type);
  };
  
  const handleMicBTypeChange = (type) => {
    setMicBType(type);
    if (cabinetSimulator) {
      cabinetSimulator.setMicBType(type);
    }
    handleUpdate('micBType', type);
  };
  
  const handleIRUpload = (e) => {
    const file = e.target.files[0];
    if (file && cabinetSimulator) {
      cabinetSimulator.loadIRFromFile(file, 'A').then(() => {
        console.log('IR loaded successfully');
      });
    }
  };
  
  // Keyboard shortcuts
  useKeyboardShortcuts({
    'c': () => setShowCabinetSettings(!showCabinetSettings),
    'a': () => setShowAdvanced(!showAdvanced),
    'm': () => setShowMicPositioning(!showMicPositioning),
    'r': () => setShowRoomSettings(!showRoomSettings),
    '1': () => handleCabinetModeChange('single'),
    '2': () => handleCabinetModeChange('dual'),
    '3': () => handleCabinetModeChange('ir'),
    '?': () => setShowKeyboardHints(!showKeyboardHints),
  });
  
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
            {/* MODE SELECTOR */}
            <div className="cabinet-mode-selector">
              <button 
                className={`mode-btn ${cabinetMode === 'single' ? 'active' : ''}`}
                onClick={() => handleCabinetModeChange('single')}
              >
                Single Cabinet
              </button>
              <button 
                className={`mode-btn ${cabinetMode === 'dual' ? 'active' : ''}`}
                onClick={() => handleCabinetModeChange('dual')}
              >
                Dual Cabinet
              </button>
              <button 
                className={`mode-btn ${cabinetMode === 'ir' ? 'active' : ''}`}
                onClick={() => handleCabinetModeChange('ir')}
              >
                IR Loader
              </button>
            </div>
            
            {/* SINGLE/DUAL CABINET CONTROLS */}
            {(cabinetMode === 'single' || cabinetMode === 'dual') && (
              <>
                <div className="cabinet-controls">
                  <h5>🔊 Cabinet A</h5>
                  <div className="control-item">
                    <label>Cabinet Type</label>
                    <select
                      value={cabinetAType}
                      onChange={(e) => handleCabinetATypeChange(e.target.value)}
                      className="cabinet-select"
                    >
                      {availableCabinets.map(cab => (
                        <option key={cab.id} value={cab.id}>
                          {cab.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  <div className="control-item">
                    <label>Microphone</label>
                    <select
                      value={micAType}
                      onChange={(e) => handleMicATypeChange(e.target.value)}
                      className="cabinet-select"
                    >
                      {availableMics.map(mic => (
                        <option key={mic.id} value={mic.id}>
                          {mic.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  <button
                    className="mic-positioning-btn"
                    onClick={() => setShowMicPositioning(!showMicPositioning)}
                  >
                    🎙️ {showMicPositioning ? 'Hide' : 'Show'} Mic Positioning
                  </button>
                </div>
                
                {/* MIC POSITION INFO TELEMETRY */}
                {micPositionInfo && (
                  <div className="mic-telemetry">
                    <h5>📊 Mic Position Info</h5>
                    <div className="telemetry-grid">
                      <div className="telemetry-item">
                        <span className="telem-label">Distance:</span>
                        <span className="telem-value">{micPositionInfo.distance}cm</span>
                      </div>
                      <div className="telemetry-item">
                        <span className="telem-label">Angle:</span>
                        <span className="telem-value">{micPositionInfo.angle}°</span>
                      </div>
                      <div className="telemetry-item">
                        <span className="telem-label">Proximity Gain:</span>
                        <span className="telem-value">+{micPositionInfo.proximityGain.toFixed(1)}dB</span>
                      </div>
                      <div className="telemetry-item">
                        <span className="telem-label">Presence Gain:</span>
                        <span className="telem-value">{micPositionInfo.presenceGain.toFixed(1)}dB</span>
                      </div>
                      <div className="telemetry-item">
                        <span className="telem-label">Presence Freq:</span>
                        <span className="telem-value">{Math.round(micPositionInfo.presenceFreq)}Hz</span>
                      </div>
                      <div className="telemetry-item">
                        <span className="telem-label">Air Loss:</span>
                        <span className="telem-value">{Math.round(micPositionInfo.airLossFreq)}Hz</span>
                      </div>
                      <div className="telemetry-item">
                        <span className="telem-label">Time of Flight:</span>
                        <span className="telem-value">{micPositionInfo.timeOfFlightMs.toFixed(2)}ms</span>
                      </div>
                    </div>
                  </div>
                )}
                
                {/* DUAL CABINET SETTINGS */}
                {cabinetMode === 'dual' && (
                  <>
                    <button
                      className="dual-settings-toggle"
                      onClick={() => setShowDualSettings(!showDualSettings)}
                    >
                      ⚖️ {showDualSettings ? 'Hide' : 'Show'} Dual Cabinet Settings
                    </button>
                    
                    {showDualSettings && (
                      <div className="dual-cabinet-settings">
                        <h5>🔊 Cabinet B</h5>
                        <div className="control-item">
                          <label>Cabinet Type</label>
                          <select
                            value={cabinetBType}
                            onChange={(e) => handleCabinetBTypeChange(e.target.value)}
                            className="cabinet-select"
                          >
                            {availableCabinets.map(cab => (
                              <option key={cab.id} value={cab.id}>
                                {cab.name}
                              </option>
                            ))}
                          </select>
                        </div>
                        
                        <div className="control-item">
                          <label>Microphone</label>
                          <select
                            value={micBType}
                            onChange={(e) => handleMicBTypeChange(e.target.value)}
                            className="cabinet-select"
                          >
                            {availableMics.map(mic => (
                              <option key={mic.id} value={mic.id}>
                                {mic.name}
                              </option>
                            ))}
                          </select>
                        </div>
                        
                        <div className="control-row">
                          <label className="tooltip" data-tooltip="Balance between Cabinet A and Cabinet B">A/B Mix</label>
                          <input
                            type="range"
                            min="0"
                            max="100"
                            value={dualMixValue}
                            onChange={(e) => {
                              const val = parseFloat(e.target.value);
                              setDualMixValue(val);
                              if (cabinetSimulator) {
                                cabinetSimulator.setDualMix(val);
                              }
                            }}
                            className="component-slider"
                          />
                          <span className="control-value">{dualMixValue}%</span>
                        </div>
                        
                        <div className="control-row">
                          <label className="tooltip" data-tooltip="Stereo width: 0=mono, +100=wide">Stereo Spread</label>
                          <input
                            type="range"
                            min="-100"
                            max="100"
                            value={stereoSpreadValue}
                            onChange={(e) => {
                              const val = parseFloat(e.target.value);
                              setStereoSpreadValue(val);
                              if (cabinetSimulator) {
                                cabinetSimulator.setStereoSpread(val);
                              }
                            }}
                            className="component-slider"
                          />
                          <span className="control-value">{stereoSpreadValue > 0 ? '+' : ''}{stereoSpreadValue}</span>
                        </div>
                        
                        <div className="control-item">
                          <label>
                            <input
                              type="checkbox"
                              onChange={(e) => {
                                if (cabinetSimulator) {
                                  cabinetSimulator.setPhaseB(e.target.checked);
                                }
                              }}
                            />
                            Phase Invert Cabinet B
                          </label>
                        </div>
                        
                        <div className="control-row">
                          <label className="tooltip" data-tooltip="Adds slight delay to Cabinet B for stereo width">Micro Delay B</label>
                          <input
                            type="range"
                            min="0"
                            max="2"
                            step="0.1"
                            value={microDelayValue}
                            onChange={(e) => {
                              const val = parseFloat(e.target.value);
                              setMicroDelayValue(val);
                              if (cabinetSimulator) {
                                cabinetSimulator.setMicroDelayB(val);
                              }
                            }}
                            className="component-slider"
                          />
                          <span className="control-value">{microDelayValue.toFixed(1)}ms</span>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </>
            )}
            
            {/* IR LOADER */}
            {cabinetMode === 'ir' && (
              <div className="ir-loader-section">
                <h5>🎵 IR Loader</h5>
                <div className="ir-upload">
                  <label className="ir-upload-btn">
                    📁 Upload IR File (.wav)
                    <input
                      type="file"
                      accept=".wav"
                      onChange={handleIRUpload}
                      style={{ display: 'none' }}
                    />
                  </label>
                </div>
                
                <button
                  className="ir-info-toggle"
                  onClick={() => setShowIRLoader(!showIRLoader)}
                >
                  ℹ️ {showIRLoader ? 'Hide' : 'Show'} IR Info
                </button>
                
                {showIRLoader && cabinetSimulator && (
                  <div className="ir-info-display">
                    {(() => {
                      const irInfo = cabinetSimulator.irLoader.getIRInfo('A');
                      return irInfo ? (
                        <>
                          <p>Duration: {irInfo.duration.toFixed(2)}s</p>
                          <p>Sample Rate: {irInfo.sampleRate}Hz</p>
                          <p>Channels: {irInfo.channels}</p>
                          <p>Length: {irInfo.length} samples</p>
                          <button
                            className="ir-clear-btn"
                            onClick={() => {
                              if (cabinetSimulator) {
                                cabinetSimulator.irLoader.clearIR('A');
                              }
                            }}
                          >
                            🗑️ Clear IR
                          </button>
                        </>
                      ) : (
                        <p>No IR loaded</p>
                      );
                    })()}
                  </div>
                )}
              </div>
            )}
            
            {/* GLOBAL CABINET CONTROLS */}
            <div className="global-cabinet-controls">
              <h5>🎚️ Global Controls</h5>
              
                  <div className="control-row">
                    <label className="tooltip" data-tooltip="Balance between unprocessed (dry) and processed (wet) signal">
                      Dry/Wet Mix
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={dryWetValue}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value);
                        setDryWetValue(val);
                        if (cabinetSimulator) {
                          cabinetSimulator.setWet(val);
                        }
                      }}
                      className="component-slider"
                    />
                    <span className="control-value">{dryWetValue}%</span>
                  </div>
              
              <div className="control-row">
                <label className="tooltip" data-tooltip="Final output level in decibels">
                  Output Gain
                </label>
                <input
                  type="range"
                  min="-12"
                  max="12"
                  step="0.5"
                  value={outputGainValue}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value);
                    setOutputGainValue(val);
                    if (cabinetSimulator) {
                      cabinetSimulator.setOutputGainDb(val);
                    }
                  }}
                  className="component-slider"
                />
                <span className="control-value">{outputGainValue > 0 ? '+' : ''}{outputGainValue}dB</span>
              </div>
              
              <button
                className="room-settings-toggle"
                onClick={() => setShowRoomSettings(!showRoomSettings)}
              >
                🏠 {showRoomSettings ? 'Hide' : 'Show'} Room Ambience
              </button>
              
              {showRoomSettings && (
                <div className="room-ambience-settings">
                  <div className="control-item">
                    <label>
                      <input
                        type="checkbox"
                        onChange={(e) => {
                          if (cabinetSimulator) {
                            cabinetSimulator.setRoom(e.target.checked);
                          }
                        }}
                      />
                      Enable Room Ambience
                    </label>
                  </div>
                  
                  <div className="control-row">
                    <label className="tooltip" data-tooltip="Room delay time (simulated room size)">Room Size</label>
                    <input
                      type="range"
                      min="0.01"
                      max="0.1"
                      step="0.001"
                      value={roomSizeValue / 1000}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value);
                        setRoomSizeValue(Math.round(val * 1000));
                        if (cabinetSimulator) {
                          cabinetSimulator.setRoom(true, val);
                        }
                      }}
                      className="component-slider"
                    />
                    <span className="control-value">{roomSizeValue}ms</span>
                  </div>
                  
                  <div className="control-row">
                    <label className="tooltip" data-tooltip="Room reflection intensity">Room Feedback</label>
                    <input
                      type="range"
                      min="0"
                      max="0.5"
                      step="0.01"
                      value={roomFeedbackValue / 100}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value);
                        setRoomFeedbackValue(Math.round(val * 100));
                        if (cabinetSimulator) {
                          cabinetSimulator.setRoom(true, undefined, val);
                        }
                      }}
                      className="component-slider"
                    />
                    <span className="control-value">{roomFeedbackValue}%</span>
                  </div>
                  
                  <div className="control-row">
                    <label className="tooltip" data-tooltip="Room tone brightness (lowpass filter)">Room Tone</label>
                    <input
                      type="range"
                      min="1000"
                      max="8000"
                      step="100"
                      value={roomToneValue}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value);
                        setRoomToneValue(val);
                        if (cabinetSimulator) {
                          cabinetSimulator.setRoom(true, undefined, undefined, val);
                        }
                      }}
                      className="component-slider"
                    />
                    <span className="control-value">{(roomToneValue / 1000).toFixed(1)}kHz</span>
                  </div>
                  
                  <div className="control-row">
                    <label className="tooltip" data-tooltip="Room ambience level in the mix">Room Mix</label>
                    <input
                      type="range"
                      min="0"
                      max="0.5"
                      step="0.01"
                      value={roomMixValue / 100}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value);
                        setRoomMixValue(Math.round(val * 100));
                        if (cabinetSimulator) {
                          cabinetSimulator.setRoom(true, undefined, undefined, undefined, val);
                        }
                      }}
                      className="component-slider"
                    />
                    <span className="control-value">{roomMixValue}%</span>
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>
      
      {/* VISUAL MIC POSITIONING */}
      {showMicPositioning && (cabinetMode === 'single' || cabinetMode === 'dual') && (
        <div className="mic-positioning-panel">
          <VisualMicPositioning
            cabinet={amp.cabinet}
            onPositionChange={handleMicPositionChange}
          />
        </div>
      )}
      
      {/* KEYBOARD SHORTCUTS HINTS */}
      {showKeyboardHints && (
        <div className="keyboard-shortcuts">
          <h6>⌨️ Keyboard Shortcuts</h6>
          <div>
            <kbd>C</kbd> Toggle Cabinet Settings
          </div>
          <div>
            <kbd>A</kbd> Toggle Advanced
          </div>
          <div>
            <kbd>M</kbd> Toggle Mic Positioning
          </div>
          <div>
            <kbd>R</kbd> Toggle Room Settings
          </div>
          <div>
            <kbd>1</kbd> Single Cabinet Mode
          </div>
          <div>
            <kbd>2</kbd> Dual Cabinet Mode
          </div>
          <div>
            <kbd>3</kbd> IR Loader Mode
          </div>
          <div>
            <kbd>?</kbd> Toggle This Help
          </div>
        </div>
      )}
    </div>
  );
};

export default AdvancedAmpControl;

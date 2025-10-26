import React from 'react';
import { motion } from 'framer-motion';
import Knob from './Knob';
import './AmpComponent.css';

const AmpComponent = ({ amp, onUpdate, onBypass, onRemove }) => {
  const [showAdvanced, setShowAdvanced] = React.useState(false);

  const handleKnobChange = (parameter) => (value) => {
    onUpdate(amp.id, parameter, value);
  };

  const handleTypeChange = (e) => {
    onUpdate(amp.id, 'type', e.target.value);
  };

  const getAmpStyle = (type) => {
    const styles = {
      // ORIGINAL 4
      clean: {
        color: '#000000',
        accent: '#silver',
        grill: '#c0c0c0',
        logo: 'Twin Reverb',
        brand: 'FENDER'
      },
      crunch: {
        color: '#d4af37',
        accent: '#8b6914',
        grill: '#654321',
        logo: 'Plexi Lead',
        brand: 'MARSHALL'
      },
      lead: {
        color: '#8b0000',
        accent: '#ff6b35',
        grill: '#2a2a2a',
        logo: 'Dual Rect',
        brand: 'MESA'
      },
      metal: {
        color: '#1a1a1a',
        accent: '#ff3333',
        grill: '#0a0a0a',
        logo: 'High Gain',
        brand: 'ENGL'
      },
      // CLEAN/VINTAGE (5)
      vox_ac30: {
        color: '#2b1810',
        accent: '#d4af37',
        grill: '#8b7355',
        logo: 'AC30 Top Boost',
        brand: 'VOX'
      },
      fender_deluxe: {
        color: '#000000',
        accent: '#c0c0c0',
        grill: '#d4d4d4',
        logo: 'Deluxe Reverb',
        brand: 'FENDER'
      },
      fender_bassman: {
        color: '#d4a574',
        accent: '#8b6914',
        grill: '#c9b896',
        logo: 'Bassman',
        brand: 'FENDER'
      },
      roland_jc120: {
        color: '#1a1a1a',
        accent: '#4a9eff',
        grill: '#2a2a2a',
        logo: 'JC-120',
        brand: 'ROLAND'
      },
      matchless_dc30: {
        color: '#8b0000',
        accent: '#ffd700',
        grill: '#654321',
        logo: 'DC-30',
        brand: 'MATCHLESS'
      },
      // CRUNCH/BRITISH (5)
      marshall_jcm800: {
        color: '#000000',
        accent: '#d4af37',
        grill: '#3a3a3a',
        logo: 'JCM800',
        brand: 'MARSHALL'
      },
      orange_rockerverb: {
        color: '#ff8c00',
        accent: '#ffffff',
        grill: '#654321',
        logo: 'Rockerverb',
        brand: 'ORANGE'
      },
      hiwatt_dr103: {
        color: '#4682b4',
        accent: '#c0c0c0',
        grill: '#2f4f4f',
        logo: 'DR103',
        brand: 'HIWATT'
      },
      marshall_jtm45: {
        color: '#000000',
        accent: '#ffd700',
        grill: '#654321',
        logo: 'JTM45',
        brand: 'MARSHALL'
      },
      badcat_hotcat: {
        color: '#1a1a1a',
        accent: '#ff6347',
        grill: '#2a2a2a',
        logo: 'Hot Cat 30',
        brand: 'BAD CAT'
      },
      // HIGH GAIN/MODERN (5)
      peavey_5150: {
        color: '#000000',
        accent: '#ff0000',
        grill: '#1a1a1a',
        logo: '5150',
        brand: 'PEAVEY'
      },
      mesa_dual_rectifier: {
        color: '#8b0000',
        accent: '#ffa500',
        grill: '#1a1a1a',
        logo: 'DUAL RECT',
        brand: 'MESA'
      },
      bogner_ecstasy: {
        color: '#1a1a2e',
        accent: '#4a9eff',
        grill: '#16213e',
        logo: 'Ecstasy',
        brand: 'BOGNER'
      },
      diezel_vh4: {
        color: '#2b2d42',
        accent: '#edf2f4',
        grill: '#1a1a1a',
        logo: 'VH4',
        brand: 'DIEZEL'
      },
      friedman_be100: {
        color: '#000000',
        accent: '#ffd700',
        grill: '#2a2a2a',
        logo: 'BE-100',
        brand: 'FRIEDMAN'
      },
      soldano_slo100: {
        color: '#8b0000',
        accent: '#ffd700',
        grill: '#2a2a2a',
        logo: 'SLO-100',
        brand: 'SOLDANO'
      },
      // BOUTIQUE/MODERN (5)
      tworock_classic: {
        color: '#4a4a4a',
        accent: '#4a9eff',
        grill: '#5a5a5a',
        logo: 'Classic Reverb',
        brand: 'TWO-ROCK'
      },
      dumble_ods: {
        color: '#d4af37',
        accent: '#654321',
        grill: '#8b7355',
        logo: 'ODS',
        brand: 'DUMBLE'
      },
      mesa_mark_v: {
        color: '#000000',
        accent: '#ffa500',
        grill: '#1a1a1a',
        logo: 'Mark V',
        brand: 'MESA'
      },
      suhr_badger: {
        color: '#1a1a1a',
        accent: '#4a9eff',
        grill: '#2a2a2a',
        logo: 'Badger 30',
        brand: 'SUHR'
      },
      victory_duchess: {
        color: '#8b0000',
        accent: '#c0c0c0',
        grill: '#654321',
        logo: 'The Duchess',
        brand: 'VICTORY'
      }
    };
    return styles[type] || styles.clean;
  };

  const ampStyle = getAmpStyle(amp.ampType || 'clean');

  // Get specific controls for each amp type
  const getAmpSpecificControls = (type) => {
    const controls = {
      // FENDER AMPS - Spring Reverb + Bright Switch
      clean: ['reverb', 'bright'],
      fender_deluxe: ['reverb', 'bright', 'vibrato'],
      fender_bassman: ['reverb', 'bright'],
      
      // VOX - Top Boost + Tremolo
      vox_ac30: ['topboost', 'tremolo', 'cut'],
      
      // ROLAND - Built-in Chorus
      roland_jc120: ['chorus', 'distortion'],
      
      // MARSHALL - Presence + Resonance
      crunch: ['presence', 'resonance'],
      marshall_jcm800: ['presence', 'resonance'],
      marshall_jtm45: ['presence'],
      
      // MESA BOOGIE - Graphic EQ + Presence
      lead: ['presence', 'graphiceq'],
      mesa_mark_v: ['presence', 'graphiceq', 'soloboost'],
      mesa_dual_rectifier: ['presence', 'resonance', 'channel', 'bold_spongy', 'tube_silicon', 'multi_watt'],
      
      // ORANGE - Shape Control
      orange_rockerverb: ['shape', 'presence'],
      
      // HIGH GAIN MODERN - Presence + Resonance/Depth
      metal: ['presence', 'resonance'],
      peavey_5150: ['peavey_channel', 'presence', 'resonance', 'pregain', 'postgain', 'bright', 'gate', 'crunch', 'speaker_impedance'],
      bogner_ecstasy: ['presence', 'depth', 'boost'],
      diezel_vh4: ['presence', 'depth', 'deepcontrol'],
      friedman_be100: ['presence', 'depth', 'tightswitch'],
      soldano_slo100: ['presence', 'depth'],
      
      // MATCHLESS - Master/Cut
      matchless_dc30: ['cut', 'mastervolume'],
      
      // BAD CAT - Boost
      badcat_hotcat: ['boost', 'presence'],
      
      // HIWATT - Simple (Bass, Mid, Treble only)
      hiwatt_dr103: [],
      
      // TWO-ROCK - Reverb + Presence
      tworock_classic: ['reverb', 'presence', 'boost'],
      
      // DUMBLE - OD/Clean + Presence
      dumble_ods: ['oddrive', 'presence', 'ratio'],
      
      // SUHR - Boost + Presence
      suhr_badger: ['boost', 'presence', 'variac'],
      
      // VICTORY - Gain Structure
      victory_duchess: ['presence', 'depth', 'gainstructure'],
    };
    return controls[type] || [];
  };

  const specificControls = getAmpSpecificControls(amp.ampType || 'clean');

  const renderSpecificControl = (controlType) => {
    switch (controlType) {
      case 'reverb':
        return <Knob key="reverb" label="Reverb" value={amp.params?.reverb || 0} onChange={handleKnobChange('reverb')} size={40} />;
      case 'bright':
        return (
          <div key="bright" className="toggle-switch">
            <label>Bright</label>
            <input 
              type="checkbox" 
              checked={amp.params?.bright || false}
              onChange={(e) => onUpdate(amp.id, 'bright', e.target.checked)}
            />
          </div>
        );
      case 'vibrato':
        return <Knob key="vibrato" label="Vibrato" value={amp.params?.vibrato || 0} onChange={handleKnobChange('vibrato')} size={40} />;
      case 'topboost':
        return (
          <div key="topboost" className="toggle-switch">
            <label>Top Boost</label>
            <input 
              type="checkbox" 
              checked={amp.params?.topboost !== false}
              onChange={(e) => onUpdate(amp.id, 'topboost', e.target.checked)}
            />
          </div>
        );
      case 'tremolo':
        return <Knob key="tremolo" label="Tremolo" value={amp.params?.tremolo || 0} onChange={handleKnobChange('tremolo')} size={40} />;
      case 'cut':
        return <Knob key="cut" label="Cut" value={amp.params?.cut || 50} onChange={handleKnobChange('cut')} size={40} />;
      case 'chorus':
        return (
          <div key="chorus" className="toggle-switch">
            <label>Chorus</label>
            <input 
              type="checkbox" 
              checked={amp.params?.chorus || false}
              onChange={(e) => onUpdate(amp.id, 'chorus', e.target.checked)}
            />
          </div>
        );
      case 'distortion':
        return (
          <div key="distortion" className="toggle-switch">
            <label>Dist</label>
            <input 
              type="checkbox" 
              checked={amp.params?.distortion || false}
              onChange={(e) => onUpdate(amp.id, 'distortion', e.target.checked)}
            />
          </div>
        );
      case 'presence':
        return <Knob key="presence" label="Presence" value={amp.params?.presence || 50} onChange={handleKnobChange('presence')} size={40} />;
      case 'resonance':
        return <Knob key="resonance" label="Resonance" value={amp.params?.resonance || 50} onChange={handleKnobChange('resonance')} size={40} />;
      case 'depth':
        return <Knob key="depth" label="Depth" value={amp.params?.depth || 50} onChange={handleKnobChange('depth')} size={40} />;
      case 'shape':
        return <Knob key="shape" label="Shape" value={amp.params?.shape || 50} onChange={handleKnobChange('shape')} size={40} />;
      case 'graphiceq':
        return (
          <div key="graphiceq" className="toggle-switch">
            <label>GFX EQ</label>
            <input 
              type="checkbox" 
              checked={amp.params?.graphiceq || false}
              onChange={(e) => onUpdate(amp.id, 'graphiceq', e.target.checked)}
            />
          </div>
        );
      case 'soloboost':
        return <Knob key="soloboost" label="Solo" value={amp.params?.soloboost || 0} onChange={handleKnobChange('soloboost')} size={40} />;
      case 'pregain':
        return <Knob key="pregain" label="Pre" value={amp.params?.pregain || 50} onChange={handleKnobChange('pregain')} size={40} />;
      case 'postgain':
        return <Knob key="postgain" label="Post" value={amp.params?.postgain || 50} onChange={handleKnobChange('postgain')} size={40} />;
      case 'boost':
        return (
          <div key="boost" className="toggle-switch">
            <label>Boost</label>
            <input 
              type="checkbox" 
              checked={amp.params?.boost || false}
              onChange={(e) => onUpdate(amp.id, 'boost', e.target.checked)}
            />
          </div>
        );
      case 'deepcontrol':
        return <Knob key="deepcontrol" label="Deep" value={amp.params?.deepcontrol || 50} onChange={handleKnobChange('deepcontrol')} size={40} />;
      case 'tightswitch':
        return (
          <div key="tightswitch" className="toggle-switch">
            <label>Tight</label>
            <input 
              type="checkbox" 
              checked={amp.params?.tightswitch || false}
              onChange={(e) => onUpdate(amp.id, 'tightswitch', e.target.checked)}
            />
          </div>
        );
      case 'mastervolume':
        return <Knob key="mastervolume" label="Master" value={amp.params?.mastervolume || 70} onChange={handleKnobChange('mastervolume')} size={40} />;
      case 'oddrive':
        return <Knob key="oddrive" label="OD" value={amp.params?.oddrive || 50} onChange={handleKnobChange('oddrive')} size={40} />;
      case 'ratio':
        return <Knob key="ratio" label="Ratio" value={amp.params?.ratio || 50} onChange={handleKnobChange('ratio')} size={40} />;
      case 'variac':
        return <Knob key="variac" label="Variac" value={amp.params?.variac || 100} onChange={handleKnobChange('variac')} size={40} />;
      case 'gainstructure':
        return <Knob key="gainstructure" label="Struct" value={amp.params?.gainstructure || 50} onChange={handleKnobChange('gainstructure')} size={40} />;
      case 'channel':
        // Mesa Dual Rectifier channels
        return (
          <div key="channel" className="amp-channel-switch">
            <label>Channel</label>
            <select 
              value={amp.params?.channel || 'modern'}
              onChange={(e) => onUpdate(amp.id, 'channel', e.target.value)}
            >
              <option value="clean">Clean</option>
              <option value="vintage">Vintage</option>
              <option value="modern">Modern</option>
            </select>
          </div>
        );
      case 'peavey_channel':
        // Peavey 5150 channels
        return (
          <div key="peavey_channel" className="amp-channel-switch">
            <label>Channel</label>
            <select 
              value={amp.params?.channel || 1}
              onChange={(e) => onUpdate(amp.id, 'channel', parseInt(e.target.value))}
            >
              <option value="0">Rhythm</option>
              <option value="1">Lead</option>
            </select>
          </div>
        );
      case 'gate':
        return (
          <div key="gate" className="toggle-switch">
            <label>Gate</label>
            <input 
              type="checkbox" 
              checked={amp.params?.gate !== false}
              onChange={(e) => onUpdate(amp.id, 'gate', e.target.checked)}
            />
          </div>
        );
      case 'crunch':
        return (
          <div key="crunch" className="toggle-switch">
            <label>Crunch</label>
            <input 
              type="checkbox" 
              checked={amp.params?.crunch || false}
              onChange={(e) => onUpdate(amp.id, 'crunch', e.target.checked)}
            />
          </div>
        );
      case 'speaker_impedance':
        return (
          <div key="speaker_impedance" className="amp-impedance-switch">
            <label>Impedance</label>
            <select 
              value={amp.params?.speaker_impedance || 16}
              onChange={(e) => onUpdate(amp.id, 'speaker_impedance', parseInt(e.target.value))}
            >
              <option value="4">4Ω (Tight)</option>
              <option value="8">8Ω (Balanced)</option>
              <option value="16">16Ω (Loose)</option>
            </select>
          </div>
        );
      case 'bold_spongy':
        return (
          <div key="bold_spongy" className="toggle-switch">
            <label>{amp.params?.bold_spongy !== false ? 'BOLD' : 'SPONGY'}</label>
            <input 
              type="checkbox" 
              checked={amp.params?.bold_spongy !== false}
              onChange={(e) => onUpdate(amp.id, 'bold_spongy', e.target.checked)}
            />
          </div>
        );
      case 'tube_silicon':
        return (
          <div key="tube_silicon" className="toggle-switch">
            <label>{amp.params?.tube_silicon !== false ? 'SILICON' : 'TUBE'}</label>
            <input 
              type="checkbox" 
              checked={amp.params?.tube_silicon !== false}
              onChange={(e) => onUpdate(amp.id, 'tube_silicon', e.target.checked)}
            />
          </div>
        );
      case 'multi_watt':
        return (
          <div key="multi_watt" className="amp-watt-switch">
            <label>Power</label>
            <select 
              value={amp.params?.multi_watt || '100'}
              onChange={(e) => onUpdate(amp.id, 'multi_watt', e.target.value)}
            >
              <option value="50">50W</option>
              <option value="100">100W</option>
              <option value="150">150W</option>
            </select>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <motion.div
      className="amp-rig-container"
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0, opacity: 0 }}
      transition={{ type: 'spring', stiffness: 300, damping: 25 }}
    >
      <button className="amp-remove" onClick={() => onRemove(amp.id)}>×</button>

      <div className="amp-main-layout">
        {/* LEFT: AMP STACK */}
        <div className="amp-stack-wrapper">
          {/* AMP HEAD */}
          <motion.div
            className={`amp-head ${amp.bypassed ? 'bypassed' : ''} amp-${amp.ampType || 'clean'}`}
            whileHover={{ y: -3, scale: 1.02 }}
          >
        <div className="amp-head-top">
          <div className="amp-brand-logo">
            <span className="brand-text">{ampStyle.brand}</span>
            <span className="model-text">{ampStyle.logo}</span>
          </div>
          
          <select 
            className="amp-type-selector" 
            value={amp.ampType || 'clean'}
            onChange={handleTypeChange}
          >
            <optgroup label="🎸 CLASSIC">
              <option value="clean">Fender Twin Reverb</option>
              <option value="crunch">Marshall Plexi</option>
              <option value="lead">Mesa Dual Rect</option>
              <option value="metal">ENGL High Gain</option>
            </optgroup>
            
            <optgroup label="🎵 CLEAN/VINTAGE">
              <option value="vox_ac30">Vox AC30</option>
              <option value="fender_deluxe">Fender Deluxe Reverb</option>
              <option value="fender_bassman">Fender Bassman</option>
              <option value="roland_jc120">Roland JC-120</option>
              <option value="matchless_dc30">Matchless DC-30</option>
            </optgroup>
            
            <optgroup label="🔥 CRUNCH/BRITISH">
              <option value="marshall_jcm800">Marshall JCM800</option>
              <option value="orange_rockerverb">Orange Rockerverb</option>
              <option value="hiwatt_dr103">Hiwatt DR103</option>
              <option value="marshall_jtm45">Marshall JTM45</option>
              <option value="badcat_hotcat">Bad Cat Hot Cat</option>
            </optgroup>
            
            <optgroup label="🤘 HIGH GAIN/MODERN">
              <option value="peavey_5150">Peavey 5150</option>
              <option value="mesa_dual_rectifier">Mesa Dual Rectifier</option>
              <option value="bogner_ecstasy">Bogner Ecstasy</option>
              <option value="diezel_vh4">Diezel VH4</option>
              <option value="friedman_be100">Friedman BE-100</option>
              <option value="soldano_slo100">Soldano SLO-100</option>
            </optgroup>
            
            <optgroup label="✨ BOUTIQUE/MODERN">
              <option value="tworock_classic">Two-Rock Classic</option>
              <option value="dumble_ods">Dumble ODS</option>
              <option value="mesa_mark_v">Mesa Mark V</option>
              <option value="suhr_badger">Suhr Badger</option>
              <option value="victory_duchess">Victory Duchess</option>
            </optgroup>
          </select>

          <button
            className={`amp-power-switch ${!amp.bypassed ? 'active' : ''}`}
            onClick={() => onBypass(amp.id)}
          >
            <span className="power-led"></span>
          </button>
        </div>

        <div className="amp-control-panel">
          <div className="amp-knobs-section">
            <div className="knob-group">
              <Knob label="Gain" value={amp.params?.gain || 50} onChange={handleKnobChange('gain')} size={45} />
              <Knob label="Bass" value={amp.params?.bass || 50} onChange={handleKnobChange('bass')} size={45} />
              <Knob label="Mid" value={amp.params?.mid || 50} onChange={handleKnobChange('mid')} size={45} />
            </div>
            <div className="knob-group">
              <Knob label="Treble" value={amp.params?.treble || 50} onChange={handleKnobChange('treble')} size={45} />
              <Knob label="Presence" value={amp.params?.presence || 50} onChange={handleKnobChange('presence')} size={45} />
              <Knob label="Master" value={amp.params?.master || 70} onChange={handleKnobChange('master')} size={45} />
            </div>
          </div>

          {/* SPECIFIC AMP CONTROLS */}
          {specificControls.length > 0 && (
            <div className="amp-specific-controls">
              <div className="specific-controls-divider"></div>
              <div className="specific-controls-group">
                {specificControls.map(control => renderSpecificControl(control))}
              </div>
            </div>
          )}
        </div>
      </motion.div>

      {/* CABINET */}
      <motion.div
        className="amp-cabinet"
        whileHover={{ y: -2, scale: 1.01 }}
      >
        <div className="cabinet-config">
          <div className="config-row">
            <label>Cabinet</label>
            <select
              value={amp.params?.cabinet || '2x12_closed'}
              onChange={(e) => onUpdate(amp.id, 'cabinet', e.target.value)}
            >
              <option value="1x12_open">1x12" Open</option>
              <option value="1x12_closed">1x12" Closed</option>
              <option value="2x12_open">2x12" Open</option>
              <option value="2x12_closed">2x12" Closed</option>
              <option value="4x12_vintage">4x12" V30</option>
              <option value="4x12_greenback">4x12" GB</option>
              <option value="1x10_tweed">1x10" Tweed</option>
              <option value="4x10_bassman">4x10" Bass</option>
            </select>
          </div>

          <div className="config-row">
            <label>Microphone</label>
            <select
              value={amp.params?.microphone || 'sm57'}
              onChange={(e) => onUpdate(amp.id, 'microphone', e.target.value)}
            >
              <option value="sm57">SM57</option>
              <option value="sm7b">SM7B</option>
              <option value="royer121">R-121</option>
              <option value="u87">U87</option>
              <option value="md421">MD421</option>
              <option value="e906">e906</option>
            </select>
          </div>

          <div className="config-row">
            <label>Position</label>
            <select
              value={amp.params?.micPosition || 'edge'}
              onChange={(e) => onUpdate(amp.id, 'micPosition', e.target.value)}
            >
              <option value="center">Center</option>
              <option value="edge">Edge</option>
              <option value="off_axis">Off-Axis</option>
              <option value="room">Room</option>
            </select>
          </div>
        </div>

            <div className="cabinet-speaker-grill">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="speaker-cone"></div>
              ))}
            </div>
          </motion.div>
        </div>

        {/* RIGHT: ADVANCED CONTROLS */}
        <div className="amp-advanced-section">
            <button
              className="advanced-toggle"
              onClick={() => setShowAdvanced(!showAdvanced)}
            >
              <span>{showAdvanced ? '▼' : '▶'}</span>
              Advanced Controls
              <span className="pro-badge">PRO</span>
            </button>

            {showAdvanced && (
              <motion.div
                className="advanced-controls-panel"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
              >
                {/* POWER AMP SECTION */}
                <div className="advanced-section">
                  <h4>⚡ Power Amp</h4>
                  <div className="advanced-controls-grid">
                    <div className="control-group">
                      <label>Tube Type</label>
                      <select
                        value={amp.params?.tubetype || 'EL34'}
                        onChange={(e) => onUpdate(amp.id, 'tubetype', e.target.value)}
                      >
                        <option value="EL34">EL34 (British)</option>
                        <option value="6L6">6L6 (American)</option>
                        <option value="EL84">EL84 (Vintage)</option>
                        <option value="KT88">KT88 (Hi-Fi)</option>
                        <option value="6V6">6V6 (Classic)</option>
                      </select>
                    </div>

                    <Knob label="Bias" value={amp.params?.bias || 50} onChange={handleKnobChange('bias')} size={35} />
                    <Knob label="Sag" value={amp.params?.sag || 50} onChange={handleKnobChange('sag')} size={35} />

                    <div className="control-group">
                      <label>Rectifier</label>
                      <select
                        value={amp.params?.rectifier || 'tube'}
                        onChange={(e) => onUpdate(amp.id, 'rectifier', e.target.value)}
                      >
                        <option value="tube">Tube (Warm)</option>
                        <option value="solid-state">Solid State (Tight)</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* SPEAKER & IMPEDANCE */}
                <div className="advanced-section">
                  <h4>🔊 Speaker & Impedance</h4>
                  <div className="advanced-controls-grid">
                    <div className="control-group">
                      <label>Impedance</label>
                      <select
                        value={amp.params?.impedance || '8'}
                        onChange={(e) => onUpdate(amp.id, 'impedance', e.target.value)}
                      >
                        <option value="4">4Ω (Tight)</option>
                        <option value="8">8Ω (Balanced)</option>
                        <option value="16">16Ω (Warm)</option>
                      </select>
                    </div>

                    <Knob label="Hum" value={amp.params?.hum || 0} onChange={handleKnobChange('hum')} size={35} />

                    <div className="control-group">
                      <label>Hum Freq</label>
                      <select
                        value={amp.params?.humfrequency || 60}
                        onChange={(e) => onUpdate(amp.id, 'humfrequency', parseInt(e.target.value))}
                      >
                        <option value="50">50Hz (EU)</option>
                        <option value="60">60Hz (US)</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* ROOM MODELING */}
                <div className="advanced-section">
                  <h4>🏠 Room Modeling</h4>
                  <div className="advanced-controls-grid">
                    <div className="control-group">
                      <label>Room Size</label>
                      <select
                        value={amp.params?.roomsize || 'medium'}
                        onChange={(e) => onUpdate(amp.id, 'roomsize', e.target.value)}
                      >
                        <option value="small">Small</option>
                        <option value="medium">Medium</option>
                        <option value="large">Large</option>
                      </select>
                    </div>

                    <div className="control-group">
                      <label>Room Type</label>
                      <select
                        value={amp.params?.roomtype || 'studio'}
                        onChange={(e) => onUpdate(amp.id, 'roomtype', e.target.value)}
                      >
                        <option value="booth">Booth</option>
                        <option value="studio">Studio</option>
                        <option value="live">Live Room</option>
                        <option value="arena">Arena</option>
                      </select>
                    </div>

                    <Knob label="Room" value={amp.params?.roomamount || 0} onChange={handleKnobChange('roomamount')} size={35} />
                    <Knob label="Early Ref" value={amp.params?.earlyreflections || 0} onChange={handleKnobChange('earlyreflections')} size={35} />
                    <Knob label="Ambient" value={amp.params?.ambientmic || 0} onChange={handleKnobChange('ambientmic')} size={35} />
                    <Knob label="Width" value={amp.params?.stereowidth || 50} onChange={handleKnobChange('stereowidth')} size={35} />
                  </div>
                </div>

                {/* FX LOOP */}
                <div className="advanced-section">
                  <h4>🔁 FX Loop</h4>
                  <div className="advanced-controls-grid">
                    <Knob label="Send" value={amp.params?.fxloopsend || 80} onChange={handleKnobChange('fxloopsend')} size={35} />
                    <Knob label="Return" value={amp.params?.fxloopreturn || 80} onChange={handleKnobChange('fxloopreturn')} size={35} />

                    <div className="control-group">
                      <label>Mode</label>
                      <select
                        value={amp.params?.fxloopmode || 'series'}
                        onChange={(e) => onUpdate(amp.id, 'fxloopmode', e.target.value)}
                      >
                        <option value="series">Series</option>
                        <option value="parallel">Parallel</option>
                      </select>
                    </div>

                    <div className="control-group">
                      <label>Position</label>
                      <select
                        value={amp.params?.fxloopposition || 'post'}
                        onChange={(e) => onUpdate(amp.id, 'fxloopposition', e.target.value)}
                      >
                        <option value="pre">Pre-Amp</option>
                        <option value="post">Post-Amp</option>
                      </select>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </div>
        </div>
      </motion.div>
    );
  };
  
  export default AmpComponent;


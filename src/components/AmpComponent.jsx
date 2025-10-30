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
    onUpdate(amp.id, 'ampType', e.target.value);
  };

  // Get original cabinet for each amp type
  const getOriginalCabinet = (ampType) => {
    const cabinetMap = {
      // CLASSIC
      'clean': '2x12_open',
      'crunch': '4x12_greenback',
      'lead': '4x12_vintage',
      'metal': '4x12_vintage',
      
      // CLEAN/VINTAGE
      'fender_twin_reverb': '2x12_open',
      'vox_ac30': '2x12_closed',
      'fender_deluxe': '1x12_open',
      'fender_vibro_king': '3x10_open',
      'fender_bassman': '4x10_bass',
      'fender_pro_junior': '1x10_open',
      'roland_jc120': '2x12_open',
      'matchless_dc30': '2x12_closed',
      
      // CRUNCH/BRITISH
      'marshall_jcm800': '4x12_greenback',
      'orange_rockerverb': '2x12_closed',
      'orange_tiny_terror': '1x12_closed',
      'hiwatt_dr103': '4x12_fane',
      'marshall_jtm45': '4x12_greenback',
      'badcat_hotcat': '2x12_closed',
      
      // HIGH GAIN/MODERN
      'peavey_5150': '4x12_sheffield',
      'mesa_dual_rectifier': '4x12_vintage',
      'bogner_ecstasy': '4x12_v30',
      'bogner_uberschall': '4x12_v30',
      'diezel_vh4': '4x12_v30',
      'engl_powerball': '4x12_vintage',
      'friedman_be100': '4x12_v30',
      'soldano_slo100': '4x12_v30',
      
      // BOUTIQUE/MODERN
      'tworock_classic': '1x12_open',
      'dumble_ods': '1x12_open',
      'mesa_mark_v': '4x12_v30',
      'mesa_transatlantic_ta30': '2x12_blue',
      'suhr_badger': '2x12_greenback',
      'victory_duchess': '2x12_closed'
    };
    
    return cabinetMap[ampType] || '2x12_closed';
  };

  const getAmpStyle = (type) => {
    const baseStyles = {
      // ORIGINAL 4
      clean: {
        color: '#2a2a2a',
        accent: '#silver',
        grill: '#808080',
        logo: 'Basic Clean',
        brand: 'GENERIC'
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
      fender_vibro_king: {
        color: '#f5f0e8',         // Creme/bege claro (chassis real)
        accent: '#000000',        // Painel de controle preto
        grill: '#d4c5a0',         // Grade bege/dourada clara
        logo: 'Vibro-King',
        brand: 'FENDER',
        textColor: '#ffffff'      // Letras brancas no painel preto
      },
      fender_bassman: {
        color: '#d4af37',
        accent: '#b8860b',
        grill: '#daa520',
        logo: 'Bassman',
        brand: 'FENDER'
      },
      fender_pro_junior: {
        color: '#d4af37',    // Tweed dourado (como o real)
        accent: '#b8860b',   // Detalhes dourados
        grill: '#daa520',    // Grill cloth tweed
        logo: 'Pro Junior',
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
        color: '#e8dcc4',    // Chassis creme/bege claro (como a foto)
        accent: '#d4c5a0',   // Detalhes creme
        grill: '#a89968',    // Grill cloth marrom/dourado (wheat/trigo)
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
      orange_tiny_terror: {
        color: '#ff6600',      // Orange vibrante (icônico)
        accent: '#ffffff',     // Detalhes brancos
        grill: '#654321',      // Grade marrom clássica Orange
        logo: 'Tiny Terror',
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
        accent: '#d4af37',
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
        color: '#000000',      // Preto (painel de controle)
        accent: '#d4af37',     // Dourado (detalhes)
        grill: '#d4c5a0',      // Grade bege/dourada clara (como no amp real)
        logo: 'Ecstasy',
        brand: 'BOGNER'
      },
      bogner_uberschall: {
        color: '#0a0a0a',      // Preto fosco boutique
        accent: '#d4af37',     // Dourado (detalhes boutique)
        grill: '#1a1a1a',      // Grade escura
        logo: 'ÜBERSCHALL',
        brand: 'BOGNER'
      },
      diezel_vh4: {
        color: '#4a4a4a',     // Chassi metálico prateado
        accent: '#c0c0c0',    // Detalhes prateados
        grill: '#2a2a2a',     // Grade escura
        logo: 'VH4',
        brand: 'DIEZEL'
      },
      engl_powerball: {
        color: '#000000',     // Preto ENGL clássico
        accent: '#ff0000',    // Vermelho característico
        grill: '#1a1a1a',     // Grade escura
        logo: 'POWERBALL II',
        brand: 'ENGL'
      },
      friedman_be100: {
        color: '#000000',
        accent: '#ffd700',
        grill: '#2a2a2a',
        logo: 'BE-100',
        brand: 'FRIEDMAN'
      },
      soldano_slo100: {
        color: '#a0a0a0',     // Alumínio escovado prateado
        accent: '#ffffff',    // Letras brancas
        grill: '#5a5a5a',     // Grade metálica
        logo: 'SLO-100',
        brand: 'SOLDANO'
      },
      // BOUTIQUE/MODERN (5)
      tworock_classic: {
        color: '#6a6a6a',     // Cinza metálico discreto
        accent: '#d0d0d0',    // Prateado
        grill: '#8a8a8a',     // Grade metálica clara
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
      mesa_transatlantic_ta30: {
        color: '#1a1a1a',
        accent: '#ffa500',
        grill: '#2a2a2a',
        logo: 'TransAtlantic TA-30',
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
        color: '#e8dcc0',  // Bege claro como o amp real
        accent: '#8b6914',  // Dourado/marrom para detalhes
        grill: '#d4c5a0',   // Grade bege/creme
        logo: 'The Duchess',
        brand: 'VICTORY'
      },
      fender_twin_reverb: {
        color: '#000000',  // Preto clássico Fender Blackface
        accent: '#c0c0c0', // Detalhes prateados
        grill: '#d4af37',  // Grade dourada característica
        logo: 'Twin Reverb',
        brand: 'FENDER'
      }
    };
    
    return baseStyles[type] || baseStyles.clean;
  };

  const ampStyle = getAmpStyle(amp.ampType || 'fender_twin_reverb');

  // Get specific controls for each amp type
  const getAmpSpecificControls = (type) => {
    const controls = {
      // FENDER AMPS - Spring Reverb + Bright Switch
      clean: ['reverb', 'bright'],
      fender_deluxe: ['fender_deluxe_channel', 'fender_reverb_dwell', 'bright', 'fender_cabinet'],
      fender_vibro_king: ['vibro_king_controls'],
      fender_bassman: ['fender_bassman_controls'],
      fender_pro_junior: ['cabinet_enabled'], // Pro Junior - apenas Volume/Tone/Master nos knobs + Cabinet
      fender_twin_reverb: ['twin_channel', 'twin_speed', 'twin_intensity', 'reverb', 'reverb_dwell', 'bright', 'cabinet_enabled'],
      
      // VOX AC30 - Full control suite
      vox_ac30: ['vox_channel', 'vox_normal_volume', 'vox_brilliance', 'vox_tremolo', 'vox_vibrato', 'vox_reverb', 'vox_cut', 'vox_pentode_triode'],
      
      // ROLAND - Built-in Chorus
      roland_jc120: ['chorus', 'vibrato_enabled', 'distortion', 'cabinet_enabled'],
      
      // MARSHALL - Presence + Resonance
      crunch: ['presence', 'resonance'],
      marshall_jcm800: ['marshall_jcm800_controls'],
      marshall_jtm45: ['marshall_jtm45_controls'],
      
      // MESA BOOGIE - Graphic EQ + Presence
      lead: ['presence', 'graphiceq'],
      mesa_mark_v: ['mesa_mark_v_controls'],
      mesa_dual_rectifier: ['mesa_dual_rectifier_controls'],
      mesa_transatlantic_ta30: ['mesa_transatlantic_ta30_controls'],
      
      // ORANGE - Full Rockerverb Controls
      orange_rockerverb: ['orange_channel', 'channel_volume', 'reverb', 'cabinet_enabled'],
      
      // ORANGE TINY TERROR - Wattage Switch + Cabinet
      orange_tiny_terror: ['tiny_terror_wattage', 'cabinet_enabled'],
      
      // HIGH GAIN MODERN - Presence + Resonance/Depth
      metal: ['presence', 'resonance'],
      peavey_5150: ['peavey_5150_controls'],
      bogner_ecstasy: ['bogner_ecstasy_controls'],
      bogner_uberschall: ['bogner_uberschall_controls'],
      diezel_vh4: ['diezel_vh4_controls'],
      engl_powerball: ['engl_powerball_controls'],
      friedman_be100: ['friedman_channel', 'friedman_depth', 'friedman_tight', 'friedman_fat', 'friedman_sat', 'friedman_bright', 'friedman_cabinet'],
      soldano_slo100: ['soldano_slo100_controls'],
      
      // MATCHLESS - Cabinet control
      matchless_dc30: ['cabinet_enabled'],
      
      // BAD CAT - Complete Hot Cat 30R controls
      badcat_hotcat: ['badcat_hotcat_controls'],
      
      // HIWATT - Complete DR103 controls
      hiwatt_dr103: ['hiwatt_dr103_controls'],
      
      // TWO-ROCK - Full control suite
      tworock_classic: ['tworock_classic_controls'],
      
      // DUMBLE ODS - Has complete custom layout (no specific controls needed)
      dumble_ods: [],
      
      // SUHR BADGER - Complete boutique British control set
      suhr_badger: ['suhr_channel', 'channel_volume', 'clarity', 'variac', 'cabinet'],
      
      // VICTORY DUCHESS - Full British boutique control
      victory_duchess: ['victory_channel', 'channel_volume', 'presence', 'resonance', 'voicing', 'cabinet_enabled'],
    };
    return controls[type] || [];
  };

  const specificControls = getAmpSpecificControls(amp.ampType || 'fender_twin_reverb');

  const renderSpecificControl = (controlType) => {
    switch (controlType) {
      case 'reverb':
        // Para Fender amps, usa tamanho menor e label uppercase
        if (amp.ampType === 'fender_twin_reverb' || amp.ampType === 'fender_deluxe') {
          return <Knob key="reverb" label="REVERB" value={amp.params?.reverb || 0} onChange={handleKnobChange('reverb')} size={28} />;
        }
        return <Knob key="reverb" label="Reverb" value={amp.params?.reverb || 0} onChange={handleKnobChange('reverb')} size={32} />;
      case 'bright':
        // Compact button style for Fender amps
        if (amp.ampType === 'fender_deluxe' || amp.ampType === 'fender_twin_reverb') {
          return (
            <div key="bright" style={{ display: 'inline-flex', gap: '4px', alignItems: 'center' }}>
              <button
                onClick={() => onUpdate(amp.id, 'bright', false)}
                style={{
                  padding: '4px 6px',
                  fontSize: '9px',
                  fontWeight: 'bold',
                  borderRadius: '3px',
                  border: !amp.params?.bright ? '1px solid #c0c0c0' : '1px solid rgba(192,192,192,0.2)',
                  background: !amp.params?.bright ? 'rgba(192,192,192,0.3)' : 'rgba(0,0,0,0.3)',
                  color: !amp.params?.bright ? '#c0c0c0' : '#888',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >OFF</button>
              <button
                onClick={() => onUpdate(amp.id, 'bright', true)}
                style={{
                  padding: '4px 6px',
                  fontSize: '9px',
                  fontWeight: 'bold',
                  borderRadius: '3px',
                  border: amp.params?.bright ? '1px solid #c0c0c0' : '1px solid rgba(192,192,192,0.2)',
                  background: amp.params?.bright ? 'rgba(192,192,192,0.3)' : 'rgba(0,0,0,0.3)',
                  color: amp.params?.bright ? '#c0c0c0' : '#888',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >BRITE</button>
            </div>
          );
        }
        // Standard toggle for other amps
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
        return <Knob key="vibrato" label="Vibrato" value={amp.params?.vibrato || 0} onChange={handleKnobChange('vibrato')} size={32} />;
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
        return <Knob key="tremolo" label="Tremolo" value={amp.params?.tremolo || 0} onChange={handleKnobChange('tremolo')} size={32} />;
      case 'cut':
        return <Knob key="cut" label="Cut" value={amp.params?.cut || 50} onChange={handleKnobChange('cut')} size={32} />;
      
      // ============================================
      // FENDER TWIN REVERB SPECIFIC CONTROLS
      // ============================================
      case 'twin_channel':
        return (
          <div key="twin_channel" style={{ display: 'inline-flex', gap: '4px', alignItems: 'center' }}>
            <button
              onClick={() => onUpdate(amp.id, 'channel', 'normal')}
              style={{
                padding: '4px 8px',
                fontSize: '9px',
                fontWeight: 'bold',
                borderRadius: '3px',
                border: amp.params?.channel === 'normal' ? '1px solid #d4af37' : '1px solid rgba(192,192,192,0.2)',
                background: amp.params?.channel === 'normal' ? 'rgba(212,175,55,0.3)' : 'rgba(0,0,0,0.3)',
                color: amp.params?.channel === 'normal' ? '#d4af37' : '#888',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >NORM</button>
            <button
              onClick={() => onUpdate(amp.id, 'channel', 'vibrato')}
              style={{
                padding: '4px 8px',
                fontSize: '9px',
                fontWeight: 'bold',
                borderRadius: '3px',
                border: amp.params?.channel === 'vibrato' ? '1px solid #d4af37' : '1px solid rgba(192,192,192,0.2)',
                background: amp.params?.channel === 'vibrato' ? 'rgba(212,175,55,0.3)' : 'rgba(0,0,0,0.3)',
                color: amp.params?.channel === 'vibrato' ? '#d4af37' : '#888',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >VIB</button>
          </div>
        );
      
      case 'twin_normal_volume':
        return null; // Volume agora está nos knobs principais
      
      case 'twin_vibrato_volume':
        return null; // Volume agora está nos knobs principais
      
      case 'twin_speed':
        return <Knob key="twin_speed" label="SPEED" value={amp.params?.vibrato_speed || 40} onChange={handleKnobChange('vibrato_speed')} size={28} />;
      
      case 'twin_intensity':
        return <Knob key="twin_intensity" label="INTENS" value={amp.params?.vibrato_intensity || 0} onChange={handleKnobChange('vibrato_intensity')} size={28} />;
      
      case 'reverb_dwell':
        return <Knob key="reverb_dwell" label="DWELL" value={amp.params?.reverb_dwell || 50} onChange={handleKnobChange('reverb_dwell')} size={28} />;
      
      // ============================================
      // VOX AC30 SPECIFIC CONTROLS
      // ============================================
      case 'vox_channel':
        return (
          <div key="vox_channel" style={{ display: 'inline-flex', gap: '4px', alignItems: 'center' }}>
            <button
              onClick={() => onUpdate(amp.id, 'channel', 0)}
              style={{
                padding: '4px 8px',
                fontSize: '9px',
                fontWeight: 'bold',
                borderRadius: '3px',
                border: amp.params?.channel === 0 ? '1px solid #d4af37' : '1px solid rgba(192,192,192,0.2)',
                background: amp.params?.channel === 0 ? 'rgba(212,175,55,0.3)' : 'rgba(0,0,0,0.3)',
                color: amp.params?.channel === 0 ? '#d4af37' : '#888',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >NORM</button>
            <button
              onClick={() => onUpdate(amp.id, 'channel', 1)}
              style={{
                padding: '4px 8px',
                fontSize: '9px',
                fontWeight: 'bold',
                borderRadius: '3px',
                border: amp.params?.channel === 1 ? '1px solid #d4af37' : '1px solid rgba(192,192,192,0.2)',
                background: amp.params?.channel === 1 ? 'rgba(212,175,55,0.3)' : 'rgba(0,0,0,0.3)',
                color: amp.params?.channel === 1 ? '#d4af37' : '#888',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >T.BOOST</button>
          </div>
        );
      
      case 'vox_normal_volume':
        // Only show when Normal channel is selected
        if (amp.params?.channel === 0) {
          return <Knob key="vox_normal_volume" label="N.VOL" value={amp.params?.normal_volume || 50} onChange={handleKnobChange('normal_volume')} size={28} />;
        }
        return null;
      
      case 'vox_brilliance':
        // Only show when Normal channel is selected
        if (amp.params?.channel === 0) {
          return (
            <div key="vox_brilliance" style={{ display: 'inline-flex', gap: '4px', alignItems: 'center' }}>
              <button
                onClick={() => onUpdate(amp.id, 'brilliance', false)}
                style={{
                  padding: '4px 6px',
                  fontSize: '9px',
                  fontWeight: 'bold',
                  borderRadius: '3px',
                  border: !amp.params?.brilliance ? '1px solid #d4af37' : '1px solid rgba(192,192,192,0.2)',
                  background: !amp.params?.brilliance ? 'rgba(212,175,55,0.3)' : 'rgba(0,0,0,0.3)',
                  color: !amp.params?.brilliance ? '#d4af37' : '#888',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >WARM</button>
              <button
                onClick={() => onUpdate(amp.id, 'brilliance', true)}
                style={{
                  padding: '4px 6px',
                  fontSize: '9px',
                  fontWeight: 'bold',
                  borderRadius: '3px',
                  border: amp.params?.brilliance ? '1px solid #d4af37' : '1px solid rgba(192,192,192,0.2)',
                  background: amp.params?.brilliance ? 'rgba(212,175,55,0.3)' : 'rgba(0,0,0,0.3)',
                  color: amp.params?.brilliance ? '#d4af37' : '#888',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >BRIL</button>
            </div>
          );
        }
        return null;
      
      case 'vox_tremolo':
        return (
          <div key="vox_tremolo" style={{ display: 'inline-flex', gap: '6px', alignItems: 'center' }}>
            <Knob label="T.SPD" value={amp.params?.tremolo_speed || 40} onChange={handleKnobChange('tremolo_speed')} size={28} />
            <Knob label="T.DEP" value={amp.params?.tremolo_depth || 0} onChange={handleKnobChange('tremolo_depth')} size={28} />
          </div>
        );
      
      case 'vox_vibrato':
        return (
          <div key="vox_vibrato" style={{ display: 'inline-flex', gap: '6px', alignItems: 'center' }}>
            <Knob label="V.SPD" value={amp.params?.vibrato_speed || 50} onChange={handleKnobChange('vibrato_speed')} size={28} />
            <Knob label="V.DEP" value={amp.params?.vibrato_depth || 0} onChange={handleKnobChange('vibrato_depth')} size={28} />
          </div>
        );
      
      case 'vox_reverb':
        return <Knob key="vox_reverb" label="REVERB" value={amp.params?.reverb || 0} onChange={handleKnobChange('reverb')} size={28} />;
      
      case 'vox_cut':
        return <Knob key="vox_cut" label="CUT" value={amp.params?.cut || 50} onChange={handleKnobChange('cut')} size={28} />;
      
      case 'vox_pentode_triode':
        return (
          <div key="vox_pentode_triode" style={{ display: 'inline-flex', gap: '4px', alignItems: 'center' }}>
            <button
              onClick={() => onUpdate(amp.id, 'pentode_triode', true)}
              style={{
                padding: '4px 6px',
                fontSize: '9px',
                fontWeight: 'bold',
                borderRadius: '3px',
                border: amp.params?.pentode_triode !== false ? '1px solid #d4af37' : '1px solid rgba(192,192,192,0.2)',
                background: amp.params?.pentode_triode !== false ? 'rgba(212,175,55,0.3)' : 'rgba(0,0,0,0.3)',
                color: amp.params?.pentode_triode !== false ? '#d4af37' : '#888',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >30W</button>
            <button
              onClick={() => onUpdate(amp.id, 'pentode_triode', false)}
              style={{
                padding: '4px 6px',
                fontSize: '9px',
                fontWeight: 'bold',
                borderRadius: '3px',
                border: amp.params?.pentode_triode === false ? '1px solid #d4af37' : '1px solid rgba(192,192,192,0.2)',
                background: amp.params?.pentode_triode === false ? 'rgba(212,175,55,0.3)' : 'rgba(0,0,0,0.3)',
                color: amp.params?.pentode_triode === false ? '#d4af37' : '#888',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >15W</button>
          </div>
        );
      
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
      case 'vibrato_enabled':
        return (
          <div key="vibrato_enabled" className="toggle-switch">
            <label>Vibrato</label>
            <input 
              type="checkbox" 
              checked={amp.params?.vibrato_enabled || false}
              onChange={(e) => onUpdate(amp.id, 'vibrato_enabled', e.target.checked)}
            />
          </div>
        );
      case 'cabinet_enabled':
        // Compact button style for Fender Twin Reverb
        if (amp.ampType === 'fender_twin_reverb') {
          return (
            <div key="cabinet_enabled" style={{ display: 'inline-flex', gap: '4px', alignItems: 'center' }}>
              <button
                onClick={() => onUpdate(amp.id, 'cabinet_enabled', false)}
                style={{
                  padding: '4px 6px',
                  fontSize: '9px',
                  fontWeight: 'bold',
                  borderRadius: '3px',
                  border: amp.params?.cabinet_enabled === false ? '1px solid #c0c0c0' : '1px solid rgba(192,192,192,0.2)',
                  background: amp.params?.cabinet_enabled === false ? 'rgba(192,192,192,0.3)' : 'rgba(0,0,0,0.3)',
                  color: amp.params?.cabinet_enabled === false ? '#c0c0c0' : '#888',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >OFF</button>
              <button
                onClick={() => onUpdate(amp.id, 'cabinet_enabled', true)}
                style={{
                  padding: '4px 6px',
                  fontSize: '9px',
                  fontWeight: 'bold',
                  borderRadius: '3px',
                  border: amp.params?.cabinet_enabled !== false ? '1px solid #c0c0c0' : '1px solid rgba(192,192,192,0.2)',
                  background: amp.params?.cabinet_enabled !== false ? 'rgba(192,192,192,0.3)' : 'rgba(0,0,0,0.3)',
                  color: amp.params?.cabinet_enabled !== false ? '#c0c0c0' : '#888',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >ON</button>
            </div>
          );
        }
        // Standard toggle for other amps
        return (
          <div key="cabinet_enabled" className="toggle-switch">
            <label>Cabinet</label>
            <input 
              type="checkbox" 
              checked={amp.params?.cabinet_enabled !== false}
              onChange={(e) => onUpdate(amp.id, 'cabinet_enabled', e.target.checked)}
            />
          </div>
        );
      case 'presence':
        return <Knob key="presence" label="Presence" value={amp.params?.presence || 50} onChange={handleKnobChange('presence')} size={32} />;
      case 'resonance':
        return <Knob key="resonance" label="Resonance" value={amp.params?.resonance || 50} onChange={handleKnobChange('resonance')} size={32} />;
      case 'depth':
        return <Knob key="depth" label="Depth" value={amp.params?.depth || 50} onChange={handleKnobChange('depth')} size={32} />;
      case 'shape':
        return <Knob key="shape" label="Shape" value={amp.params?.shape || 50} onChange={handleKnobChange('shape')} size={32} />;
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
        return <Knob key="soloboost" label="Solo" value={amp.params?.soloboost || 0} onChange={handleKnobChange('soloboost')} size={32} />;
      case 'pregain':
        return <Knob key="pregain" label="Pre" value={amp.params?.pregain || 50} onChange={handleKnobChange('pregain')} size={32} />;
      case 'postgain':
        return <Knob key="postgain" label="Post" value={amp.params?.postgain || 50} onChange={handleKnobChange('postgain')} size={32} />;
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
      
      // ============================================
      // TWO-ROCK CLASSIC REVERB SPECIFIC CONTROLS
      // ============================================
      case 'tworock_channel':
        return (
          <div key="tworock_channel" className="toggle-switch">
            <label>Channel</label>
            <select 
              value={amp.params?.channel || 0}
              onChange={(e) => onUpdate(amp.id, 'channel', parseInt(e.target.value))}
              className="channel-select"
            >
              <option value={0}>Clean</option>
              <option value={1}>Lead</option>
            </select>
          </div>
        );
      
      case 'reverb_decay':
        return (
          <div key="reverb_decay" style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'center' }}>
            <Knob label="Decay" value={amp.params?.reverb_decay || 45} onChange={handleKnobChange('reverb_decay')} size={28} />
            <span style={{ fontSize: '9px', color: '#999', textAlign: 'center' }}>Rev Decay</span>
          </div>
        );
      
      case 'deepcontrol':
        return <Knob key="deepcontrol" label="Deep" value={amp.params?.deepcontrol || 50} onChange={handleKnobChange('deepcontrol')} size={32} />;
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
        return <Knob key="mastervolume" label="Master" value={amp.params?.mastervolume || 70} onChange={handleKnobChange('mastervolume')} size={32} />;
      case 'oddrive':
        return <Knob key="oddrive" label="OD" value={amp.params?.oddrive || 50} onChange={handleKnobChange('oddrive')} size={32} />;
      case 'ratio':
        return <Knob key="ratio" label="Ratio" value={amp.params?.ratio || 50} onChange={handleKnobChange('ratio')} size={32} />;
      case 'variac':
        return <Knob key="variac" label="Variac" value={amp.params?.variac || 100} onChange={handleKnobChange('variac')} size={32} />;
      
      // ============================================
      // SUHR BADGER SPECIFIC CONTROLS
      // ============================================
      case 'suhr_channel':
        return (
          <div key="suhr_channel" className="toggle-switch">
            <label>Channel</label>
            <select 
              value={amp.params?.channel || 1}
              onChange={(e) => onUpdate(amp.id, 'channel', parseInt(e.target.value))}
              className="channel-select"
            >
              <option value={0}>Clean</option>
              <option value={1}>Gain</option>
            </select>
          </div>
        );
      
      case 'clarity':
        return (
          <div key="clarity" className="toggle-switch">
            <label>Clarity</label>
            <input 
              type="checkbox" 
              checked={amp.params?.clarity || false}
              onChange={(e) => onUpdate(amp.id, 'clarity', e.target.checked ? 1 : 0)}
            />
          </div>
        );
      
      case 'cabinet':
        return (
          <div key="cabinet" className="toggle-switch">
            <label>Cabinet</label>
            <input 
              type="checkbox" 
              checked={amp.params?.cabinet !== 0}
              onChange={(e) => onUpdate(amp.id, 'cabinet', e.target.checked ? 1 : 0)}
            />
          </div>
        );
      
      // ============================================
      // VICTORY DUCHESS SPECIFIC CONTROLS
      // ============================================
      case 'victory_channel':
        return (
          <div key="victory_channel" style={{ 
            display: 'flex', 
            flexDirection: 'column', 
            gap: '6px', 
            padding: '8px 10px', 
            background: 'linear-gradient(135deg, rgba(232,220,192,0.3), rgba(212,197,160,0.2))', 
            borderRadius: '6px', 
            border: '2px solid rgba(139,105,20,0.5)'
          }}>
            <label style={{ fontSize: '10px', fontWeight: 'bold', color: '#5a4a2a', textTransform: 'uppercase', letterSpacing: '1px' }}>Voice I / II</label>
            <div style={{ display: 'flex', gap: '6px' }}>
              <button 
                onClick={() => onUpdate(amp.id, 'channel', 1)}
                style={{
                  padding: '6px 12px',
                  background: amp.params?.channel === 1 ? 'linear-gradient(135deg, #8b6914, #a0761a)' : 'rgba(232,220,192,0.3)',
                  border: '2px solid #8b6914',
                  color: amp.params?.channel === 1 ? '#fff' : '#5a4a2a',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontWeight: 'bold',
                  fontSize: '10px',
                  boxShadow: amp.params?.channel === 1 ? '0 2px 8px rgba(139,105,20,0.5)' : 'none',
                  transition: 'all 0.2s ease'
                }}
              >VOICE I</button>
              <button 
                onClick={() => onUpdate(amp.id, 'channel', 2)}
                style={{
                  padding: '6px 12px',
                  background: amp.params?.channel === 2 ? 'linear-gradient(135deg, #8b6914, #a0761a)' : 'rgba(232,220,192,0.3)',
                  border: '2px solid #8b6914',
                  color: amp.params?.channel === 2 ? '#fff' : '#5a4a2a',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontWeight: 'bold',
                  fontSize: '10px',
                  boxShadow: amp.params?.channel === 2 ? '0 2px 8px rgba(139,105,20,0.5)' : 'none',
                  transition: 'all 0.2s ease'
                }}
              >VOICE II</button>
            </div>
          </div>
        );
      
      case 'voicing':
        return (
          <div key="voicing" style={{ 
            display: 'flex', 
            flexDirection: 'column', 
            gap: '6px', 
            padding: '8px 10px', 
            background: 'linear-gradient(135deg, rgba(232,220,192,0.3), rgba(212,197,160,0.2))', 
            borderRadius: '6px', 
            border: '2px solid rgba(139,105,20,0.5)'
          }}>
            <label style={{ fontSize: '10px', fontWeight: 'bold', color: '#5a4a2a', textTransform: 'uppercase', letterSpacing: '1px' }}>High Preheat</label>
            <div style={{ display: 'flex', gap: '6px' }}>
              <button 
                onClick={() => onUpdate(amp.id, 'voicing', 'vintage')}
                style={{
                  padding: '6px 12px',
                  background: amp.params?.voicing === 'vintage' ? 'linear-gradient(135deg, #8b6914, #a0761a)' : 'rgba(232,220,192,0.3)',
                  border: '2px solid #8b6914',
                  color: amp.params?.voicing === 'vintage' ? '#fff' : '#5a4a2a',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontWeight: 'bold',
                  fontSize: '10px',
                  boxShadow: amp.params?.voicing === 'vintage' ? '0 2px 8px rgba(139,105,20,0.5)' : 'none',
                  transition: 'all 0.2s ease'
                }}
              >LOW</button>
              <button 
                onClick={() => onUpdate(amp.id, 'voicing', 'modern')}
                style={{
                  padding: '6px 12px',
                  background: amp.params?.voicing === 'modern' ? 'linear-gradient(135deg, #8b6914, #a0761a)' : 'rgba(232,220,192,0.3)',
                  border: '2px solid #8b6914',
                  color: amp.params?.voicing === 'modern' ? '#fff' : '#5a4a2a',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontWeight: 'bold',
                  fontSize: '10px',
                  boxShadow: amp.params?.voicing === 'modern' ? '0 2px 8px rgba(139,105,20,0.5)' : 'none',
                  transition: 'all 0.2s ease'
                }}
              >HIGH</button>
            </div>
          </div>
        );
      case 'cabinet_enabled':
        return (
          <div key="cabinet_enabled" className="toggle-switch">
            <label>Cabinet</label>
            <input 
              type="checkbox" 
              checked={amp.params?.cabinet_enabled !== false}
              onChange={(e) => onUpdate(amp.id, 'cabinet_enabled', e.target.checked)}
            />
          </div>
        );
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
      case 'soldano_channel':
        // Soldano SLO-100 channels
        return (
          <div key="soldano_channel" className="amp-channel-switch">
            <label>Channel</label>
            <select 
              value={amp.params?.channel || 1}
              onChange={(e) => onUpdate(amp.id, 'channel', parseInt(e.target.value))}
            >
              <option value="0">Normal</option>
              <option value="1">Overdrive</option>
            </select>
          </div>
        );
      case 'orange_channel':
        // Orange Rockerverb channels
        return (
          <div key="orange_channel" className="amp-channel-switch">
            <label>Channel</label>
            <select 
              value={amp.params?.channel || 1}
              onChange={(e) => onUpdate(amp.id, 'channel', parseInt(e.target.value))}
              style={{ padding: '5px', fontSize: '12px', borderRadius: '4px', background: '#ff8c00', color: '#fff', border: '1px solid #fff' }}
            >
              <option value="0">Clean</option>
              <option value="1">Dirty</option>
            </select>
          </div>
        );
      case 'channel_volume':
        return <Knob key="channel_volume" label="Ch Vol" value={amp.params?.channel_volume || 70} onChange={handleKnobChange('channel_volume')} size={32} />;
      
      // ============================================
      // ORANGE TINY TERROR SPECIFIC CONTROLS
      // ============================================
      case 'tiny_terror_wattage':
        // Orange Tiny Terror wattage switch (7W/15W)
        return (
          <div key="tiny_terror_wattage" className="amp-wattage-switch">
            <label>Power</label>
            <select 
              value={amp.params?.wattage || 15}
              onChange={(e) => onUpdate(amp.id, 'wattage', parseInt(e.target.value))}
              style={{ 
                padding: '5px 8px', 
                fontSize: '12px', 
                borderRadius: '4px', 
                background: '#ff6600', 
                color: '#fff', 
                border: '2px solid #fff',
                fontWeight: 'bold',
                cursor: 'pointer'
              }}
            >
              <option value="7">7W</option>
              <option value="15">15W</option>
            </select>
          </div>
        );
      
      case 'master_gain':
        return <Knob key="master_gain" label="Pre-Master" value={amp.params?.master_gain || 70} onChange={handleKnobChange('master_gain')} size={32} />;
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
      
      case 'fender_bassman_controls':
        return (
          <div key="fender_bassman_controls" style={{ display: 'inline-flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
            {/* Main Controls - Classic Bassman 3 Knobs */}
            <Knob label="TREBLE" value={amp.params?.treble || 65} onChange={handleKnobChange('treble')} size={28} />
            <Knob label="PRESENCE" value={amp.params?.presence || 50} onChange={handleKnobChange('presence')} size={28} />
            <Knob label="MASTER" value={amp.params?.master || 70} onChange={handleKnobChange('master')} size={28} />
            
            {/* Bright Cap */}
            <div style={{ display: 'inline-flex', gap: '4px', alignItems: 'center' }}>
              <button
                onClick={() => onUpdate(amp.id, 'bright', 0)}
                style={{
                  padding: '4px 6px',
                  fontSize: '10px',
                  fontWeight: 'bold',
                  borderRadius: '3px',
                  border: amp.params?.bright === 0 ? '2px solid #000' : '1px solid rgba(0,0,0,0.3)',
                  background: amp.params?.bright === 0 ? '#8b6914' : 'rgba(0,0,0,0.2)',
                  color: amp.params?.bright === 0 ? '#fff' : '#555',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  textShadow: amp.params?.bright === 0 ? '0 1px 2px rgba(0,0,0,0.5)' : 'none'
                }}
              >OFF</button>
              <button
                onClick={() => onUpdate(amp.id, 'bright', 1)}
                style={{
                  padding: '4px 6px',
                  fontSize: '10px',
                  fontWeight: 'bold',
                  borderRadius: '3px',
                  border: amp.params?.bright !== 0 ? '2px solid #000' : '1px solid rgba(0,0,0,0.3)',
                  background: amp.params?.bright !== 0 ? '#8b6914' : 'rgba(0,0,0,0.2)',
                  color: amp.params?.bright !== 0 ? '#fff' : '#555',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  textShadow: amp.params?.bright !== 0 ? '0 1px 2px rgba(0,0,0,0.5)' : 'none'
                }}
              >BRITE</button>
              </div>
              
            {/* Cabinet */}
            <div style={{ display: 'inline-flex', gap: '4px', alignItems: 'center' }}>
              <button
                onClick={() => onUpdate(amp.id, 'cabinet_enabled', 0)}
                style={{
                  padding: '4px 6px',
                  fontSize: '10px',
                  fontWeight: 'bold',
                  borderRadius: '3px',
                  border: amp.params?.cabinet_enabled === 0 ? '2px solid #000' : '1px solid rgba(0,0,0,0.3)',
                  background: amp.params?.cabinet_enabled === 0 ? '#8b6914' : 'rgba(0,0,0,0.2)',
                  color: amp.params?.cabinet_enabled === 0 ? '#fff' : '#555',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  textShadow: amp.params?.cabinet_enabled === 0 ? '0 1px 2px rgba(0,0,0,0.5)' : 'none'
                }}
              >OFF</button>
              <button
                onClick={() => onUpdate(amp.id, 'cabinet_enabled', 1)}
                style={{
                  padding: '4px 6px',
                  fontSize: '10px',
                  fontWeight: 'bold',
                  borderRadius: '3px',
                  border: amp.params?.cabinet_enabled !== 0 ? '2px solid #000' : '1px solid rgba(0,0,0,0.3)',
                  background: amp.params?.cabinet_enabled !== 0 ? '#8b6914' : 'rgba(0,0,0,0.2)',
                  color: amp.params?.cabinet_enabled !== 0 ? '#fff' : '#555',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  textShadow: amp.params?.cabinet_enabled !== 0 ? '0 1px 2px rgba(0,0,0,0.5)' : 'none'
                }}
              >CAB</button>
            </div>
          </div>
        );
      
      // ============================================
      // FENDER VIBRO-KING - COMPLETE CONTROLS
      // ============================================
      case 'vibro_king_controls':
        return (
          <div key="vibro_king_controls" style={{ display: 'inline-flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
            {/* Reverb Controls */}
            <Knob label="REVERB" value={amp.params?.reverb || 35} onChange={handleKnobChange('reverb')} size={28} />
            <Knob label="DWELL" value={amp.params?.reverb_dwell || 50} onChange={handleKnobChange('reverb_dwell')} size={26} />
            
            {/* Tremolo Controls */}
            <Knob label="TREM SPEED" value={amp.params?.tremolo_speed || 50} onChange={handleKnobChange('tremolo_speed')} size={26} />
            <Knob label="TREM INT" value={amp.params?.tremolo_intensity || 0} onChange={handleKnobChange('tremolo_intensity')} size={26} />
            
            {/* Vibrato (Pitch) Controls */}
            <Knob label="VIB SPEED" value={amp.params?.vibrato_speed || 50} onChange={handleKnobChange('vibrato_speed')} size={26} />
            <Knob label="VIB INT" value={amp.params?.vibrato_intensity || 0} onChange={handleKnobChange('vibrato_intensity')} size={26} />
            
            {/* Presence */}
            <Knob label="PRESENCE" value={amp.params?.presence || 50} onChange={handleKnobChange('presence')} size={28} />
            
            {/* Bright Switch */}
            <div style={{ display: 'inline-flex', gap: '4px', alignItems: 'center' }}>
              <button
                onClick={() => onUpdate(amp.id, 'bright', false)}
                style={{
                  padding: '4px 6px',
                  fontSize: '10px',
                  fontWeight: 'bold',
                  borderRadius: '3px',
                  border: !amp.params?.bright ? '2px solid #000' : '1px solid rgba(0,0,0,0.3)',
                  background: !amp.params?.bright ? '#d4af37' : 'rgba(0,0,0,0.2)',
                  color: !amp.params?.bright ? '#000' : '#555',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  textShadow: !amp.params?.bright ? '0 1px 2px rgba(0,0,0,0.5)' : 'none'
                }}
              >OFF</button>
              <button
                onClick={() => onUpdate(amp.id, 'bright', true)}
                style={{
                  padding: '4px 6px',
                  fontSize: '10px',
                  fontWeight: 'bold',
                  borderRadius: '3px',
                  border: amp.params?.bright ? '2px solid #000' : '1px solid rgba(0,0,0,0.3)',
                  background: amp.params?.bright ? '#d4af37' : 'rgba(0,0,0,0.2)',
                  color: amp.params?.bright ? '#000' : '#555',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  textShadow: amp.params?.bright ? '0 1px 2px rgba(0,0,0,0.5)' : 'none'
                }}
              >BRIGHT</button>
            </div>
            
            {/* Cabinet Switch */}
            <div style={{ display: 'inline-flex', gap: '4px', alignItems: 'center' }}>
              <button
                onClick={() => onUpdate(amp.id, 'cabinet_enabled', false)}
                style={{
                  padding: '4px 6px',
                  fontSize: '10px',
                  fontWeight: 'bold',
                  borderRadius: '3px',
                  border: !amp.params?.cabinet_enabled ? '2px solid #000' : '1px solid rgba(0,0,0,0.3)',
                  background: !amp.params?.cabinet_enabled ? '#d4af37' : 'rgba(0,0,0,0.2)',
                  color: !amp.params?.cabinet_enabled ? '#000' : '#555',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  textShadow: !amp.params?.cabinet_enabled ? '0 1px 2px rgba(0,0,0,0.5)' : 'none'
                }}
              >OFF</button>
              <button
                onClick={() => onUpdate(amp.id, 'cabinet_enabled', true)}
                style={{
                  padding: '4px 6px',
                  fontSize: '10px',
                  fontWeight: 'bold',
                  borderRadius: '3px',
                  border: amp.params?.cabinet_enabled ? '2px solid #000' : '1px solid rgba(0,0,0,0.3)',
                  background: amp.params?.cabinet_enabled ? '#d4af37' : 'rgba(0,0,0,0.2)',
                  color: amp.params?.cabinet_enabled ? '#000' : '#555',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  textShadow: amp.params?.cabinet_enabled ? '0 1px 2px rgba(0,0,0,0.5)' : 'none'
                }}
              >CAB</button>
            </div>
          </div>
        );
      
      // ============================================
      // MARSHALL JCM800 - COMPLETE CONTROLS
      // ============================================
      case 'marshall_jcm800_controls':
        return (
          <div key="marshall_jcm800_controls" className="marshall-jcm800-full-controls" style={{
            display: 'flex',
            flexDirection: 'row',
            gap: '8px',
            padding: '8px',
            background: 'linear-gradient(135deg, rgba(0,0,0,0.7), rgba(0,0,0,0.5))',
            borderRadius: '8px',
            border: '2px solid rgba(139,105,20,0.6)',
            flexWrap: 'wrap',
            justifyContent: 'center',
            alignItems: 'center'
          }}>
            {/* INPUT SELECTOR (High/Low) - Compacto */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'center', padding: '6px', background: 'rgba(0,0,0,0.5)', borderRadius: '6px', border: '1px solid rgba(139,105,20,0.4)' }}>
              <label style={{ fontSize: '8px', fontWeight: 'bold', color: '#d4af37', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                INPUT
                </label>
              <div style={{ display: 'flex', gap: '4px' }}>
                  <button 
                    onClick={() => onUpdate(amp.id, 'input_sensitivity', 0)}
                    style={{
                    padding: '5px 10px',
                    background: amp.params?.input_sensitivity === 0 ? '#d4af37' : 'rgba(0,0,0,0.7)',
                    border: amp.params?.input_sensitivity === 0 ? '1px solid #d4af37' : '1px solid #555',
                      color: amp.params?.input_sensitivity === 0 ? '#000' : '#d4af37',
                    borderRadius: '4px',
                      cursor: 'pointer',
                      fontWeight: 'bold',
                    fontSize: '9px',
                      textTransform: 'uppercase'
                    }}
                  >HIGH</button>
                  <button 
                    onClick={() => onUpdate(amp.id, 'input_sensitivity', 1)}
                    style={{
                    padding: '5px 10px',
                    background: amp.params?.input_sensitivity === 1 ? '#d4af37' : 'rgba(0,0,0,0.7)',
                    border: amp.params?.input_sensitivity === 1 ? '1px solid #d4af37' : '1px solid #555',
                      color: amp.params?.input_sensitivity === 1 ? '#000' : '#d4af37',
                    borderRadius: '4px',
                      cursor: 'pointer',
                      fontWeight: 'bold',
                    fontSize: '9px',
                      textTransform: 'uppercase'
                    }}
                  >LOW</button>
              </div>
            </div>
            
            {/* FRONT PANEL KNOBS - Layout horizontal compacto com botões grandes */}
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', flexWrap: 'wrap', padding: '6px' }}>
              <Knob label="Preamp" value={amp.params?.preamp_volume || 70} onChange={handleKnobChange('preamp_volume')} size={44} color="#d4af37" />
              <Knob label="Bass" value={amp.params?.bass || 60} onChange={handleKnobChange('bass')} size={42} color="#d4af37" />
              <Knob label="Mid" value={amp.params?.mid || 50} onChange={handleKnobChange('mid')} size={42} color="#d4af37" />
              <Knob label="Treble" value={amp.params?.treble || 70} onChange={handleKnobChange('treble')} size={42} color="#d4af37" />
              <Knob label="Presence" value={amp.params?.presence || 60} onChange={handleKnobChange('presence')} size={42} color="#d4af37" />
              <Knob label="Master" value={amp.params?.master_volume || 50} onChange={handleKnobChange('master_volume')} size={46} color="#ffd700" />
            </div>
            
            {/* BACK PANEL CONTROLS - Compacto */}
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', padding: '6px', background: 'rgba(0,0,0,0.5)', borderRadius: '6px', border: '1px solid rgba(139,105,20,0.4)' }}>
                {/* POWER MODE (Pentode/Triode) */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', alignItems: 'center' }}>
                <label style={{ fontSize: '7px', color: '#d4af37', fontWeight: 'bold' }}>POWER</label>
                  <div className="toggle-switch">
                  <label style={{ fontSize: '8px' }}>{amp.params?.power_mode === 0 ? '100W' : '50W'}</label>
                    <input 
                      type="checkbox" 
                      checked={amp.params?.power_mode !== 0}
                      onChange={(e) => onUpdate(amp.id, 'power_mode', e.target.checked ? 1 : 0)}
                    />
                  </div>
                </div>
                
                {/* STANDBY */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', alignItems: 'center' }}>
                <label style={{ fontSize: '7px', color: '#d4af37', fontWeight: 'bold' }}>STDBY</label>
                  <div className="toggle-switch">
                  <label style={{ fontSize: '8px' }}>{amp.params?.standby ? 'ON' : 'OFF'}</label>
                    <input 
                      type="checkbox" 
                      checked={amp.params?.standby || false}
                      onChange={(e) => onUpdate(amp.id, 'standby', e.target.checked)}
                    />
                  </div>
                </div>
                
                {/* FX LOOP */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', alignItems: 'center' }}>
                <label style={{ fontSize: '7px', color: '#d4af37', fontWeight: 'bold' }}>FX LOOP</label>
                  <div className="toggle-switch">
                  <label style={{ fontSize: '8px' }}>{amp.params?.fx_loop ? 'ON' : 'OFF'}</label>
                    <input 
                      type="checkbox" 
                      checked={amp.params?.fx_loop || false}
                      onChange={(e) => onUpdate(amp.id, 'fx_loop', e.target.checked)}
                    />
                  </div>
                </div>
                
                {/* CABINET TOGGLE */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', alignItems: 'center' }}>
                <label style={{ fontSize: '7px', color: '#d4af37', fontWeight: 'bold' }}>CAB</label>
                  <div className="toggle-switch">
                  <label style={{ fontSize: '8px' }}>{amp.params?.cabinet_enabled !== false ? 'ON' : 'OFF'}</label>
                    <input 
                      type="checkbox" 
                      checked={amp.params?.cabinet_enabled !== false}
                      onChange={(e) => onUpdate(amp.id, 'cabinet_enabled', e.target.checked)}
                    />
                </div>
              </div>
            </div>
          </div>
        );
      
      // ============================================
      // MARSHALL JTM45 - COMPLETE CONTROLS
      // ============================================
      case 'marshall_jtm45_controls':
        return (
          <div key="marshall_jtm45_controls" className="marshall-jtm45-full-controls" style={{
            display: 'flex',
            flexDirection: 'row',
            gap: '10px',
            padding: '8px 12px',
            background: 'linear-gradient(135deg, #d4af37 0%, #b8941f 100%)',
            borderRadius: '6px',
            border: '2px solid #8b6914',
            flexWrap: 'wrap',
            justifyContent: 'center',
            alignItems: 'center'
          }}>
            {/* INPUT SELECTOR (High/Low) - Compacto */}
            <div style={{
              display: 'flex',
              gap: '4px',
              padding: '4px 6px',
              background: 'rgba(0,0,0,0.3)',
              borderRadius: '4px',
              border: '1px solid rgba(0,0,0,0.5)',
              alignItems: 'center'
            }}>
              <label style={{ fontSize: '7px', fontWeight: 'bold', color: '#000', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                INPUT
                </label>
                  <button 
                    onClick={() => onUpdate(amp.id, 'input', 1)}
                    style={{
                  padding: '4px 8px',
                  background: amp.params?.input === 1 ? '#000' : 'rgba(0,0,0,0.4)',
                  border: '1px solid #000',
                  color: amp.params?.input === 1 ? '#d4af37' : '#000',
                  borderRadius: '3px',
                      cursor: 'pointer',
                      fontWeight: 'bold',
                  fontSize: '8px',
                      textTransform: 'uppercase'
                    }}
              >HI</button>
                  <button 
                    onClick={() => onUpdate(amp.id, 'input', 0)}
                    style={{
                  padding: '4px 8px',
                  background: amp.params?.input === 0 ? '#000' : 'rgba(0,0,0,0.4)',
                  border: '1px solid #000',
                  color: amp.params?.input === 0 ? '#d4af37' : '#000',
                  borderRadius: '3px',
                      cursor: 'pointer',
                      fontWeight: 'bold',
                  fontSize: '8px',
                      textTransform: 'uppercase'
                    }}
              >LO</button>
            </div>
            
            {/* CHANNEL VOLUMES (Normal/Bright) */}
            <div style={{
              display: 'flex',
              gap: '10px',
              padding: '6px 8px',
              background: 'rgba(0,0,0,0.2)',
              borderRadius: '6px',
              border: '1px solid rgba(0,0,0,0.3)'
            }}>
              <Knob label="NORM" value={amp.params?.ch_normal || 60} onChange={handleKnobChange('ch_normal')} size={34} color="#000000" />
              <Knob label="BRITE" value={amp.params?.ch_bright || 40} onChange={handleKnobChange('ch_bright')} size={34} color="#000000" />
            </div>
            
            {/* TONE CONTROLS - Horizontal compacto */}
            <div style={{
              display: 'flex',
              gap: '10px',
              padding: '6px 8px',
              background: 'rgba(0,0,0,0.2)',
              borderRadius: '6px',
              border: '1px solid rgba(0,0,0,0.3)'
            }}>
              <Knob label="VOL" value={amp.params?.volume || 60} onChange={handleKnobChange('volume')} size={36} color="#000000" />
              <Knob label="BASS" value={amp.params?.bass || 55} onChange={handleKnobChange('bass')} size={32} color="#000000" />
              <Knob label="MID" value={amp.params?.middle || 50} onChange={handleKnobChange('middle')} size={32} color="#000000" />
              <Knob label="TREB" value={amp.params?.treble || 65} onChange={handleKnobChange('treble')} size={32} color="#000000" />
              <Knob label="PRES" value={amp.params?.presence || 55} onChange={handleKnobChange('presence')} size={32} color="#000000" />
            </div>
            
            {/* MASTER & CABINET */}
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '6px',
              padding: '6px 8px',
              background: 'rgba(0,0,0,0.2)',
              borderRadius: '6px',
              border: '1px solid rgba(0,0,0,0.3)',
              alignItems: 'center'
            }}>
              <Knob label="MASTER" value={amp.params?.master || 70} onChange={handleKnobChange('master')} size={38} color="#000000" />
              
              <div className="toggle-switch">
                <label style={{ fontSize: '7px', color: '#000', fontWeight: 'bold' }}>CAB</label>
                <input 
                  type="checkbox" 
                  checked={amp.params?.cabinet_enabled !== false}
                  onChange={(e) => onUpdate(amp.id, 'cabinet_enabled', e.target.checked)}
                />
              </div>
            </div>
          </div>
        );
      
      // ============================================
      // MESA MARK V - COMPLETE CONTROLS
      // ============================================
      case 'mesa_mark_v_controls':
        return (
          <div key="mesa_mark_v_controls" className="mesa-mark-v-full-controls" style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '15px',
            padding: '15px',
            background: 'linear-gradient(135deg, rgba(0,0,0,0.4), rgba(255,165,0,0.1))',
            borderRadius: '10px',
            border: '2px solid rgba(255,165,0,0.3)',
            width: '100%',
            maxWidth: '900px'
          }}>
            {/* CHANNEL & MODE SELECTORS */}
            <div style={{ display: 'flex', gap: '15px', justifyContent: 'space-between', alignItems: 'center', padding: '10px', background: 'rgba(0,0,0,0.3)', borderRadius: '8px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                <label style={{ fontSize: '9px', fontWeight: 'bold', color: '#ffa500', textTransform: 'uppercase' }}>Channel</label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button 
                    onClick={() => onUpdate(amp.id, 'channel', 1)}
                    style={{
                      padding: '8px 16px',
                      background: amp.params?.channel === 1 ? '#ffa500' : 'rgba(0,0,0,0.5)',
                      border: '2px solid #ffa500',
                      color: amp.params?.channel === 1 ? '#000' : '#ffa500',
                      borderRadius: '5px',
                      cursor: 'pointer',
                      fontWeight: 'bold',
                      fontSize: '11px'
                    }}
                  >CH 1</button>
                  <button 
                    onClick={() => onUpdate(amp.id, 'channel', 2)}
                    style={{
                      padding: '8px 16px',
                      background: amp.params?.channel === 2 ? '#ffa500' : 'rgba(0,0,0,0.5)',
                      border: '2px solid #ffa500',
                      color: amp.params?.channel === 2 ? '#000' : '#ffa500',
                      borderRadius: '5px',
                      cursor: 'pointer',
                      fontWeight: 'bold',
                      fontSize: '11px'
                    }}
                  >CH 2</button>
                  <button 
                    onClick={() => onUpdate(amp.id, 'channel', 3)}
                    style={{
                      padding: '8px 16px',
                      background: amp.params?.channel === 3 ? '#ffa500' : 'rgba(0,0,0,0.5)',
                      border: '2px solid #ffa500',
                      color: amp.params?.channel === 3 ? '#000' : '#ffa500',
                      borderRadius: '5px',
                      cursor: 'pointer',
                      fontWeight: 'bold',
                      fontSize: '11px'
                    }}
                  >CH 3</button>
                </div>
              </div>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                <label style={{ fontSize: '9px', fontWeight: 'bold', color: '#ffa500', textTransform: 'uppercase' }}>Mode</label>
                <select 
                  value={amp.params?.mode || 'iic+'}
                  onChange={(e) => onUpdate(amp.id, 'mode', e.target.value)}
                  style={{
                    padding: '8px 12px',
                    background: 'rgba(0,0,0,0.7)',
                    border: '2px solid #ffa500',
                    color: '#ffa500',
                    borderRadius: '5px',
                    fontSize: '11px',
                    fontWeight: 'bold',
                    cursor: 'pointer'
                  }}
                >
                  {(amp.params?.channel === 1 || amp.params?.channel === '1') ? (
                    <>
                      <option value="clean">CLEAN</option>
                      <option value="fat">FAT</option>
                      <option value="tweed">TWEED</option>
                    </>
                  ) : (amp.params?.channel === 2 || amp.params?.channel === '2') ? (
                    <>
                      <option value="edge">EDGE</option>
                      <option value="crunch">CRUNCH</option>
                      <option value="mark_i">MARK I</option>
                    </>
                  ) : (
                    <>
                      <option value="iic+">IIC+</option>
                      <option value="mark_iv">MARK IV</option>
                      <option value="extreme">EXTREME</option>
                    </>
                  )}
                </select>
              </div>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                <label style={{ fontSize: '9px', fontWeight: 'bold', color: '#ffa500', textTransform: 'uppercase' }}>Variac Power</label>
                <select 
                  value={amp.params?.variac_power || 90}
                  onChange={(e) => onUpdate(amp.id, 'variac_power', parseInt(e.target.value))}
                  style={{
                    padding: '8px 12px',
                    background: 'rgba(0,0,0,0.7)',
                    border: '2px solid #ffa500',
                    color: '#ffa500',
                    borderRadius: '5px',
                    fontSize: '11px',
                    fontWeight: 'bold',
                    cursor: 'pointer'
                  }}
                >
                  <option value="90">FULL (90W)</option>
                  <option value="45">VARIAC (45W)</option>
                  <option value="10">TWEED (10W)</option>
                </select>
              </div>
            </div>
            
            {/* MAIN KNOBS */}
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', padding: '10px', background: 'rgba(0,0,0,0.2)', borderRadius: '8px' }}>
              <Knob label="Gain" value={amp.params?.gain || 70} onChange={handleKnobChange('gain')} size={40} />
              <Knob label="Bass" value={amp.params?.bass || 60} onChange={handleKnobChange('bass')} size={40} />
              <Knob label="Mid" value={amp.params?.middle || 50} onChange={handleKnobChange('middle')} size={40} />
              <Knob label="Treble" value={amp.params?.treble || 70} onChange={handleKnobChange('treble')} size={40} />
              <Knob label="Presence" value={amp.params?.presence || 65} onChange={handleKnobChange('presence')} size={40} />
            </div>
            
            {/* GRAPHIC EQ */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '12px', background: 'rgba(0,0,0,0.3)', borderRadius: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label style={{ fontSize: '11px', fontWeight: 'bold', color: '#ffa500', textTransform: 'uppercase', letterSpacing: '1px' }}>
                  5-Band Graphic EQ
                </label>
                <div className="toggle-switch">
                  <label style={{ fontSize: '10px', color: '#ffa500' }}>
                    {amp.params?.eq_enabled ? 'ON' : 'OFF'}
                  </label>
                  <input 
                    type="checkbox" 
                    checked={amp.params?.eq_enabled || false}
                    onChange={(e) => onUpdate(amp.id, 'eq_enabled', e.target.checked)}
                  />
                </div>
              </div>
              
              <div style={{ display: 'flex', gap: '15px', justifyContent: 'space-around', opacity: amp.params?.eq_enabled ? 1 : 0.3 }}>
                {[
                  { param: 'eq_80', label: '80Hz' },
                  { param: 'eq_240', label: '240Hz' },
                  { param: 'eq_750', label: '750Hz' },
                  { param: 'eq_2200', label: '2.2kHz' },
                  { param: 'eq_6600', label: '6.6kHz' }
                ].map(({ param, label }) => (
                  <div key={param} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                    <input 
                      type="range"
                      orient="vertical"
                      min="0"
                      max="100"
                      value={amp.params?.[param] || 50}
                      onChange={(e) => onUpdate(amp.id, param, parseInt(e.target.value))}
                      disabled={!amp.params?.eq_enabled}
                      style={{
                        width: '80px',
                        height: '15px',
                        transform: 'rotate(-90deg)',
                        transformOrigin: '40px 40px',
                        margin: '40px 0'
                      }}
                    />
                    <span style={{ fontSize: '9px', color: '#ffa500', fontWeight: 'bold' }}>{label}</span>
                    <span style={{ fontSize: '8px', color: '#999' }}>
                      {((amp.params?.[param] || 50) - 50) / 4.17 > 0 ? '+' : ''}{(((amp.params?.[param] || 50) - 50) / 4.17).toFixed(1)}dB
                    </span>
                  </div>
                ))}
              </div>
            </div>
            
            {/* MASTERS & OPTIONS */}
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'space-between', alignItems: 'center', padding: '10px', background: 'rgba(0,0,0,0.2)', borderRadius: '8px' }}>
              <Knob label="Ch Master" value={amp.params?.channel_master || 70} onChange={handleKnobChange('channel_master')} size={38} />
              <Knob label="Master" value={amp.params?.master || 70} onChange={handleKnobChange('master')} size={42} />
              
              <div style={{ display: 'flex', gap: '10px' }}>
                <div className="toggle-switch">
                  <label style={{ fontSize: '9px', color: '#ffa500' }}>V-Curve</label>
                  <input 
                    type="checkbox" 
                    checked={amp.params?.vcurve_enabled || false}
                    onChange={(e) => onUpdate(amp.id, 'vcurve_enabled', e.target.checked)}
                  />
                </div>
                
                <div className="toggle-switch">
                  <label style={{ fontSize: '9px', color: '#ffa500' }}>Cabinet</label>
                  <input 
                    type="checkbox" 
                    checked={amp.params?.cabinet_enabled !== false}
                    onChange={(e) => onUpdate(amp.id, 'cabinet_enabled', e.target.checked)}
                  />
                </div>
              </div>
            </div>
          </div>
        );
      
      // ============================================
      // MESA DUAL RECTIFIER - COMPLETE CONTROLS
      // ============================================
      case 'mesa_dual_rectifier_controls':
        const currentChannel = amp.params?.channel || 3;
        return (
          <div key="mesa_dual_rectifier_controls" className="mesa-dual-rectifier-full-controls" style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '4px',
            padding: '5px 6px',
            background: 'repeating-linear-gradient(90deg, transparent, transparent 1px, rgba(255,255,255,0.03) 1px, rgba(255,255,255,0.03) 2px), linear-gradient(135deg, #3a3a3a 0%, #2a2a2a 100%)',
            borderRadius: '4px',
            border: '2px solid #4a4a4a',
            boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.1), inset 0 2px 4px rgba(0,0,0,0.4)',
            maxWidth: '850px',
            alignItems: 'center'
          }}>
            {/* LINHA SUPERIOR - KNOBS */}
            <div style={{
              display: 'flex',
              flexDirection: 'row',
              gap: '5px',
              flexWrap: 'nowrap',
              justifyContent: 'center',
              alignItems: 'center'
            }}>
            {/* CHANNEL KNOBS - INLINE */}
            <div style={{
              display: 'flex',
              gap: '6px',
              padding: '4px 6px',
              background: 'rgba(0,0,0,0.3)',
              borderRadius: '4px',
              border: '1px solid rgba(128,128,128,0.4)',
              alignItems: 'center'
            }}>
              <div style={{ fontSize: '7px', color: '#d0d0d0', fontWeight: 'bold', writingMode: 'vertical-rl', transform: 'rotate(180deg)', letterSpacing: '1px' }}>
                {currentChannel === 1 ? 'CH1-CLEAN' : currentChannel === 2 ? 'CH2-VINTAGE' : 'CH3-MODERN'}
              </div>
              {currentChannel === 1 && (
                <>
                  <Knob label="GAIN" value={amp.params?.ch1_gain || 30} onChange={handleKnobChange('ch1_gain')} size={28} color="#e0e0e0" />
                  <Knob label="TREB" value={amp.params?.ch1_treble || 60} onChange={handleKnobChange('ch1_treble')} size={26} color="#e0e0e0" />
                  <Knob label="MID" value={amp.params?.ch1_mid || 50} onChange={handleKnobChange('ch1_mid')} size={26} color="#e0e0e0" />
                  <Knob label="BASS" value={amp.params?.ch1_bass || 55} onChange={handleKnobChange('ch1_bass')} size={26} color="#e0e0e0" />
                  <Knob label="PRES" value={amp.params?.ch1_presence || 45} onChange={handleKnobChange('ch1_presence')} size={26} color="#e0e0e0" />
                  <Knob label="MSTR" value={amp.params?.ch1_master || 60} onChange={handleKnobChange('ch1_master')} size={28} color="#c0c0c0" />
                </>
              )}
              {currentChannel === 2 && (
                <>
                  <Knob label="GAIN" value={amp.params?.ch2_gain || 60} onChange={handleKnobChange('ch2_gain')} size={28} color="#e0e0e0" />
                  <Knob label="TREB" value={amp.params?.ch2_treble || 65} onChange={handleKnobChange('ch2_treble')} size={26} color="#e0e0e0" />
                  <Knob label="MID" value={amp.params?.ch2_mid || 55} onChange={handleKnobChange('ch2_mid')} size={26} color="#e0e0e0" />
                  <Knob label="BASS" value={amp.params?.ch2_bass || 60} onChange={handleKnobChange('ch2_bass')} size={26} color="#e0e0e0" />
                  <Knob label="PRES" value={amp.params?.ch2_presence || 50} onChange={handleKnobChange('ch2_presence')} size={26} color="#e0e0e0" />
                  <Knob label="MSTR" value={amp.params?.ch2_master || 50} onChange={handleKnobChange('ch2_master')} size={28} color="#c0c0c0" />
                </>
              )}
              {currentChannel === 3 && (
                <>
                  <Knob label="GAIN" value={amp.params?.ch3_gain || 80} onChange={handleKnobChange('ch3_gain')} size={28} color="#e0e0e0" />
                  <Knob label="TREB" value={amp.params?.ch3_treble || 70} onChange={handleKnobChange('ch3_treble')} size={26} color="#e0e0e0" />
                  <Knob label="MID" value={amp.params?.ch3_mid || 40} onChange={handleKnobChange('ch3_mid')} size={26} color="#e0e0e0" />
                  <Knob label="BASS" value={amp.params?.ch3_bass || 75} onChange={handleKnobChange('ch3_bass')} size={26} color="#e0e0e0" />
                  <Knob label="PRES" value={amp.params?.ch3_presence || 60} onChange={handleKnobChange('ch3_presence')} size={26} color="#e0e0e0" />
                  <Knob label="MSTR" value={amp.params?.ch3_master || 50} onChange={handleKnobChange('ch3_master')} size={28} color="#c0c0c0" />
                </>
              )}
            </div>
            
            {/* GLOBAL CONTROLS */}
            <div style={{
              display: 'flex',
              gap: '6px',
              padding: '4px 6px',
              background: 'rgba(0,0,0,0.3)',
              borderRadius: '4px',
              border: '1px solid rgba(128,128,128,0.4)'
            }}>
              <Knob label="OUTPUT" value={amp.params?.output_master || 70} onChange={handleKnobChange('output_master')} size={30} color="#c0c0c0" />
              <Knob label="SOLO" value={amp.params?.solo || 0} onChange={handleKnobChange('solo')} size={24} color="#e0e0e0" />
              <Knob label="REVERB" value={amp.params?.reverb || 0} onChange={handleKnobChange('reverb')} size={24} color="#e0e0e0" />
            </div>
            </div>
            
            {/* LINHA INFERIOR - CHANNEL SELECTOR + BACK PANEL */}
            <div style={{
              display: 'flex',
              flexDirection: 'row',
              gap: '5px',
              flexWrap: 'nowrap',
              justifyContent: 'center',
              alignItems: 'flex-start'
          }}>
            {/* CHANNEL SELECTOR */}
            <div style={{
              display: 'flex',
              flexDirection: 'row',
              gap: '3px',
              padding: '4px 6px',
              background: 'rgba(0,0,0,0.5)',
              borderRadius: '4px',
              border: '1px solid rgba(128,128,128,0.5)',
              alignItems: 'center'
            }}>
              <label style={{ fontSize: '7px', color: '#d0d0d0', fontWeight: 'bold', letterSpacing: '0.5px', marginRight: '3px' }}>CH</label>
                  <button 
                    onClick={() => onUpdate(amp.id, 'channel', 1)}
                    style={{
                  padding: '3px 8px',
                  background: currentChannel === 1 ? 'linear-gradient(135deg, #b0b0b0 0%, #909090 100%)' : 'rgba(0,0,0,0.7)',
                  border: '1px solid ' + (currentChannel === 1 ? '#c0c0c0' : '#555'),
                  color: currentChannel === 1 ? '#000' : '#c0c0c0',
                  borderRadius: '2px',
                      cursor: 'pointer',
                      fontWeight: 'bold',
                  fontSize: '7px',
                  position: 'relative'
                }}
              >
                1
                {currentChannel === 1 && (
                  <div style={{
                    position: 'absolute',
                    top: '1px',
                    right: '1px',
                    width: '3px',
                    height: '3px',
                    borderRadius: '50%',
                    background: '#ff0000',
                    boxShadow: '0 0 6px #ff0000, 0 0 12px rgba(255,0,0,0.6)',
                    animation: 'pulse 1.5s infinite'
                  }}></div>
                )}
              </button>
                  <button 
                    onClick={() => onUpdate(amp.id, 'channel', 2)}
                    style={{
                  padding: '3px 8px',
                  background: currentChannel === 2 ? 'linear-gradient(135deg, #b0b0b0 0%, #909090 100%)' : 'rgba(0,0,0,0.7)',
                  border: '1px solid ' + (currentChannel === 2 ? '#c0c0c0' : '#555'),
                  color: currentChannel === 2 ? '#000' : '#c0c0c0',
                  borderRadius: '2px',
                      cursor: 'pointer',
                      fontWeight: 'bold',
                  fontSize: '7px',
                  position: 'relative'
                }}
              >
                2
                {currentChannel === 2 && (
                  <div style={{
                    position: 'absolute',
                    top: '1px',
                    right: '1px',
                    width: '3px',
                    height: '3px',
                    borderRadius: '50%',
                    background: '#ff0000',
                    boxShadow: '0 0 6px #ff0000, 0 0 12px rgba(255,0,0,0.6)',
                    animation: 'pulse 1.5s infinite'
                  }}></div>
                )}
              </button>
                  <button 
                    onClick={() => onUpdate(amp.id, 'channel', 3)}
                    style={{
                  padding: '3px 8px',
                  background: currentChannel === 3 ? 'linear-gradient(135deg, #b0b0b0 0%, #909090 100%)' : 'rgba(0,0,0,0.7)',
                  border: '1px solid ' + (currentChannel === 3 ? '#c0c0c0' : '#555'),
                  color: currentChannel === 3 ? '#000' : '#c0c0c0',
                  borderRadius: '2px',
                      cursor: 'pointer',
                      fontWeight: 'bold',
                  fontSize: '7px',
                  position: 'relative'
                }}
              >
                3
                {currentChannel === 3 && (
                  <div style={{
                    position: 'absolute',
                    top: '1px',
                    right: '1px',
                    width: '3px',
                    height: '3px',
                    borderRadius: '50%',
                    background: '#ff0000',
                    boxShadow: '0 0 6px #ff0000, 0 0 12px rgba(255,0,0,0.6)',
                    animation: 'pulse 1.5s infinite'
                  }}></div>
                )}
              </button>
            </div>
            
            {/* BACK PANEL CONTROLS */}
            <div style={{
              display: 'flex',
              flexDirection: 'row',
              gap: '4px',
              padding: '4px 6px',
              background: 'rgba(0,0,0,0.5)',
              borderRadius: '4px',
              border: '1px solid rgba(128,128,128,0.4)',
              alignItems: 'center',
              flexWrap: 'wrap'
            }}>
              <label style={{ fontSize: '6px', color: '#d0d0d0', fontWeight: 'bold', marginRight: '2px' }}>🔧 BACK</label>
              
                {/* BOLD/SPONGY */}
              <div className="toggle-switch" style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
                <label style={{ fontSize: '6px', color: '#d0d0d0', fontWeight: 'bold' }}>PWR</label>
                    <input 
                      type="checkbox" 
                      checked={amp.params?.bold_spongy !== false}
                      onChange={(e) => onUpdate(amp.id, 'bold_spongy', e.target.checked)}
                  style={{ transform: 'scale(0.7)' }}
                    />
                </div>
                
                {/* TUBE/SILICON */}
              <div className="toggle-switch" style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
                <label style={{ fontSize: '6px', color: '#d0d0d0', fontWeight: 'bold' }}>RECT</label>
                    <input 
                      type="checkbox" 
                      checked={amp.params?.tube_silicon !== false}
                      onChange={(e) => onUpdate(amp.id, 'tube_silicon', e.target.checked)}
                  style={{ transform: 'scale(0.7)' }}
                    />
                </div>
                
                {/* MULTI-WATT */}
                  <select 
                    value={amp.params?.multi_watt || 100}
                    onChange={(e) => onUpdate(amp.id, 'multi_watt', parseInt(e.target.value))}
                    style={{
                  padding: '1px 3px',
                      background: 'rgba(0,0,0,0.7)',
                  border: '1px solid #808080',
                  color: '#d0d0d0',
                  borderRadius: '2px',
                  fontSize: '7px',
                  fontWeight: 'bold'
                    }}
                  >
                    <option value="50">50W</option>
                    <option value="100">100W</option>
                    <option value="150">150W</option>
                  </select>
                
                {/* BIAS */}
                  <select 
                    value={amp.params?.bias || 0}
                    onChange={(e) => onUpdate(amp.id, 'bias', parseInt(e.target.value))}
                    style={{
                  padding: '1px 3px',
                      background: 'rgba(0,0,0,0.7)',
                  border: '1px solid #808080',
                  color: '#d0d0d0',
                  borderRadius: '2px',
                  fontSize: '7px',
                  fontWeight: 'bold'
                }}
              >
                <option value="0">Aggr</option>
                <option value="1">Mod</option>
                  </select>
                
                {/* VARIAC */}
              <div className="toggle-switch" style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
                <label style={{ fontSize: '6px', color: '#d0d0d0', fontWeight: 'bold' }}>VAR</label>
                    <input 
                      type="checkbox" 
                      checked={amp.params?.variac || false}
                      onChange={(e) => onUpdate(amp.id, 'variac', e.target.checked)}
                  style={{ transform: 'scale(0.7)' }}
                    />
                </div>
                
                {/* CABINET TOGGLE */}
              <div className="toggle-switch" style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
                <label style={{ fontSize: '6px', color: '#d0d0d0', fontWeight: 'bold' }}>CAB</label>
                    <input 
                      type="checkbox" 
                      checked={amp.params?.cabinet_enabled !== false}
                      onChange={(e) => onUpdate(amp.id, 'cabinet_enabled', e.target.checked)}
                  style={{ transform: 'scale(0.7)' }}
                    />
                </div>
              </div>
            </div>
          </div>
        );
      
      // ============================================
      // MESA TRANSATLANTIC TA-30 - COMPLETE CONTROLS
      // ============================================
      case 'mesa_transatlantic_ta30_controls':
        const ta30CurrentChannel = amp.params?.channel || 2;
        const ta30Ch1Mode = amp.params?.mode || 'clean';
        const ta30Ch2Mode = amp.params?.mode || 'hi1';
        return (
          <div key="mesa_transatlantic_ta30_controls" className="mesa-ta30-full-controls" style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '4px',
            padding: '5px 6px',
            background: 'repeating-linear-gradient(90deg, transparent, transparent 1px, rgba(255,165,0,0.03) 1px, rgba(255,165,0,0.03) 2px), linear-gradient(135deg, #2a2a2a 0%, #1a1a1a 100%)',
            borderRadius: '4px',
            border: '2px solid #ffa500',
            boxShadow: 'inset 0 1px 0 rgba(255,165,0,0.2), inset 0 2px 4px rgba(0,0,0,0.4)',
            maxWidth: '850px',
            alignItems: 'center'
          }}>
            {/* LINHA SUPERIOR - KNOBS */}
            <div style={{
              display: 'flex',
              flexDirection: 'row',
              gap: '5px',
              flexWrap: 'nowrap',
              justifyContent: 'center',
              alignItems: 'center'
            }}>
            {/* CHANNEL KNOBS - INLINE */}
            <div style={{
              display: 'flex',
              gap: '6px',
              padding: '4px 6px',
              background: 'rgba(0,0,0,0.3)',
              borderRadius: '4px',
              border: '1px solid rgba(255,165,0,0.4)',
              alignItems: 'center'
            }}>
              <div style={{ fontSize: '7px', color: '#ffa500', fontWeight: 'bold', writingMode: 'vertical-rl', transform: 'rotate(180deg)', letterSpacing: '1px' }}>
                {ta30CurrentChannel === 1 ? `CH1-${ta30Ch1Mode.toUpperCase()}` : `CH2-${ta30Ch2Mode.toUpperCase()}`}
              </div>
              {ta30CurrentChannel === 1 && (
                <>
                  <Knob label="GAIN" value={amp.params?.ch1_gain || 35} onChange={handleKnobChange('ch1_gain')} size={28} color="#ffa500" />
                  <Knob label="BASS" value={amp.params?.ch1_bass || 60} onChange={handleKnobChange('ch1_bass')} size={26} color="#e0e0e0" />
                  <Knob label="TREB" value={amp.params?.ch1_treble || 65} onChange={handleKnobChange('ch1_treble')} size={26} color="#e0e0e0" />
                  <Knob label="CUT" value={amp.params?.ch1_cut || 50} onChange={handleKnobChange('ch1_cut')} size={26} color="#e0e0e0" />
                  <Knob label="MSTR" value={amp.params?.ch1_master || 65} onChange={handleKnobChange('ch1_master')} size={28} color="#ffa500" />
                </>
              )}
              {ta30CurrentChannel === 2 && (
                <>
                  <Knob label="GAIN" value={amp.params?.ch2_gain || 70} onChange={handleKnobChange('ch2_gain')} size={28} color="#ffa500" />
                  <Knob label="BASS" value={amp.params?.ch2_bass || 58} onChange={handleKnobChange('ch2_bass')} size={26} color="#e0e0e0" />
                  <Knob label="MID" value={amp.params?.ch2_middle || 48} onChange={handleKnobChange('ch2_middle')} size={26} color="#e0e0e0" />
                  <Knob label="TREB" value={amp.params?.ch2_treble || 68} onChange={handleKnobChange('ch2_treble')} size={26} color="#e0e0e0" />
                  <Knob label="PRES" value={amp.params?.ch2_presence || 62} onChange={handleKnobChange('ch2_presence')} size={26} color="#e0e0e0" />
                  <Knob label="MSTR" value={amp.params?.ch2_master || 70} onChange={handleKnobChange('ch2_master')} size={28} color="#ffa500" />
                </>
              )}
            </div>
            
            {/* GLOBAL CONTROLS */}
            <div style={{
              display: 'flex',
              gap: '6px',
              padding: '4px 6px',
              background: 'rgba(0,0,0,0.3)',
              borderRadius: '4px',
              border: '1px solid rgba(255,165,0,0.4)'
            }}>
              <Knob label="OUTPUT" value={amp.params?.master || 70} onChange={handleKnobChange('master')} size={30} color="#ffa500" />
              <Knob label="REVERB" value={amp.params?.reverb || 0} onChange={handleKnobChange('reverb')} size={24} color="#e0e0e0" />
            </div>
            </div>
            
            {/* LINHA INFERIOR - CHANNEL + MODE + BACK PANEL */}
            <div style={{
              display: 'flex',
              flexDirection: 'row',
              gap: '5px',
              flexWrap: 'nowrap',
              justifyContent: 'center',
              alignItems: 'flex-start'
          }}>
            {/* CHANNEL SELECTOR */}
            <div style={{
              display: 'flex',
              flexDirection: 'row',
              gap: '3px',
              padding: '4px 6px',
              background: 'rgba(0,0,0,0.5)',
              borderRadius: '4px',
              border: '1px solid rgba(255,165,0,0.5)',
              alignItems: 'center'
            }}>
              <label style={{ fontSize: '7px', color: '#ffa500', fontWeight: 'bold', letterSpacing: '0.5px', marginRight: '3px' }}>CH</label>
                  <button 
                    onClick={() => onUpdate(amp.id, 'channel', 1)}
                    style={{
                  padding: '3px 8px',
                  background: ta30CurrentChannel === 1 ? 'linear-gradient(135deg, #ffa500 0%, #ff8c00 100%)' : 'rgba(0,0,0,0.7)',
                  border: '1px solid ' + (ta30CurrentChannel === 1 ? '#ffa500' : '#555'),
                  color: ta30CurrentChannel === 1 ? '#000' : '#ffa500',
                  borderRadius: '2px',
                      cursor: 'pointer',
                      fontWeight: 'bold',
                  fontSize: '7px',
                  position: 'relative'
                }}
              >
                1
                {ta30CurrentChannel === 1 && (
                  <div style={{
                    position: 'absolute',
                    top: '1px',
                    right: '1px',
                    width: '3px',
                    height: '3px',
                    borderRadius: '50%',
                    background: '#00ff00',
                    boxShadow: '0 0 6px #00ff00, 0 0 12px rgba(0,255,0,0.6)',
                    animation: 'pulse 1.5s infinite'
                  }}></div>
                )}
              </button>
                  <button 
                    onClick={() => onUpdate(amp.id, 'channel', 2)}
                    style={{
                  padding: '3px 8px',
                  background: ta30CurrentChannel === 2 ? 'linear-gradient(135deg, #ffa500 0%, #ff8c00 100%)' : 'rgba(0,0,0,0.7)',
                  border: '1px solid ' + (ta30CurrentChannel === 2 ? '#ffa500' : '#555'),
                  color: ta30CurrentChannel === 2 ? '#000' : '#ffa500',
                  borderRadius: '2px',
                      cursor: 'pointer',
                      fontWeight: 'bold',
                  fontSize: '7px',
                  position: 'relative'
                }}
              >
                2
                {ta30CurrentChannel === 2 && (
                  <div style={{
                    position: 'absolute',
                    top: '1px',
                    right: '1px',
                    width: '3px',
                    height: '3px',
                    borderRadius: '50%',
                    background: '#00ff00',
                    boxShadow: '0 0 6px #00ff00, 0 0 12px rgba(0,255,0,0.6)',
                    animation: 'pulse 1.5s infinite'
                  }}></div>
                )}
              </button>
            </div>
            
            {/* MODE SELECTOR */}
            <div style={{
              display: 'flex',
              flexDirection: 'row',
              gap: '3px',
              padding: '4px 6px',
              background: 'rgba(0,0,0,0.5)',
              borderRadius: '4px',
              border: '1px solid rgba(255,165,0,0.5)',
              alignItems: 'center'
            }}>
              <label style={{ fontSize: '7px', color: '#ffa500', fontWeight: 'bold', letterSpacing: '0.5px', marginRight: '2px' }}>MODE</label>
              {ta30CurrentChannel === 1 ? (
                <>
                  <button 
                    onClick={() => onUpdate(amp.id, 'mode', 'clean')}
                    style={{
                      padding: '3px 6px',
                      background: ta30Ch1Mode === 'clean' ? 'linear-gradient(135deg, #ffa500 0%, #ff8c00 100%)' : 'rgba(0,0,0,0.7)',
                      border: '1px solid ' + (ta30Ch1Mode === 'clean' ? '#ffa500' : '#555'),
                      color: ta30Ch1Mode === 'clean' ? '#000' : '#ffa500',
                      borderRadius: '2px',
                      cursor: 'pointer',
                      fontWeight: 'bold',
                      fontSize: '6px'
                    }}
                  >
                    CLN
                  </button>
                  <button 
                    onClick={() => onUpdate(amp.id, 'mode', 'edge')}
                    style={{
                      padding: '3px 6px',
                      background: ta30Ch1Mode === 'edge' ? 'linear-gradient(135deg, #ffa500 0%, #ff8c00 100%)' : 'rgba(0,0,0,0.7)',
                      border: '1px solid ' + (ta30Ch1Mode === 'edge' ? '#ffa500' : '#555'),
                      color: ta30Ch1Mode === 'edge' ? '#000' : '#ffa500',
                      borderRadius: '2px',
                      cursor: 'pointer',
                      fontWeight: 'bold',
                      fontSize: '6px'
                    }}
                  >
                    EDG
                  </button>
                </>
              ) : (
                <>
                  <button 
                    onClick={() => onUpdate(amp.id, 'mode', 'tweed')}
                    style={{
                      padding: '3px 5px',
                      background: ta30Ch2Mode === 'tweed' ? 'linear-gradient(135deg, #ffa500 0%, #ff8c00 100%)' : 'rgba(0,0,0,0.7)',
                      border: '1px solid ' + (ta30Ch2Mode === 'tweed' ? '#ffa500' : '#555'),
                      color: ta30Ch2Mode === 'tweed' ? '#000' : '#ffa500',
                      borderRadius: '2px',
                      cursor: 'pointer',
                      fontWeight: 'bold',
                      fontSize: '6px'
                    }}
                  >
                    TWD
                  </button>
                  <button 
                    onClick={() => onUpdate(amp.id, 'mode', 'hi1')}
                    style={{
                      padding: '3px 5px',
                      background: ta30Ch2Mode === 'hi1' ? 'linear-gradient(135deg, #ffa500 0%, #ff8c00 100%)' : 'rgba(0,0,0,0.7)',
                      border: '1px solid ' + (ta30Ch2Mode === 'hi1' ? '#ffa500' : '#555'),
                      color: ta30Ch2Mode === 'hi1' ? '#000' : '#ffa500',
                      borderRadius: '2px',
                      cursor: 'pointer',
                      fontWeight: 'bold',
                      fontSize: '6px'
                    }}
                  >
                    HI1
                  </button>
                  <button 
                    onClick={() => onUpdate(amp.id, 'mode', 'hi2')}
                    style={{
                      padding: '3px 5px',
                      background: ta30Ch2Mode === 'hi2' ? 'linear-gradient(135deg, #ffa500 0%, #ff8c00 100%)' : 'rgba(0,0,0,0.7)',
                      border: '1px solid ' + (ta30Ch2Mode === 'hi2' ? '#ffa500' : '#555'),
                      color: ta30Ch2Mode === 'hi2' ? '#000' : '#ffa500',
                      borderRadius: '2px',
                      cursor: 'pointer',
                      fontWeight: 'bold',
                      fontSize: '6px'
                    }}
                  >
                    HI2
                  </button>
                </>
              )}
            </div>
            
            {/* BACK PANEL CONTROLS */}
            <div style={{
              display: 'flex',
              flexDirection: 'row',
              gap: '4px',
              padding: '4px 6px',
              background: 'rgba(0,0,0,0.5)',
              borderRadius: '4px',
              border: '1px solid rgba(255,165,0,0.4)',
              alignItems: 'center',
              flexWrap: 'wrap'
            }}>
              <label style={{ fontSize: '6px', color: '#ffa500', fontWeight: 'bold', marginRight: '2px' }}>🔧 BACK</label>
              
              {/* VOICE */}
              <select 
                value={amp.params?.voice || 'american'}
                onChange={(e) => onUpdate(amp.id, 'voice', e.target.value)}
                style={{
                  padding: '1px 3px',
                  background: 'rgba(0,0,0,0.7)',
                  border: '1px solid #ffa500',
                  color: '#ffa500',
                  borderRadius: '2px',
                  fontSize: '7px',
                  fontWeight: 'bold'
                }}
              >
                <option value="american">AMER</option>
                <option value="british">BRIT</option>
              </select>
              
              {/* WATTAGE */}
              <select 
                value={amp.params?.wattage || 30}
                onChange={(e) => onUpdate(amp.id, 'wattage', parseInt(e.target.value))}
                style={{
                  padding: '1px 3px',
                  background: 'rgba(0,0,0,0.7)',
                  border: '1px solid #ffa500',
                  color: '#ffa500',
                  borderRadius: '2px',
                  fontSize: '7px',
                  fontWeight: 'bold'
                }}
              >
                <option value="5">5W</option>
                <option value="15">15W</option>
                <option value="30">30W</option>
              </select>
              
              {/* RECTIFIER */}
              <select 
                value={amp.params?.rectifier || 'silicon'}
                onChange={(e) => onUpdate(amp.id, 'rectifier', e.target.value)}
                style={{
                  padding: '1px 3px',
                  background: 'rgba(0,0,0,0.7)',
                  border: '1px solid #ffa500',
                  color: '#ffa500',
                  borderRadius: '2px',
                  fontSize: '7px',
                  fontWeight: 'bold'
                }}
              >
                <option value="silicon">SILI</option>
                <option value="tube">TUBE</option>
              </select>
              
              {/* GATE TOGGLE */}
              <div className="toggle-switch" style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
                <label style={{ fontSize: '6px', color: '#ffa500', fontWeight: 'bold' }}>GATE</label>
                <input 
                  type="checkbox" 
                  checked={amp.params?.gate || false}
                  onChange={(e) => onUpdate(amp.id, 'gate', e.target.checked)}
                  style={{ transform: 'scale(0.7)' }}
                />
              </div>
              
              {/* CABINET TOGGLE */}
              <div className="toggle-switch" style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
                <label style={{ fontSize: '6px', color: '#ffa500', fontWeight: 'bold' }}>CAB</label>
                <input 
                  type="checkbox" 
                  checked={amp.params?.cabinet_enabled !== false}
                  onChange={(e) => onUpdate(amp.id, 'cabinet_enabled', e.target.checked)}
                  style={{ transform: 'scale(0.7)' }}
                />
              </div>
            </div>
          </div>
        </div>
        );
      
      // ============================================
      // BAD CAT HOT CAT 30R - COMPLETE CONTROLS
      // ============================================
      case 'badcat_hotcat_controls':
        return (
          <div key="badcat_hotcat_controls" className="badcat-hotcat-full-controls" style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '4px',
            padding: '5px 6px',
            background: 'linear-gradient(135deg, #1a1a1a 0%, #0a0a0a 100%)',
            borderRadius: '4px',
            border: '2px solid #d4af37',
            maxWidth: '850px',
            alignItems: 'center'
          }}>
            {/* LINHA SUPERIOR - KNOBS */}
            <div style={{
              display: 'flex',
              flexDirection: 'row',
              gap: '5px',
              flexWrap: 'nowrap',
              justifyContent: 'center',
              alignItems: 'center'
            }}>
            {/* GAIN + VOLUME */}
            <div style={{
              display: 'flex',
              gap: '6px',
              padding: '4px 6px',
              background: 'rgba(0,0,0,0.3)',
              borderRadius: '4px',
              border: '1px solid rgba(212,175,55,0.3)'
            }}>
                <Knob
                  label="GAIN"
                  value={amp.params?.gain || 55}
                  onChange={handleKnobChange('gain')}
                size={28}
                color="#d4af37"
                />
                <Knob
                label={amp.params?.channel === 1 ? "CH1" : "CH2"}
                  value={amp.params?.channel === 1 ? (amp.params?.ch1_volume || 60) : (amp.params?.ch2_volume || 60)}
                  onChange={handleKnobChange(amp.params?.channel === 1 ? 'ch1_volume' : 'ch2_volume')}
                size={28}
                color="#d4af37"
                />
            </div>

            {/* TONE STACK */}
            <div style={{
              display: 'flex',
              gap: '6px',
              padding: '4px 6px',
              background: 'rgba(0,0,0,0.3)',
              borderRadius: '4px',
              border: '1px solid rgba(212,175,55,0.3)'
            }}>
              <Knob label="BASS" value={amp.params?.bass || 50} onChange={handleKnobChange('bass')} size={26} color="#d4af37" />
              <Knob label="MID" value={amp.params?.middle || 55} onChange={handleKnobChange('middle')} size={26} color="#d4af37" />
              <Knob label="TREB" value={amp.params?.treble || 60} onChange={handleKnobChange('treble')} size={26} color="#d4af37" />
              <Knob label="CUT" value={amp.params?.cut || 50} onChange={handleKnobChange('cut')} size={26} color="#d4af37" />
              </div>

            {/* FOCUS */}
            <div style={{
              display: 'flex',
              gap: '4px',
              padding: '4px 6px',
              background: 'rgba(0,0,0,0.4)',
              borderRadius: '4px',
              border: '1px solid rgba(255,170,0,0.3)',
              alignItems: 'center'
            }}>
              <Knob label="FOCUS" value={amp.params?.focus || 40} onChange={handleKnobChange('focus')} size={24} color="#ffaa00" />
              </div>

            {/* REVERB */}
            <div style={{
              display: 'flex',
              gap: '6px',
              padding: '4px 6px',
              background: 'rgba(0,0,0,0.3)',
              borderRadius: '4px',
              border: '1px solid rgba(100,150,200,0.3)',
              alignItems: 'center'
            }}>
              <Knob label="REV" value={amp.params?.reverb || 30} onChange={handleKnobChange('reverb')} size={26} color="#6496c8" />
              <Knob label="TONE" value={amp.params?.reverb_tone || 60} onChange={handleKnobChange('reverb_tone')} size={24} color="#6496c8" />
              <Knob label="MIX" value={amp.params?.reverb_mix || 25} onChange={handleKnobChange('reverb_mix')} size={24} color="#6496c8" />
              </div>
            
            {/* MASTERS */}
            <div style={{
              display: 'flex',
              gap: '6px',
              padding: '4px 6px',
              background: 'rgba(0,0,0,0.3)',
              borderRadius: '4px',
              border: '1px solid rgba(212,175,55,0.3)',
              alignItems: 'center'
            }}>
              <Knob label="K-M" value={amp.params?.k_master || 70} onChange={handleKnobChange('k_master')} size={28} color="#d4af37" />
              <Knob label="OUT" value={amp.params?.output_level || 100} onChange={handleKnobChange('output_level')} size={26} color="#d4af37" />
              <Knob label="MSTR" value={amp.params?.master || 70} onChange={handleKnobChange('master')} size={28} color="#d4af37" />
              </div>
            </div>

            {/* LINHA INFERIOR - CHANNEL + MODE + BITE + CABINET */}
            <div style={{
              display: 'flex',
              flexDirection: 'row',
              gap: '5px',
              flexWrap: 'nowrap',
              justifyContent: 'center',
              alignItems: 'center'
            }}>
            {/* CHANNEL SELECTOR */}
            <div style={{
              display: 'flex',
              flexDirection: 'row',
              gap: '3px',
              padding: '4px 6px',
              background: 'rgba(0,0,0,0.5)',
              borderRadius: '4px',
              border: '1px solid rgba(212,175,55,0.4)',
              alignItems: 'center'
            }}>
              <label style={{ fontSize: '6px', color: '#d4af37', fontWeight: 'bold', marginRight: '3px' }}>CH</label>
              <button 
                onClick={() => onUpdate(amp.id, 'channel', 1)}
                style={{
                  padding: '3px 8px',
                  background: (amp.params?.channel || 1) === 1 ? 'linear-gradient(135deg, #d4af37 0%, #b8941f 100%)' : 'rgba(0,0,0,0.7)',
                  border: '1px solid ' + ((amp.params?.channel || 1) === 1 ? '#d4af37' : '#555'),
                  color: (amp.params?.channel || 1) === 1 ? '#000' : '#d4af37',
                  borderRadius: '2px',
                  cursor: 'pointer',
                  fontWeight: 'bold',
                  fontSize: '7px'
                }}
              >1</button>
              <button 
                onClick={() => onUpdate(amp.id, 'channel', 2)}
                style={{
                  padding: '3px 8px',
                  background: (amp.params?.channel || 1) === 2 ? 'linear-gradient(135deg, #d4af37 0%, #b8941f 100%)' : 'rgba(0,0,0,0.7)',
                  border: '1px solid ' + ((amp.params?.channel || 1) === 2 ? '#d4af37' : '#555'),
                  color: (amp.params?.channel || 1) === 2 ? '#000' : '#d4af37',
                  borderRadius: '2px',
                  cursor: 'pointer',
                  fontWeight: 'bold',
                  fontSize: '7px'
                }}
              >2</button>
              </div>

            {/* MODE (apenas para CH2) */}
            {amp.params?.channel === 2 && (
              <div style={{
                display: 'flex',
                flexDirection: 'row',
                gap: '3px',
                padding: '4px 6px',
                background: 'rgba(0,0,0,0.5)',
                borderRadius: '4px',
                border: '1px solid rgba(255,170,0,0.3)',
                alignItems: 'center'
              }}>
                <label style={{ fontSize: '6px', color: '#ffaa00', fontWeight: 'bold', marginRight: '2px' }}>MODE</label>
                <select 
                  value={amp.params?.ch2_mode || 'EF86'}
                  onChange={(e) => onUpdate(amp.id, 'ch2_mode', e.target.value)}
                  style={{
                    padding: '1px 3px',
                    background: '#2a2a2a',
                    color: '#ffaa00',
                    border: '1px solid #ffaa00',
                    borderRadius: '2px',
                    fontWeight: 'bold',
                    fontSize: '7px'
                  }}
                >
                  <option value="EF86">EF86</option>
                  <option value="ECC83">ECC83</option>
                </select>
              </div>
            )}

            {/* BITE */}
            <div style={{
              display: 'flex',
              flexDirection: 'row',
              gap: '3px',
              padding: '4px 6px',
              background: 'rgba(0,0,0,0.4)',
              borderRadius: '4px',
              border: '1px solid rgba(255,170,0,0.3)',
              alignItems: 'center'
            }}>
              <label style={{ fontSize: '6px', color: '#ffaa00', fontWeight: 'bold', marginRight: '2px' }}>BITE</label>
              <select 
                value={amp.params?.bite !== undefined ? amp.params.bite : 1}
                onChange={(e) => onUpdate(amp.id, 'bite', parseInt(e.target.value))}
                style={{
                  padding: '1px 3px',
                  background: '#2a2a2a',
                  color: '#ffaa00',
                  border: '1px solid #ffaa00',
                  borderRadius: '2px',
                  fontWeight: 'bold',
                  fontSize: '7px'
                }}
              >
                <option value={0}>-</option>
                <option value={1}>+</option>
                <option value={2}>++</option>
              </select>
              </div>

            {/* CABINET TOGGLE */}
            <div className="toggle-switch" style={{ display: 'flex', alignItems: 'center', gap: '2px', padding: '4px 6px', background: 'rgba(0,0,0,0.3)', borderRadius: '4px', border: '1px solid rgba(212,175,55,0.3)' }}>
              <label style={{ fontSize: '6px', color: '#d4af37', fontWeight: 'bold' }}>CAB</label>
              <input 
                type="checkbox" 
                checked={amp.params?.cabinet_enabled !== false}
                onChange={(e) => onUpdate(amp.id, 'cabinet_enabled', e.target.checked)}
                style={{ transform: 'scale(0.7)' }}
                />
              </div>
              </div>
            </div>
        );
      
      // ============================================
      // PEAVEY 5150 - COMPLETE CONTROLS
      // ============================================
      case 'peavey_5150_controls':
        const peaveyChannel = amp.params?.channel || 1; // 0=Rhythm, 1=Lead
        const peaveyPreParam = peaveyChannel === 0 ? 'rhythm_pre_gain' : 'lead_pre_gain';
        const peaveyPostParam = peaveyChannel === 0 ? 'rhythm_post_gain' : 'lead_post_gain';
        
        return (
          <div key="peavey_5150_controls" className="peavey-5150-full-controls" style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '4px',
            padding: '5px 6px',
            background: 'repeating-radial-gradient(circle at 2px 2px, rgba(0,0,0,0.5) 0px, transparent 1px), linear-gradient(135deg, #484848 0%, #333333 100%)',
            backgroundSize: '4px 4px, 100% 100%',
            borderRadius: '4px',
            border: '2px solid #2a2a2a',
            boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.1), inset 0 2px 4px rgba(0,0,0,0.4)',
            maxWidth: '800px',
            alignItems: 'center'
          }}>
            {/* LINHA SUPERIOR - KNOBS */}
            <div style={{
              display: 'flex',
              flexDirection: 'row',
              gap: '5px',
              flexWrap: 'nowrap',
              justifyContent: 'center',
              alignItems: 'center'
            }}>
            {/* PREGAIN + POSTGAIN - Dinâmicos baseados no canal ativo */}
            <div style={{
              display: 'flex',
              gap: '6px',
              padding: '4px 6px',
              background: 'rgba(0,0,0,0.3)',
              borderRadius: '4px',
              border: '1px solid rgba(80,80,80,0.4)'
            }}>
              <Knob label="PRE" value={amp.params?.[peaveyPreParam] || 50} onChange={handleKnobChange(peaveyPreParam)} size={26} color="#ffffff" />
              <Knob label="POST" value={amp.params?.[peaveyPostParam] || 50} onChange={handleKnobChange(peaveyPostParam)} size={26} color="#ffffff" />
              </div>

            {/* GAIN + TONE STACK */}
            <div style={{
              display: 'flex',
              gap: '6px',
              padding: '4px 6px',
              background: 'rgba(0,0,0,0.3)',
              borderRadius: '4px',
              border: '1px solid rgba(80,80,80,0.4)'
            }}>
              <Knob label="GAIN" value={amp.params?.gain || 50} onChange={handleKnobChange('gain')} size={28} color="#ffffff" />
              <Knob label="BASS" value={amp.params?.bass || 50} onChange={handleKnobChange('bass')} size={26} color="#ffffff" />
              <Knob label="MID" value={amp.params?.mid || 50} onChange={handleKnobChange('mid')} size={26} color="#ffffff" />
              <Knob label="TREB" value={amp.params?.treble || 50} onChange={handleKnobChange('treble')} size={26} color="#ffffff" />
              </div>

            {/* PRESENCE + RESONANCE */}
            <div style={{
              display: 'flex',
              gap: '6px',
              padding: '4px 6px',
              background: 'rgba(0,0,0,0.3)',
              borderRadius: '4px',
              border: '1px solid rgba(80,80,80,0.4)'
            }}>
              <Knob label="PRES" value={amp.params?.presence || 50} onChange={handleKnobChange('presence')} size={26} color="#ffffff" />
              <Knob label="RESON" value={amp.params?.resonance || 50} onChange={handleKnobChange('resonance')} size={26} color="#ffffff" />
              </div>
            </div>

            {/* LINHA INFERIOR - CHANNEL SELECTOR + MASTER + SWITCHES */}
            <div style={{
              display: 'flex',
              flexDirection: 'row',
              gap: '5px',
              flexWrap: 'nowrap',
              justifyContent: 'center',
              alignItems: 'center'
            }}>
            {/* CHANNEL SELECTOR */}
            <div style={{
              display: 'flex',
              flexDirection: 'row',
              gap: '3px',
              padding: '4px 6px',
              background: 'rgba(0,0,0,0.5)',
              borderRadius: '4px',
              border: '1px solid rgba(80,80,80,0.4)',
              alignItems: 'center',
              position: 'relative'
            }}>
              <label style={{ fontSize: '6px', color: '#ffffff', fontWeight: 'bold', marginRight: '3px' }}>CH</label>
              <button 
                onClick={() => onUpdate(amp.id, 'channel', 0)}
                style={{
                  padding: '3px 8px',
                  background: (amp.params?.channel || 1) === 0 ? 'linear-gradient(135deg, #c0c0c0 0%, #a0a0a0 100%)' : 'rgba(0,0,0,0.7)',
                  border: '1px solid ' + ((amp.params?.channel || 1) === 0 ? '#c0c0c0' : '#555'),
                  color: (amp.params?.channel || 1) === 0 ? '#000' : '#ffffff',
                  borderRadius: '2px',
                  cursor: 'pointer',
                  fontWeight: 'bold',
                  fontSize: '7px',
                  position: 'relative'
                }}
              >
                R
                {(amp.params?.channel || 1) === 0 && (
                  <div style={{
                    position: 'absolute',
                    top: '1px',
                    right: '1px',
                    width: '3px',
                    height: '3px',
                    borderRadius: '50%',
                    background: '#ff0000',
                    boxShadow: '0 0 6px #ff0000, 0 0 12px rgba(255,0,0,0.6)',
                    animation: 'pulse 1.5s infinite'
                  }}></div>
                )}
              </button>
              <button 
                onClick={() => onUpdate(amp.id, 'channel', 1)}
                style={{
                  padding: '3px 8px',
                  background: (amp.params?.channel || 1) === 1 ? 'linear-gradient(135deg, #c0c0c0 0%, #a0a0a0 100%)' : 'rgba(0,0,0,0.7)',
                  border: '1px solid ' + ((amp.params?.channel || 1) === 1 ? '#c0c0c0' : '#555'),
                  color: (amp.params?.channel || 1) === 1 ? '#000' : '#ffffff',
                  borderRadius: '2px',
                  cursor: 'pointer',
                  fontWeight: 'bold',
                  fontSize: '7px',
                  position: 'relative'
                }}
              >
                L
                {(amp.params?.channel || 1) === 1 && (
                  <div style={{
                    position: 'absolute',
                    top: '1px',
                    right: '1px',
                    width: '3px',
                    height: '3px',
                    borderRadius: '50%',
                    background: '#ff0000',
                    boxShadow: '0 0 6px #ff0000, 0 0 12px rgba(255,0,0,0.6)',
                    animation: 'pulse 1.5s infinite'
                  }}></div>
                )}
              </button>
            </div>

            {/* MASTER + SWITCHES HORIZONTAL */}
            <div style={{
              display: 'flex',
              flexDirection: 'row',
              gap: '4px',
              padding: '4px 6px',
              background: 'rgba(0,0,0,0.3)',
              borderRadius: '4px',
              border: '1px solid rgba(80,80,80,0.4)',
              alignItems: 'center'
            }}>
              <Knob label="MASTER" value={amp.params?.master || 70} onChange={handleKnobChange('master')} size={28} color="#ffffff" />
              
              <div className="toggle-switch" style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
                <label style={{ fontSize: '6px', color: '#ffffff', fontWeight: 'bold' }}>BRT</label>
                  <input 
                    type="checkbox" 
                  checked={amp.params?.bright || false}
                  onChange={(e) => onUpdate(amp.id, 'bright', e.target.checked)}
                  style={{ transform: 'scale(0.7)' }}
                  />
                </div>
              
              <div className="toggle-switch" style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
                <label style={{ fontSize: '6px', color: '#ffffff', fontWeight: 'bold' }}>GT</label>
                <input 
                  type="checkbox" 
                  checked={amp.params?.gate || false}
                  onChange={(e) => onUpdate(amp.id, 'gate', e.target.checked)}
                  style={{ transform: 'scale(0.7)' }}
                />
              </div>
              
              <div className="toggle-switch" style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
                <label style={{ fontSize: '6px', color: '#ffffff', fontWeight: 'bold' }}>CR</label>
                <input 
                  type="checkbox" 
                  checked={amp.params?.crunch || false}
                  onChange={(e) => onUpdate(amp.id, 'crunch', e.target.checked)}
                  style={{ transform: 'scale(0.7)' }}
                />
              </div>
              
              <select 
                value={amp.params?.speaker_impedance || 16}
                onChange={(e) => onUpdate(amp.id, 'speaker_impedance', parseInt(e.target.value))}
                style={{
                  padding: '1px 3px',
                  background: '#1a1a1a',
                  color: '#ffffff',
                  border: '1px solid #555555',
                  borderRadius: '2px',
                  fontWeight: 'bold',
                  fontSize: '6px'
                }}
              >
                <option value={4}>4Ω</option>
                <option value={8}>8Ω</option>
                <option value={16}>16Ω</option>
              </select>
            </div>
            </div>
          </div>
        );
      
      // ============================================
      // HIWATT DR103 - COMPLETE CONTROLS
      // ============================================
      case 'hiwatt_dr103_controls':
        return (
          <div key="hiwatt_dr103_controls" className="hiwatt-dr103-full-controls" style={{
            display: 'flex',
            flexDirection: 'row',
            gap: '10px',
            padding: '8px 12px',
            background: 'linear-gradient(135deg, #1a1a1a 0%, #0a0a0a 100%)',
            borderRadius: '6px',
            border: '2px solid #c0c0c0',
            flexWrap: 'wrap',
            justifyContent: 'center',
            alignItems: 'center'
          }}>
            {/* VOLUME CONTROLS - Compacto */}
            <div style={{
              display: 'flex',
              gap: '10px',
              padding: '6px 8px',
              background: 'rgba(0,0,0,0.5)',
              borderRadius: '6px',
              border: '1px solid rgba(192,192,192,0.3)'
            }}>
                <Knob
                  label="NORMAL VOL"
                  value={amp.params?.volume_normal || 50}
                  onChange={handleKnobChange('volume_normal')}
                size={34}
                color="#ffffff"
                />
                <Knob
                  label="BRIGHT VOL"
                  value={amp.params?.volume_brilliant || 50}
                  onChange={handleKnobChange('volume_brilliant')}
                size={34}
                color="#ffffff"
                />
            </div>

            {/* TONE CONTROLS - Horizontal compacto */}
            <div style={{
              display: 'flex',
              gap: '10px',
              padding: '6px 8px',
              background: 'rgba(0,0,0,0.5)',
              borderRadius: '6px',
              border: '1px solid rgba(192,192,192,0.3)'
            }}>
                <Knob
                  label="BASS"
                  value={amp.params?.bass || 50}
                  onChange={handleKnobChange('bass')}
                size={32}
                color="#ffffff"
                />
                <Knob
                  label="TREBLE"
                  value={amp.params?.treble || 50}
                  onChange={handleKnobChange('treble')}
                size={32}
                color="#ffffff"
                />
                <Knob
                  label="MIDDLE"
                  value={amp.params?.middle || 50}
                  onChange={handleKnobChange('middle')}
                size={32}
                color="#ffffff"
                />
                <Knob
                  label="PRESENCE"
                  value={amp.params?.presence || 50}
                  onChange={handleKnobChange('presence')}
                size={32}
                color="#ffffff"
                />
            </div>

            {/* MASTER VOLUME & CONTROLS */}
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '6px',
              padding: '6px 8px',
              background: 'rgba(0,0,0,0.5)',
              borderRadius: '6px',
              border: '1px solid rgba(192,192,192,0.3)',
              alignItems: 'center'
            }}>
                <Knob
                  label="MASTER VOL"
                  value={amp.params?.master || 70}
                  onChange={handleKnobChange('master')}
                size={38}
                color="#c0c0c0"
                />
              
              {/* STANDBY indicator and CABINET toggle */}
              <div style={{
                display: 'flex',
                gap: '10px',
                alignItems: 'center'
              }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}>
                  <div style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    background: amp.params?.cabinet_enabled !== false ? '#ff3333' : '#330000',
                    boxShadow: amp.params?.cabinet_enabled !== false ? '0 0 8px #ff3333' : 'none',
                    border: '1px solid #000'
                  }}></div>
                  <label style={{ fontSize: '7px', color: '#ffffff', fontWeight: 'bold', textTransform: 'uppercase' }}>STBY</label>
                </div>
                
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}>
                  <label style={{ fontSize: '7px', color: '#ffffff', fontWeight: 'bold', textTransform: 'uppercase' }}>CAB</label>
                  <div className="toggle-switch">
                    <label style={{ fontSize: '7px' }}>{amp.params?.cabinet_enabled !== false ? 'ON' : 'OFF'}</label>
                    <input 
                      type="checkbox" 
                      checked={amp.params?.cabinet_enabled !== false}
                      onChange={(e) => onUpdate(amp.id, 'cabinet_enabled', e.target.checked)}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      
      // ============================================
      // BOGNER ECSTASY - COMPLETE CONTROLS
      // ============================================
      case 'bogner_ecstasy_controls':
        const bognerChannel = amp.params?.channel || 2;
        return (
          <div key="bogner_ecstasy_controls" className="bogner-ecstasy-full-controls" style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '5px',
            padding: '6px 8px',
            background: 'repeating-radial-gradient(circle at 2px 2px, rgba(40,40,40,0.8) 0px, transparent 1px), linear-gradient(135deg, #3a3a3a 0%, #2a2a2a 100%)',
            backgroundSize: '4px 4px, 100% 100%',
            borderRadius: '4px',
            border: '2px solid #1a1a1a',
            boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.1), inset 0 2px 4px rgba(0,0,0,0.5)',
            maxWidth: '850px',
            alignItems: 'center'
          }}>
            {/* LINHA SUPERIOR - KNOBS PRINCIPAIS */}
            <div style={{
              display: 'flex',
              flexDirection: 'row',
              gap: '5px',
              flexWrap: 'nowrap',
              justifyContent: 'center',
              alignItems: 'center'
            }}>
              {/* GAIN + VOLUME DO CANAL */}
              <div style={{
                display: 'flex',
                gap: '6px',
                padding: '4px 6px',
                background: 'rgba(0,0,0,0.4)',
                borderRadius: '4px',
                border: '1px solid rgba(212,175,55,0.3)'
              }}>
                <Knob 
                  label={`CH${bognerChannel} GAIN`} 
                  value={amp.params?.[`ch${bognerChannel}_gain`] || 50} 
                  onChange={handleKnobChange(`ch${bognerChannel}_gain`)} 
                  size={28} 
                  color="#c0c0c0" 
                />
                <Knob 
                  label={`CH${bognerChannel} VOL`} 
                  value={amp.params?.[`ch${bognerChannel}_master`] || 70} 
                  onChange={handleKnobChange(`ch${bognerChannel}_master`)} 
                  size={28} 
                  color="#c0c0c0" 
                />
              </div>

              {/* TONE STACK */}
              <div style={{
                display: 'flex',
                gap: '6px',
                padding: '4px 6px',
                background: 'rgba(0,0,0,0.4)',
                borderRadius: '4px',
                border: '1px solid rgba(212,175,55,0.3)'
              }}>
                <Knob label="BASS" value={amp.params?.bass || 60} onChange={handleKnobChange('bass')} size={26} color="#c0c0c0" />
                <Knob label="MID" value={amp.params?.middle || 50} onChange={handleKnobChange('middle')} size={26} color="#c0c0c0" />
                <Knob label="TREB" value={amp.params?.treble || 65} onChange={handleKnobChange('treble')} size={26} color="#c0c0c0" />
            </div>

              {/* PRESENCE + DEPTH + MASTER */}
            <div style={{ 
              display: 'flex', 
                gap: '6px',
                padding: '4px 6px',
              background: 'rgba(0,0,0,0.4)',
                borderRadius: '4px',
                border: '1px solid rgba(212,175,55,0.3)'
              }}>
                <Knob label="PRES" value={amp.params?.presence || 60} onChange={handleKnobChange('presence')} size={26} color="#c0c0c0" />
                <Knob label="DEPTH" value={amp.params?.depth || 50} onChange={handleKnobChange('depth')} size={26} color="#c0c0c0" />
                <Knob label="MSTR" value={amp.params?.master || 70} onChange={handleKnobChange('master')} size={28} color="#d4af37" />
              </div>
            </div>

            {/* LINHA INFERIOR - CHANNEL SELECTOR COM LEDS + SWITCHES */}
            <div style={{
              display: 'flex',
              flexDirection: 'row',
              gap: '6px',
              flexWrap: 'nowrap',
              justifyContent: 'center',
              alignItems: 'center'
            }}>
              {/* CHANNEL SELECTOR COM LEDs FÍSICOS */}
              <div style={{
                display: 'flex',
                flexDirection: 'row',
                gap: '4px',
                padding: '4px 8px',
                background: 'rgba(0,0,0,0.6)',
                borderRadius: '4px',
                border: '1px solid rgba(212,175,55,0.4)',
                alignItems: 'center'
              }}>
                <label style={{ fontSize: '8px', color: '#d4af37', fontWeight: 'bold', marginRight: '4px' }}>CHANNEL</label>
                
                {/* Clean LED + Button */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
                  <div style={{
                    width: '9px',
                    height: '9px',
                    borderRadius: '50%',
                    background: bognerChannel === 1 ? 'radial-gradient(circle, #00ff00 0%, #00aa00 100%)' : '#1a1a1a',
                    boxShadow: bognerChannel === 1 ? '0 0 10px #00ff00, inset 0 1px 2px rgba(255,255,255,0.3)' : 'inset 0 1px 2px rgba(0,0,0,0.8)',
                    border: '1px solid ' + (bognerChannel === 1 ? '#00ff00' : '#0a0a0a')
                  }}></div>
              <button 
                onClick={() => onUpdate(amp.id, 'channel', 1)}
                style={{
                      padding: '4px 8px',
                      background: bognerChannel === 1 ? 'linear-gradient(135deg, #c0c0c0 0%, #a0a0a0 100%)' : 'rgba(0,0,0,0.7)',
                      border: '1px solid ' + (bognerChannel === 1 ? '#c0c0c0' : '#555'),
                      color: bognerChannel === 1 ? '#000' : '#c0c0c0',
                      borderRadius: '2px',
                  cursor: 'pointer',
                  fontWeight: 'bold',
                      fontSize: '9px',
                  textTransform: 'uppercase',
                      transition: 'all 0.2s',
                      boxShadow: bognerChannel === 1 ? 'inset 0 1px 0 rgba(255,255,255,0.4)' : 'none'
                    }}
                  >1</button>
                </div>

                {/* Lead LED + Button */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
                  <div style={{
                    width: '9px',
                    height: '9px',
                    borderRadius: '50%',
                    background: bognerChannel === 2 ? 'radial-gradient(circle, #ffd700 0%, #b8941f 100%)' : '#1a1a1a',
                    boxShadow: bognerChannel === 2 ? '0 0 10px #ffd700, inset 0 1px 2px rgba(255,255,255,0.3)' : 'inset 0 1px 2px rgba(0,0,0,0.8)',
                    border: '1px solid ' + (bognerChannel === 2 ? '#ffd700' : '#0a0a0a')
                  }}></div>
              <button 
                onClick={() => onUpdate(amp.id, 'channel', 2)}
                style={{
                      padding: '4px 8px',
                      background: bognerChannel === 2 ? 'linear-gradient(135deg, #c0c0c0 0%, #a0a0a0 100%)' : 'rgba(0,0,0,0.7)',
                      border: '1px solid ' + (bognerChannel === 2 ? '#c0c0c0' : '#555'),
                      color: bognerChannel === 2 ? '#000' : '#c0c0c0',
                      borderRadius: '2px',
                  cursor: 'pointer',
                  fontWeight: 'bold',
                      fontSize: '9px',
                  textTransform: 'uppercase',
                      transition: 'all 0.2s',
                      boxShadow: bognerChannel === 2 ? 'inset 0 1px 0 rgba(255,255,255,0.4)' : 'none'
                    }}
                  >2</button>
                </div>

                {/* Ultra LED + Button */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
                  <div style={{
                    width: '9px',
                    height: '9px',
                    borderRadius: '50%',
                    background: bognerChannel === 3 ? 'radial-gradient(circle, #ff0000 0%, #aa0000 100%)' : '#1a1a1a',
                    boxShadow: bognerChannel === 3 ? '0 0 10px #ff0000, inset 0 1px 2px rgba(255,255,255,0.3)' : 'inset 0 1px 2px rgba(0,0,0,0.8)',
                    border: '1px solid ' + (bognerChannel === 3 ? '#ff0000' : '#0a0a0a')
                  }}></div>
              <button 
                onClick={() => onUpdate(amp.id, 'channel', 3)}
                style={{
                      padding: '4px 8px',
                      background: bognerChannel === 3 ? 'linear-gradient(135deg, #c0c0c0 0%, #a0a0a0 100%)' : 'rgba(0,0,0,0.7)',
                      border: '1px solid ' + (bognerChannel === 3 ? '#c0c0c0' : '#555'),
                      color: bognerChannel === 3 ? '#000' : '#c0c0c0',
                      borderRadius: '2px',
                  cursor: 'pointer',
                  fontWeight: 'bold',
                      fontSize: '9px',
                  textTransform: 'uppercase',
                      transition: 'all 0.2s',
                      boxShadow: bognerChannel === 3 ? 'inset 0 1px 0 rgba(255,255,255,0.4)' : 'none'
                    }}
                  >3</button>
              </div>
            </div>

              {/* SWITCHES COMPACTOS */}
            <div style={{
              display: 'flex',
                gap: '4px',
                padding: '4px 6px',
                background: 'rgba(0,0,0,0.6)',
                borderRadius: '4px',
                border: '1px solid rgba(212,175,55,0.4)',
                alignItems: 'center'
            }}>
              {/* PRE-EQ */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', alignItems: 'center' }}>
                  <label style={{ fontSize: '7px', color: '#d4af37', fontWeight: 'bold' }}>PRE-EQ</label>
                <select 
                  value={amp.params?.pre_eq || 'N'}
                  onChange={(e) => onUpdate(amp.id, 'pre_eq', e.target.value)}
                  style={{
                      padding: '3px 5px',
                      background: 'rgba(0,0,0,0.8)',
                      border: '1px solid #c0c0c0',
                      color: '#c0c0c0',
                      borderRadius: '2px',
                      fontSize: '9px',
                    fontWeight: 'bold',
                    cursor: 'pointer'
                  }}
                >
                    <option value="B1">B1</option>
                    <option value="N">N</option>
                    <option value="B2">B2</option>
                </select>
              </div>

              {/* BRIGHT */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', alignItems: 'center' }}>
                  <label style={{ fontSize: '7px', color: '#d4af37', fontWeight: 'bold' }}>BRT</label>
                <select 
                  value={amp.params?.bright || 0}
                  onChange={(e) => onUpdate(amp.id, 'bright', parseInt(e.target.value))}
                  style={{
                      padding: '3px 5px',
                      background: 'rgba(0,0,0,0.8)',
                      border: '1px solid #c0c0c0',
                      color: '#c0c0c0',
                      borderRadius: '2px',
                      fontSize: '9px',
                    fontWeight: 'bold',
                    cursor: 'pointer'
                  }}
                >
                  <option value={0}>OFF</option>
                  <option value={1}>MID</option>
                  <option value={2}>HI</option>
                </select>
              </div>

              {/* GAIN SWITCH */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', alignItems: 'center' }}>
                  <label style={{ fontSize: '7px', color: '#d4af37', fontWeight: 'bold' }}>GAIN</label>
                <select 
                  value={amp.params?.gain_switch || 'H'}
                  onChange={(e) => onUpdate(amp.id, 'gain_switch', e.target.value)}
                  style={{
                      padding: '3px 5px',
                      background: 'rgba(0,0,0,0.8)',
                      border: '1px solid #c0c0c0',
                      color: '#c0c0c0',
                      borderRadius: '2px',
                      fontSize: '9px',
                    fontWeight: 'bold',
                    cursor: 'pointer'
                  }}
                >
                    <option value="H">H</option>
                    <option value="L">L</option>
                </select>
              </div>

              {/* EXCURSION */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', alignItems: 'center' }}>
                  <label style={{ fontSize: '7px', color: '#d4af37', fontWeight: 'bold' }}>EXCUR</label>
                <select 
                  value={amp.params?.excursion || 'M'}
                  onChange={(e) => onUpdate(amp.id, 'excursion', e.target.value)}
                  style={{
                      padding: '3px 5px',
                      background: 'rgba(0,0,0,0.8)',
                      border: '1px solid #c0c0c0',
                      color: '#c0c0c0',
                      borderRadius: '2px',
                      fontSize: '9px',
                    fontWeight: 'bold',
                    cursor: 'pointer'
                  }}
                >
                    <option value="T">T</option>
                    <option value="M">M</option>
                    <option value="L">L</option>
                </select>
            </div>

              {/* STRUCTURE */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', alignItems: 'center' }}>
                  <label style={{ fontSize: '7px', color: '#d4af37', fontWeight: 'bold' }}>STRUC</label>
                <select 
                  value={amp.params?.structure || 'New'}
                  onChange={(e) => onUpdate(amp.id, 'structure', e.target.value)}
                  style={{
                      padding: '3px 5px',
                      background: 'rgba(0,0,0,0.8)',
                      border: '1px solid #c0c0c0',
                      color: '#c0c0c0',
                      borderRadius: '2px',
                      fontSize: '9px',
                    fontWeight: 'bold',
                    cursor: 'pointer'
                  }}
                >
                    <option value="Old">OLD</option>
                    <option value="New">NEW</option>
                </select>
                </div>
              </div>

              {/* BOOST + VARIAC */}
              <div style={{
                display: 'flex',
                gap: '4px',
                padding: '4px 6px',
                background: 'rgba(0,0,0,0.6)',
                borderRadius: '4px',
                border: '1px solid rgba(212,175,55,0.4)',
                alignItems: 'center'
              }}>
                <button
                  onClick={() => onUpdate(amp.id, `boost${bognerChannel}`, !amp.params?.[`boost${bognerChannel}`])}
                  style={{
                    padding: '5px 10px',
                    background: amp.params?.[`boost${bognerChannel}`] ? 'linear-gradient(135deg, #d4af37 0%, #b8941f 100%)' : 'rgba(0,0,0,0.7)',
                    border: '1px solid ' + (amp.params?.[`boost${bognerChannel}`] ? '#d4af37' : '#555'),
                    color: amp.params?.[`boost${bognerChannel}`] ? '#000' : '#d4af37',
                    borderRadius: '2px',
                    cursor: 'pointer',
                    fontWeight: 'bold',
                    fontSize: '9px',
                    textTransform: 'uppercase',
                    transition: 'all 0.2s',
                    boxShadow: amp.params?.[`boost${bognerChannel}`] ? '0 0 6px rgba(212,175,55,0.6), inset 0 1px 0 rgba(255,255,255,0.3)' : 'none'
                  }}
                >BOOST</button>
                
                <button
                  onClick={() => onUpdate(amp.id, 'variac', !amp.params?.variac)}
                  style={{
                    padding: '5px 10px',
                    background: amp.params?.variac ? 'linear-gradient(135deg, #c0c0c0 0%, #a0a0a0 100%)' : 'rgba(0,0,0,0.7)',
                    border: '1px solid ' + (amp.params?.variac ? '#c0c0c0' : '#555'),
                    color: amp.params?.variac ? '#000' : '#c0c0c0',
                    borderRadius: '2px',
                    cursor: 'pointer',
                    fontWeight: 'bold',
                    fontSize: '9px',
                    textTransform: 'uppercase',
                    transition: 'all 0.2s',
                    boxShadow: amp.params?.variac ? 'inset 0 1px 0 rgba(255,255,255,0.4)' : 'none'
                  }}
                >VAR</button>
                  </div>
            </div>
          </div>
        );
      
      // ============================================
      // FRIEDMAN BE-100 CONTROLS (integrated like VOX)
      // ============================================
      case 'friedman_channel':
        const friedmanChannel = amp.params?.channel ?? 1;
        return (
          <div key="friedman_channel" className="toggle-switch" style={{ display: 'flex', flexDirection: 'column', gap: '6px', alignItems: 'center' }}>
            <label style={{ fontSize: '10px', color: '#ffd700', fontWeight: 'bold' }}>Channel</label>
            <select 
              value={friedmanChannel}
              onChange={(e) => onUpdate(amp.id, 'channel', parseInt(e.target.value))}
              style={{ 
                padding: '6px 10px', 
                fontSize: '11px', 
                borderRadius: '4px', 
                background: '#000', 
                color: '#ffd700', 
                border: '1px solid #ffd700'
              }}
            >
              <option value={0}>CLEAN</option>
              <option value={1}>BE</option>
            </select>
          </div>
        );
      
      case 'friedman_depth':
        return <Knob key="friedman_depth" label="Depth" value={amp.params?.depth || 50} onChange={handleKnobChange('depth')} size={32} />;
      
      case 'friedman_tight':
        return (
          <div key="friedman_tight" className="toggle-switch">
            <label>Tight</label>
            <input 
              type="checkbox" 
              checked={amp.params?.tight || false}
              onChange={(e) => onUpdate(amp.id, 'tight', e.target.checked)}
            />
          </div>
        );
      
      case 'friedman_fat':
        return (
          <div key="friedman_fat" className="toggle-switch">
            <label>Fat</label>
            <input 
              type="checkbox" 
              checked={amp.params?.fat || false}
              onChange={(e) => onUpdate(amp.id, 'fat', e.target.checked)}
            />
          </div>
        );
      
      case 'friedman_sat':
        return (
          <div key="friedman_sat" className="toggle-switch">
            <label>SAT</label>
            <input 
              type="checkbox" 
              checked={amp.params?.sat || false}
              onChange={(e) => onUpdate(amp.id, 'sat', e.target.checked)}
            />
          </div>
        );
      
      case 'friedman_bright':
        return (
          <div key="friedman_bright" className="toggle-switch">
            <label>Bright</label>
            <input 
              type="checkbox" 
              checked={amp.params?.c45 || false}
              onChange={(e) => onUpdate(amp.id, 'c45', e.target.checked)}
            />
          </div>
        );
      
      case 'friedman_cabinet':
        return (
          <div key="friedman_cabinet" className="toggle-switch">
            <label>Cabinet</label>
            <input 
              type="checkbox" 
              checked={amp.params?.cabinet_enabled !== false}
              onChange={(e) => onUpdate(amp.id, 'cabinet_enabled', e.target.checked)}
            />
          </div>
        );
      
      // ============================================
      // FENDER DELUXE REVERB CONTROLS
      // ============================================
      case 'fender_deluxe_channel':
        const fenderChannel = amp.params?.channel ?? 1;
        return (
          <div key="fender_deluxe_channel" style={{ display: 'inline-flex', gap: '4px', alignItems: 'center' }}>
            <button
              onClick={() => onUpdate(amp.id, 'channel', 0)}
              style={{ 
                padding: '4px 8px',
                fontSize: '9px',
                fontWeight: 'bold',
                borderRadius: '3px',
                border: fenderChannel === 0 ? '1px solid #c0c0c0' : '1px solid rgba(192,192,192,0.2)',
                background: fenderChannel === 0 ? 'rgba(192,192,192,0.3)' : 'rgba(0,0,0,0.3)',
                color: fenderChannel === 0 ? '#c0c0c0' : '#888',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >NORM</button>
            <button
              onClick={() => onUpdate(amp.id, 'channel', 1)}
              style={{
                padding: '4px 8px',
                fontSize: '9px',
                fontWeight: 'bold',
                borderRadius: '3px',
                border: fenderChannel === 1 ? '1px solid #c0c0c0' : '1px solid rgba(192,192,192,0.2)',
                background: fenderChannel === 1 ? 'rgba(192,192,192,0.3)' : 'rgba(0,0,0,0.3)',
                color: fenderChannel === 1 ? '#c0c0c0' : '#888',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >VIB</button>
          </div>
        );
      
      case 'fender_reverb_dwell':
        return <Knob key="fender_reverb_dwell" label="DWELL" value={amp.params?.reverb_dwell || 50} onChange={handleKnobChange('reverb_dwell')} size={28} />;
      
      case 'fender_cabinet':
        return (
          <div key="fender_cabinet" style={{ display: 'inline-flex', gap: '4px', alignItems: 'center' }}>
            <button
              onClick={() => onUpdate(amp.id, 'cabinet_enabled', false)}
              style={{
                padding: '4px 6px',
                fontSize: '9px',
                fontWeight: 'bold',
                borderRadius: '3px',
                border: amp.params?.cabinet_enabled === false ? '1px solid #c0c0c0' : '1px solid rgba(192,192,192,0.2)',
                background: amp.params?.cabinet_enabled === false ? 'rgba(192,192,192,0.3)' : 'rgba(0,0,0,0.3)',
                color: amp.params?.cabinet_enabled === false ? '#c0c0c0' : '#888',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >OFF</button>
            <button
              onClick={() => onUpdate(amp.id, 'cabinet_enabled', true)}
              style={{
                padding: '4px 6px',
                fontSize: '9px',
                fontWeight: 'bold',
                borderRadius: '3px',
                border: amp.params?.cabinet_enabled !== false ? '1px solid #c0c0c0' : '1px solid rgba(192,192,192,0.2)',
                background: amp.params?.cabinet_enabled !== false ? 'rgba(192,192,192,0.3)' : 'rgba(0,0,0,0.3)',
                color: amp.params?.cabinet_enabled !== false ? '#c0c0c0' : '#888',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >ON</button>
          </div>
        );
      
      // ============================================
      // BOGNER ÜBERSCHALL - COMPLETE CONTROLS
      // ============================================
      case 'bogner_uberschall_controls':
        const uberschallChannel = amp.params?.channel || 3;
        return (
          <div key="bogner_uberschall_controls" className="bogner-uberschall-full-controls" style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '5px',
            padding: '6px 8px',
            background: 'repeating-radial-gradient(circle at 2px 2px, rgba(20,20,20,0.6) 0px, transparent 1px), linear-gradient(135deg, #0f0f0f 0%, #050505 100%)',
            backgroundSize: '4px 4px, 100% 100%',
            borderRadius: '4px',
            border: '2px solid #1a1a1a',
            boxShadow: 'inset 0 1px 0 rgba(212,175,55,0.15), inset 0 2px 4px rgba(0,0,0,0.8), 0 2px 8px rgba(0,0,0,0.6)',
            maxWidth: '900px',
            alignItems: 'center'
          }}>
            {/* LINHA SUPERIOR - KNOBS PRINCIPAIS */}
            <div style={{
              display: 'flex',
              flexDirection: 'row',
              gap: '5px',
              flexWrap: 'nowrap',
              justifyContent: 'center',
              alignItems: 'center'
            }}>
              {/* GAIN + CHANNEL VOLUME */}
              <div style={{
                display: 'flex',
                gap: '6px',
                padding: '4px 6px',
                background: 'rgba(0,0,0,0.6)',
                borderRadius: '4px',
                border: '1px solid rgba(212,175,55,0.3)'
              }}>
                <Knob 
                  label="GAIN" 
                  value={amp.params?.gain || 85} 
                  onChange={handleKnobChange('gain')} 
                  size={30} 
                  color="#2a2a2a" 
                />
                <Knob 
                  label="CH VOL" 
                  value={amp.params?.channel_volume || 75} 
                  onChange={handleKnobChange('channel_volume')} 
                  size={28} 
                  color="#2a2a2a" 
                />
              </div>

              {/* TONE STACK */}
              <div style={{
                display: 'flex',
                gap: '6px',
                padding: '4px 6px',
                background: 'rgba(0,0,0,0.6)',
                borderRadius: '4px',
                border: '1px solid rgba(212,175,55,0.3)'
              }}>
                <Knob label="BASS" value={amp.params?.bass || 70} onChange={handleKnobChange('bass')} size={26} color="#2a2a2a" />
                <Knob label="MID" value={amp.params?.middle || 42} onChange={handleKnobChange('middle')} size={26} color="#2a2a2a" />
                <Knob label="TREB" value={amp.params?.treble || 72} onChange={handleKnobChange('treble')} size={26} color="#2a2a2a" />
              </div>

              {/* PRESENCE + DEPTH + MASTER */}
              <div style={{ 
                display: 'flex', 
                gap: '6px',
                padding: '4px 6px',
                background: 'rgba(0,0,0,0.6)',
                borderRadius: '4px',
                border: '1px solid rgba(212,175,55,0.3)'
              }}>
                <Knob label="PRES" value={amp.params?.presence || 68} onChange={handleKnobChange('presence')} size={26} color="#2a2a2a" />
                <Knob label="DEPTH" value={amp.params?.depth || 68} onChange={handleKnobChange('depth')} size={26} color="#2a2a2a" />
                <Knob label="MSTR" value={amp.params?.master || 70} onChange={handleKnobChange('master')} size={30} color="#2a2a2a" />
              </div>
            </div>

            {/* LINHA INFERIOR - CHANNEL SELECTOR + SWITCHES */}
            <div style={{
              display: 'flex',
              flexDirection: 'row',
              gap: '6px',
              flexWrap: 'nowrap',
              justifyContent: 'center',
              alignItems: 'center'
            }}>
              {/* CHANNEL SELECTOR COM LEDs */}
              <div style={{
                display: 'flex',
                flexDirection: 'row',
                gap: '4px',
                padding: '4px 8px',
                background: 'rgba(0,0,0,0.7)',
                borderRadius: '4px',
                border: '1px solid rgba(212,175,55,0.4)',
                alignItems: 'center'
              }}>
                <label style={{ fontSize: '8px', color: '#ffffff', fontWeight: 'bold', marginRight: '4px', letterSpacing: '0.5px' }}>CHANNEL</label>

                <button
                  onClick={() => onUpdate(amp.id, 'channel', 1)}
                  style={{
                    padding: '6px 10px',
                    fontSize: '9px',
                    fontWeight: 'bold',
                    borderRadius: '3px',
                    border: uberschallChannel === 1 ? '2px solid #00ff00' : '1px solid rgba(192,192,192,0.3)',
                    background: uberschallChannel === 1 ? 'rgba(0,255,0,0.2)' : 'rgba(0,0,0,0.4)',
                    color: uberschallChannel === 1 ? '#00ff00' : '#888',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    boxShadow: uberschallChannel === 1 ? '0 0 8px rgba(0,255,0,0.6), inset 0 0 6px rgba(0,255,0,0.3)' : 'inset 0 1px 2px rgba(0,0,0,0.5)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                >
                  {uberschallChannel === 1 && <span style={{ 
                    width: '6px', 
                    height: '6px', 
                    borderRadius: '50%', 
                    background: '#00ff00',
                    boxShadow: '0 0 6px #00ff00',
                    animation: 'pulse 1.5s ease-in-out infinite'
                  }}></span>}
                  CLN
                </button>

                <button
                  onClick={() => onUpdate(amp.id, 'channel', 2)}
                  style={{
                    padding: '6px 10px',
                    fontSize: '9px',
                    fontWeight: 'bold',
                    borderRadius: '3px',
                    border: uberschallChannel === 2 ? '2px solid #ff8800' : '1px solid rgba(192,192,192,0.3)',
                    background: uberschallChannel === 2 ? 'rgba(255,136,0,0.2)' : 'rgba(0,0,0,0.4)',
                    color: uberschallChannel === 2 ? '#ff8800' : '#888',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    boxShadow: uberschallChannel === 2 ? '0 0 8px rgba(255,136,0,0.6), inset 0 0 6px rgba(255,136,0,0.3)' : 'inset 0 1px 2px rgba(0,0,0,0.5)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                >
                  {uberschallChannel === 2 && <span style={{ 
                    width: '6px', 
                    height: '6px', 
                    borderRadius: '50%', 
                    background: '#ff8800',
                    boxShadow: '0 0 6px #ff8800',
                    animation: 'pulse 1.5s ease-in-out infinite'
                  }}></span>}
                  CRN
                </button>

                <button
                  onClick={() => onUpdate(amp.id, 'channel', 3)}
                  style={{
                    padding: '6px 10px',
                    fontSize: '9px',
                    fontWeight: 'bold',
                    borderRadius: '3px',
                    border: uberschallChannel === 3 ? '2px solid #ff0000' : '1px solid rgba(192,192,192,0.3)',
                    background: uberschallChannel === 3 ? 'rgba(255,0,0,0.2)' : 'rgba(0,0,0,0.4)',
                    color: uberschallChannel === 3 ? '#ff0000' : '#888',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    boxShadow: uberschallChannel === 3 ? '0 0 8px rgba(255,0,0,0.6), inset 0 0 6px rgba(255,0,0,0.3)' : 'inset 0 1px 2px rgba(0,0,0,0.5)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                >
                  {uberschallChannel === 3 && <span style={{ 
                    width: '6px', 
                    height: '6px', 
                    borderRadius: '50%', 
                    background: '#ff0000',
                    boxShadow: '0 0 6px #ff0000',
                    animation: 'pulse 1.5s ease-in-out infinite'
                  }}></span>}
                  ÜBR
                </button>
              </div>

              {/* SWITCHES - BRIGHT, MID SHIFT, GAIN BOOST, GATE */}
              <div style={{
                display: 'flex',
                gap: '5px',
                padding: '4px 6px',
                background: 'rgba(0,0,0,0.7)',
                borderRadius: '4px',
                border: '1px solid rgba(212,175,55,0.4)'
              }}>
                <button
                  onClick={() => onUpdate(amp.id, 'bright', !amp.params?.bright)}
                  style={{
                    padding: '4px 6px',
                    fontSize: '9px',
                    fontWeight: 'bold',
                    borderRadius: '3px',
                    border: amp.params?.bright ? '1px solid #d4af37' : '1px solid rgba(212,175,55,0.2)',
                    background: amp.params?.bright ? 'rgba(212,175,55,0.3)' : 'rgba(0,0,0,0.4)',
                    color: amp.params?.bright ? '#d4af37' : '#999',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    letterSpacing: '0.3px'
                  }}
                >BRT</button>

                <button
                  onClick={() => onUpdate(amp.id, 'mid_shift', !amp.params?.mid_shift)}
                  style={{
                    padding: '4px 6px',
                    fontSize: '9px',
                    fontWeight: 'bold',
                    borderRadius: '3px',
                    border: amp.params?.mid_shift ? '1px solid #d4af37' : '1px solid rgba(212,175,55,0.2)',
                    background: amp.params?.mid_shift ? 'rgba(212,175,55,0.3)' : 'rgba(0,0,0,0.4)',
                    color: amp.params?.mid_shift ? '#d4af37' : '#999',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    letterSpacing: '0.3px'
                  }}
                >MID ↓</button>

                <button
                  onClick={() => onUpdate(amp.id, 'gain_boost', !amp.params?.gain_boost)}
                  style={{
                    padding: '4px 6px',
                    fontSize: '9px',
                    fontWeight: 'bold',
                    borderRadius: '3px',
                    border: amp.params?.gain_boost ? '1px solid #d4af37' : '1px solid rgba(212,175,55,0.2)',
                    background: amp.params?.gain_boost ? 'rgba(212,175,55,0.3)' : 'rgba(0,0,0,0.4)',
                    color: amp.params?.gain_boost ? '#d4af37' : '#999',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    letterSpacing: '0.3px'
                  }}
                >BST</button>

                <button
                  onClick={() => onUpdate(amp.id, 'gate', !amp.params?.gate)}
                  style={{
                    padding: '4px 6px',
                    fontSize: '9px',
                    fontWeight: 'bold',
                    borderRadius: '3px',
                    border: amp.params?.gate ? '1px solid #00ff00' : '1px solid rgba(0,255,0,0.2)',
                    background: amp.params?.gate ? 'rgba(0,255,0,0.25)' : 'rgba(0,0,0,0.4)',
                    color: amp.params?.gate ? '#00ff00' : '#999',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    letterSpacing: '0.3px'
                  }}
                >GATE</button>
              </div>

              {/* RECTIFIER SWITCH */}
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '2px',
                padding: '4px 6px',
                background: 'rgba(0,0,0,0.7)',
                borderRadius: '4px',
                border: '1px solid rgba(212,175,55,0.4)',
                alignItems: 'center'
              }}>
                <label style={{ fontSize: '7px', color: '#ffffff', fontWeight: 'bold', letterSpacing: '0.5px' }}>RECTIFIER</label>
                <div style={{ display: 'flex', gap: '3px' }}>
                  <button
                    onClick={() => onUpdate(amp.id, 'rectifier', 'silicon')}
                    style={{
                      padding: '3px 5px',
                      fontSize: '8px',
                      fontWeight: 'bold',
                      borderRadius: '2px',
                      border: amp.params?.rectifier === 'silicon' ? '1px solid #ffffff' : '1px solid rgba(255,255,255,0.2)',
                      background: amp.params?.rectifier === 'silicon' ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.4)',
                      color: amp.params?.rectifier === 'silicon' ? '#ffffff' : '#999',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      letterSpacing: '0.3px'
                    }}
                  >SI</button>
                  <button
                    onClick={() => onUpdate(amp.id, 'rectifier', 'tube')}
                    style={{
                      padding: '3px 5px',
                      fontSize: '8px',
                      fontWeight: 'bold',
                      borderRadius: '2px',
                      border: amp.params?.rectifier === 'tube' ? '1px solid #d4af37' : '1px solid rgba(212,175,55,0.2)',
                      background: amp.params?.rectifier === 'tube' ? 'rgba(212,175,55,0.3)' : 'rgba(0,0,0,0.4)',
                      color: amp.params?.rectifier === 'tube' ? '#d4af37' : '#999',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      letterSpacing: '0.3px'
                    }}
                  >TUBE</button>
                </div>
              </div>

              {/* CABINET ON/OFF */}
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '2px',
                padding: '4px 6px',
                background: 'rgba(0,0,0,0.7)',
                borderRadius: '4px',
                border: '1px solid rgba(212,175,55,0.4)',
                alignItems: 'center'
              }}>
                <label style={{ fontSize: '7px', color: '#ffffff', fontWeight: 'bold', letterSpacing: '0.5px' }}>CAB</label>
                <button
                  onClick={() => onUpdate(amp.id, 'cabinet_enabled', !amp.params?.cabinet_enabled)}
                  style={{
                    padding: '4px 6px',
                    fontSize: '9px',
                    fontWeight: 'bold',
                    borderRadius: '3px',
                    border: amp.params?.cabinet_enabled !== false ? '1px solid #ffffff' : '1px solid rgba(255,255,255,0.2)',
                    background: amp.params?.cabinet_enabled !== false ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.4)',
                    color: amp.params?.cabinet_enabled !== false ? '#ffffff' : '#999',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    letterSpacing: '0.3px'
                  }}
                >ON</button>
              </div>
            </div>
          </div>
        );
      
      // ============================================
      // DIEZEL VH4 - COMPLETE CONTROLS
      // ============================================
      case 'diezel_vh4_controls':
        const diezelChannel = amp.params?.channel || 3;
        return (
          <div key="diezel_vh4_controls" className="diezel-vh4-full-controls" style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '5px',
            padding: '6px 8px',
            background: 'repeating-radial-gradient(circle at 2px 2px, rgba(60,60,60,0.8) 0px, transparent 1px), linear-gradient(135deg, #4a4a4a 0%, #3a3a3a 100%)',
            backgroundSize: '4px 4px, 100% 100%',
            borderRadius: '4px',
            border: '2px solid #1a1a1a',
            boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.15), inset 0 2px 4px rgba(0,0,0,0.5)',
            maxWidth: '850px',
            alignItems: 'center'
          }}>
            {/* LINHA SUPERIOR - KNOBS PRINCIPAIS */}
            <div style={{
              display: 'flex',
              flexDirection: 'row',
              gap: '5px',
              flexWrap: 'nowrap',
              justifyContent: 'center',
              alignItems: 'center'
            }}>
              {/* GAIN + VOLUME DO CANAL */}
            <div style={{
              display: 'flex',
                gap: '6px',
                padding: '4px 6px',
                background: 'rgba(0,0,0,0.6)',
                borderRadius: '4px',
                border: '1px solid rgba(192,192,192,0.3)'
              }}>
                <Knob 
                  label="GAIN" 
                  value={amp.params?.gain || 70} 
                  onChange={handleKnobChange('gain')} 
                  size={28} 
                  color="#e0e0e0" 
                />
                <Knob 
                  label="CH VOL" 
                  value={amp.params?.channel_volume || 70} 
                  onChange={handleKnobChange('channel_volume')} 
                  size={28} 
                  color="#e0e0e0" 
                />
              </div>

            {/* TONE STACK */}
            <div style={{
              display: 'flex',
                gap: '6px',
                padding: '4px 6px',
                background: 'rgba(0,0,0,0.6)',
                borderRadius: '4px',
                border: '1px solid rgba(192,192,192,0.3)'
              }}>
                <Knob label="BASS" value={amp.params?.bass || 60} onChange={handleKnobChange('bass')} size={26} color="#e0e0e0" />
                <Knob label="MID" value={amp.params?.middle || 55} onChange={handleKnobChange('middle')} size={26} color="#e0e0e0" />
                <Knob label="TREB" value={amp.params?.treble || 65} onChange={handleKnobChange('treble')} size={26} color="#e0e0e0" />
            </div>

              {/* PRESENCE + DEEP + MASTER */}
            <div style={{
              display: 'flex',
                gap: '6px',
                padding: '4px 6px',
                background: 'rgba(0,0,0,0.6)',
                borderRadius: '4px',
                border: '1px solid rgba(192,192,192,0.3)'
              }}>
                <Knob label="PRES" value={amp.params?.presence || 60} onChange={handleKnobChange('presence')} size={26} color="#e0e0e0" />
                <Knob label="DEEP" value={amp.params?.deep || 50} onChange={handleKnobChange('deep')} size={26} color="#e0e0e0" />
                <Knob label="MSTR" value={amp.params?.master || 70} onChange={handleKnobChange('master')} size={28} color="#ffffff" />
              </div>
            </div>

            {/* LINHA INFERIOR - CHANNEL SELECTOR COM LEDS + SWITCHES */}
            <div style={{
              display: 'flex',
              flexDirection: 'row',
              gap: '6px',
              flexWrap: 'nowrap',
              justifyContent: 'center',
              alignItems: 'center'
            }}>
              {/* CHANNEL SELECTOR COM LEDs FÍSICOS (4 canais) */}
              <div style={{
                display: 'flex',
                flexDirection: 'row',
                gap: '4px',
                padding: '4px 8px',
                background: 'rgba(0,0,0,0.8)',
                  borderRadius: '4px', 
                border: '1px solid rgba(255,255,255,0.4)',
                alignItems: 'center'
              }}>
                <label style={{ fontSize: '7px', color: '#ffffff', fontWeight: 'bold', marginRight: '4px', textTransform: 'uppercase' }}>CHANNEL</label>
                
                {/* Clean LED + Button */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
                  <div style={{
                    width: '9px',
                    height: '9px',
                    borderRadius: '50%',
                    background: diezelChannel === 1 ? 'radial-gradient(circle, #00ff00 0%, #00aa00 100%)' : '#1a1a1a',
                    boxShadow: diezelChannel === 1 ? '0 0 10px #00ff00, inset 0 1px 2px rgba(255,255,255,0.3)' : 'inset 0 1px 2px rgba(0,0,0,0.8)',
                    border: '1px solid ' + (diezelChannel === 1 ? '#00ff00' : '#0a0a0a')
                  }}></div>
                  <button 
                    onClick={() => onUpdate(amp.id, 'channel', 1)}
                style={{ 
                      padding: '4px 8px',
                      background: diezelChannel === 1 ? 'linear-gradient(135deg, #e0e0e0 0%, #c0c0c0 100%)' : 'rgba(0,0,0,0.7)',
                      border: '1px solid ' + (diezelChannel === 1 ? '#e0e0e0' : '#666'),
                      color: diezelChannel === 1 ? '#000' : '#e0e0e0',
                      borderRadius: '2px',
                      cursor: 'pointer',
                      fontWeight: 'bold',
                      fontSize: '8px',
                      textTransform: 'uppercase',
                      transition: 'all 0.2s',
                      boxShadow: diezelChannel === 1 ? 'inset 0 1px 0 rgba(255,255,255,0.4)' : 'none'
                    }}
                  >1</button>
            </div>

                {/* Crunch LED + Button */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
                  <div style={{
                    width: '9px',
                    height: '9px',
                    borderRadius: '50%',
                    background: diezelChannel === 2 ? 'radial-gradient(circle, #4a9eff 0%, #2060cc 100%)' : '#1a1a1a',
                    boxShadow: diezelChannel === 2 ? '0 0 10px #4a9eff, inset 0 1px 2px rgba(255,255,255,0.3)' : 'inset 0 1px 2px rgba(0,0,0,0.8)',
                    border: '1px solid ' + (diezelChannel === 2 ? '#4a9eff' : '#0a0a0a')
                  }}></div>
                  <button 
                    onClick={() => onUpdate(amp.id, 'channel', 2)}
                    style={{
                      padding: '4px 8px',
                      background: diezelChannel === 2 ? 'linear-gradient(135deg, #e0e0e0 0%, #c0c0c0 100%)' : 'rgba(0,0,0,0.7)',
                      border: '1px solid ' + (diezelChannel === 2 ? '#e0e0e0' : '#666'),
                      color: diezelChannel === 2 ? '#000' : '#e0e0e0',
                      borderRadius: '2px',
                      cursor: 'pointer',
                      fontWeight: 'bold',
                      fontSize: '8px',
                      textTransform: 'uppercase',
                      transition: 'all 0.2s',
                      boxShadow: diezelChannel === 2 ? 'inset 0 1px 0 rgba(255,255,255,0.4)' : 'none'
                    }}
                  >2</button>
              </div>

                {/* Mega LED + Button */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
                  <div style={{
                    width: '9px',
                    height: '9px',
                    borderRadius: '50%',
                    background: diezelChannel === 3 ? 'radial-gradient(circle, #ff6600 0%, #cc4400 100%)' : '#1a1a1a',
                    boxShadow: diezelChannel === 3 ? '0 0 10px #ff6600, inset 0 1px 2px rgba(255,255,255,0.3)' : 'inset 0 1px 2px rgba(0,0,0,0.8)',
                    border: '1px solid ' + (diezelChannel === 3 ? '#ff6600' : '#0a0a0a')
                  }}></div>
                  <button 
                    onClick={() => onUpdate(amp.id, 'channel', 3)}
                    style={{
                      padding: '4px 8px',
                      background: diezelChannel === 3 ? 'linear-gradient(135deg, #e0e0e0 0%, #c0c0c0 100%)' : 'rgba(0,0,0,0.7)',
                      border: '1px solid ' + (diezelChannel === 3 ? '#e0e0e0' : '#666'),
                      color: diezelChannel === 3 ? '#000' : '#e0e0e0',
                      borderRadius: '2px',
                      cursor: 'pointer',
                      fontWeight: 'bold',
                      fontSize: '8px',
                      textTransform: 'uppercase',
                      transition: 'all 0.2s',
                      boxShadow: diezelChannel === 3 ? 'inset 0 1px 0 rgba(255,255,255,0.4)' : 'none'
                    }}
                  >3</button>
                </div>

                {/* Ultra LED + Button */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
                  <div style={{
                    width: '9px',
                    height: '9px',
                    borderRadius: '50%',
                    background: diezelChannel === 4 ? 'radial-gradient(circle, #ff0000 0%, #aa0000 100%)' : '#1a1a1a',
                    boxShadow: diezelChannel === 4 ? '0 0 10px #ff0000, inset 0 1px 2px rgba(255,255,255,0.3)' : 'inset 0 1px 2px rgba(0,0,0,0.8)',
                    border: '1px solid ' + (diezelChannel === 4 ? '#ff0000' : '#0a0a0a')
                  }}></div>
                  <button 
                    onClick={() => onUpdate(amp.id, 'channel', 4)}
                    style={{
                      padding: '4px 8px',
                      background: diezelChannel === 4 ? 'linear-gradient(135deg, #e0e0e0 0%, #c0c0c0 100%)' : 'rgba(0,0,0,0.7)',
                      border: '1px solid ' + (diezelChannel === 4 ? '#e0e0e0' : '#666'),
                      color: diezelChannel === 4 ? '#000' : '#e0e0e0',
                      borderRadius: '2px',
                      cursor: 'pointer',
                      fontWeight: 'bold',
                      fontSize: '8px',
                      textTransform: 'uppercase',
                      transition: 'all 0.2s',
                      boxShadow: diezelChannel === 4 ? 'inset 0 1px 0 rgba(255,255,255,0.4)' : 'none'
                    }}
                  >4</button>
              </div>
            </div>

              {/* MID-CUT SWITCH */}
            <div style={{
              display: 'flex',
                gap: '4px',
                padding: '4px 6px',
                background: 'rgba(0,0,0,0.8)',
                  borderRadius: '4px', 
                border: '1px solid rgba(255,255,255,0.4)',
                alignItems: 'center'
              }}>
                <button
                  onClick={() => onUpdate(amp.id, 'midcut', !amp.params?.midcut)}
                  style={{
                    padding: '5px 10px',
                    background: amp.params?.midcut ? 'linear-gradient(135deg, #ff6b35 0%, #dd5520 100%)' : 'rgba(0,0,0,0.7)',
                    border: '1px solid ' + (amp.params?.midcut ? '#ff6b35' : '#666'),
                    color: amp.params?.midcut ? '#000' : '#ff6b35',
                    borderRadius: '2px',
                    cursor: 'pointer',
                    fontWeight: 'bold',
                    fontSize: '8px',
                    textTransform: 'uppercase',
                    transition: 'all 0.2s',
                    boxShadow: amp.params?.midcut ? '0 0 6px rgba(255,107,53,0.6), inset 0 1px 0 rgba(255,255,255,0.3)' : 'none'
                  }}
                >MID-CUT</button>
            </div>

              {/* GATE + CABINET */}
            <div style={{
              display: 'flex',
                gap: '4px',
                padding: '4px 6px',
                background: 'rgba(0,0,0,0.8)',
                borderRadius: '4px',
                border: '1px solid rgba(255,255,255,0.4)',
                alignItems: 'center'
              }}>
                <button
                  onClick={() => onUpdate(amp.id, 'gate', !amp.params?.gate)}
                  style={{
                    padding: '5px 10px',
                    background: amp.params?.gate ? 'linear-gradient(135deg, #00c864 0%, #00a050 100%)' : 'rgba(0,0,0,0.7)',
                    border: '1px solid ' + (amp.params?.gate ? '#00c864' : '#666'),
                    color: amp.params?.gate ? '#000' : '#00c864',
                    borderRadius: '2px',
                    cursor: 'pointer',
                    fontWeight: 'bold',
                    fontSize: '8px',
                    textTransform: 'uppercase',
                    transition: 'all 0.2s',
                    boxShadow: amp.params?.gate ? '0 0 6px rgba(0,200,100,0.6), inset 0 1px 0 rgba(255,255,255,0.3)' : 'none'
                  }}
                >GATE</button>
                
                <button
                  onClick={() => onUpdate(amp.id, 'cabinet_enabled', !amp.params?.cabinet_enabled)}
                  style={{
                    padding: '5px 10px',
                    background: amp.params?.cabinet_enabled !== false ? 'linear-gradient(135deg, #e0e0e0 0%, #c0c0c0 100%)' : 'rgba(0,0,0,0.7)',
                    border: '1px solid ' + (amp.params?.cabinet_enabled !== false ? '#e0e0e0' : '#666'),
                    color: amp.params?.cabinet_enabled !== false ? '#000' : '#e0e0e0',
                    borderRadius: '2px',
                    cursor: 'pointer',
                    fontWeight: 'bold',
                    fontSize: '8px',
                    textTransform: 'uppercase',
                    transition: 'all 0.2s',
                    boxShadow: amp.params?.cabinet_enabled !== false ? 'inset 0 1px 0 rgba(255,255,255,0.4)' : 'none'
                  }}
                >CAB</button>
            </div>
            </div>
          </div>
        );
      
      // ============================================
      // ENGL POWERBALL - COMPLETE CONTROLS
      // ============================================
      case 'engl_powerball_controls':
        const englChannel = amp.params?.channel || 4;
        return (
          <div key="engl_powerball_controls" className="engl-powerball-full-controls" style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '5px',
            padding: '6px 8px',
            background: 'repeating-radial-gradient(circle at 2px 2px, rgba(40,0,0,0.8) 0px, transparent 1px), linear-gradient(135deg, #1a1a1a 0%, #0a0a0a 100%)',
            backgroundSize: '4px 4px, 100% 100%',
            borderRadius: '4px',
            border: '2px solid #ff0000',
            boxShadow: 'inset 0 1px 0 rgba(255,0,0,0.2), inset 0 2px 4px rgba(0,0,0,0.6), 0 0 10px rgba(255,0,0,0.3)',
            maxWidth: '850px',
            alignItems: 'center'
          }}>
            {/* LINHA SUPERIOR - KNOBS PRINCIPAIS */}
            <div style={{
              display: 'flex',
              flexDirection: 'row',
              gap: '5px',
              flexWrap: 'nowrap',
              justifyContent: 'center',
              alignItems: 'center'
            }}>
              {/* GAIN + VOLUME DO CANAL */}
              <div style={{
                display: 'flex',
                gap: '6px',
                padding: '4px 6px',
                background: 'rgba(0,0,0,0.8)',
                borderRadius: '4px',
                border: '1px solid rgba(255,0,0,0.4)'
              }}>
                <Knob 
                  label="GAIN" 
                  value={amp.params?.gain || 80} 
                  onChange={handleKnobChange('gain')} 
                  size={28} 
                  color="#ff4444" 
                />
                <Knob 
                  label="CH VOL" 
                  value={amp.params?.channel_volume || 72} 
                  onChange={handleKnobChange('channel_volume')} 
                  size={28} 
                  color="#ff4444" 
                />
              </div>

              {/* TONE STACK */}
              <div style={{
                display: 'flex',
                gap: '6px',
                padding: '4px 6px',
                background: 'rgba(0,0,0,0.8)',
                borderRadius: '4px',
                border: '1px solid rgba(255,0,0,0.4)'
              }}>
                <Knob label="BASS" value={amp.params?.bass || 68} onChange={handleKnobChange('bass')} size={26} color="#ff4444" />
                <Knob label="MID" value={amp.params?.middle || 45} onChange={handleKnobChange('middle')} size={26} color="#ff4444" />
                <Knob label="TREB" value={amp.params?.treble || 70} onChange={handleKnobChange('treble')} size={26} color="#ff4444" />
              </div>

              {/* PRESENCE + DEPTH + CONTOUR + MASTER */}
              <div style={{
                display: 'flex',
                gap: '6px',
                padding: '4px 6px',
                background: 'rgba(0,0,0,0.8)',
                borderRadius: '4px',
                border: '1px solid rgba(255,0,0,0.4)'
              }}>
                <Knob label="PRES" value={amp.params?.presence || 65} onChange={handleKnobChange('presence')} size={26} color="#ff4444" />
                <Knob label="DEPTH" value={amp.params?.depth || 65} onChange={handleKnobChange('depth')} size={26} color="#ff4444" />
                <Knob label="CNTR" value={amp.params?.contour || 40} onChange={handleKnobChange('contour')} size={26} color="#ff8800" />
                <Knob label="MSTR" value={amp.params?.master || 70} onChange={handleKnobChange('master')} size={28} color="#ffffff" />
              </div>
            </div>

            {/* LINHA INFERIOR - CHANNEL SELECTOR COM LEDS + SWITCHES */}
            <div style={{
              display: 'flex',
              flexDirection: 'row',
              gap: '6px',
              flexWrap: 'nowrap',
              justifyContent: 'center',
              alignItems: 'center'
            }}>
              {/* CHANNEL SELECTOR COM LEDs (4 canais) */}
              <div style={{
                display: 'flex',
                flexDirection: 'row',
                gap: '4px',
                padding: '4px 8px',
                background: 'rgba(0,0,0,0.9)',
                borderRadius: '4px', 
                border: '1px solid rgba(255,0,0,0.6)',
                alignItems: 'center'
              }}>
                <label style={{ fontSize: '7px', color: '#ff0000', fontWeight: 'bold', marginRight: '4px', textTransform: 'uppercase' }}>CHANNEL</label>
                
                {/* Clean LED + Button */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
                  <div style={{
                    width: '9px',
                    height: '9px',
                    borderRadius: '50%',
                    background: englChannel === 1 ? 'radial-gradient(circle, #00ff00 0%, #00aa00 100%)' : '#1a1a1a',
                    boxShadow: englChannel === 1 ? '0 0 10px #00ff00, inset 0 1px 2px rgba(255,255,255,0.3)' : 'inset 0 1px 2px rgba(0,0,0,0.8)',
                    border: '1px solid ' + (englChannel === 1 ? '#00ff00' : '#0a0a0a')
                  }}></div>
                  <button 
                    onClick={() => onUpdate(amp.id, 'channel', 1)}
                    style={{ 
                      padding: '4px 8px',
                      background: englChannel === 1 ? 'linear-gradient(135deg, #ff0000 0%, #cc0000 100%)' : 'rgba(0,0,0,0.7)',
                      border: '1px solid ' + (englChannel === 1 ? '#ff0000' : '#666'),
                      color: englChannel === 1 ? '#fff' : '#ff4444',
                      borderRadius: '2px',
                      cursor: 'pointer',
                      fontWeight: 'bold',
                      fontSize: '8px',
                      textTransform: 'uppercase',
                      transition: 'all 0.2s',
                      boxShadow: englChannel === 1 ? '0 0 8px rgba(255,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.2)' : 'none'
                    }}
                  >CLN</button>
                </div>

                {/* Crunch LED + Button */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
                  <div style={{
                    width: '9px',
                    height: '9px',
                    borderRadius: '50%',
                    background: englChannel === 2 ? 'radial-gradient(circle, #ffaa00 0%, #cc8800 100%)' : '#1a1a1a',
                    boxShadow: englChannel === 2 ? '0 0 10px #ffaa00, inset 0 1px 2px rgba(255,255,255,0.3)' : 'inset 0 1px 2px rgba(0,0,0,0.8)',
                    border: '1px solid ' + (englChannel === 2 ? '#ffaa00' : '#0a0a0a')
                  }}></div>
                  <button 
                    onClick={() => onUpdate(amp.id, 'channel', 2)}
                    style={{
                      padding: '4px 8px',
                      background: englChannel === 2 ? 'linear-gradient(135deg, #ff0000 0%, #cc0000 100%)' : 'rgba(0,0,0,0.7)',
                      border: '1px solid ' + (englChannel === 2 ? '#ff0000' : '#666'),
                      color: englChannel === 2 ? '#fff' : '#ff4444',
                      borderRadius: '2px',
                      cursor: 'pointer',
                      fontWeight: 'bold',
                      fontSize: '8px',
                      textTransform: 'uppercase',
                      transition: 'all 0.2s',
                      boxShadow: englChannel === 2 ? '0 0 8px rgba(255,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.2)' : 'none'
                    }}
                  >CRU</button>
                </div>

                {/* Soft Lead LED + Button */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
                  <div style={{
                    width: '9px',
                    height: '9px',
                    borderRadius: '50%',
                    background: englChannel === 3 ? 'radial-gradient(circle, #ff6600 0%, #cc4400 100%)' : '#1a1a1a',
                    boxShadow: englChannel === 3 ? '0 0 10px #ff6600, inset 0 1px 2px rgba(255,255,255,0.3)' : 'inset 0 1px 2px rgba(0,0,0,0.8)',
                    border: '1px solid ' + (englChannel === 3 ? '#ff6600' : '#0a0a0a')
                  }}></div>
                  <button 
                    onClick={() => onUpdate(amp.id, 'channel', 3)}
                    style={{
                      padding: '4px 8px',
                      background: englChannel === 3 ? 'linear-gradient(135deg, #ff0000 0%, #cc0000 100%)' : 'rgba(0,0,0,0.7)',
                      border: '1px solid ' + (englChannel === 3 ? '#ff0000' : '#666'),
                      color: englChannel === 3 ? '#fff' : '#ff4444',
                      borderRadius: '2px',
                      cursor: 'pointer',
                      fontWeight: 'bold',
                      fontSize: '8px',
                      textTransform: 'uppercase',
                      transition: 'all 0.2s',
                      boxShadow: englChannel === 3 ? '0 0 8px rgba(255,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.2)' : 'none'
                    }}
                  >SFT</button>
                </div>

                {/* Heavy Lead LED + Button */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
                  <div style={{
                    width: '9px',
                    height: '9px',
                    borderRadius: '50%',
                    background: englChannel === 4 ? 'radial-gradient(circle, #ff0000 0%, #aa0000 100%)' : '#1a1a1a',
                    boxShadow: englChannel === 4 ? '0 0 10px #ff0000, inset 0 1px 2px rgba(255,255,255,0.3)' : 'inset 0 1px 2px rgba(0,0,0,0.8)',
                    border: '1px solid ' + (englChannel === 4 ? '#ff0000' : '#0a0a0a')
                  }}></div>
                  <button 
                    onClick={() => onUpdate(amp.id, 'channel', 4)}
                    style={{
                      padding: '4px 8px',
                      background: englChannel === 4 ? 'linear-gradient(135deg, #ff0000 0%, #cc0000 100%)' : 'rgba(0,0,0,0.7)',
                      border: '1px solid ' + (englChannel === 4 ? '#ff0000' : '#666'),
                      color: englChannel === 4 ? '#fff' : '#ff4444',
                      borderRadius: '2px',
                      cursor: 'pointer',
                      fontWeight: 'bold',
                      fontSize: '8px',
                      textTransform: 'uppercase',
                      transition: 'all 0.2s',
                      boxShadow: englChannel === 4 ? '0 0 8px rgba(255,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.2)' : 'none'
                    }}
                  >HVY</button>
                </div>
              </div>

              {/* BRIGHT + GATE + CABINET */}
              <div style={{
                display: 'flex',
                gap: '4px',
                padding: '4px 6px',
                background: 'rgba(0,0,0,0.9)',
                borderRadius: '4px',
                border: '1px solid rgba(255,0,0,0.6)',
                alignItems: 'center'
              }}>
                <button
                  onClick={() => onUpdate(amp.id, 'bright', !amp.params?.bright)}
                  style={{
                    padding: '5px 10px',
                    background: amp.params?.bright ? 'linear-gradient(135deg, #ffaa00 0%, #cc8800 100%)' : 'rgba(0,0,0,0.7)',
                    border: '1px solid ' + (amp.params?.bright ? '#ffaa00' : '#666'),
                    color: amp.params?.bright ? '#000' : '#ffaa00',
                    borderRadius: '2px',
                    cursor: 'pointer',
                    fontWeight: 'bold',
                    fontSize: '8px',
                    textTransform: 'uppercase',
                    transition: 'all 0.2s',
                    boxShadow: amp.params?.bright ? '0 0 6px rgba(255,170,0,0.6), inset 0 1px 0 rgba(255,255,255,0.3)' : 'none'
                  }}
                >BRIGHT</button>

                <button
                  onClick={() => onUpdate(amp.id, 'gate', !amp.params?.gate)}
                  style={{
                    padding: '5px 10px',
                    background: amp.params?.gate !== false ? 'linear-gradient(135deg, #00c864 0%, #00a050 100%)' : 'rgba(0,0,0,0.7)',
                    border: '1px solid ' + (amp.params?.gate !== false ? '#00c864' : '#666'),
                    color: amp.params?.gate !== false ? '#000' : '#00c864',
                    borderRadius: '2px',
                    cursor: 'pointer',
                    fontWeight: 'bold',
                    fontSize: '8px',
                    textTransform: 'uppercase',
                    transition: 'all 0.2s',
                    boxShadow: amp.params?.gate !== false ? '0 0 6px rgba(0,200,100,0.6), inset 0 1px 0 rgba(255,255,255,0.3)' : 'none'
                  }}
                >GATE</button>
                
                <button
                  onClick={() => onUpdate(amp.id, 'cabinet_enabled', !amp.params?.cabinet_enabled)}
                  style={{
                    padding: '5px 10px',
                    background: amp.params?.cabinet_enabled !== false ? 'linear-gradient(135deg, #ff0000 0%, #cc0000 100%)' : 'rgba(0,0,0,0.7)',
                    border: '1px solid ' + (amp.params?.cabinet_enabled !== false ? '#ff0000' : '#666'),
                    color: amp.params?.cabinet_enabled !== false ? '#fff' : '#ff4444',
                    borderRadius: '2px',
                    cursor: 'pointer',
                    fontWeight: 'bold',
                    fontSize: '8px',
                    textTransform: 'uppercase',
                    transition: 'all 0.2s',
                    boxShadow: amp.params?.cabinet_enabled !== false ? '0 0 6px rgba(255,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.2)' : 'none'
                  }}
                >CAB</button>
              </div>
            </div>
          </div>
        );
      
      // ============================================
      // SOLDANO SLO-100 - COMPLETE CONTROLS
      // ============================================
      case 'soldano_slo100_controls':
        const soldanoChannel = amp.params?.channel || 1;
        return (
          <div key="soldano_slo100_controls" className="soldano-slo100-full-controls" style={{
              display: 'flex',
              flexDirection: 'column',
            gap: '5px',
            padding: '6px 8px',
            background: 'repeating-radial-gradient(circle at 2px 2px, rgba(100,100,100,0.8) 0px, transparent 1px), linear-gradient(135deg, #b0b0b0 0%, #909090 100%)',
            backgroundSize: '4px 4px, 100% 100%',
            borderRadius: '4px',
            border: '2px solid #707070',
            boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.2), inset 0 2px 4px rgba(0,0,0,0.3)',
            maxWidth: '850px',
            alignItems: 'center'
          }}>
            {/* LINHA SUPERIOR - KNOBS PRINCIPAIS */}
            <div style={{
              display: 'flex',
              flexDirection: 'row',
              gap: '5px',
              flexWrap: 'nowrap',
              justifyContent: 'center',
              alignItems: 'center'
            }}>
              {/* GAIN + PREAMP */}
              <div style={{
                display: 'flex',
                gap: '6px',
                padding: '4px 6px',
              background: 'rgba(0,0,0,0.3)',
                borderRadius: '4px',
                border: '1px solid rgba(255,255,255,0.2)'
              }}>
                <Knob 
                  label="GAIN" 
                  value={amp.params?.gain || 70} 
                  onChange={handleKnobChange('gain')} 
                  size={28} 
                  color="#1a1a1a" 
                />
                <Knob 
                  label="PRE" 
                  value={amp.params?.master_gain || 70} 
                  onChange={handleKnobChange('master_gain')} 
                  size={28} 
                  color="#1a1a1a" 
                />
            </div>

              {/* TONE STACK */}
            <div style={{
              display: 'flex',
                gap: '6px',
                padding: '4px 6px',
                background: 'rgba(0,0,0,0.3)',
                borderRadius: '4px',
                border: '1px solid rgba(255,255,255,0.2)'
              }}>
                <Knob label="BASS" value={amp.params?.bass || 60} onChange={handleKnobChange('bass')} size={26} color="#1a1a1a" />
                <Knob label="MID" value={amp.params?.mid || 50} onChange={handleKnobChange('mid')} size={26} color="#1a1a1a" />
                <Knob label="TREB" value={amp.params?.treble || 65} onChange={handleKnobChange('treble')} size={26} color="#1a1a1a" />
              </div>

              {/* PRESENCE + DEPTH + MASTER */}
              <div style={{
                display: 'flex',
                gap: '6px',
                padding: '4px 6px',
                background: 'rgba(0,0,0,0.3)',
                borderRadius: '4px',
                border: '1px solid rgba(255,255,255,0.2)'
              }}>
                <Knob label="PRES" value={amp.params?.presence || 60} onChange={handleKnobChange('presence')} size={26} color="#1a1a1a" />
                <Knob label="DEPTH" value={amp.params?.depth || 50} onChange={handleKnobChange('depth')} size={26} color="#1a1a1a" />
                <Knob label="MSTR" value={amp.params?.master || 70} onChange={handleKnobChange('master')} size={28} color="#1a1a1a" />
                </div>
              </div>

            {/* LINHA INFERIOR - CHANNEL SELECTOR + SWITCHES */}
            <div style={{
              display: 'flex',
              flexDirection: 'row',
              gap: '6px',
              flexWrap: 'nowrap',
              justifyContent: 'center',
              alignItems: 'center'
            }}>
              {/* CHANNEL SELECTOR COM LEDs */}
              <div style={{
                display: 'flex',
                flexDirection: 'row',
                gap: '4px',
                padding: '4px 8px',
                background: 'rgba(0,0,0,0.5)',
                borderRadius: '4px',
                border: '1px solid rgba(255,255,255,0.3)',
                alignItems: 'center'
              }}>
                <label style={{ fontSize: '8px', color: '#ffffff', fontWeight: 'bold', marginRight: '4px', textTransform: 'uppercase' }}>CHANNEL</label>
                
                {/* Normal LED + Button */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
                  <div style={{
                    width: '9px',
                    height: '9px',
                    borderRadius: '50%',
                    background: soldanoChannel === 0 ? 'radial-gradient(circle, #00ff00 0%, #00aa00 100%)' : '#1a1a1a',
                    boxShadow: soldanoChannel === 0 ? '0 0 10px #00ff00, inset 0 1px 2px rgba(255,255,255,0.3)' : 'inset 0 1px 2px rgba(0,0,0,0.8)',
                    border: '1px solid ' + (soldanoChannel === 0 ? '#00ff00' : '#0a0a0a')
                  }}></div>
                  <button 
                    onClick={() => onUpdate(amp.id, 'channel', 0)}
                    style={{
                      padding: '4px 10px',
                      background: soldanoChannel === 0 ? 'linear-gradient(135deg, #e0e0e0 0%, #c0c0c0 100%)' : 'rgba(0,0,0,0.7)',
                      border: '1px solid ' + (soldanoChannel === 0 ? '#ffffff' : '#666'),
                      color: soldanoChannel === 0 ? '#000' : '#ffffff',
                      borderRadius: '2px',
                      cursor: 'pointer',
                      fontWeight: 'bold',
                      fontSize: '8px',
                      textTransform: 'uppercase',
                      transition: 'all 0.2s',
                      boxShadow: soldanoChannel === 0 ? 'inset 0 1px 0 rgba(255,255,255,0.4)' : 'none'
                    }}
                  >NORM</button>
                </div>

                {/* Overdrive LED + Button */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
                  <div style={{
                    width: '9px',
                    height: '9px',
                    borderRadius: '50%',
                    background: soldanoChannel === 1 ? 'radial-gradient(circle, #ff0000 0%, #aa0000 100%)' : '#1a1a1a',
                    boxShadow: soldanoChannel === 1 ? '0 0 10px #ff0000, inset 0 1px 2px rgba(255,255,255,0.3)' : 'inset 0 1px 2px rgba(0,0,0,0.8)',
                    border: '1px solid ' + (soldanoChannel === 1 ? '#ff0000' : '#0a0a0a')
                  }}></div>
                  <button 
                    onClick={() => onUpdate(amp.id, 'channel', 1)}
                    style={{
                      padding: '4px 10px',
                      background: soldanoChannel === 1 ? 'linear-gradient(135deg, #e0e0e0 0%, #c0c0c0 100%)' : 'rgba(0,0,0,0.7)',
                      border: '1px solid ' + (soldanoChannel === 1 ? '#ffffff' : '#666'),
                      color: soldanoChannel === 1 ? '#000' : '#ffffff',
                      borderRadius: '2px',
                      cursor: 'pointer',
                      fontWeight: 'bold',
                      fontSize: '8px',
                      textTransform: 'uppercase',
                      transition: 'all 0.2s',
                      boxShadow: soldanoChannel === 1 ? 'inset 0 1px 0 rgba(255,255,255,0.4)' : 'none'
                    }}
                  >OD</button>
              </div>
            </div>

              {/* BRIGHT SWITCH */}
            <div style={{
              display: 'flex',
                gap: '4px',
                padding: '4px 6px',
                background: 'rgba(0,0,0,0.5)',
                borderRadius: '4px',
                border: '1px solid rgba(255,255,255,0.3)',
                alignItems: 'center'
              }}>
                <button
                  onClick={() => onUpdate(amp.id, 'bright', !amp.params?.bright)}
                  style={{
                    padding: '5px 10px',
                    background: amp.params?.bright ? 'linear-gradient(135deg, #ffd700 0%, #d4af37 100%)' : 'rgba(0,0,0,0.7)',
                    border: '1px solid ' + (amp.params?.bright ? '#ffd700' : '#666'),
                    color: amp.params?.bright ? '#000' : '#ffd700',
                    borderRadius: '2px',
                    cursor: 'pointer',
                    fontWeight: 'bold',
                    fontSize: '8px',
                    textTransform: 'uppercase',
                    transition: 'all 0.2s',
                    boxShadow: amp.params?.bright ? '0 0 6px rgba(255,215,0,0.6), inset 0 1px 0 rgba(255,255,255,0.3)' : 'none'
                  }}
                >BRIGHT</button>
            </div>

              {/* GATE + CABINET */}
              <div style={{
                display: 'flex',
                gap: '4px',
                padding: '4px 6px',
                background: 'rgba(0,0,0,0.5)',
                borderRadius: '4px',
                border: '1px solid rgba(255,255,255,0.3)',
                alignItems: 'center'
              }}>
                <button
                  onClick={() => onUpdate(amp.id, 'gate', !amp.params?.gate)}
                  style={{
                    padding: '5px 10px',
                    background: amp.params?.gate ? 'linear-gradient(135deg, #00c864 0%, #00a050 100%)' : 'rgba(0,0,0,0.7)',
                    border: '1px solid ' + (amp.params?.gate ? '#00c864' : '#666'),
                    color: amp.params?.gate ? '#000' : '#00c864',
                    borderRadius: '2px',
                    cursor: 'pointer',
                    fontWeight: 'bold',
                    fontSize: '8px',
                    textTransform: 'uppercase',
                    transition: 'all 0.2s',
                    boxShadow: amp.params?.gate ? '0 0 6px rgba(0,200,100,0.6), inset 0 1px 0 rgba(255,255,255,0.3)' : 'none'
                  }}
                >GATE</button>
                
                <button
                  onClick={() => onUpdate(amp.id, 'cabinet_enabled', !(amp.params?.cabinet_enabled !== false))}
                  style={{
                    padding: '5px 10px',
                    background: amp.params?.cabinet_enabled !== false ? 'linear-gradient(135deg, #ffffff 0%, #e0e0e0 100%)' : 'rgba(0,0,0,0.7)',
                    border: '1px solid ' + (amp.params?.cabinet_enabled !== false ? '#ffffff' : '#666'),
                    color: amp.params?.cabinet_enabled !== false ? '#000' : '#ffffff',
                    borderRadius: '2px',
                    cursor: 'pointer',
                    fontWeight: 'bold',
                    fontSize: '8px',
                    textTransform: 'uppercase',
                    transition: 'all 0.2s',
                    boxShadow: amp.params?.cabinet_enabled !== false ? 'inset 0 1px 0 rgba(255,255,255,0.5)' : 'none'
                  }}
                >CAB</button>
                </div>
              </div>
          </div>
        );
      
      // ============================================
      // TWO-ROCK CLASSIC - COMPLETE CONTROLS
      // ============================================
      case 'tworock_classic_controls':
        const tworockChannel = amp.params?.channel || 0;
        return (
          <div key="tworock_classic_controls" className="tworock-classic-full-controls" style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '5px',
            padding: '6px 8px',
            background: 'repeating-radial-gradient(circle at 2px 2px, rgba(90,90,90,0.6) 0px, transparent 1px), linear-gradient(135deg, #6a6a6a 0%, #5a5a5a 100%)',
            backgroundSize: '4px 4px, 100% 100%',
            borderRadius: '4px',
            border: '2px solid #4a4a4a',
            boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.1), inset 0 2px 4px rgba(0,0,0,0.4)',
            maxWidth: '850px',
            alignItems: 'center'
          }}>
            {/* LINHA SUPERIOR - KNOBS PRINCIPAIS */}
            <div style={{
              display: 'flex',
              flexDirection: 'row',
              gap: '5px',
              flexWrap: 'nowrap',
              justifyContent: 'center',
              alignItems: 'center'
            }}>
              {/* GAIN + VOLUME */}
              <div style={{
                display: 'flex',
                gap: '6px',
                padding: '4px 6px',
                background: 'rgba(0,0,0,0.3)',
                borderRadius: '4px',
                border: '1px solid rgba(192,192,192,0.2)'
              }}>
                <Knob 
                  label="GAIN" 
                  value={amp.params?.gain || 50} 
                  onChange={handleKnobChange('gain')} 
                  size={28} 
                  color="#1a1a1a" 
                />
                <Knob 
                  label="VOL" 
                  value={amp.params?.channel_volume || 70} 
                  onChange={handleKnobChange('channel_volume')} 
                  size={28} 
                  color="#1a1a1a" 
                />
              </div>

              {/* TONE STACK */}
              <div style={{
                display: 'flex',
                gap: '6px',
                padding: '4px 6px',
                background: 'rgba(0,0,0,0.3)',
                borderRadius: '4px',
                border: '1px solid rgba(192,192,192,0.2)'
              }}>
                <Knob label="BASS" value={amp.params?.bass || 50} onChange={handleKnobChange('bass')} size={26} color="#1a1a1a" />
                <Knob label="MID" value={amp.params?.mid || 50} onChange={handleKnobChange('mid')} size={26} color="#1a1a1a" />
                <Knob label="TREB" value={amp.params?.treble || 50} onChange={handleKnobChange('treble')} size={26} color="#1a1a1a" />
            </div>

              {/* PRESENCE + DEPTH + MASTER */}
            <div style={{
              display: 'flex',
                gap: '6px',
                padding: '4px 6px',
                background: 'rgba(0,0,0,0.3)',
                borderRadius: '4px',
                border: '1px solid rgba(192,192,192,0.2)'
              }}>
                <Knob label="PRES" value={amp.params?.presence || 50} onChange={handleKnobChange('presence')} size={26} color="#1a1a1a" />
                <Knob label="DEPTH" value={amp.params?.depth || 50} onChange={handleKnobChange('depth')} size={26} color="#1a1a1a" />
                <Knob label="MSTR" value={amp.params?.master || 70} onChange={handleKnobChange('master')} size={28} color="#1a1a1a" />
              </div>

              {/* REVERB */}
              <div style={{
                display: 'flex',
                gap: '6px',
                padding: '4px 6px',
                background: 'rgba(0,0,0,0.3)',
                borderRadius: '4px',
                border: '1px solid rgba(192,192,192,0.2)'
              }}>
                <Knob label="REV" value={amp.params?.reverb || 30} onChange={handleKnobChange('reverb')} size={26} color="#1a1a1a" />
                <Knob label="DECAY" value={amp.params?.reverb_decay || 45} onChange={handleKnobChange('reverb_decay')} size={26} color="#1a1a1a" />
                </div>
              </div>

            {/* LINHA INFERIOR - CHANNEL SELECTOR + SWITCHES */}
            <div style={{
              display: 'flex',
              flexDirection: 'row',
              gap: '6px',
              flexWrap: 'nowrap',
              justifyContent: 'center',
              alignItems: 'center'
            }}>
              {/* CHANNEL SELECTOR COM LEDs */}
              <div style={{
                display: 'flex',
                flexDirection: 'row',
                gap: '4px',
                padding: '4px 8px',
                background: 'rgba(0,0,0,0.5)',
                borderRadius: '4px',
                border: '1px solid rgba(192,192,192,0.3)',
                alignItems: 'center'
              }}>
                <label style={{ fontSize: '8px', color: '#e0e0e0', fontWeight: 'bold', marginRight: '4px', textTransform: 'uppercase' }}>CHANNEL</label>
                
                {/* Clean LED + Button */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
                  <div style={{
                    width: '9px',
                    height: '9px',
                    borderRadius: '50%',
                    background: tworockChannel === 0 ? 'radial-gradient(circle, #00ff00 0%, #00aa00 100%)' : '#1a1a1a',
                    boxShadow: tworockChannel === 0 ? '0 0 10px #00ff00, inset 0 1px 2px rgba(255,255,255,0.3)' : 'inset 0 1px 2px rgba(0,0,0,0.8)',
                    border: '1px solid ' + (tworockChannel === 0 ? '#00ff00' : '#0a0a0a')
                  }}></div>
                  <button 
                    onClick={() => onUpdate(amp.id, 'channel', 0)}
                    style={{
                      padding: '4px 10px',
                      background: tworockChannel === 0 ? 'linear-gradient(135deg, #d0d0d0 0%, #b0b0b0 100%)' : 'rgba(0,0,0,0.7)',
                      border: '1px solid ' + (tworockChannel === 0 ? '#e0e0e0' : '#666'),
                      color: tworockChannel === 0 ? '#000' : '#e0e0e0',
                      borderRadius: '2px',
                      cursor: 'pointer',
                      fontWeight: 'bold',
                      fontSize: '8px',
                      textTransform: 'uppercase',
                      transition: 'all 0.2s',
                      boxShadow: tworockChannel === 0 ? 'inset 0 1px 0 rgba(255,255,255,0.4)' : 'none'
                    }}
                  >CLEAN</button>
                </div>

                {/* Lead LED + Button */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
                  <div style={{
                    width: '9px',
                    height: '9px',
                    borderRadius: '50%',
                    background: tworockChannel === 1 ? 'radial-gradient(circle, #ffa500 0%, #cc8400 100%)' : '#1a1a1a',
                    boxShadow: tworockChannel === 1 ? '0 0 10px #ffa500, inset 0 1px 2px rgba(255,255,255,0.3)' : 'inset 0 1px 2px rgba(0,0,0,0.8)',
                    border: '1px solid ' + (tworockChannel === 1 ? '#ffa500' : '#0a0a0a')
                  }}></div>
                  <button 
                    onClick={() => onUpdate(amp.id, 'channel', 1)}
                    style={{
                      padding: '4px 10px',
                      background: tworockChannel === 1 ? 'linear-gradient(135deg, #d0d0d0 0%, #b0b0b0 100%)' : 'rgba(0,0,0,0.7)',
                      border: '1px solid ' + (tworockChannel === 1 ? '#e0e0e0' : '#666'),
                      color: tworockChannel === 1 ? '#000' : '#e0e0e0',
                      borderRadius: '2px',
                      cursor: 'pointer',
                      fontWeight: 'bold',
                      fontSize: '8px',
                      textTransform: 'uppercase',
                      transition: 'all 0.2s',
                      boxShadow: tworockChannel === 1 ? 'inset 0 1px 0 rgba(255,255,255,0.4)' : 'none'
                    }}
                  >LEAD</button>
              </div>
            </div>

              {/* BOOST SWITCH */}
            <div style={{
              display: 'flex',
                gap: '4px',
                padding: '4px 6px',
                background: 'rgba(0,0,0,0.5)',
                borderRadius: '4px',
                border: '1px solid rgba(192,192,192,0.3)',
                alignItems: 'center'
              }}>
                <button
                  onClick={() => onUpdate(amp.id, 'boost', !amp.params?.boost)}
                  style={{
                    padding: '5px 12px',
                    background: amp.params?.boost ? 'linear-gradient(135deg, #ff8c00 0%, #cc7000 100%)' : 'rgba(0,0,0,0.7)',
                    border: '1px solid ' + (amp.params?.boost ? '#ff8c00' : '#666'),
                    color: amp.params?.boost ? '#000' : '#ff8c00',
                    borderRadius: '2px',
                    cursor: 'pointer',
                    fontWeight: 'bold',
                    fontSize: '8px',
                    textTransform: 'uppercase',
                    transition: 'all 0.2s',
                    boxShadow: amp.params?.boost ? '0 0 6px rgba(255,140,0,0.6), inset 0 1px 0 rgba(255,255,255,0.3)' : 'none'
                  }}
                >BOOST</button>
              </div>

              {/* CABINET */}
              <div style={{
                display: 'flex',
                gap: '4px',
                padding: '4px 6px',
                background: 'rgba(0,0,0,0.5)',
                borderRadius: '4px',
                border: '1px solid rgba(192,192,192,0.3)',
                alignItems: 'center'
              }}>
                <button
                  onClick={() => onUpdate(amp.id, 'cabinet_enabled', !(amp.params?.cabinet_enabled !== false))}
                  style={{
                    padding: '5px 12px',
                    background: amp.params?.cabinet_enabled !== false ? 'linear-gradient(135deg, #d0d0d0 0%, #b0b0b0 100%)' : 'rgba(0,0,0,0.7)',
                    border: '1px solid ' + (amp.params?.cabinet_enabled !== false ? '#e0e0e0' : '#666'),
                    color: amp.params?.cabinet_enabled !== false ? '#000' : '#e0e0e0',
                    borderRadius: '2px',
                    cursor: 'pointer',
                    fontWeight: 'bold',
                    fontSize: '8px',
                    textTransform: 'uppercase',
                    transition: 'all 0.2s',
                    boxShadow: amp.params?.cabinet_enabled !== false ? 'inset 0 1px 0 rgba(255,255,255,0.4)' : 'none'
                  }}
                >CAB</button>
              </div>
            </div>
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
            className={`amp-head ${amp.bypassed ? 'bypassed' : ''} amp-${amp.ampType || 'fender_twin_reverb'}`}
            whileHover={{ y: -3, scale: 1.02 }}
          >
        <div className="amp-head-top">
          <div className="amp-brand-logo">
            <span className="brand-text">{ampStyle.brand}</span>
            <span className="model-text">{ampStyle.logo}</span>
          </div>
          
          <select 
            className="amp-type-selector" 
            value={amp.ampType || 'fender_twin_reverb'}
            onChange={handleTypeChange}
          >
            <optgroup label="🎵 CLEAN/VINTAGE">
              <option value="fender_twin_reverb">Fender Twin Reverb</option>
              <option value="vox_ac30">Vox AC30</option>
              <option value="fender_deluxe">Fender Deluxe Reverb</option>
              <option value="fender_vibro_king">Fender Vibro-King</option>
              <option value="fender_bassman">Fender Bassman</option>
              <option value="fender_pro_junior">Fender Pro Junior</option>
              <option value="roland_jc120">Roland JC-120</option>
              <option value="matchless_dc30">Matchless DC-30</option>
            </optgroup>
            
            <optgroup label="🔥 CRUNCH/BRITISH">
              <option value="marshall_jcm800">Marshall JCM800</option>
              <option value="orange_rockerverb">Orange Rockerverb</option>
              <option value="orange_tiny_terror">Orange Tiny Terror</option>
              <option value="hiwatt_dr103">Hiwatt DR103</option>
              <option value="marshall_jtm45">Marshall JTM45</option>
              <option value="badcat_hotcat">Bad Cat Hot Cat</option>
            </optgroup>
            
            <optgroup label="🤘 HIGH GAIN/MODERN">
              <option value="peavey_5150">Peavey 5150</option>
              <option value="mesa_dual_rectifier">Mesa Dual Rectifier</option>
              <option value="bogner_ecstasy">Bogner Ecstasy</option>
              <option value="bogner_uberschall">Bogner Überschall</option>
              <option value="diezel_vh4">Diezel VH4</option>
              <option value="engl_powerball">ENGL Powerball</option>
              <option value="friedman_be100">Friedman BE-100</option>
              <option value="soldano_slo100">Soldano SLO-100</option>
            </optgroup>
            
            <optgroup label="✨ BOUTIQUE/MODERN">
              <option value="tworock_classic">Two-Rock Classic</option>
              <option value="dumble_ods">Dumble ODS</option>
              <option value="mesa_mark_v">Mesa Mark V</option>
              <option value="mesa_transatlantic_ta30">Mesa TransAtlantic TA-30</option>
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
            {/* VOX AC30 has different control layout */}
            {amp.ampType === 'fender_twin_reverb' ? (
              /* FENDER TWIN REVERB - Authentic Blackface layout */
              <div className="twin-reverb-knobs-layout" style={{ display: 'flex', gap: '8px', justifyContent: 'center', alignItems: 'center' }}>
                {/* Volume do canal ativo */}
                <Knob 
                  label="VOLUME" 
                  value={amp.params?.channel === 'normal' ? (amp.params?.normal_volume || 50) : (amp.params?.vibrato_volume || 50)} 
                  onChange={handleKnobChange(amp.params?.channel === 'normal' ? 'normal_volume' : 'vibrato_volume')} 
                  size={36} 
                />
                <Knob label="TREBLE" value={amp.params?.treble || 60} onChange={handleKnobChange('treble')} size={36} />
                <Knob label="BASS" value={amp.params?.bass || 50} onChange={handleKnobChange('bass')} size={36} />
                <Knob label="MID" value={amp.params?.mid || 50} onChange={handleKnobChange('mid')} size={36} />
                <Knob label="MASTER" value={amp.params?.master || 70} onChange={handleKnobChange('master')} size={36} />
              </div>
            ) : amp.ampType === 'fender_vibro_king' ? (
              /* FENDER VIBRO-KING - Boutique Blackface layout */
              <div className="vibro-king-knobs-layout" style={{ display: 'flex', gap: '8px', justifyContent: 'center', alignItems: 'center' }}>
                <Knob label="VOLUME" value={amp.params?.volume || 65} onChange={handleKnobChange('volume')} size={36} />
                <Knob label="TREBLE" value={amp.params?.treble || 65} onChange={handleKnobChange('treble')} size={36} />
                <Knob label="BASS" value={amp.params?.bass || 55} onChange={handleKnobChange('bass')} size={36} />
                <Knob label="MID" value={amp.params?.mid || 50} onChange={handleKnobChange('mid')} size={36} />
                <Knob label="MASTER" value={amp.params?.master || 70} onChange={handleKnobChange('master')} size={36} />
              </div>
            ) : amp.ampType === 'vox_ac30' ? (
              <div className="vox-knobs-layout">
                {/* Top Boost Channel: Volume, Bass, Treble, Master */}
                {amp.params?.channel !== 0 && (
                  <>
                    <Knob label="VOLUME" value={amp.params?.topboost_volume || 60} onChange={handleKnobChange('topboost_volume')} size={28} />
                    <Knob label="BASS" value={amp.params?.bass || 50} onChange={handleKnobChange('bass')} size={28} />
                    <Knob label="TREBLE" value={amp.params?.treble || 60} onChange={handleKnobChange('treble')} size={28} />
                    <Knob label="MASTER" value={amp.params?.master || 70} onChange={handleKnobChange('master')} size={28} />
                  </>
                )}
                {/* Normal Channel: only Master (Top Boost inactive) */}
                {amp.params?.channel === 0 && (
                  <>
                    <div style={{ opacity: 0.2, pointerEvents: 'none' }}>
                      <Knob label="VOLUME" value={50} onChange={() => {}} size={28} />
                    </div>
                    <div style={{ opacity: 0.2, pointerEvents: 'none' }}>
                      <Knob label="BASS" value={50} onChange={() => {}} size={28} />
                    </div>
                    <div style={{ opacity: 0.2, pointerEvents: 'none' }}>
                      <Knob label="TREBLE" value={50} onChange={() => {}} size={28} />
                    </div>
                    <Knob label="MASTER" value={amp.params?.master || 70} onChange={handleKnobChange('master')} size={28} />
                  </>
                )}
              </div>
            ) : amp.ampType === 'roland_jc120' ? (
              /* ROLAND JC-120 - Authentic Jazz Chorus layout */
              <div className="jc120-knobs-layout" style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', justifyContent: 'center' }}>
                <div className="knob-group" style={{ display: 'flex', gap: '8px', flexDirection: 'column', alignItems: 'center', padding: '8px', background: 'rgba(0,0,0,0.2)', borderRadius: '8px' }}>
                  <span style={{ fontSize: '10px', fontWeight: 'bold', color: '#4a9eff', textTransform: 'uppercase' }}>Volume & Tone</span>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <Knob label="Volume" value={amp.params?.ch1_volume || 50} onChange={handleKnobChange('ch1_volume')} size={36} />
                    <Knob label="Bass" value={amp.params?.bass || 50} onChange={handleKnobChange('bass')} size={36} />
                    <Knob label="Mid" value={amp.params?.mid || 45} onChange={handleKnobChange('mid')} size={36} />
                    <Knob label="Treble" value={amp.params?.treble || 60} onChange={handleKnobChange('treble')} size={36} />
                  </div>
                </div>
                <div className="knob-group" style={{ display: 'flex', gap: '8px', flexDirection: 'column', alignItems: 'center', padding: '8px', background: 'rgba(0,0,0,0.2)', borderRadius: '8px' }}>
                  <span style={{ fontSize: '10px', fontWeight: 'bold', color: '#4a9eff', textTransform: 'uppercase' }}>Chorus</span>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <Knob label="Rate" value={amp.params?.chorus_rate || 40} onChange={handleKnobChange('chorus_rate')} size={36} />
                    <Knob label="Depth" value={amp.params?.chorus_depth || 50} onChange={handleKnobChange('chorus_depth')} size={36} />
                  </div>
                </div>
                <div className="knob-group" style={{ display: 'flex', gap: '8px', flexDirection: 'column', alignItems: 'center', padding: '8px', background: 'rgba(0,0,0,0.2)', borderRadius: '8px' }}>
                  <span style={{ fontSize: '10px', fontWeight: 'bold', color: '#4a9eff', textTransform: 'uppercase' }}>Master</span>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <Knob label="Master" value={amp.params?.master || 70} onChange={handleKnobChange('master')} size={36} />
                  </div>
                </div>
              </div>
            ) : amp.ampType === 'fender_pro_junior' ? (
              /* FENDER PRO JUNIOR - Apenas Volume + Tone (como o real) */
              <div className="pro-junior-knobs-layout" style={{ display: 'flex', gap: '24px', justifyContent: 'center', alignItems: 'center', padding: '16px' }}>
                <Knob 
                  label="VOLUME" 
                  value={amp.params?.volume || 60} 
                  onChange={handleKnobChange('volume')} 
                  size={52}
                  color="#000000"
                />
                <Knob 
                  label="TONE" 
                  value={amp.params?.tone || 60} 
                  onChange={handleKnobChange('tone')} 
                  size={52}
                  color="#000000"
                />
              </div>
            ) : amp.ampType === 'matchless_dc30' ? (
              /* MATCHLESS DC-30 - Compact dual-channel boutique layout */
              <div className="matchless-dc30-knobs-layout" style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'center', width: '100%' }}>
                {/* CHANNEL SELECTOR */}
                <div className="knob-group" style={{ 
                  display: 'flex', 
                  gap: '6px', 
                  flexDirection: 'column', 
                  alignItems: 'center', 
                  padding: '8px 10px', 
                  background: 'linear-gradient(135deg, rgba(139,115,85,0.3), rgba(139,115,85,0.15))', 
                  borderRadius: '8px',
                  border: '2px solid rgba(139,115,85,0.5)',
                  minWidth: '140px'
                }}>
                  <span style={{ fontSize: '9px', fontWeight: 'bold', color: '#8b7355', textTransform: 'uppercase', letterSpacing: '1px' }}>Channel</span>
                  <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                    <button 
                      onClick={() => onUpdate(amp.id, 'channel', 1)}
                      style={{
                        padding: '6px 12px',
                        background: amp.params?.channel === 1 ? 'linear-gradient(135deg, #d4c5a0, #c4b5a0)' : 'rgba(0,0,0,0.5)',
                        border: '1px solid #8b7355',
                        color: amp.params?.channel === 1 ? '#4a4030' : '#8b7355',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontWeight: 'bold',
                        fontSize: '10px',
                        boxShadow: amp.params?.channel === 1 ? '0 2px 4px rgba(139,115,85,0.4)' : 'none',
                        transition: 'all 0.2s ease'
                      }}
                    >CH 1<br/><span style={{ fontSize: '8px', fontWeight: 'normal' }}>EF86</span></button>
                    <button 
                      onClick={() => onUpdate(amp.id, 'channel', 2)}
                      style={{
                        padding: '6px 12px',
                        background: amp.params?.channel === 2 ? 'linear-gradient(135deg, #d4c5a0, #c4b5a0)' : 'rgba(0,0,0,0.5)',
                        border: '1px solid #8b7355',
                        color: amp.params?.channel === 2 ? '#4a4030' : '#8b7355',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontWeight: 'bold',
                        fontSize: '10px',
                        boxShadow: amp.params?.channel === 2 ? '0 2px 4px rgba(139,115,85,0.4)' : 'none',
                        transition: 'all 0.2s ease'
                      }}
                    >CH 2<br/><span style={{ fontSize: '8px', fontWeight: 'normal' }}>12AX7</span></button>
                  </div>
                </div>

                {/* CHANNEL 1 VOLUME */}
                <div className="knob-group" style={{ 
                  display: 'flex', 
                  gap: '6px', 
                  flexDirection: 'column', 
                  alignItems: 'center', 
                  padding: '8px', 
                  background: amp.params?.channel === 1 ? 'linear-gradient(135deg, rgba(139,115,85,0.3), rgba(139,115,85,0.15))' : 'rgba(0,0,0,0.2)', 
                  borderRadius: '6px',
                  border: amp.params?.channel === 1 ? '2px solid rgba(139,115,85,0.4)' : '1px solid rgba(139,115,85,0.2)',
                  opacity: amp.params?.channel === 1 ? 1 : 0.5
                }}>
                  <span style={{ fontSize: '9px', fontWeight: 'bold', color: '#8b7355', textTransform: 'uppercase' }}>Ch1 Volume</span>
                  <Knob label="EF86" value={amp.params?.ch1_volume || 55} onChange={handleKnobChange('ch1_volume')} size={28} />
                  {/* BRILLIANCE SWITCH (CH1 only) */}
                  {amp.params?.channel === 1 && (
                    <div style={{ marginTop: '3px' }}>
                      <label style={{ fontSize: '7px', color: '#8b7355', display: 'flex', alignItems: 'center', gap: '3px', cursor: 'pointer' }}>
                        <input 
                          type="checkbox" 
                          checked={amp.params?.brilliance || false}
                          onChange={(e) => onUpdate(amp.id, 'brilliance', e.target.checked ? 1 : 0)}
                          style={{ cursor: 'pointer' }}
                        />
                        BRILLIANCE
                      </label>
                    </div>
                  )}
                </div>

                {/* CHANNEL 2 VOLUME */}
                <div className="knob-group" style={{ 
                  display: 'flex', 
                  gap: '6px', 
                  flexDirection: 'column', 
                  alignItems: 'center', 
                  padding: '8px', 
                  background: amp.params?.channel === 2 ? 'linear-gradient(135deg, rgba(139,115,85,0.3), rgba(139,115,85,0.15))' : 'rgba(0,0,0,0.2)', 
                  borderRadius: '6px',
                  border: amp.params?.channel === 2 ? '2px solid rgba(139,115,85,0.4)' : '1px solid rgba(139,115,85,0.2)',
                  opacity: amp.params?.channel === 2 ? 1 : 0.5
                }}>
                  <span style={{ fontSize: '9px', fontWeight: 'bold', color: '#8b7355', textTransform: 'uppercase' }}>Ch2 Volume</span>
                  <Knob label="12AX7" value={amp.params?.ch2_volume || 55} onChange={handleKnobChange('ch2_volume')} size={28} />
                </div>

                {/* TONE STACK (Top Boost style) */}
                <div className="knob-group" style={{ 
                  display: 'flex', 
                  gap: '6px', 
                  flexDirection: 'column', 
                  alignItems: 'center', 
                  padding: '8px 10px', 
                  background: 'linear-gradient(135deg, rgba(139,115,85,0.3), rgba(139,115,85,0.15))', 
                  borderRadius: '6px',
                  border: '2px solid rgba(139,115,85,0.5)'
                }}>
                  <span style={{ fontSize: '9px', fontWeight: 'bold', color: '#8b7355', textTransform: 'uppercase' }}>Tone Stack</span>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <Knob label="Bass" value={amp.params?.bass || 50} onChange={handleKnobChange('bass')} size={28} />
                    <Knob label="Treble" value={amp.params?.treble || 65} onChange={handleKnobChange('treble')} size={28} />
                  </div>
                </div>

                {/* CUT & MASTER */}
                <div className="knob-group" style={{ 
                  display: 'flex', 
                  gap: '6px', 
                  flexDirection: 'column', 
                  alignItems: 'center', 
                  padding: '8px 10px', 
                  background: 'linear-gradient(135deg, rgba(139,115,85,0.3), rgba(139,115,85,0.15))', 
                  borderRadius: '6px',
                  border: '2px solid rgba(139,115,85,0.5)'
                }}>
                  <span style={{ fontSize: '9px', fontWeight: 'bold', color: '#8b7355', textTransform: 'uppercase' }}>Master Section</span>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <Knob label="Cut" value={amp.params?.cut || 30} onChange={handleKnobChange('cut')} size={28} />
                    <Knob label="Master" value={amp.params?.master || 70} onChange={handleKnobChange('master')} size={28} />
                  </div>
                </div>
              </div>
            ) : amp.ampType === 'orange_rockerverb' ? (
              /* ORANGE ROCKERVERB - British high-gain layout */
              <div className="orange-rockerverb-knobs-layout" style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', justifyContent: 'center' }}>
                <div className="knob-group" style={{ display: 'flex', gap: '8px', flexDirection: 'column', alignItems: 'center', padding: '10px', background: 'linear-gradient(135deg, rgba(255,140,0,0.2), rgba(255,140,0,0.1))', borderRadius: '8px', border: '2px solid rgba(255,140,0,0.4)' }}>
                  <span style={{ fontSize: '11px', fontWeight: 'bold', color: '#ff8c00', textTransform: 'uppercase', letterSpacing: '1px' }}>Preamp</span>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <Knob label="Gain" value={amp.params?.gain || 70} onChange={handleKnobChange('gain')} size={38} />
                    <Knob label="Bass" value={amp.params?.bass || 60} onChange={handleKnobChange('bass')} size={38} />
                    <Knob label="Mid" value={amp.params?.mid || 50} onChange={handleKnobChange('mid')} size={38} />
                    <Knob label="Treble" value={amp.params?.treble || 65} onChange={handleKnobChange('treble')} size={38} />
                  </div>
                </div>
                <div className="knob-group" style={{ display: 'flex', gap: '8px', flexDirection: 'column', alignItems: 'center', padding: '10px', background: 'linear-gradient(135deg, rgba(255,140,0,0.2), rgba(255,140,0,0.1))', borderRadius: '8px', border: '2px solid rgba(255,140,0,0.4)' }}>
                  <span style={{ fontSize: '11px', fontWeight: 'bold', color: '#ff8c00', textTransform: 'uppercase', letterSpacing: '1px' }}>Master</span>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <Knob label="Reverb" value={amp.params?.reverb || 30} onChange={handleKnobChange('reverb')} size={38} />
                    <Knob label="Master" value={amp.params?.master || 70} onChange={handleKnobChange('master')} size={38} />
                  </div>
                </div>
              </div>
            ) : amp.ampType === 'orange_tiny_terror' ? (
              /* ORANGE TINY TERROR - Lunchbox legend with simple controls */
              <div className="orange-tiny-terror-knobs-layout" style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', justifyContent: 'center' }}>
                <div className="knob-group" style={{ display: 'flex', gap: '8px', flexDirection: 'column', alignItems: 'center', padding: '10px', background: 'linear-gradient(135deg, rgba(255,102,0,0.25), rgba(255,102,0,0.12))', borderRadius: '8px', border: '2px solid rgba(255,102,0,0.5)', boxShadow: '0 2px 8px rgba(255,102,0,0.3)' }}>
                  <span style={{ fontSize: '10px', fontWeight: 'bold', color: '#ff6600', textTransform: 'uppercase', letterSpacing: '1.5px', textShadow: '0 1px 2px rgba(0,0,0,0.5)' }}>⚡ Tiny Terror</span>
                  <div style={{ display: 'flex', gap: '12px' }}>
                    <Knob label="Gain" value={amp.params?.gain || 65} onChange={handleKnobChange('gain')} size={40} />
                    <Knob label="Volume" value={amp.params?.volume || 65} onChange={handleKnobChange('volume')} size={40} />
                    <Knob label="Tone" value={amp.params?.tone || 60} onChange={handleKnobChange('tone')} size={40} />
                    <Knob label="Master" value={amp.params?.master || 70} onChange={handleKnobChange('master')} size={40} />
                  </div>
                </div>
              </div>
            ) : amp.ampType === 'suhr_badger' ? (
              /* SUHR BADGER - Complete control layout */
              <div className="suhr-badger-knobs-layout" style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', justifyContent: 'center' }}>
                <div className="knob-group" style={{ display: 'flex', gap: '8px', flexDirection: 'column', alignItems: 'center', padding: '8px', background: 'rgba(0,0,0,0.2)', borderRadius: '8px' }}>
                  <span style={{ fontSize: '10px', fontWeight: 'bold', color: '#4a9eff', textTransform: 'uppercase' }}>Preamp</span>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <Knob label="Gain" value={amp.params?.gain || 65} onChange={handleKnobChange('gain')} size={36} />
                    <Knob label="Bass" value={amp.params?.bass || 55} onChange={handleKnobChange('bass')} size={36} />
                    <Knob label="Middle" value={amp.params?.middle || 60} onChange={handleKnobChange('middle')} size={36} />
                    <Knob label="Treble" value={amp.params?.treble || 65} onChange={handleKnobChange('treble')} size={36} />
                  </div>
                </div>
                <div className="knob-group" style={{ display: 'flex', gap: '8px', flexDirection: 'column', alignItems: 'center', padding: '8px', background: 'rgba(0,0,0,0.2)', borderRadius: '8px' }}>
                  <span style={{ fontSize: '10px', fontWeight: 'bold', color: '#4a9eff', textTransform: 'uppercase' }}>Power Amp</span>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <Knob label="Presence" value={amp.params?.presence || 60} onChange={handleKnobChange('presence')} size={36} />
                    <Knob label="Master" value={amp.params?.master || 70} onChange={handleKnobChange('master')} size={36} />
                  </div>
                </div>
              </div>
            ) : amp.ampType === 'marshall_jcm800' ? (
              /* MARSHALL JCM800 - Authentic front panel layout */
              <div className="marshall-jcm800-knobs-layout" style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', justifyContent: 'center' }}>
                <div className="knob-group" style={{ display: 'flex', gap: '8px', flexDirection: 'column', alignItems: 'center', padding: '8px', background: 'linear-gradient(135deg, rgba(0,0,0,0.3), rgba(212,175,55,0.1))', borderRadius: '8px', border: '1px solid rgba(212,175,55,0.3)' }}>
                  <span style={{ fontSize: '10px', fontWeight: 'bold', color: '#d4af37', textTransform: 'uppercase' }}>Channel 1 - High Gain</span>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <Knob label="Preamp" value={amp.params?.preamp_volume || 70} onChange={handleKnobChange('preamp_volume')} size={36} />
                    <Knob label="Bass" value={amp.params?.bass || 60} onChange={handleKnobChange('bass')} size={36} />
                    <Knob label="Middle" value={amp.params?.mid || 50} onChange={handleKnobChange('mid')} size={36} />
                    <Knob label="Treble" value={amp.params?.treble || 70} onChange={handleKnobChange('treble')} size={36} />
                    <Knob label="Presence" value={amp.params?.presence || 60} onChange={handleKnobChange('presence')} size={36} />
                    <Knob label="Master" value={amp.params?.master_volume || 50} onChange={handleKnobChange('master_volume')} size={36} />
                  </div>
                </div>
              </div>
            ) : amp.ampType === 'fender_deluxe' ? (
              /* FENDER DELUXE REVERB - Compact Blackface layout */
              <div className="fender-deluxe-knobs-layout" style={{ 
                display: 'flex', 
                gap: '8px', 
                justifyContent: 'center',
                flexWrap: 'wrap'
              }}>
                {/* Channel-specific knobs + shared Reverb */}
                {amp.params?.channel === 0 ? (
                  /* NORMAL CHANNEL: Volume, Treble, Bass */
                  <>
                    <Knob label="VOLUME" value={amp.params?.normal_volume || 50} onChange={handleKnobChange('normal_volume')} size={28} />
                    <Knob label="TREBLE" value={amp.params?.treble || 60} onChange={handleKnobChange('treble')} size={28} />
                    <Knob label="BASS" value={amp.params?.bass || 55} onChange={handleKnobChange('bass')} size={28} />
                    <Knob label="REVERB" value={amp.params?.reverb || 30} onChange={handleKnobChange('reverb')} size={28} />
                    <Knob label="MASTER" value={amp.params?.master || 70} onChange={handleKnobChange('master')} size={28} />
                  </>
                ) : (
                  /* VIBRATO CHANNEL: Volume, Treble, Bass, Speed, Intensity */
                  <>
                    <Knob label="VOLUME" value={amp.params?.vibrato_volume || 50} onChange={handleKnobChange('vibrato_volume')} size={28} />
                    <Knob label="TREBLE" value={amp.params?.treble || 60} onChange={handleKnobChange('treble')} size={28} />
                    <Knob label="BASS" value={amp.params?.bass || 55} onChange={handleKnobChange('bass')} size={28} />
                    <Knob label="SPEED" value={amp.params?.vibrato_speed || 50} onChange={handleKnobChange('vibrato_speed')} size={28} />
                    <Knob label="INTENS" value={amp.params?.vibrato_intensity || 0} onChange={handleKnobChange('vibrato_intensity')} size={28} />
                    <Knob label="REVERB" value={amp.params?.reverb || 30} onChange={handleKnobChange('reverb')} size={28} />
                    <Knob label="MASTER" value={amp.params?.master || 70} onChange={handleKnobChange('master')} size={28} />
                  </>
                )}
              </div>
            ) : amp.ampType === 'hiwatt_dr103' ? (
              /* HIWATT DR103 - Controls handled in custom section below */
              <div style={{ display: 'none' }}></div>
            ) : amp.ampType === 'friedman_be100' ? (
              /* FRIEDMAN BE-100 - Authentic front panel layout like VOX */
              <div className="friedman-be100-front-panel" style={{ 
                display: 'flex', 
                gap: '8px', 
                justifyContent: 'center',
                flexWrap: 'wrap'
              }}>
                {/* All main knobs in one row like the real amp */}
                <Knob label="PRESENCE" value={amp.params?.presence || 65} onChange={handleKnobChange('presence')} size={36} />
                <Knob label="BASS" value={amp.params?.bass || 60} onChange={handleKnobChange('bass')} size={36} />
                <Knob label="MIDDLE" value={amp.params?.middle || 50} onChange={handleKnobChange('middle')} size={36} />
                <Knob label="TREBLE" value={amp.params?.treble || 70} onChange={handleKnobChange('treble')} size={36} />
                <Knob label="MASTER" value={amp.params?.master || 70} onChange={handleKnobChange('master')} size={38} />
                <div style={{ width: '1px', height: '60px', background: 'rgba(255,215,0,0.3)', margin: '0 8px' }}></div>
                <Knob label="GAIN" value={amp.params?.gain || 75} onChange={handleKnobChange('gain')} size={38} />
                <Knob label="VOLUME" value={amp.params?.volume || 70} onChange={handleKnobChange('volume')} size={36} />
              </div>
            ) : amp.ampType === 'dumble_ods' ? (
              /* DUMBLE ODS - Ultra compact */
              <div className="dumble-ods-front-panel" style={{ 
                display: 'flex', 
                gap: '1px', 
                justifyContent: 'center',
                flexWrap: 'wrap',
                padding: '1px 2px'
              }}>
                {/* Inline: Channel + Knobs */}
                <div style={{ display: 'flex', gap: '2px', alignItems: 'center' }}>
                  <button 
                    onClick={() => onUpdate(amp.id, 'channel', 0)}
                    style={{
                      padding: '2px 4px',
                      background: amp.params?.channel === 0 ? '#d4af37' : 'rgba(0,0,0,0.5)',
                      border: '1px solid #d4af37',
                      color: amp.params?.channel === 0 ? '#000' : '#d4af37',
                      borderRadius: '2px',
                      cursor: 'pointer',
                      fontWeight: 'bold',
                      fontSize: '7px',
                      lineHeight: '1'
                    }}
                  >C</button>
                  <button 
                    onClick={() => onUpdate(amp.id, 'channel', 1)}
                    style={{
                      padding: '2px 4px',
                      background: amp.params?.channel === 1 ? '#d4af37' : 'rgba(0,0,0,0.5)',
                      border: '1px solid #d4af37',
                      color: amp.params?.channel === 1 ? '#000' : '#d4af37',
                      borderRadius: '2px',
                      cursor: 'pointer',
                      fontWeight: 'bold',
                      fontSize: '7px',
                      lineHeight: '1'
                    }}
                  >O</button>
                </div>

                <Knob label="Clean" value={amp.params?.clean_volume || 50} onChange={handleKnobChange('clean_volume')} size={20} />
                <Knob label="Drive" value={amp.params?.od_drive || 50} onChange={handleKnobChange('od_drive')} size={20} />
                <Knob label="OD" value={amp.params?.od_volume || 50} onChange={handleKnobChange('od_volume')} size={20} />
                <Knob label="Ratio" value={amp.params?.ratio || 50} onChange={handleKnobChange('ratio')} size={18} />
                <Knob label="Bass" value={amp.params?.bass || 50} onChange={handleKnobChange('bass')} size={20} />
                <Knob label="Mid" value={amp.params?.mid || 55} onChange={handleKnobChange('mid')} size={20} />
                <Knob label="Treble" value={amp.params?.treble || 60} onChange={handleKnobChange('treble')} size={20} />
                <Knob label="Pres" value={amp.params?.presence || 50} onChange={handleKnobChange('presence')} size={20} />
                <Knob label="Master" value={amp.params?.master || 70} onChange={handleKnobChange('master')} size={22} />

                {/* Compact switches */}
                <div style={{ 
                  width: '100%', 
                  display: 'flex', 
                  gap: '4px', 
                  justifyContent: 'center',
                  flexWrap: 'wrap',
                  padding: '3px 0',
                  borderTop: '1px solid rgba(212,175,55,0.2)',
                  marginTop: '2px'
                }}>
                  <label style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '3px', 
                    fontSize: '9px', 
                    fontWeight: 'bold',
                    color: '#d4af37',
                    cursor: 'pointer',
                    padding: '3px 6px',
                    background: amp.params?.pab ? 'rgba(212,175,55,0.25)' : 'rgba(0,0,0,0.3)',
                    borderRadius: '3px',
                    border: '1px solid rgba(212,175,55,0.4)',
                    lineHeight: '1'
                  }}>
                    <input 
                      type="checkbox" 
                      checked={amp.params?.pab || false}
                      onChange={(e) => onUpdate(amp.id, 'pab', e.target.checked)}
                      style={{ cursor: 'pointer', width: '12px', height: '12px', margin: 0 }}
                    />
                    PAB
                  </label>

                  <label style={{ 
                    display: 'flex',
                    alignItems: 'center',
                    gap: '3px',
                    fontSize: '9px', 
                    fontWeight: 'bold',
                    color: '#d4af37',
                    padding: '3px 6px',
                    background: (amp.params?.bright_mode || 0) > 0 ? 'rgba(212,175,55,0.25)' : 'rgba(0,0,0,0.3)',
                    borderRadius: '3px',
                    border: '1px solid rgba(212,175,55,0.4)',
                    lineHeight: '1'
                  }}>
                    BRT
                    <select
                      value={amp.params?.bright_mode || 0}
                      onChange={(e) => onUpdate(amp.id, 'bright_mode', parseInt(e.target.value))}
                      style={{
                        fontSize: '9px',
                        padding: '2px 4px',
                        background: 'rgba(0,0,0,0.5)',
                        color: '#d4af37',
                        border: '1px solid rgba(212,175,55,0.4)',
                        borderRadius: '3px',
                        cursor: 'pointer',
                        height: '18px',
                        lineHeight: '1'
                      }}
                    >
                      <option value={0}>-</option>
                      <option value={1}>100</option>
                      <option value={2}>330</option>
                    </select>
                  </label>

                  <label style={{ 
                    display: 'flex',
                    alignItems: 'center',
                    gap: '3px',
                    fontSize: '9px', 
                    fontWeight: 'bold',
                    color: '#d4af37',
                    padding: '3px 6px',
                    background: 'rgba(0,0,0,0.3)',
                    borderRadius: '3px',
                    border: '1px solid rgba(212,175,55,0.4)',
                    lineHeight: '1'
                  }}>
                    <select
                      value={amp.params?.voicing || 'rock'}
                      onChange={(e) => onUpdate(amp.id, 'voicing', e.target.value)}
                      style={{
                        fontSize: '9px',
                        padding: '2px 4px',
                        background: 'rgba(0,0,0,0.5)',
                        color: '#d4af37',
                        border: '1px solid rgba(212,175,55,0.4)',
                        borderRadius: '3px',
                        cursor: 'pointer',
                        height: '18px',
                        lineHeight: '1'
                      }}
                    >
                      <option value="rock">R</option>
                      <option value="jazz">J</option>
                    </select>
                  </label>

                  <label style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '3px', 
                    fontSize: '9px', 
                    fontWeight: 'bold',
                    color: '#d4af37',
                    cursor: 'pointer',
                    padding: '3px 6px',
                    background: amp.params?.mid_boost ? 'rgba(212,175,55,0.25)' : 'rgba(0,0,0,0.3)',
                    borderRadius: '3px',
                    border: '1px solid rgba(212,175,55,0.4)',
                    lineHeight: '1'
                  }}>
                    <input 
                      type="checkbox" 
                      checked={amp.params?.mid_boost || false}
                      onChange={(e) => onUpdate(amp.id, 'mid_boost', e.target.checked)}
                      style={{ cursor: 'pointer', width: '12px', height: '12px', margin: 0 }}
                    />
                    M+
                  </label>

                  <label style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '3px', 
                    fontSize: '9px', 
                    fontWeight: 'bold',
                    color: '#d4af37',
                    cursor: 'pointer',
                    padding: '3px 6px',
                    background: amp.params?.deep ? 'rgba(212,175,55,0.25)' : 'rgba(0,0,0,0.3)',
                    borderRadius: '3px',
                    border: '1px solid rgba(212,175,55,0.4)',
                    lineHeight: '1'
                  }}>
                    <input 
                      type="checkbox" 
                      checked={amp.params?.deep || false}
                      onChange={(e) => onUpdate(amp.id, 'deep', e.target.checked)}
                      style={{ cursor: 'pointer', width: '12px', height: '12px', margin: 0 }}
                    />
                    DPH
                  </label>

                  <label style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '3px', 
                    fontSize: '9px', 
                    fontWeight: 'bold',
                    color: '#d4af37',
                    cursor: 'pointer',
                    padding: '3px 6px',
                    background: amp.params?.hrm ? 'rgba(212,175,55,0.25)' : 'rgba(0,0,0,0.3)',
                    borderRadius: '3px',
                    border: '1px solid rgba(212,175,55,0.4)',
                    lineHeight: '1'
                  }}>
                    <input 
                      type="checkbox" 
                      checked={amp.params?.hrm || false}
                      onChange={(e) => onUpdate(amp.id, 'hrm', e.target.checked)}
                      style={{ cursor: 'pointer', width: '12px', height: '12px', margin: 0 }}
                    />
                    HRM
                  </label>

                  <label style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '3px', 
                    fontSize: '9px', 
                    fontWeight: 'bold',
                    color: '#d4af37',
                    cursor: 'pointer',
                    padding: '3px 6px',
                    background: amp.params?.cab_sim ? 'rgba(212,175,55,0.25)' : 'rgba(0,0,0,0.3)',
                    borderRadius: '3px',
                    border: '1px solid rgba(212,175,55,0.4)',
                    lineHeight: '1'
                  }}>
                    <input 
                      type="checkbox" 
                      checked={amp.params?.cab_sim || false}
                      onChange={(e) => onUpdate(amp.id, 'cab_sim', e.target.checked)}
                      style={{ cursor: 'pointer', width: '12px', height: '12px', margin: 0 }}
                    />
                    CAB
                  </label>

                  {amp.params?.hrm && (
                    <>
                      <div style={{ width: '1px', height: '14px', background: 'rgba(212,175,55,0.4)', alignSelf: 'center' }}></div>
                      <Knob label="HB" value={amp.params?.hrm_bass || 50} onChange={handleKnobChange('hrm_bass')} size={22} />
                      <Knob label="HM" value={amp.params?.hrm_mid || 50} onChange={handleKnobChange('hrm_mid')} size={22} />
                      <Knob label="HT" value={amp.params?.hrm_treble || 50} onChange={handleKnobChange('hrm_treble')} size={22} />
                    </>
                  )}
                </div>
              </div>
            ) : amp.ampType === 'mesa_mark_v' ? (
              /* MESA MARK V - Custom layout only (no standard knobs) */
              <></>
            ) : amp.ampType === 'mesa_transatlantic_ta30' ? (
              /* MESA TRANSATLANTIC TA-30 - Custom layout only (no standard knobs) */
              <></>
            ) : amp.ampType === 'marshall_jtm45' ? (
              /* MARSHALL JTM45 - Controls handled in custom section below */
              <div style={{ display: 'none' }}></div>
            ) : amp.ampType === 'badcat_hotcat' ? (
              /* BAD CAT HOT CAT - Controls handled in custom section below */
              <div style={{ display: 'none' }}></div>
            ) : amp.ampType === 'peavey_5150' ? (
              /* PEAVEY 5150 - Controls handled in custom section below */
              <div style={{ display: 'none' }}></div>
            ) : amp.ampType === 'bogner_ecstasy' ? (
              /* BOGNER ECSTASY - Controls handled in custom section below */
              <div style={{ display: 'none' }}></div>
            ) : amp.ampType === 'bogner_uberschall' ? (
              /* BOGNER ÜBERSCHALL - Controls handled in custom section below */
              <div style={{ display: 'none' }}></div>
            ) : amp.ampType === 'diezel_vh4' ? (
              /* DIEZEL VH4 - Controls handled in custom section below */
              <div style={{ display: 'none' }}></div>
            ) : amp.ampType === 'engl_powerball' ? (
              /* ENGL POWERBALL - Controls handled in custom section below */
              <div style={{ display: 'none' }}></div>
            ) : amp.ampType === 'soldano_slo100' ? (
              /* SOLDANO SLO-100 - Controls handled in custom section below */
              <div style={{ display: 'none' }}></div>
            ) : amp.ampType === 'tworock_classic' ? (
              /* TWO-ROCK CLASSIC - Controls handled in custom section below */
              <div style={{ display: 'none' }}></div>
            ) : amp.ampType === 'mesa_dual_rectifier' ? (
              /* MESA DUAL RECTIFIER - Controls handled in custom section below */
              <div style={{ display: 'none' }}></div>
            ) : (
              /* Standard amp layout */
              <>
                <div className="knob-group">
                  <Knob label="Gain" value={amp.params?.gain || 50} onChange={handleKnobChange('gain')} size={36} />
                  <Knob label="Bass" value={amp.params?.bass || 50} onChange={handleKnobChange('bass')} size={36} />
                  <Knob label="Mid" value={amp.params?.mid || 50} onChange={handleKnobChange('mid')} size={36} />
                </div>
                <div className="knob-group">
                  <Knob label="Treble" value={amp.params?.treble || 50} onChange={handleKnobChange('treble')} size={36} />
                  <Knob label="Presence" value={amp.params?.presence || 50} onChange={handleKnobChange('presence')} size={36} />
                  <Knob label="Master" value={amp.params?.master || 70} onChange={handleKnobChange('master')} size={36} />
                </div>
              </>
            )}
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
          <div className="config-row" style={{ paddingBottom: '3px', borderBottom: '1px solid rgba(138, 95, 58, 0.3)' }}>
            <label style={{ fontWeight: 'bold', color: '#ff6b35', fontSize: '7px' }}>Cabinet IR</label>
            <div className="toggle-switch" style={{ marginLeft: 'auto' }}>
              <label style={{ fontSize: '7px' }}>{amp.params?.cabinet_enabled !== false ? 'ON' : 'OFF'}</label>
              <input 
                type="checkbox" 
                checked={amp.params?.cabinet_enabled !== false}
                onChange={(e) => onUpdate(amp.id, 'cabinet_enabled', e.target.checked)}
              />
            </div>
          </div>

          <div className="config-row">
            <label>Cabinet</label>
            <select
              value={amp.params?.cabinet || getOriginalCabinet(amp.ampType)}
              onChange={(e) => onUpdate(amp.id, 'cabinet', e.target.value)}
              disabled={amp.params?.cabinet_enabled === false}
              style={{ opacity: amp.params?.cabinet_enabled === false ? 0.5 : 1 }}
            >
              {(() => {
                const originalCab = getOriginalCabinet(amp.ampType);
                const cabinets = [
                  { value: '1x12_open', label: '1x12" Open' },
                  { value: '1x12_closed', label: '1x12" Closed' },
                  { value: '2x12_open', label: '2x12" Open' },
                  { value: '2x12_closed', label: '2x12" Closed' },
                  { value: '4x12_vintage', label: '4x12" V30' },
                  { value: '4x12_greenback', label: '4x12" GB' },
                  { value: '1x10_tweed', label: '1x10" Tweed' },
                  { value: '4x10_bassman', label: '4x10" Bass' }
                ];
                
                return cabinets.map(cab => (
                  <option key={cab.value} value={cab.value}>
                    {cab.label}{cab.value === originalCab ? ' (original)' : ''}
                  </option>
                ));
              })()}
            </select>
          </div>

          <div className="config-row">
            <label>Microphone</label>
            <select
              value={amp.params?.microphone || 'sm57'}
              onChange={(e) => onUpdate(amp.id, 'microphone', e.target.value)}
              disabled={amp.params?.cabinet_enabled === false}
              style={{ opacity: amp.params?.cabinet_enabled === false ? 0.5 : 1 }}
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
              disabled={amp.params?.cabinet_enabled === false}
              style={{ opacity: amp.params?.cabinet_enabled === false ? 0.5 : 1 }}
            >
              <option value="center">Center</option>
              <option value="edge">Edge</option>
              <option value="off_axis">Off-Axis</option>
              <option value="room">Room</option>
            </select>
          </div>
        </div>

            {(() => {
              // Determine number of speakers based on cabinet type
              const cabinetType = amp.params?.cabinet || getOriginalCabinet(amp.ampType);
              let speakerCount = 4; // default 4x12
              let gridCols = 2;
              
              if (cabinetType.includes('1x10') || cabinetType.includes('1x12')) {
                speakerCount = 1;
                gridCols = 1;
              } else if (cabinetType.includes('2x12') || cabinetType.includes('2x10')) {
                speakerCount = 2;
                gridCols = 2;
              } else if (cabinetType.includes('3x10')) {
                speakerCount = 3;
                gridCols = 3; // 3 speakers in a row (Vibro-King style)
              } else if (cabinetType.includes('4x10') || cabinetType.includes('4x12')) {
                speakerCount = 4;
                gridCols = 2;
              }
              
              return (
                <div 
                  className="cabinet-speaker-grill" 
                  style={{ 
                    opacity: amp.params?.cabinet_enabled === false ? 0.3 : 1,
                    filter: amp.params?.cabinet_enabled === false ? 'grayscale(1)' : 'none',
                    transition: 'all 0.3s ease',
                    gridTemplateColumns: `repeat(${gridCols}, 1fr)`,
                    gap: speakerCount === 1 ? '0' : '15px',
                    padding: speakerCount === 1 ? '40px' : '20px'
                  }}
                >
                  {[...Array(speakerCount)].map((_, i) => (
                    <div key={i} className="speaker-cone"></div>
                  ))}
                  {amp.params?.cabinet_enabled === false && (
                    <div style={{
                      position: 'absolute',
                      top: '50%',
                      left: '50%',
                      transform: 'translate(-50%, -50%)',
                      fontSize: '12px',
                      fontWeight: 'bold',
                      color: '#ff6b35',
                      textShadow: '0 2px 4px rgba(0,0,0,0.8)',
                      pointerEvents: 'none',
                      zIndex: 10
                    }}>
                      DIRECT OUT
                    </div>
                  )}
                </div>
              );
            })()}
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

                    <Knob label="Bias" value={amp.params?.bias || 50} onChange={handleKnobChange('bias')} size={28} />
                    <Knob label="Sag" value={amp.params?.sag || 50} onChange={handleKnobChange('sag')} size={28} />

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

                    <Knob label="Hum" value={amp.params?.hum || 0} onChange={handleKnobChange('hum')} size={28} />

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

                    <Knob label="Room" value={amp.params?.roomamount || 0} onChange={handleKnobChange('roomamount')} size={28} />
                    <Knob label="Early Ref" value={amp.params?.earlyreflections || 0} onChange={handleKnobChange('earlyreflections')} size={28} />
                    <Knob label="Ambient" value={amp.params?.ambientmic || 0} onChange={handleKnobChange('ambientmic')} size={28} />
                    <Knob label="Width" value={amp.params?.stereowidth || 50} onChange={handleKnobChange('stereowidth')} size={28} />
                  </div>
                </div>

                {/* FX LOOP */}
                <div className="advanced-section">
                  <h4>🔁 FX Loop</h4>
                  <div className="advanced-controls-grid">
                    <Knob label="Send" value={amp.params?.fxloopsend || 80} onChange={handleKnobChange('fxloopsend')} size={28} />
                    <Knob label="Return" value={amp.params?.fxloopreturn || 80} onChange={handleKnobChange('fxloopreturn')} size={28} />

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



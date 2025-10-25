import React from 'react';
import './EffectIcon.css';

const EffectIcon = ({ type, size = 64 }) => {
  const renderIcon = () => {
    switch(type.toLowerCase()) {
      // AMPLIFIERS
      case 'amp':
      case 'amplifier':
        return (
          <svg viewBox="0 0 64 64" fill="none">
            <defs>
              <linearGradient id="ampGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#ff8c42" />
                <stop offset="100%" stopColor="#ff6b35" />
              </linearGradient>
            </defs>
            {/* Amp head */}
            <rect x="8" y="12" width="48" height="20" rx="2" fill="url(#ampGrad)" stroke="#1a1a1a" strokeWidth="2"/>
            {/* Speaker grill */}
            <rect x="8" y="36" width="48" height="18" rx="2" fill="#2a2a2a" stroke="#1a1a1a" strokeWidth="2"/>
            <circle cx="20" cy="45" r="6" fill="#3a3a3a" stroke="#1a1a1a"/>
            <circle cx="44" cy="45" r="6" fill="#3a3a3a" stroke="#1a1a1a"/>
            {/* Knobs */}
            <circle cx="18" cy="22" r="2.5" fill="#f0d878" stroke="#1a1a1a"/>
            <circle cx="28" cy="22" r="2.5" fill="#f0d878" stroke="#1a1a1a"/>
            <circle cx="38" cy="22" r="2.5" fill="#f0d878" stroke="#1a1a1a"/>
            <circle cx="48" cy="22" r="2.5" fill="#f0d878" stroke="#1a1a1a"/>
          </svg>
        );

      // OVERDRIVE
      case 'overdrive':
      case 'tube screamer':
        return (
          <svg viewBox="0 0 64 64" fill="none">
            <defs>
              <linearGradient id="odGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#00cc66" />
                <stop offset="100%" stopColor="#00a550" />
              </linearGradient>
            </defs>
            {/* Pedal body */}
            <rect x="12" y="8" width="40" height="48" rx="4" fill="url(#odGrad)" stroke="#006622" strokeWidth="2"/>
            {/* Knobs */}
            <circle cx="24" cy="28" r="6" fill="#f5deb3" stroke="#1a1a1a" strokeWidth="1.5"/>
            <line x1="24" y1="22" x2="24" y2="28" stroke="#1a1a1a" strokeWidth="2"/>
            <circle cx="40" cy="28" r="6" fill="#f5deb3" stroke="#1a1a1a" strokeWidth="1.5"/>
            <line x1="40" y1="22" x2="40" y2="28" stroke="#1a1a1a" strokeWidth="2"/>
            {/* LED */}
            <circle cx="32" cy="45" r="3" fill="#00ff00" opacity="0.8">
              <animate attributeName="opacity" values="0.8;1;0.8" dur="2s" repeatCount="indefinite"/>
            </circle>
          </svg>
        );

      // DISTORTION
      case 'distortion':
      case 'bossds1':
      case 'boss ds-1':
        return (
          <svg viewBox="0 0 64 64" fill="none">
            <defs>
              <linearGradient id="distGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#ff7722" />
                <stop offset="100%" stopColor="#ff6600" />
              </linearGradient>
            </defs>
            {/* Pedal body */}
            <rect x="12" y="8" width="40" height="48" rx="4" fill="url(#distGrad)" stroke="#cc5500" strokeWidth="2"/>
            {/* Knobs */}
            <circle cx="20" cy="25" r="5" fill="#2a2a2a" stroke="#1a1a1a" strokeWidth="1.5"/>
            <circle cx="32" cy="25" r="5" fill="#2a2a2a" stroke="#1a1a1a" strokeWidth="1.5"/>
            <circle cx="44" cy="25" r="5" fill="#2a2a2a" stroke="#1a1a1a" strokeWidth="1.5"/>
            {/* Lightning bolt */}
            <path d="M35 38 L29 44 L32 44 L30 50 L36 44 L33 44 Z" fill="#ffff00" stroke="#1a1a1a" strokeWidth="1"/>
            {/* LED */}
            <circle cx="32" cy="15" r="2" fill="#ff0000" opacity="0.9"/>
          </svg>
        );

      // FUZZ
      case 'fuzz':
      case 'bigmuff':
      case 'fuzz face':
        return (
          <svg viewBox="0 0 64 64" fill="none">
            <defs>
              <radialGradient id="fuzzGrad">
                <stop offset="0%" stopColor="#2a2a2a" />
                <stop offset="100%" stopColor="#1a1a1a" />
              </radialGradient>
            </defs>
            {/* Round pedal */}
            <circle cx="32" cy="32" r="26" fill="url(#fuzzGrad)" stroke="#0a0a0a" strokeWidth="2"/>
            {/* Knobs */}
            <circle cx="20" cy="32" r="8" fill="#c0c0c0" stroke="#1a1a1a" strokeWidth="1.5"/>
            <line x1="20" y1="24" x2="20" y2="32" stroke="#1a1a1a" strokeWidth="2"/>
            <circle cx="44" cy="32" r="8" fill="#c0c0c0" stroke="#1a1a1a" strokeWidth="1.5"/>
            <line x1="44" y1="24" x2="44" y2="32" stroke="#1a1a1a" strokeWidth="2"/>
            {/* Fuzz waves */}
            <path d="M26 44 Q28 40, 30 44 T34 44 T38 44" stroke="#ff3838" strokeWidth="2" fill="none"/>
          </svg>
        );

      // DIGITAL DELAY
      case 'digital delay':
      case 'digitaldelay':
        return (
          <svg viewBox="0 0 64 64" fill="none">
            <defs>
              <linearGradient id="digitalDelayGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#00ff88" />
                <stop offset="100%" stopColor="#00cc66" />
              </linearGradient>
            </defs>
            <rect x="12" y="8" width="40" height="48" rx="4" fill="url(#digitalDelayGrad)" stroke="#009944" strokeWidth="2"/>
            {/* LCD Display */}
            <rect x="18" y="18" width="28" height="12" rx="1" fill="#001a00"/>
            <text x="32" y="26" fill="#00ff00" fontSize="5" textAnchor="middle" fontFamily="monospace">999ms</text>
            {/* Digital waveform */}
            <rect x="20" y="36" width="2" height="6" fill="#00ff00"/>
            <rect x="24" y="34" width="2" height="8" fill="#00ff00"/>
            <rect x="28" y="32" width="2" height="10" fill="#00ff00"/>
            <rect x="32" y="34" width="2" height="8" fill="#00ff00"/>
            <rect x="36" y="36" width="2" height="6" fill="#00ff00"/>
            <rect x="40" y="38" width="2" height="4" fill="#00ff00"/>
            {/* Knobs */}
            <circle cx="32" cy="50" r="3" fill="#2a2a2a" stroke="#1a1a1a"/>
          </svg>
        );

      // TAP DELAY
      case 'tap delay':
      case 'tapdelay':
        return (
          <svg viewBox="0 0 64 64" fill="none">
            <defs>
              <linearGradient id="tapDelayGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#ffaa44" />
                <stop offset="100%" stopColor="#ff8800" />
              </linearGradient>
            </defs>
            <rect x="12" y="8" width="40" height="48" rx="4" fill="url(#tapDelayGrad)" stroke="#cc6600" strokeWidth="2"/>
            {/* Tap tempo dots */}
            <circle cx="22" cy="24" r="3" fill="#ffffff" opacity="0.8">
              <animate attributeName="opacity" values="0.3;1;0.3" dur="0.8s" repeatCount="indefinite"/>
            </circle>
            <circle cx="32" cy="24" r="3" fill="#ffffff" opacity="0.6">
              <animate attributeName="opacity" values="0.3;1;0.3" dur="0.8s" begin="0.2s" repeatCount="indefinite"/>
            </circle>
            <circle cx="42" cy="24" r="3" fill="#ffffff" opacity="0.4">
              <animate attributeName="opacity" values="0.3;1;0.3" dur="0.8s" begin="0.4s" repeatCount="indefinite"/>
            </circle>
            {/* Knobs */}
            <circle cx="26" cy="38" r="5" fill="#2a2a2a" stroke="#1a1a1a"/>
            <circle cx="38" cy="38" r="5" fill="#2a2a2a" stroke="#1a1a1a"/>
            {/* TAP button */}
            <rect x="26" y="48" width="12" height="6" rx="2" fill="#ffff00"/>
          </svg>
        );

      // TAPE ECHO
      case 'tape echo':
      case 'tapeecho':
        return (
          <svg viewBox="0 0 64 64" fill="none">
            <defs>
              <linearGradient id="tapeEchoGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#d4af37" />
                <stop offset="100%" stopColor="#b8941f" />
              </linearGradient>
            </defs>
            <rect x="12" y="8" width="40" height="48" rx="4" fill="url(#tapeEchoGrad)" stroke="#9a7f1a" strokeWidth="2"/>
            {/* Tape reels - vintage style */}
            <circle cx="24" cy="28" r="7" fill="#3a3a3a" stroke="#1a1a1a" strokeWidth="1.5">
              <animateTransform attributeName="transform" type="rotate" from="0 24 28" to="360 24 28" dur="3s" repeatCount="indefinite"/>
            </circle>
            <circle cx="40" cy="28" r="7" fill="#3a3a3a" stroke="#1a1a1a" strokeWidth="1.5">
              <animateTransform attributeName="transform" type="rotate" from="0 40 28" to="360 40 28" dur="3s" repeatCount="indefinite"/>
            </circle>
            {/* Tape path */}
            <line x1="24" y1="21" x2="40" y2="21" stroke="#8b4513" strokeWidth="3"/>
            <line x1="24" y1="35" x2="40" y2="35" stroke="#8b4513" strokeWidth="3"/>
            {/* Knobs */}
            <circle cx="22" cy="46" r="4" fill="#f5deb3" stroke="#1a1a1a"/>
            <circle cx="32" cy="46" r="4" fill="#f5deb3" stroke="#1a1a1a"/>
            <circle cx="42" cy="46" r="4" fill="#f5deb3" stroke="#1a1a1a"/>
          </svg>
        );

      // GENERIC DELAY (fallback)
      case 'delay':
        return (
          <svg viewBox="0 0 64 64" fill="none">
            <defs>
              <linearGradient id="delayGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#22dd22" />
                <stop offset="100%" stopColor="#00aa00" />
              </linearGradient>
            </defs>
            {/* Pedal body */}
            <rect x="10" y="8" width="44" height="48" rx="4" fill="url(#delayGrad)" stroke="#007700" strokeWidth="2"/>
            {/* Tape reels */}
            <circle cx="22" cy="30" r="8" fill="#3a3a3a" stroke="#1a1a1a" strokeWidth="1.5">
              <animateTransform attributeName="transform" type="rotate" from="0 22 30" to="360 22 30" dur="3s" repeatCount="indefinite"/>
            </circle>
            <circle cx="42" cy="30" r="8" fill="#3a3a3a" stroke="#1a1a1a" strokeWidth="1.5">
              <animateTransform attributeName="transform" type="rotate" from="0 42 30" to="360 42 30" dur="3s" repeatCount="indefinite"/>
            </circle>
            {/* Tape */}
            <line x1="22" y1="22" x2="42" y2="22" stroke="#8b4513" strokeWidth="3"/>
            <line x1="22" y1="38" x2="42" y2="38" stroke="#8b4513" strokeWidth="3"/>
            {/* Delay dots */}
            <circle cx="18" cy="48" r="2" fill="#00ff00" opacity="0.8">
              <animate attributeName="opacity" values="0.3;1;0.3" dur="1s" repeatCount="indefinite"/>
            </circle>
            <circle cx="26" cy="48" r="2" fill="#00ff00" opacity="0.6">
              <animate attributeName="opacity" values="0.3;1;0.3" dur="1s" begin="0.2s" repeatCount="indefinite"/>
            </circle>
            <circle cx="34" cy="48" r="2" fill="#00ff00" opacity="0.4">
              <animate attributeName="opacity" values="0.3;1;0.3" dur="1s" begin="0.4s" repeatCount="indefinite"/>
            </circle>
          </svg>
        );

      // REVERB
      case 'reverb':
      case 'hall reverb':
      case 'plate reverb':
      case 'room reverb':
        return (
          <svg viewBox="0 0 64 64" fill="none">
            <defs>
              <linearGradient id="reverbGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#b19cd9" />
                <stop offset="100%" stopColor="#9b59b6" />
              </linearGradient>
            </defs>
            {/* Pedal body */}
            <rect x="10" y="8" width="44" height="48" rx="4" fill="url(#reverbGrad)" stroke="#7d3c98" strokeWidth="2"/>
            {/* Reverb waves */}
            <ellipse cx="32" cy="28" rx="4" ry="2" fill="none" stroke="#ffffff" strokeWidth="1.5" opacity="0.8">
              <animate attributeName="rx" values="4;12;4" dur="2s" repeatCount="indefinite"/>
              <animate attributeName="ry" values="2;6;2" dur="2s" repeatCount="indefinite"/>
              <animate attributeName="opacity" values="0.8;0.2;0.8" dur="2s" repeatCount="indefinite"/>
            </ellipse>
            <ellipse cx="32" cy="28" rx="8" ry="4" fill="none" stroke="#ffffff" strokeWidth="1.5" opacity="0.5">
              <animate attributeName="rx" values="8;16;8" dur="2s" repeatCount="indefinite"/>
              <animate attributeName="ry" values="4;8;4" dur="2s" repeatCount="indefinite"/>
              <animate attributeName="opacity" values="0.5;0.1;0.5" dur="2s" repeatCount="indefinite"/>
            </ellipse>
            <ellipse cx="32" cy="28" rx="12" ry="6" fill="none" stroke="#ffffff" strokeWidth="1.5" opacity="0.3">
              <animate attributeName="rx" values="12;20;12" dur="2s" repeatCount="indefinite"/>
              <animate attributeName="ry" values="6;10;6" dur="2s" repeatCount="indefinite"/>
              <animate attributeName="opacity" values="0.3;0;0.3" dur="2s" repeatCount="indefinite"/>
            </ellipse>
            {/* Knobs */}
            <circle cx="22" cy="46" r="4" fill="#f0d878" stroke="#1a1a1a" strokeWidth="1"/>
            <circle cx="42" cy="46" r="4" fill="#f0d878" stroke="#1a1a1a" strokeWidth="1"/>
          </svg>
        );

      // CHORUS
      case 'chorus':
      case 'flanger':
      case 'phaser':
        return (
          <svg viewBox="0 0 64 64" fill="none">
            <defs>
              <linearGradient id="chorusGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#33bbff" />
                <stop offset="100%" stopColor="#0099ff" />
              </linearGradient>
            </defs>
            {/* Pedal body */}
            <rect x="12" y="8" width="40" height="48" rx="4" fill="url(#chorusGrad)" stroke="#0077cc" strokeWidth="2"/>
            {/* Modulation wave */}
            <path d="M18 28 Q24 20, 30 28 T42 28" stroke="#ffffff" strokeWidth="3" fill="none" opacity="0.8">
              <animate attributeName="d" 
                values="M18 28 Q24 20, 30 28 T42 28;M18 28 Q24 36, 30 28 T42 28;M18 28 Q24 20, 30 28 T42 28" 
                dur="2s" repeatCount="indefinite"/>
            </path>
            <path d="M18 36 Q24 28, 30 36 T42 36" stroke="#ffffff" strokeWidth="2" fill="none" opacity="0.5">
              <animate attributeName="d" 
                values="M18 36 Q24 28, 30 36 T42 36;M18 36 Q24 44, 30 36 T42 36;M18 36 Q24 28, 30 36 T42 36" 
                dur="2s" begin="0.5s" repeatCount="indefinite"/>
            </path>
            {/* Knobs */}
            <circle cx="22" cy="48" r="4" fill="#2a2a2a" stroke="#1a1a1a" strokeWidth="1"/>
            <circle cx="42" cy="48" r="4" fill="#2a2a2a" stroke="#1a1a1a" strokeWidth="1"/>
          </svg>
        );

      // MXR DYNA COMP
      case 'mxr dyna comp':
      case 'mxrdynacomp':
      case 'dyna comp':
      case 'dynacomp':
        return (
          <svg viewBox="0 0 64 64" fill="none">
            <defs>
              <linearGradient id="dynacompGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#dd2222" />
                <stop offset="100%" stopColor="#cc0000" />
              </linearGradient>
            </defs>
            <rect x="12" y="8" width="40" height="48" rx="4" fill="url(#dynacompGrad)" stroke="#aa0000" strokeWidth="2"/>
            {/* MXR logo */}
            <text x="32" y="20" fill="#ffffff" fontSize="8" fontWeight="bold" textAnchor="middle">MXR</text>
            {/* Large knobs */}
            <circle cx="24" cy="32" r="6" fill="#2a2a2a" stroke="#1a1a1a" strokeWidth="1.5"/>
            <line x1="24" y1="26" x2="24" y2="32" stroke="#ffffff" strokeWidth="2"/>
            <circle cx="40" cy="32" r="6" fill="#2a2a2a" stroke="#1a1a1a" strokeWidth="1.5"/>
            <line x1="40" y1="26" x2="40" y2="32" stroke="#ffffff" strokeWidth="2"/>
            {/* LED */}
            <circle cx="32" cy="48" r="2" fill="#ffff00" opacity="0.9"/>
          </svg>
        );

      // BOSS CE-1 CHORUS ENSEMBLE
      case 'boss ce-1':
      case 'bossce1':
      case 'ce-1':
      case 'chorus ensemble':
        return (
          <svg viewBox="0 0 64 64" fill="none">
            <defs>
              <linearGradient id="ce1Grad" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#c0c0c0" />
                <stop offset="100%" stopColor="#909090" />
              </linearGradient>
            </defs>
            <rect x="8" y="8" width="48" height="48" rx="4" fill="url(#ce1Grad)" stroke="#707070" strokeWidth="2"/>
            {/* BOSS logo */}
            <text x="32" y="22" fill="#1a1a1a" fontSize="8" fontWeight="bold" textAnchor="middle">BOSS</text>
            {/* Chorus wave */}
            <path d="M16 32 Q24 26, 32 32 T48 32" stroke="#0066cc" strokeWidth="2" fill="none">
              <animate attributeName="d" 
                values="M16 32 Q24 26, 32 32 T48 32;M16 32 Q24 38, 32 32 T48 32;M16 32 Q24 26, 32 32 T48 32" 
                dur="2s" repeatCount="indefinite"/>
            </path>
            {/* Knobs */}
            <circle cx="20" cy="46" r="4" fill="#2a2a2a" stroke="#1a1a1a"/>
            <circle cx="32" cy="46" r="4" fill="#2a2a2a" stroke="#1a1a1a"/>
            <circle cx="44" cy="46" r="4" fill="#2a2a2a" stroke="#1a1a1a"/>
          </svg>
        );

      // MXR PHASE 90
      case 'mxr phase 90':
      case 'mxrphase90':
      case 'phase 90':
      case 'phase90':
        return (
          <svg viewBox="0 0 64 64" fill="none">
            <defs>
              <linearGradient id="phase90Grad" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#ff8800" />
                <stop offset="100%" stopColor="#ff6600" />
              </linearGradient>
            </defs>
            <rect x="12" y="8" width="40" height="48" rx="4" fill="url(#phase90Grad)" stroke="#cc5500" strokeWidth="2"/>
            {/* MXR logo */}
            <text x="32" y="20" fill="#1a1a1a" fontSize="8" fontWeight="bold" textAnchor="middle">MXR</text>
            {/* Phase circles */}
            <circle cx="32" cy="30" r="4" fill="none" stroke="#1a1a1a" strokeWidth="2">
              <animate attributeName="r" values="4;8;4" dur="2s" repeatCount="indefinite"/>
              <animate attributeName="opacity" values="1;0.3;1" dur="2s" repeatCount="indefinite"/>
            </circle>
            <circle cx="32" cy="30" r="6" fill="none" stroke="#1a1a1a" strokeWidth="1.5">
              <animate attributeName="r" values="6;10;6" dur="2s" begin="0.5s" repeatCount="indefinite"/>
              <animate attributeName="opacity" values="0.7;0.2;0.7" dur="2s" begin="0.5s" repeatCount="indefinite"/>
            </circle>
            {/* Single knob */}
            <circle cx="32" cy="46" r="6" fill="#2a2a2a" stroke="#1a1a1a" strokeWidth="1.5"/>
            <line x1="32" y1="40" x2="32" y2="46" stroke="#ffffff" strokeWidth="2"/>
          </svg>
        );

      // UNI-VIBE
      case 'uni-vibe':
      case 'univibe':
      case 'uni vibe':
        return (
          <svg viewBox="0 0 64 64" fill="none">
            <defs>
              <linearGradient id="univibeGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#2a2a2a" />
                <stop offset="100%" stopColor="#1a1a1a" />
              </linearGradient>
            </defs>
            <rect x="12" y="8" width="40" height="48" rx="4" fill="url(#univibeGrad)" stroke="#0a0a0a" strokeWidth="2"/>
            {/* Rotating wave pattern */}
            <circle cx="32" cy="28" r="10" fill="none" stroke="#ff6b35" strokeWidth="2">
              <animateTransform attributeName="transform" type="rotate" from="0 32 28" to="360 32 28" dur="4s" repeatCount="indefinite"/>
            </circle>
            <line x1="22" y1="28" x2="42" y2="28" stroke="#ff6b35" strokeWidth="2">
              <animateTransform attributeName="transform" type="rotate" from="0 32 28" to="360 32 28" dur="4s" repeatCount="indefinite"/>
            </line>
            <line x1="32" y1="18" x2="32" y2="38" stroke="#ff6b35" strokeWidth="2">
              <animateTransform attributeName="transform" type="rotate" from="0 32 28" to="360 32 28" dur="4s" repeatCount="indefinite"/>
            </line>
            {/* Knobs */}
            <circle cx="24" cy="48" r="4" fill="#c0c0c0" stroke="#1a1a1a"/>
            <circle cx="40" cy="48" r="4" fill="#c0c0c0" stroke="#1a1a1a"/>
          </svg>
        );

      // BOSS BF-2 FLANGER
      case 'boss bf-2':
      case 'bossbf2':
      case 'bf-2':
        return (
          <svg viewBox="0 0 64 64" fill="none">
            <defs>
              <linearGradient id="bf2Grad" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#6699ff" />
                <stop offset="100%" stopColor="#4477dd" />
              </linearGradient>
            </defs>
            <rect x="12" y="8" width="40" height="48" rx="4" fill="url(#bf2Grad)" stroke="#3366cc" strokeWidth="2"/>
            {/* BOSS logo */}
            <text x="32" y="20" fill="#ffffff" fontSize="8" fontWeight="bold" textAnchor="middle">BOSS</text>
            {/* Flanger wave */}
            <path d="M18 28 Q24 22, 30 28 T42 28" stroke="#ffffff" strokeWidth="2" fill="none">
              <animate attributeName="d" 
                values="M18 28 Q24 22, 30 28 T42 28;M18 28 Q24 34, 30 28 T42 28;M18 28 Q24 22, 30 28 T42 28" 
                dur="1.5s" repeatCount="indefinite"/>
            </path>
            <path d="M18 34 Q24 28, 30 34 T42 34" stroke="#ffffff" strokeWidth="1.5" fill="none" opacity="0.6">
              <animate attributeName="d" 
                values="M18 34 Q24 28, 30 34 T42 34;M18 34 Q24 40, 30 34 T42 34;M18 34 Q24 28, 30 34 T42 34" 
                dur="1.5s" begin="0.3s" repeatCount="indefinite"/>
            </path>
            {/* Knobs */}
            <circle cx="22" cy="46" r="3" fill="#2a2a2a" stroke="#1a1a1a"/>
            <circle cx="32" cy="46" r="3" fill="#2a2a2a" stroke="#1a1a1a"/>
            <circle cx="42" cy="46" r="3" fill="#2a2a2a" stroke="#1a1a1a"/>
            {/* LED */}
            <circle cx="32" cy="15" r="2" fill="#66ccff" opacity="0.9"/>
          </svg>
        );

      // BOSS TR-2 TREMOLO
      case 'boss tr-2':
      case 'bosstr2':
      case 'tr-2':
        return (
          <svg viewBox="0 0 64 64" fill="none">
            <defs>
              <linearGradient id="tr2Grad" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#00cc88" />
                <stop offset="100%" stopColor="#00aa66" />
              </linearGradient>
            </defs>
            <rect x="12" y="8" width="40" height="48" rx="4" fill="url(#tr2Grad)" stroke="#008855" strokeWidth="2"/>
            {/* BOSS logo */}
            <text x="32" y="20" fill="#ffffff" fontSize="8" fontWeight="bold" textAnchor="middle">BOSS</text>
            {/* Tremolo wave (amplitude modulation) */}
            <path d="M18 32 L22 24 L26 32 L30 24 L34 32 L38 24 L42 32 L46 24" stroke="#ffffff" strokeWidth="2" fill="none">
              <animate attributeName="opacity" values="1;0.5;1" dur="1s" repeatCount="indefinite"/>
            </path>
            {/* Knobs */}
            <circle cx="24" cy="44" r="4" fill="#2a2a2a" stroke="#1a1a1a"/>
            <circle cx="40" cy="44" r="4" fill="#2a2a2a" stroke="#1a1a1a"/>
            {/* LED */}
            <circle cx="32" cy="15" r="2" fill="#00ff88" opacity="0.9"/>
          </svg>
        );

      // STRYMON MOBIUS
      case 'strymon mobius':
      case 'strymonmobius':
      case 'mobius':
        return (
          <svg viewBox="0 0 64 64" fill="none">
            <defs>
              <linearGradient id="mobiusGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#3366ff" />
                <stop offset="100%" stopColor="#2244cc" />
              </linearGradient>
            </defs>
            <rect x="6" y="16" width="52" height="32" rx="2" fill="url(#mobiusGrad)" stroke="#1133aa" strokeWidth="2"/>
            {/* OLED Display */}
            <rect x="12" y="22" width="24" height="12" rx="1" fill="#000000"/>
            <text x="24" y="30" fill="#ffffff" fontSize="5" textAnchor="middle" fontFamily="monospace">MOBIUS</text>
            {/* Knobs */}
            <circle cx="40" cy="24" r="3" fill="#c0c0c0" stroke="#1a1a1a" strokeWidth="0.5"/>
            <circle cx="48" cy="24" r="3" fill="#c0c0c0" stroke="#1a1a1a" strokeWidth="0.5"/>
            <circle cx="40" cy="32" r="3" fill="#c0c0c0" stroke="#1a1a1a" strokeWidth="0.5"/>
            <circle cx="48" cy="32" r="3" fill="#c0c0c0" stroke="#1a1a1a" strokeWidth="0.5"/>
            <circle cx="40" cy="40" r="3" fill="#c0c0c0" stroke="#1a1a1a" strokeWidth="0.5"/>
            <circle cx="48" cy="40" r="3" fill="#c0c0c0" stroke="#1a1a1a" strokeWidth="0.5"/>
          </svg>
        );

      // EVENTIDE H9
      case 'eventide h9':
      case 'eventideh9':
      case 'h9':
        return (
          <svg viewBox="0 0 64 64" fill="none">
            <defs>
              <linearGradient id="h9Grad" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#2a2a2a" />
                <stop offset="100%" stopColor="#1a1a1a" />
              </linearGradient>
            </defs>
            <rect x="6" y="16" width="52" height="32" rx="2" fill="url(#h9Grad)" stroke="#0a0a0a" strokeWidth="2"/>
            {/* LCD Display */}
            <rect x="12" y="22" width="28" height="14" rx="1" fill="#001a00"/>
            <text x="26" y="30" fill="#00ff00" fontSize="6" textAnchor="middle" fontFamily="monospace">H9</text>
            {/* Large knob */}
            <circle cx="48" cy="32" r="8" fill="#c0c0c0" stroke="#1a1a1a" strokeWidth="1"/>
            <line x1="48" y1="24" x2="48" y2="32" stroke="#1a1a1a" strokeWidth="2"/>
            {/* Function buttons */}
            <rect x="12" y="40" width="8" height="4" rx="1" fill="#ff6b35"/>
            <rect x="22" y="40" width="8" height="4" rx="1" fill="#ff6b35"/>
            <rect x="32" y="40" width="8" height="4" rx="1" fill="#ff6b35"/>
          </svg>
        );

      // CRY BABY WAH (update to match type)
      case 'cry baby':
      case 'cry baby wah':
      case 'crybabywah':
      case 'crybaby':
        return (
          <svg viewBox="0 0 64 64" fill="none">
            <defs>
              <linearGradient id="crybabyGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#1a1a1a" />
                <stop offset="100%" stopColor="#000000" />
              </linearGradient>
            </defs>
            {/* Wah pedal shape */}
            <path d="M20 56 L20 20 Q20 12, 28 12 L36 12 Q44 12, 44 20 L44 56 Z" fill="url(#crybabyGrad)" stroke="#0a0a0a" strokeWidth="2"/>
            {/* Rubber pad */}
            <ellipse cx="32" cy="35" rx="10" ry="15" fill="#2a2a2a" stroke="#1a1a1a" strokeWidth="1"/>
            {/* Wah text */}
            <text x="32" y="20" fill="#ffffff" fontSize="8" fontWeight="bold" textAnchor="middle">CRY BABY</text>
            {/* Wah wave */}
            <path d="M24 24 Q28 20, 32 24 Q36 28, 40 24" stroke="#ff0000" strokeWidth="2" fill="none">
              <animate attributeName="d" 
                values="M24 24 Q28 20, 32 24 Q36 28, 40 24;M24 28 Q28 24, 32 28 Q36 32, 40 28;M24 24 Q28 20, 32 24 Q36 28, 40 24" 
                dur="1.5s" repeatCount="indefinite"/>
            </path>
          </svg>
        );

      // NOISE GATE
      case 'noise gate':
      case 'noisegate':
      case 'gate':
        return (
          <svg viewBox="0 0 64 64" fill="none">
            <defs>
              <linearGradient id="gateGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#3a3a3a" />
                <stop offset="100%" stopColor="#2a2a2a" />
              </linearGradient>
            </defs>
            <rect x="12" y="8" width="40" height="48" rx="4" fill="url(#gateGrad)" stroke="#1a1a1a" strokeWidth="2"/>
            {/* Gate visualization */}
            <rect x="20" y="20" width="24" height="20" fill="#1a1a1a" stroke="#ff6b35" strokeWidth="1"/>
            {/* Signal bars */}
            <rect x="22" y="32" width="3" height="6" fill="#00ff00"/>
            <rect x="26" y="28" width="3" height="10" fill="#00ff00"/>
            <rect x="30" y="24" width="3" height="14" fill="#ffff00"/>
            <rect x="34" y="22" width="3" height="16" fill="#ff6600" opacity="0.5"/>
            <rect x="38" y="20" width="3" height="18" fill="#ff0000" opacity="0.3"/>
            {/* Threshold knob */}
            <circle cx="32" cy="48" r="5" fill="#ff6b35" stroke="#1a1a1a" strokeWidth="1.5"/>
          </svg>
        );

      // COMPRESSOR (generic)
      case 'compressor':
      case 'limiter':
        return (
          <svg viewBox="0 0 64 64" fill="none">
            <defs>
              <linearGradient id="compGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#dd2222" />
                <stop offset="100%" stopColor="#cc0000" />
              </linearGradient>
            </defs>
            {/* Pedal body */}
            <rect x="12" y="8" width="40" height="48" rx="4" fill="url(#compGrad)" stroke="#aa0000" strokeWidth="2"/>
            {/* VU meter */}
            <rect x="18" y="18" width="28" height="18" rx="2" fill="#1a1a1a" stroke="#0a0a0a" strokeWidth="1"/>
            <rect x="20" y="22" width="3" height="10" fill="#00ff00"/>
            <rect x="24" y="22" width="3" height="10" fill="#00ff00"/>
            <rect x="28" y="22" width="3" height="10" fill="#ffff00"/>
            <rect x="32" y="22" width="3" height="10" fill="#ffff00"/>
            <rect x="36" y="22" width="3" height="10" fill="#ff6600"/>
            <rect x="40" y="22" width="3" height="10" fill="#ff0000">
              <animate attributeName="opacity" values="0.3;1;0.3" dur="1s" repeatCount="indefinite"/>
            </rect>
            {/* Knobs */}
            <circle cx="32" cy="46" r="5" fill="#2a2a2a" stroke="#1a1a1a" strokeWidth="1"/>
          </svg>
        );

      // WAH
      case 'wah':
      case 'crybaby':
      case 'cry baby':
        return (
          <svg viewBox="0 0 64 64" fill="none">
            <defs>
              <linearGradient id="wahGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#1a1a1a" />
                <stop offset="100%" stopColor="#000000" />
              </linearGradient>
            </defs>
            {/* Wah pedal shape */}
            <path d="M20 56 L20 20 Q20 12, 28 12 L36 12 Q44 12, 44 20 L44 56 Z" fill="url(#wahGrad)" stroke="#0a0a0a" strokeWidth="2"/>
            {/* Rubber pad */}
            <ellipse cx="32" cy="35" rx="10" ry="15" fill="#2a2a2a" stroke="#1a1a1a" strokeWidth="1"/>
            {/* Wah wave */}
            <path d="M24 24 Q28 20, 32 24 Q36 28, 40 24" stroke="#ff0000" strokeWidth="2" fill="none">
              <animate attributeName="d" 
                values="M24 24 Q28 20, 32 24 Q36 28, 40 24;M24 28 Q28 24, 32 28 Q36 32, 40 28;M24 24 Q28 20, 32 24 Q36 28, 40 24" 
                dur="1.5s" repeatCount="indefinite"/>
            </path>
          </svg>
        );

      // EQ
      case 'eq':
      case 'equalizer':
      case 'graphic eq':
        return (
          <svg viewBox="0 0 64 64" fill="none">
            <defs>
              <linearGradient id="eqGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#4a4a4a" />
                <stop offset="100%" stopColor="#2a2a2a" />
              </linearGradient>
            </defs>
            {/* Pedal body */}
            <rect x="10" y="8" width="44" height="48" rx="4" fill="url(#eqGrad)" stroke="#1a1a1a" strokeWidth="2"/>
            {/* EQ sliders */}
            <rect x="16" y="38" width="4" height="12" fill="#ff6b35"/>
            <rect x="23" y="28" width="4" height="22" fill="#ff6b35"/>
            <rect x="30" y="20" width="4" height="30" fill="#ff6b35"/>
            <rect x="37" y="32" width="4" height="18" fill="#ff6b35"/>
            <rect x="44" y="25" width="4" height="25" fill="#ff6b35"/>
            {/* Frequency labels */}
            <text x="18" y="16" fill="#ffffff" fontSize="6" textAnchor="middle">L</text>
            <text x="25" y="16" fill="#ffffff" fontSize="6" textAnchor="middle">M</text>
            <text x="32" y="16" fill="#ffffff" fontSize="6" textAnchor="middle">H</text>
          </svg>
        );

      // SPECIFIC PEDALS - MESA V-TWIN
      case 'mesa v-twin':
      case 'mesavtwin':
        return (
          <svg viewBox="0 0 64 64" fill="none">
            <defs>
              <linearGradient id="mesaGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#2a2a2a" />
                <stop offset="100%" stopColor="#1a1a1a" />
              </linearGradient>
            </defs>
            <rect x="6" y="16" width="52" height="32" rx="2" fill="url(#mesaGrad)" stroke="#0a0a0a" strokeWidth="2"/>
            {/* Mesa stripes */}
            <rect x="10" y="20" width="2" height="24" fill="#ff6600" opacity="0.8"/>
            <rect x="14" y="20" width="2" height="24" fill="#ff8800" opacity="0.8"/>
            {/* Knobs */}
            <circle cx="28" cy="28" r="3" fill="#2a2a2a" stroke="#1a1a1a"/>
            <circle cx="38" cy="28" r="3" fill="#2a2a2a" stroke="#1a1a1a"/>
            <circle cx="48" cy="28" r="3" fill="#2a2a2a" stroke="#1a1a1a"/>
            <circle cx="28" cy="38" r="3" fill="#2a2a2a" stroke="#1a1a1a"/>
            <circle cx="38" cy="38" r="3" fill="#2a2a2a" stroke="#1a1a1a"/>
          </svg>
        );

      // TECH 21 SANSAMP
      case 'tech 21':
      case 'tech21':
      case 'sansamp':
      case 'tech21sansamp':
        return (
          <svg viewBox="0 0 64 64" fill="none">
            <defs>
              <linearGradient id="sansampGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#2a2a2a" />
                <stop offset="100%" stopColor="#1a1a1a" />
              </linearGradient>
            </defs>
            <rect x="6" y="16" width="52" height="32" rx="2" fill="url(#sansampGrad)" stroke="#0a0a0a" strokeWidth="2"/>
            {/* VU Meter */}
            <rect x="12" y="22" width="18" height="8" rx="1" fill="#0a0a0a"/>
            <rect x="13" y="24" width="3" height="4" fill="#00ff00"/>
            <rect x="17" y="24" width="3" height="4" fill="#ffff00"/>
            <rect x="21" y="24" width="3" height="4" fill="#ff6600"/>
            <rect x="25" y="24" width="3" height="4" fill="#ff0000"/>
            {/* Character switches */}
            <circle cx="40" cy="26" r="2" fill="#ff6b35"/>
            <circle cx="48" cy="26" r="2" fill="#ff6b35"/>
            <circle cx="40" cy="36" r="2" fill="#ff6b35"/>
            <circle cx="48" cy="36" r="2" fill="#ff6b35"/>
          </svg>
        );

      // TUBE SCREAMER
      case 'tube screamer':
      case 'tubescreamer':
      case 'ts9':
      case 'ts808':
        return (
          <svg viewBox="0 0 64 64" fill="none">
            <defs>
              <linearGradient id="tsGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#00cc66" />
                <stop offset="100%" stopColor="#00a550" />
              </linearGradient>
            </defs>
            <rect x="12" y="8" width="40" height="48" rx="4" fill="url(#tsGrad)" stroke="#006622" strokeWidth="2"/>
            {/* Knobs (cream colored) */}
            <circle cx="22" cy="24" r="6" fill="#f5deb3" stroke="#1a1a1a" strokeWidth="1.5"/>
            <line x1="22" y1="18" x2="22" y2="24" stroke="#1a1a1a" strokeWidth="2"/>
            <circle cx="32" cy="24" r="6" fill="#f5deb3" stroke="#1a1a1a" strokeWidth="1.5"/>
            <line x1="32" y1="18" x2="32" y2="24" stroke="#1a1a1a" strokeWidth="2"/>
            <circle cx="42" cy="24" r="6" fill="#f5deb3" stroke="#1a1a1a" strokeWidth="1.5"/>
            <line x1="42" y1="18" x2="42" y2="24" stroke="#1a1a1a" strokeWidth="2"/>
            {/* LED */}
            <circle cx="32" cy="45" r="3" fill="#00ff00" opacity="0.8">
              <animate attributeName="opacity" values="0.8;1;0.8" dur="2s" repeatCount="indefinite"/>
            </circle>
          </svg>
        );

      // KLON CENTAUR
      case 'klon':
      case 'klon centaur':
      case 'kloncentaur':
      case 'centaur':
        return (
          <svg viewBox="0 0 64 64" fill="none">
            <defs>
              <linearGradient id="klonGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#f0d878" />
                <stop offset="100%" stopColor="#d4af37" />
              </linearGradient>
            </defs>
            <rect x="12" y="8" width="40" height="48" rx="4" fill="url(#klonGrad)" stroke="#b8941f" strokeWidth="2"/>
            {/* Gold knobs */}
            <circle cx="20" cy="24" r="6" fill="#ffd700" stroke="#1a1a1a" strokeWidth="1.5"/>
            <circle cx="32" cy="24" r="6" fill="#ffd700" stroke="#1a1a1a" strokeWidth="1.5"/>
            <circle cx="44" cy="24" r="6" fill="#ffd700" stroke="#1a1a1a" strokeWidth="1.5"/>
            {/* Centaur silhouette */}
            <path d="M28 38 Q32 34, 36 38" stroke="#8b6914" strokeWidth="2" fill="none"/>
            {/* LED */}
            <circle cx="32" cy="48" r="2" fill="#e0f7ff" opacity="0.9"/>
          </svg>
        );

      // BOSS BD-2
      case 'boss bd-2':
      case 'bossbd2':
      case 'bd-2':
      case 'blues driver':
        return (
          <svg viewBox="0 0 64 64" fill="none">
            <defs>
              <linearGradient id="bd2Grad" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#0077dd" />
                <stop offset="100%" stopColor="#0066cc" />
              </linearGradient>
            </defs>
            <rect x="12" y="8" width="40" height="48" rx="4" fill="url(#bd2Grad)" stroke="#0055aa" strokeWidth="2"/>
            {/* Black knobs */}
            <circle cx="20" cy="25" r="5" fill="#2a2a2a" stroke="#1a1a1a" strokeWidth="1.5"/>
            <line x1="20" y1="20" x2="20" y2="25" stroke="#ffffff" strokeWidth="1.5"/>
            <circle cx="32" cy="25" r="5" fill="#2a2a2a" stroke="#1a1a1a" strokeWidth="1.5"/>
            <line x1="32" y1="20" x2="32" y2="25" stroke="#ffffff" strokeWidth="1.5"/>
            <circle cx="44" cy="25" r="5" fill="#2a2a2a" stroke="#1a1a1a" strokeWidth="1.5"/>
            <line x1="44" y1="20" x2="44" y2="25" stroke="#ffffff" strokeWidth="1.5"/>
            {/* BOSS logo */}
            <text x="32" y="42" fill="#ffffff" fontSize="8" fontWeight="bold" textAnchor="middle">BOSS</text>
            {/* LED */}
            <circle cx="32" cy="15" r="2" fill="#0099ff" opacity="0.9"/>
          </svg>
        );

      // BOSS SD-1
      case 'boss sd-1':
      case 'bosssd1':
      case 'sd-1':
      case 'super overdrive':
        return (
          <svg viewBox="0 0 64 64" fill="none">
            <defs>
              <linearGradient id="sd1Grad" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#ffdd22" />
                <stop offset="100%" stopColor="#ffcc00" />
              </linearGradient>
            </defs>
            <rect x="12" y="8" width="40" height="48" rx="4" fill="url(#sd1Grad)" stroke="#ddaa00" strokeWidth="2"/>
            {/* Black knobs */}
            <circle cx="20" cy="25" r="5" fill="#2a2a2a" stroke="#1a1a1a" strokeWidth="1.5"/>
            <circle cx="32" cy="25" r="5" fill="#2a2a2a" stroke="#1a1a1a" strokeWidth="1.5"/>
            <circle cx="44" cy="25" r="5" fill="#2a2a2a" stroke="#1a1a1a" strokeWidth="1.5"/>
            {/* BOSS logo */}
            <text x="32" y="42" fill="#1a1a1a" fontSize="8" fontWeight="bold" textAnchor="middle">BOSS</text>
            {/* LED */}
            <circle cx="32" cy="15" r="2" fill="#ffff00" opacity="0.9"/>
          </svg>
        );

      // PROCO RAT
      case 'proco rat':
      case 'procorat':
      case 'rat':
        return (
          <svg viewBox="0 0 64 64" fill="none">
            <rect x="12" y="8" width="40" height="48" rx="4" fill="#1a1a1a" stroke="#0a0a0a" strokeWidth="2"/>
            {/* Large black knobs */}
            <circle cx="20" cy="26" r="6" fill="#2a2a2a" stroke="#1a1a1a" strokeWidth="1.5"/>
            <circle cx="32" cy="26" r="6" fill="#2a2a2a" stroke="#1a1a1a" strokeWidth="1.5"/>
            <circle cx="44" cy="26" r="6" fill="#2a2a2a" stroke="#1a1a1a" strokeWidth="1.5"/>
            {/* RAT logo */}
            <text x="32" y="44" fill="#ffffff" fontSize="10" fontWeight="bold" textAnchor="middle">RAT</text>
            {/* LED */}
            <circle cx="32" cy="15" r="2" fill="#ff0000" opacity="0.9"/>
          </svg>
        );

      // FULLTONE OCD
      case 'fulltone ocd':
      case 'fulltoneocd':
      case 'ocd':
        return (
          <svg viewBox="0 0 64 64" fill="none">
            <defs>
              <linearGradient id="ocdGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#f5e6c8" />
                <stop offset="100%" stopColor="#e8d4b0" />
              </linearGradient>
            </defs>
            <rect x="12" y="8" width="40" height="48" rx="4" fill="url(#ocdGrad)" stroke="#d4b894" strokeWidth="2"/>
            {/* Knobs */}
            <circle cx="24" cy="26" r="5" fill="#2a2a2a" stroke="#1a1a1a" strokeWidth="1.5"/>
            <circle cx="40" cy="26" r="5" fill="#2a2a2a" stroke="#1a1a1a" strokeWidth="1.5"/>
            {/* OCD text */}
            <text x="32" y="42" fill="#1a1a1a" fontSize="12" fontWeight="bold" textAnchor="middle">OCD</text>
            {/* LED */}
            <circle cx="32" cy="15" r="2" fill="#0066ff" opacity="0.9"/>
          </svg>
        );

      // MXR DISTORTION+
      case 'mxr distortion+':
      case 'mxr distortion plus':
      case 'mxrdistortionplus':
      case 'distortion+':
        return (
          <svg viewBox="0 0 64 64" fill="none">
            <defs>
              <linearGradient id="mxrDistGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#ffee22" />
                <stop offset="100%" stopColor="#ffdd00" />
              </linearGradient>
            </defs>
            <rect x="12" y="8" width="40" height="48" rx="4" fill="url(#mxrDistGrad)" stroke="#ddbb00" strokeWidth="2"/>
            {/* MXR knobs */}
            <circle cx="24" cy="28" r="5" fill="#2a2a2a" stroke="#1a1a1a" strokeWidth="1.5"/>
            <circle cx="40" cy="28" r="5" fill="#2a2a2a" stroke="#1a1a1a" strokeWidth="1.5"/>
            {/* MXR logo */}
            <text x="32" y="18" fill="#1a1a1a" fontSize="8" fontWeight="bold" textAnchor="middle">MXR</text>
            {/* LED */}
            <circle cx="32" cy="46" r="2" fill="#ff0000" opacity="0.9"/>
          </svg>
        );

      // BIG MUFF
      case 'big muff':
      case 'bigmuff':
      case 'muff':
        return (
          <svg viewBox="0 0 64 64" fill="none">
            <defs>
              <linearGradient id="muffGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#2a2a2a" />
                <stop offset="100%" stopColor="#1a1a1a" />
              </linearGradient>
            </defs>
            <rect x="10" y="6" width="44" height="52" rx="4" fill="url(#muffGrad)" stroke="#0a0a0a" strokeWidth="2"/>
            {/* Knobs - large and silver */}
            <circle cx="18" cy="22" r="5" fill="#c0c0c0" stroke="#1a1a1a" strokeWidth="1.5"/>
            <circle cx="32" cy="22" r="5" fill="#c0c0c0" stroke="#1a1a1a" strokeWidth="1.5"/>
            <circle cx="46" cy="22" r="5" fill="#c0c0c0" stroke="#1a1a1a" strokeWidth="1.5"/>
            <circle cx="25" cy="36" r="5" fill="#c0c0c0" stroke="#1a1a1a" strokeWidth="1.5"/>
            <circle cx="39" cy="36" r="5" fill="#c0c0c0" stroke="#1a1a1a" strokeWidth="1.5"/>
            {/* LED eyes */}
            <circle cx="25" cy="48" r="2" fill="#ff0000" opacity="0.9"/>
            <circle cx="39" cy="48" r="2" fill="#ff0000" opacity="0.9"/>
          </svg>
        );

      // Z.VEX FUZZ FACTORY
      case 'zvex':
      case 'z.vex':
      case 'fuzz factory':
      case 'zvexfuzzfactory':
        return (
          <svg viewBox="0 0 64 64" fill="none">
            <defs>
              <linearGradient id="zvexGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#ff6699" />
                <stop offset="50%" stopColor="#6699ff" />
                <stop offset="100%" stopColor="#66ff99" />
              </linearGradient>
            </defs>
            <rect x="12" y="8" width="40" height="48" rx="4" fill="url(#zvexGrad)" stroke="#1a1a1a" strokeWidth="2"/>
            {/* Hand-painted style tubes */}
            <rect x="18" y="20" width="3" height="8" rx="1" fill="#ff3366"/>
            <rect x="24" y="20" width="3" height="8" rx="1" fill="#33ff66"/>
            <rect x="30" y="20" width="3" height="8" rx="1" fill="#3366ff"/>
            <rect x="36" y="20" width="3" height="8" rx="1" fill="#ff9933"/>
            <rect x="42" y="20" width="3" height="8" rx="1" fill="#9933ff"/>
            {/* Knobs */}
            <circle cx="26" cy="40" r="4" fill="#ffff00" stroke="#1a1a1a" strokeWidth="1"/>
            <circle cx="38" cy="40" r="4" fill="#ff00ff" stroke="#1a1a1a" strokeWidth="1"/>
          </svg>
        );

      // MEMORY MAN (EHX)
      case 'memory man':
      case 'memoryman':
      case 'ehx memory man':
        return (
          <svg viewBox="0 0 64 64" fill="none">
            <defs>
              <linearGradient id="memoryGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#c0c0c0" />
                <stop offset="100%" stopColor="#909090" />
              </linearGradient>
            </defs>
            <rect x="8" y="8" width="48" height="48" rx="4" fill="url(#memoryGrad)" stroke="#707070" strokeWidth="2"/>
            {/* Knobs - many small knobs */}
            <circle cx="18" cy="20" r="3" fill="#2a2a2a" stroke="#1a1a1a" strokeWidth="0.5"/>
            <circle cx="28" cy="20" r="3" fill="#2a2a2a" stroke="#1a1a1a" strokeWidth="0.5"/>
            <circle cx="38" cy="20" r="3" fill="#2a2a2a" stroke="#1a1a1a" strokeWidth="0.5"/>
            <circle cx="48" cy="20" r="3" fill="#2a2a2a" stroke="#1a1a1a" strokeWidth="0.5"/>
            <circle cx="18" cy="32" r="3" fill="#2a2a2a" stroke="#1a1a1a" strokeWidth="0.5"/>
            <circle cx="28" cy="32" r="3" fill="#2a2a2a" stroke="#1a1a1a" strokeWidth="0.5"/>
            <circle cx="38" cy="32" r="3" fill="#2a2a2a" stroke="#1a1a1a" strokeWidth="0.5"/>
            <circle cx="48" cy="32" r="3" fill="#2a2a2a" stroke="#1a1a1a" strokeWidth="0.5"/>
            {/* LED */}
            <circle cx="32" cy="48" r="2" fill="#ff6b35" opacity="0.9"/>
          </svg>
        );

      // MXR CARBON COPY
      case 'mxr carbon copy':
      case 'carboncopy':
      case 'carbon copy':
        return (
          <svg viewBox="0 0 64 64" fill="none">
            <defs>
              <linearGradient id="carbonGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#2a2a2a" />
                <stop offset="100%" stopColor="#1a1a1a" />
              </linearGradient>
            </defs>
            <rect x="12" y="8" width="40" height="48" rx="4" fill="url(#carbonGrad)" stroke="#0a0a0a" strokeWidth="2"/>
            {/* MXR knobs */}
            <circle cx="20" cy="24" r="5" fill="#c0c0c0" stroke="#1a1a1a" strokeWidth="1"/>
            <circle cx="32" cy="24" r="5" fill="#c0c0c0" stroke="#1a1a1a" strokeWidth="1"/>
            <circle cx="44" cy="24" r="5" fill="#c0c0c0" stroke="#1a1a1a" strokeWidth="1"/>
            {/* Modulation switches */}
            <rect x="28" y="38" width="8" height="4" fill="#00cc66"/>
            {/* MXR logo */}
            <text x="32" y="50" fill="#00cc66" fontSize="6" fontWeight="bold" textAnchor="middle">MXR</text>
          </svg>
        );

      // BOSS DD-500
      case 'boss dd-500':
      case 'bossdd500':
      case 'dd-500':
      case 'dd500':
        return (
          <svg viewBox="0 0 64 64" fill="none">
            <defs>
              <linearGradient id="dd500Grad" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#2a2a2a" />
                <stop offset="100%" stopColor="#1a1a1a" />
              </linearGradient>
            </defs>
            <rect x="6" y="16" width="52" height="32" rx="2" fill="url(#dd500Grad)" stroke="#0a0a0a" strokeWidth="2"/>
            {/* LCD Display */}
            <rect x="12" y="22" width="28" height="14" rx="1" fill="#003366"/>
            <text x="26" y="30" fill="#00ccff" fontSize="6" textAnchor="middle" fontFamily="monospace">DD-500</text>
            {/* Knobs */}
            <circle cx="44" cy="24" r="3" fill="#2a2a2a" stroke="#1a1a1a" strokeWidth="0.5"/>
            <circle cx="52" cy="24" r="3" fill="#2a2a2a" stroke="#1a1a1a" strokeWidth="0.5"/>
            <circle cx="44" cy="32" r="3" fill="#2a2a2a" stroke="#1a1a1a" strokeWidth="0.5"/>
            <circle cx="52" cy="32" r="3" fill="#2a2a2a" stroke="#1a1a1a" strokeWidth="0.5"/>
            <circle cx="44" cy="40" r="3" fill="#2a2a2a" stroke="#1a1a1a" strokeWidth="0.5"/>
            <circle cx="52" cy="40" r="3" fill="#2a2a2a" stroke="#1a1a1a" strokeWidth="0.5"/>
          </svg>
        );

      // LINE 6 DL4
      case 'line 6 dl4':
      case 'line6dl4':
      case 'dl4':
        return (
          <svg viewBox="0 0 64 64" fill="none">
            <defs>
              <linearGradient id="dl4Grad" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#00aa00" />
                <stop offset="100%" stopColor="#008800" />
              </linearGradient>
            </defs>
            <rect x="6" y="16" width="52" height="32" rx="2" fill="url(#dl4Grad)" stroke="#006600" strokeWidth="2"/>
            {/* LCD Display */}
            <rect x="12" y="22" width="24" height="12" rx="1" fill="#001a00"/>
            <text x="24" y="30" fill="#00ff00" fontSize="6" textAnchor="middle" fontFamily="monospace">DL4</text>
            {/* Footswitches */}
            <rect x="40" y="24" width="6" height="6" rx="1" fill="#2a2a2a"/>
            <rect x="48" y="24" width="6" height="6" rx="1" fill="#2a2a2a"/>
            <rect x="40" y="34" width="6" height="6" rx="1" fill="#2a2a2a"/>
            <rect x="48" y="34" width="6" height="6" rx="1" fill="#2a2a2a"/>
          </svg>
        );

      // BIGSKY REVERB
      case 'bigsky':
      case 'bigskyverb':
      case 'bigsky reverb':
        return (
          <svg viewBox="0 0 64 64" fill="none">
            <defs>
              <linearGradient id="bigskyGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#6633ff" />
                <stop offset="100%" stopColor="#4411cc" />
              </linearGradient>
            </defs>
            <rect x="6" y="16" width="52" height="32" rx="2" fill="url(#bigskyGrad)" stroke="#3311aa" strokeWidth="2"/>
            {/* OLED Display */}
            <rect x="12" y="22" width="24" height="12" rx="1" fill="#000000"/>
            <text x="24" y="30" fill="#ffffff" fontSize="5" textAnchor="middle" fontFamily="monospace">BIGSKY</text>
            {/* Knobs */}
            <circle cx="40" cy="24" r="3" fill="#c0c0c0" stroke="#1a1a1a" strokeWidth="0.5"/>
            <circle cx="48" cy="24" r="3" fill="#c0c0c0" stroke="#1a1a1a" strokeWidth="0.5"/>
            <circle cx="40" cy="32" r="3" fill="#c0c0c0" stroke="#1a1a1a" strokeWidth="0.5"/>
            <circle cx="48" cy="32" r="3" fill="#c0c0c0" stroke="#1a1a1a" strokeWidth="0.5"/>
            <circle cx="40" cy="40" r="3" fill="#c0c0c0" stroke="#1a1a1a" strokeWidth="0.5"/>
            <circle cx="48" cy="40" r="3" fill="#c0c0c0" stroke="#1a1a1a" strokeWidth="0.5"/>
          </svg>
        );

      // EVENTIDE SPACE
      case 'eventide space':
      case 'eventidespace':
      case 'space':
        return (
          <svg viewBox="0 0 64 64" fill="none">
            <defs>
              <linearGradient id="spaceGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#2a2a2a" />
                <stop offset="100%" stopColor="#1a1a1a" />
              </linearGradient>
            </defs>
            <rect x="6" y="16" width="52" height="32" rx="2" fill="url(#spaceGrad)" stroke="#0a0a0a" strokeWidth="2"/>
            {/* LCD Display */}
            <rect x="12" y="22" width="24" height="12" rx="1" fill="#001a00"/>
            <text x="24" y="30" fill="#00ff00" fontSize="5" textAnchor="middle" fontFamily="monospace">SPACE</text>
            {/* Knobs */}
            <circle cx="42" cy="24" r="3" fill="#c0c0c0" stroke="#1a1a1a" strokeWidth="0.5"/>
            <circle cx="50" cy="24" r="3" fill="#c0c0c0" stroke="#1a1a1a" strokeWidth="0.5"/>
            <circle cx="42" cy="32" r="3" fill="#c0c0c0" stroke="#1a1a1a" strokeWidth="0.5"/>
            <circle cx="50" cy="32" r="3" fill="#c0c0c0" stroke="#1a1a1a" strokeWidth="0.5"/>
            <circle cx="42" cy="40" r="3" fill="#c0c0c0" stroke="#1a1a1a" strokeWidth="0.5"/>
            <circle cx="50" cy="40" r="3" fill="#c0c0c0" stroke="#1a1a1a" strokeWidth="0.5"/>
            {/* Rack ears */}
            <circle cx="9" cy="32" r="1.5" fill="#666"/>
            <circle cx="55" cy="32" r="1.5" fill="#666"/>
          </svg>
        );

      // BOSS RV-500
      case 'boss rv-500':
      case 'bossrv500':
      case 'rv-500':
      case 'rv500':
        return (
          <svg viewBox="0 0 64 64" fill="none">
            <defs>
              <linearGradient id="rv500Grad" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#2a2a2a" />
                <stop offset="100%" stopColor="#1a1a1a" />
              </linearGradient>
            </defs>
            <rect x="6" y="16" width="52" height="32" rx="2" fill="url(#rv500Grad)" stroke="#0a0a0a" strokeWidth="2"/>
            {/* LCD Display */}
            <rect x="12" y="22" width="28" height="14" rx="1" fill="#003366"/>
            <text x="26" y="30" fill="#00ccff" fontSize="6" textAnchor="middle" fontFamily="monospace">RV-500</text>
            {/* Knobs */}
            <circle cx="44" cy="24" r="3" fill="#2a2a2a" stroke="#1a1a1a" strokeWidth="0.5"/>
            <circle cx="52" cy="24" r="3" fill="#2a2a2a" stroke="#1a1a1a" strokeWidth="0.5"/>
            <circle cx="44" cy="32" r="3" fill="#2a2a2a" stroke="#1a1a1a" strokeWidth="0.5"/>
            <circle cx="52" cy="32" r="3" fill="#2a2a2a" stroke="#1a1a1a" strokeWidth="0.5"/>
            <circle cx="44" cy="40" r="3" fill="#2a2a2a" stroke="#1a1a1a" strokeWidth="0.5"/>
            <circle cx="52" cy="40" r="3" fill="#2a2a2a" stroke="#1a1a1a" strokeWidth="0.5"/>
          </svg>
        );

      // SPRING REVERB
      case 'spring reverb':
      case 'springreverb':
      case 'spring':
        return (
          <svg viewBox="0 0 64 64" fill="none">
            <defs>
              <linearGradient id="springGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#88ccff" />
                <stop offset="100%" stopColor="#6699cc" />
              </linearGradient>
            </defs>
            <rect x="12" y="8" width="40" height="48" rx="4" fill="url(#springGrad)" stroke="#4477aa" strokeWidth="2"/>
            {/* Spring coils */}
            <path d="M20 24 Q24 20, 28 24 T36 24 T44 24" stroke="#ffffff" strokeWidth="2" fill="none">
              <animate attributeName="d" 
                values="M20 24 Q24 20, 28 24 T36 24 T44 24;M20 24 Q24 28, 28 24 T36 24 T44 24;M20 24 Q24 20, 28 24 T36 24 T44 24" 
                dur="1.5s" repeatCount="indefinite"/>
            </path>
            <path d="M20 32 Q24 28, 28 32 T36 32 T44 32" stroke="#ffffff" strokeWidth="2" fill="none">
              <animate attributeName="d" 
                values="M20 32 Q24 28, 28 32 T36 32 T44 32;M20 32 Q24 36, 28 32 T36 32 T44 32;M20 32 Q24 28, 28 32 T36 32 T44 32" 
                dur="1.5s" begin="0.3s" repeatCount="indefinite"/>
            </path>
            {/* Knobs */}
            <circle cx="26" cy="46" r="4" fill="#2a2a2a" stroke="#1a1a1a"/>
            <circle cx="38" cy="46" r="4" fill="#2a2a2a" stroke="#1a1a1a"/>
          </svg>
        );

      // SHIMMER REVERB
      case 'shimmer reverb':
      case 'shimmerreverb':
      case 'shimmer':
        return (
          <svg viewBox="0 0 64 64" fill="none">
            <defs>
              <linearGradient id="shimmerGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#ffddff" />
                <stop offset="100%" stopColor="#cc99ff" />
              </linearGradient>
            </defs>
            <rect x="12" y="8" width="40" height="48" rx="4" fill="url(#shimmerGrad)" stroke="#aa77dd" strokeWidth="2"/>
            {/* Sparkles */}
            <circle cx="20" cy="18" r="1.5" fill="#ffffff" opacity="0.8">
              <animate attributeName="opacity" values="0.3;1;0.3" dur="1.5s" repeatCount="indefinite"/>
            </circle>
            <circle cx="28" cy="22" r="1" fill="#ffffff" opacity="0.6">
              <animate attributeName="opacity" values="0.2;1;0.2" dur="2s" begin="0.3s" repeatCount="indefinite"/>
            </circle>
            <circle cx="36" cy="20" r="1.5" fill="#ffffff" opacity="0.7">
              <animate attributeName="opacity" values="0.3;1;0.3" dur="1.8s" begin="0.6s" repeatCount="indefinite"/>
            </circle>
            <circle cx="44" cy="24" r="1" fill="#ffffff" opacity="0.5">
              <animate attributeName="opacity" values="0.2;1;0.2" dur="2.2s" begin="0.9s" repeatCount="indefinite"/>
            </circle>
            {/* Reverb waves */}
            <ellipse cx="32" cy="36" rx="8" ry="4" fill="none" stroke="#ffffff" strokeWidth="1.5" opacity="0.5">
              <animate attributeName="rx" values="8;14;8" dur="2s" repeatCount="indefinite"/>
              <animate attributeName="ry" values="4;7;4" dur="2s" repeatCount="indefinite"/>
              <animate attributeName="opacity" values="0.5;0.1;0.5" dur="2s" repeatCount="indefinite"/>
            </ellipse>
            {/* Knobs */}
            <circle cx="32" cy="48" r="4" fill="#7733aa" stroke="#1a1a1a"/>
          </svg>
        );

      // METAL DISTORTION
      case 'metal distortion':
      case 'metaldistortion':
      case 'metal':
        return (
          <svg viewBox="0 0 64 64" fill="none">
            <defs>
              <linearGradient id="metalGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#1a1a1a" />
                <stop offset="100%" stopColor="#0a0a0a" />
              </linearGradient>
            </defs>
            <rect x="12" y="8" width="40" height="48" rx="4" fill="url(#metalGrad)" stroke="#000000" strokeWidth="2"/>
            {/* Metal horns */}
            <path d="M20 28 L18 24 L20 20 L22 24 Z" fill="#ff3333"/>
            <path d="M44 28 L42 24 L44 20 L46 24 Z" fill="#ff3333"/>
            {/* Knobs */}
            <circle cx="26" cy="30" r="5" fill="#ff3333" stroke="#1a1a1a"/>
            <circle cx="38" cy="30" r="5" fill="#ff3333" stroke="#1a1a1a"/>
            {/* Lightning */}
            <path d="M34 40 L30 46 L32 46 L30 52 L36 46 L34 46 Z" fill="#ffff00" stroke="#1a1a1a"/>
          </svg>
        );

      // CLEAN BOOST
      case 'clean boost':
      case 'cleanboost':
      case 'boost':
        return (
          <svg viewBox="0 0 64 64" fill="none">
            <defs>
              <linearGradient id="boostGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#e0f7ff" />
                <stop offset="100%" stopColor="#aaccee" />
              </linearGradient>
            </defs>
            <rect x="12" y="8" width="40" height="48" rx="4" fill="url(#boostGrad)" stroke="#88aacc" strokeWidth="2"/>
            {/* Up arrow */}
            <path d="M32 18 L26 28 L32 24 L38 28 Z" fill="#0066cc" stroke="#1a1a1a"/>
            {/* Knobs */}
            <circle cx="32" cy="38" r="6" fill="#0066cc" stroke="#1a1a1a" strokeWidth="1.5"/>
            <line x1="32" y1="32" x2="32" y2="38" stroke="#ffffff" strokeWidth="2"/>
            {/* LED */}
            <circle cx="32" cy="50" r="2" fill="#0099ff" opacity="0.9"/>
          </svg>
        );

      // TAPE SATURATION
      case 'tape saturation':
      case 'tapesaturation':
      case 'tape':
        return (
          <svg viewBox="0 0 64 64" fill="none">
            <defs>
              <linearGradient id="tapeGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#d4a574" />
                <stop offset="100%" stopColor="#b8865a" />
              </linearGradient>
            </defs>
            <rect x="12" y="8" width="40" height="48" rx="4" fill="url(#tapeGrad)" stroke="#9a7048" strokeWidth="2"/>
            {/* Tape reels */}
            <circle cx="24" cy="28" r="6" fill="#2a2a2a" stroke="#1a1a1a">
              <animateTransform attributeName="transform" type="rotate" from="0 24 28" to="360 24 28" dur="4s" repeatCount="indefinite"/>
            </circle>
            <circle cx="40" cy="28" r="6" fill="#2a2a2a" stroke="#1a1a1a">
              <animateTransform attributeName="transform" type="rotate" from="0 40 28" to="360 40 28" dur="4s" repeatCount="indefinite"/>
            </circle>
            {/* Tape */}
            <line x1="24" y1="22" x2="40" y2="22" stroke="#8b4513" strokeWidth="2"/>
            {/* Knobs */}
            <circle cx="32" cy="44" r="4" fill="#f0d878" stroke="#1a1a1a"/>
          </svg>
        );

      // RACK EFFECTS - TIMELINE, EVENTIDE, etc.
      case 'timeline':
      case 'timelinedelay':
      case 'timefactor':
      case 'eventidetimefactor':
      case 'eventide':
        return (
          <svg viewBox="0 0 64 64" fill="none">
            <defs>
              <linearGradient id="rackGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#2a2a2a" />
                <stop offset="100%" stopColor="#1a1a1a" />
              </linearGradient>
            </defs>
            {/* Rack unit */}
            <rect x="6" y="16" width="52" height="32" rx="2" fill="url(#rackGrad)" stroke="#0a0a0a" strokeWidth="2"/>
            {/* LCD Display */}
            <rect x="12" y="22" width="24" height="12" rx="1" fill="#001a00"/>
            <text x="24" y="30" fill="#00ff00" fontSize="6" textAnchor="middle" fontFamily="monospace">DELAY</text>
            {/* Knobs */}
            <circle cx="42" cy="28" r="3" fill="#c0c0c0" stroke="#1a1a1a" strokeWidth="0.5"/>
            <circle cx="50" cy="28" r="3" fill="#c0c0c0" stroke="#1a1a1a" strokeWidth="0.5"/>
            <circle cx="42" cy="38" r="3" fill="#c0c0c0" stroke="#1a1a1a" strokeWidth="0.5"/>
            <circle cx="50" cy="38" r="3" fill="#c0c0c0" stroke="#1a1a1a" strokeWidth="0.5"/>
            {/* Rack ears */}
            <circle cx="9" cy="32" r="1.5" fill="#666"/>
            <circle cx="55" cy="32" r="1.5" fill="#666"/>
          </svg>
        );

      // TREMOLO (generic)
      case 'tremolo':
        return (
          <svg viewBox="0 0 64 64" fill="none">
            <defs>
              <linearGradient id="tremoloGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#00dd99" />
                <stop offset="100%" stopColor="#00bb77" />
              </linearGradient>
            </defs>
            <rect x="12" y="8" width="40" height="48" rx="4" fill="url(#tremoloGrad)" stroke="#009955" strokeWidth="2"/>
            {/* Amplitude wave */}
            <path d="M18 28 L22 20 L26 28 L30 20 L34 28 L38 20 L42 28 L46 20" stroke="#ffffff" strokeWidth="2.5" fill="none">
              <animate attributeName="opacity" values="1;0.4;1" dur="1s" repeatCount="indefinite"/>
            </path>
            {/* Knobs */}
            <circle cx="26" cy="46" r="4" fill="#2a2a2a" stroke="#1a1a1a"/>
            <circle cx="38" cy="46" r="4" fill="#2a2a2a" stroke="#1a1a1a"/>
          </svg>
        );

      // VIBRATO
      case 'vibrato':
        return (
          <svg viewBox="0 0 64 64" fill="none">
            <defs>
              <linearGradient id="vibratoGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#ff77ff" />
                <stop offset="100%" stopColor="#dd55dd" />
              </linearGradient>
            </defs>
            <rect x="12" y="8" width="40" height="48" rx="4" fill="url(#vibratoGrad)" stroke="#bb33bb" strokeWidth="2"/>
            {/* Pitch modulation */}
            <path d="M18 28 Q24 20, 30 28 Q36 36, 42 28" stroke="#ffffff" strokeWidth="2.5" fill="none">
              <animate attributeName="d" 
                values="M18 28 Q24 20, 30 28 Q36 36, 42 28;M18 28 Q24 36, 30 28 Q36 20, 42 28;M18 28 Q24 20, 30 28 Q36 36, 42 28" 
                dur="1s" repeatCount="indefinite"/>
            </path>
            {/* Knobs */}
            <circle cx="26" cy="46" r="4" fill="#2a2a2a" stroke="#1a1a1a"/>
            <circle cx="38" cy="46" r="4" fill="#2a2a2a" stroke="#1a1a1a"/>
          </svg>
        );

      // OCTAVER
      case 'octaver':
        return (
          <svg viewBox="0 0 64 64" fill="none">
            <defs>
              <linearGradient id="octaverGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#cc55ff" />
                <stop offset="100%" stopColor="#aa33dd" />
              </linearGradient>
            </defs>
            <rect x="12" y="8" width="40" height="48" rx="4" fill="url(#octaverGrad)" stroke="#8811bb" strokeWidth="2"/>
            {/* Octave waves */}
            <path d="M18 24 Q24 20, 30 24 T42 24" stroke="#ffffff" strokeWidth="2" fill="none"/>
            <path d="M18 32 Q24 28, 30 32 T42 32" stroke="#ffffff" strokeWidth="2" fill="none" opacity="0.7"/>
            <path d="M18 40 Q24 36, 30 40 T42 40" stroke="#ffffff" strokeWidth="2" fill="none" opacity="0.4"/>
            {/* Knobs */}
            <circle cx="26" cy="50" r="3" fill="#2a2a2a" stroke="#1a1a1a"/>
            <circle cx="38" cy="50" r="3" fill="#2a2a2a" stroke="#1a1a1a"/>
          </svg>
        );

      // PITCH SHIFTER
      case 'pitch shifter':
      case 'pitchshifter':
      case 'whammy':
        return (
          <svg viewBox="0 0 64 64" fill="none">
            <defs>
              <linearGradient id="pitchGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#ff3388" />
                <stop offset="100%" stopColor="#dd1166" />
              </linearGradient>
            </defs>
            <rect x="12" y="8" width="40" height="48" rx="4" fill="url(#pitchGrad)" stroke="#bb0044" strokeWidth="2"/>
            {/* Up/Down arrows */}
            <path d="M32 20 L26 28 L32 24 L38 28 Z" fill="#ffffff" opacity="0.9"/>
            <path d="M32 44 L26 36 L32 40 L38 36 Z" fill="#ffffff" opacity="0.6"/>
            {/* Pitch range display */}
            <text x="32" y="35" fill="#ffffff" fontSize="10" fontWeight="bold" textAnchor="middle">±12</text>
            {/* Knobs */}
            <circle cx="32" cy="50" r="4" fill="#2a2a2a" stroke="#1a1a1a"/>
          </svg>
        );

      // HARMONIZER
      case 'harmonizer':
        return (
          <svg viewBox="0 0 64 64" fill="none">
            <defs>
              <linearGradient id="harmonizerGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#55ddff" />
                <stop offset="100%" stopColor="#33bbdd" />
              </linearGradient>
            </defs>
            <rect x="12" y="8" width="40" height="48" rx="4" fill="url(#harmonizerGrad)" stroke="#1199bb" strokeWidth="2"/>
            {/* Multiple harmony waves */}
            <path d="M18 24 Q24 20, 30 24 T42 24" stroke="#ffffff" strokeWidth="1.5" fill="none"/>
            <path d="M18 30 Q24 26, 30 30 T42 30" stroke="#ffffff" strokeWidth="1.5" fill="none"/>
            <path d="M18 36 Q24 32, 30 36 T42 36" stroke="#ffffff" strokeWidth="1.5" fill="none"/>
            {/* Musical note */}
            <circle cx="32" cy="44" r="3" fill="#ffffff"/>
            <rect x="35" y="38" width="1.5" height="6" fill="#ffffff"/>
          </svg>
        );

      // LOOPER
      case 'looper':
        return (
          <svg viewBox="0 0 64 64" fill="none">
            <defs>
              <linearGradient id="looperGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#ff6633" />
                <stop offset="100%" stopColor="#dd4411" />
              </linearGradient>
            </defs>
            <rect x="10" y="8" width="44" height="48" rx="4" fill="url(#looperGrad)" stroke="#bb2200" strokeWidth="2"/>
            {/* Loop arrow */}
            <circle cx="32" cy="28" r="10" fill="none" stroke="#ffffff" strokeWidth="3"/>
            <path d="M42 24 L46 28 L42 32" fill="#ffffff"/>
            {/* Record dot */}
            <circle cx="32" cy="44" r="4" fill="#ff0000">
              <animate attributeName="opacity" values="1;0.3;1" dur="1s" repeatCount="indefinite"/>
            </circle>
            {/* Waveform layers */}
            <rect x="14" y="52" width="36" height="2" fill="#ffff00" opacity="0.7"/>
          </svg>
        );

      // RING MODULATOR
      case 'ring modulator':
      case 'ringmod':
        return (
          <svg viewBox="0 0 64 64" fill="none">
            <defs>
              <linearGradient id="ringmodGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#00ffcc" />
                <stop offset="100%" stopColor="#00ddaa" />
              </linearGradient>
            </defs>
            <rect x="12" y="8" width="40" height="48" rx="4" fill="url(#ringmodGrad)" stroke="#00bb88" strokeWidth="2"/>
            {/* Ring pattern */}
            <circle cx="32" cy="28" r="8" fill="none" stroke="#1a1a1a" strokeWidth="2"/>
            <circle cx="32" cy="28" r="4" fill="none" stroke="#1a1a1a" strokeWidth="2"/>
            {/* Modulation wave */}
            <path d="M18 40 L22 36 L26 40 L30 36 L34 40 L38 36 L42 40 L46 36" stroke="#1a1a1a" strokeWidth="2" fill="none"/>
            {/* Knobs */}
            <circle cx="26" cy="50" r="3" fill="#2a2a2a" stroke="#1a1a1a"/>
            <circle cx="38" cy="50" r="3" fill="#2a2a2a" stroke="#1a1a1a"/>
          </svg>
        );

      // BIT CRUSHER
      case 'bit crusher':
      case 'bitcrusher':
        return (
          <svg viewBox="0 0 64 64" fill="none">
            <defs>
              <linearGradient id="bitcrusherGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#ff00ff" />
                <stop offset="100%" stopColor="#dd00dd" />
              </linearGradient>
            </defs>
            <rect x="12" y="8" width="40" height="48" rx="4" fill="url(#bitcrusherGrad)" stroke="#bb00bb" strokeWidth="2"/>
            {/* Pixelated waveform */}
            <rect x="18" y="32" width="4" height="8" fill="#ffffff"/>
            <rect x="24" y="26" width="4" height="14" fill="#ffffff"/>
            <rect x="30" y="22" width="4" height="18" fill="#ffffff"/>
            <rect x="36" y="28" width="4" height="12" fill="#ffffff"/>
            <rect x="42" y="34" width="4" height="6" fill="#ffffff"/>
            {/* Bit counter */}
            <text x="32" y="50" fill="#ffffff" fontSize="8" fontWeight="bold" textAnchor="middle">8-BIT</text>
          </svg>
        );

      // SLICER
      case 'slicer':
      case 'step slicer':
      case 'stepslicer':
        return (
          <svg viewBox="0 0 64 64" fill="none">
            <defs>
              <linearGradient id="slicerGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#ffcc00" />
                <stop offset="100%" stopColor="#ff9900" />
              </linearGradient>
            </defs>
            <rect x="12" y="8" width="40" height="48" rx="4" fill="url(#slicerGrad)" stroke="#dd7700" strokeWidth="2"/>
            {/* Sliced blocks */}
            <rect x="18" y="24" width="6" height="12" fill="#ffffff">
              <animate attributeName="opacity" values="1;0.2;1" dur="0.5s" repeatCount="indefinite"/>
            </rect>
            <rect x="26" y="24" width="6" height="12" fill="#ffffff">
              <animate attributeName="opacity" values="1;0.2;1" dur="0.5s" begin="0.1s" repeatCount="indefinite"/>
            </rect>
            <rect x="34" y="24" width="6" height="12" fill="#ffffff">
              <animate attributeName="opacity" values="1;0.2;1" dur="0.5s" begin="0.2s" repeatCount="indefinite"/>
            </rect>
            <rect x="42" y="24" width="6" height="12" fill="#ffffff">
              <animate attributeName="opacity" values="1;0.2;1" dur="0.5s" begin="0.3s" repeatCount="indefinite"/>
            </rect>
            {/* Knobs */}
            <circle cx="26" cy="46" r="4" fill="#2a2a2a" stroke="#1a1a1a"/>
            <circle cx="38" cy="46" r="4" fill="#2a2a2a" stroke="#1a1a1a"/>
          </svg>
        );

      // VOLUME PEDAL
      case 'volume':
      case 'volume pedal':
        return (
          <svg viewBox="0 0 64 64" fill="none">
            <defs>
              <linearGradient id="volumeGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#3a3a3a" />
                <stop offset="100%" stopColor="#2a2a2a" />
              </linearGradient>
            </defs>
            <rect x="12" y="8" width="40" height="48" rx="4" fill="url(#volumeGrad)" stroke="#1a1a1a" strokeWidth="2"/>
            {/* Volume bars */}
            <rect x="20" y="38" width="3" height="10" fill="#00ff00"/>
            <rect x="25" y="34" width="3" height="14" fill="#00ff00"/>
            <rect x="30" y="30" width="3" height="18" fill="#ffff00"/>
            <rect x="35" y="26" width="3" height="22" fill="#ff6600"/>
            <rect x="40" y="22" width="3" height="26" fill="#ff0000" opacity="0.5"/>
            {/* Volume icon */}
            <path d="M20 18 L26 18 L32 12 L32 44 L26 38 L20 38 Z" fill="#ff6b35"/>
          </svg>
        );

      // TUNER
      case 'tuner':
        return (
          <svg viewBox="0 0 64 64" fill="none">
            <defs>
              <linearGradient id="tunerGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#2a2a2a" />
                <stop offset="100%" stopColor="#1a1a1a" />
              </linearGradient>
            </defs>
            <rect x="12" y="8" width="40" height="48" rx="4" fill="url(#tunerGrad)" stroke="#0a0a0a" strokeWidth="2"/>
            {/* Display */}
            <rect x="18" y="18" width="28" height="20" rx="2" fill="#001a00" stroke="#00ff00" strokeWidth="1"/>
            {/* Note */}
            <text x="32" y="32" fill="#00ff00" fontSize="14" fontWeight="bold" textAnchor="middle">A</text>
            {/* Tuning indicator */}
            <path d="M32 42 L28 48 L36 48 Z" fill="#00ff00"/>
            {/* Pitch bars */}
            <rect x="22" y="50" width="2" height="4" fill="#ff6600"/>
            <rect x="26" y="50" width="2" height="4" fill="#ff6600"/>
            <rect x="30" y="50" width="2" height="4" fill="#00ff00"/>
            <rect x="34" y="50" width="2" height="4" fill="#ff6600"/>
            <rect x="38" y="50" width="2" height="4" fill="#ff6600"/>
          </svg>
        );

      // DEFAULT
      default:
        return (
          <svg viewBox="0 0 64 64" fill="none">
            <defs>
              <linearGradient id="defaultGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#444444" />
                <stop offset="100%" stopColor="#2a2a2a" />
              </linearGradient>
            </defs>
            <rect x="12" y="8" width="40" height="48" rx="4" fill="url(#defaultGrad)" stroke="#1a1a1a" strokeWidth="2"/>
            <circle cx="32" cy="32" r="12" fill="none" stroke="#ff6b35" strokeWidth="2"/>
            <path d="M32 24 L32 32 L38 32" stroke="#ff6b35" strokeWidth="2"/>
          </svg>
        );
    }
  };

  return (
    <div className="effect-icon" style={{ width: size, height: size }}>
      {renderIcon()}
    </div>
  );
};

export default EffectIcon;


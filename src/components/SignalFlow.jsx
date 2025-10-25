import React, { useEffect, useState, useRef } from 'react';
import './SignalFlow.css';

const SignalFlow = ({ effects }) => {
  const [cables, setCables] = useState([]);
  const containerRef = useRef(null);

  useEffect(() => {
    if (!containerRef.current || effects.length === 0) return;

    const updateCables = () => {
      const pedalboard = containerRef.current.closest('.main-content');
      if (!pedalboard) return;

      const effectElements = Array.from(pedalboard.querySelectorAll('.pedal, .amp-rig-container'));
      const newCables = [];

      for (let i = 0; i < effectElements.length - 1; i++) {
        const from = effectElements[i];
        const to = effectElements[i + 1];
        
        const fromRect = from.getBoundingClientRect();
        const toRect = to.getBoundingClientRect();
        const containerRect = pedalboard.getBoundingClientRect();

        // Calculate cable connection points
        const x1 = fromRect.right - containerRect.left;
        const y1 = (fromRect.top + fromRect.height / 2) - containerRect.top;
        const x2 = toRect.left - containerRect.left;
        const y2 = (toRect.top + toRect.height / 2) - containerRect.top;

        // Cable color based on effect type
        const color = getCableColor(effects[i]?.type);

        newCables.push({
          id: `cable-${i}`,
          x1,
          y1,
          x2,
          y2,
          color,
          active: !effects[i]?.bypassed
        });
      }

      setCables(newCables);
    };

    updateCables();
    
    // Update on window resize or changes
    window.addEventListener('resize', updateCables);
    const observer = new MutationObserver(updateCables);
    
    if (containerRef.current.closest('.main-content')) {
      observer.observe(containerRef.current.closest('.main-content'), {
        childList: true,
        subtree: true,
        attributes: true
      });
    }

    return () => {
      window.removeEventListener('resize', updateCables);
      observer.disconnect();
    };
  }, [effects]);

  const getCableColor = (type) => {
    if (!type) return '#ff6b35';
    
    const colorMap = {
      // Overdrive/Distortion - Red/Orange
      overdrive: '#ff6b35',
      distortion: '#ff4757',
      fuzz: '#ff3838',
      bossds1: '#ff4757',
      kloncentaur: '#ffa502',
      procorat: '#ff3838',
      
      // Modulation - Blue/Cyan
      chorus: '#00d2ff',
      flanger: '#0099ff',
      phaser: '#6c5ce7',
      tremolo: '#00cec9',
      
      // Delay - Green
      delay: '#00ff88',
      tapdelay: '#00e676',
      timelinedelay: '#1dd1a1',
      memoryman: '#10ac84',
      
      // Reverb - Purple
      reverb: '#a29bfe',
      hallreverb: '#8e44ad',
      platereverb: '#9b59b6',
      bigskyreverb: '#b19cd9',
      
      // Amp - Yellow/Gold
      amp: '#ffd700',
      
      // Default
      default: '#ff6b35'
    };

    return colorMap[type] || colorMap.default;
  };

  const generatePath = (x1, y1, x2, y2) => {
    // Create smooth bezier curve for cable
    const dx = x2 - x1;
    const dy = y2 - y1;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const sag = Math.min(distance * 0.2, 30); // Cable sag effect

    const controlX = (x1 + x2) / 2;
    const controlY1 = y1 + sag;
    const controlY2 = y2 + sag;

    return `M ${x1},${y1} Q ${controlX},${controlY1} ${(x1 + x2) / 2},${(y1 + y2) / 2} Q ${controlX},${controlY2} ${x2},${y2}`;
  };

  return (
    <div className="signal-flow-container" ref={containerRef}>
      <svg className="signal-flow-svg">
        <defs>
          {/* Cable texture pattern */}
          <pattern id="cable-texture" patternUnits="userSpaceOnUse" width="10" height="10">
            <line x1="0" y1="5" x2="10" y2="5" stroke="rgba(0,0,0,0.2)" strokeWidth="0.5" />
          </pattern>
          
          {/* Signal flow animation */}
          {cables.map((cable) => (
            <linearGradient key={`gradient-${cable.id}`} id={`gradient-${cable.id}`} gradientUnits="userSpaceOnUse" x1={cable.x1} y1={cable.y1} x2={cable.x2} y2={cable.y2}>
              <stop offset="0%" stopColor={cable.color} stopOpacity="0.3">
                {cable.active && <animate attributeName="offset" values="0;1" dur="1.5s" repeatCount="indefinite" />}
              </stop>
              <stop offset="0%" stopColor={cable.color} stopOpacity="1">
                {cable.active && <animate attributeName="offset" values="0;1" dur="1.5s" repeatCount="indefinite" />}
              </stop>
              <stop offset="10%" stopColor={cable.color} stopOpacity="0.3">
                {cable.active && <animate attributeName="offset" values="0.1;1.1" dur="1.5s" repeatCount="indefinite" />}
              </stop>
            </linearGradient>
          ))}
          
          {/* Plug shadow */}
          <filter id="plug-shadow">
            <feGaussianBlur in="SourceAlpha" stdDeviation="3"/>
            <feOffset dx="0" dy="2" result="offsetblur"/>
            <feComponentTransfer>
              <feFuncA type="linear" slope="0.5"/>
            </feComponentTransfer>
            <feMerge>
              <feMergeNode/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>

        {/* Render cables */}
        {cables.map((cable) => (
          <g key={cable.id} className={`cable ${cable.active ? 'active' : 'bypassed'}`}>
            {/* Cable shadow */}
            <path
              d={generatePath(cable.x1 + 2, cable.y1 + 2, cable.x2 + 2, cable.y2 + 2)}
              stroke="rgba(0,0,0,0.4)"
              strokeWidth="6"
              fill="none"
              strokeLinecap="round"
            />
            
            {/* Main cable */}
            <path
              d={generatePath(cable.x1, cable.y1, cable.x2, cable.y2)}
              stroke={cable.active ? `url(#gradient-${cable.id})` : '#333'}
              strokeWidth="5"
              fill="none"
              strokeLinecap="round"
              style={{
                filter: 'url(#cable-texture)'
              }}
            />
            
            {/* Cable outline */}
            <path
              d={generatePath(cable.x1, cable.y1, cable.x2, cable.y2)}
              stroke="#000"
              strokeWidth="6"
              fill="none"
              strokeLinecap="round"
              opacity="0.5"
            />
            
            {/* 1/4" Jack plugs */}
            {/* From plug */}
            <g transform={`translate(${cable.x1}, ${cable.y1})`} filter="url(#plug-shadow)">
              <rect x="-12" y="-5" width="12" height="10" rx="2" fill="#2a2a2a" stroke="#1a1a1a" strokeWidth="1"/>
              <circle cx="-6" cy="0" r="3" fill="#1a1a1a"/>
              <rect x="-8" y="-2" width="4" height="4" fill="#4a4a4a"/>
            </g>
            
            {/* To plug */}
            <g transform={`translate(${cable.x2}, ${cable.y2})`} filter="url(#plug-shadow)">
              <rect x="0" y="-5" width="12" height="10" rx="2" fill="#2a2a2a" stroke="#1a1a1a" strokeWidth="1"/>
              <circle cx="6" cy="0" r="3" fill="#1a1a1a"/>
              <rect x="4" y="-2" width="4" height="4" fill="#4a4a4a"/>
            </g>
          </g>
        ))}
      </svg>

      {/* Signal Flow Indicator */}
      <div className="signal-flow-indicator">
        <div className="flow-icon">🎸</div>
        <div className="flow-arrow">→</div>
        {effects.map((effect, i) => (
          <React.Fragment key={effect.id}>
            <div className={`flow-node ${effect.bypassed ? 'bypassed' : 'active'}`}>
              <div className="node-led"></div>
              <div className="node-label">{effect.type === 'amp' ? '🔊' : '⚡'}</div>
            </div>
            {i < effects.length - 1 && <div className="flow-arrow">→</div>}
          </React.Fragment>
        ))}
        <div className="flow-arrow">→</div>
        <div className="flow-icon">🔈</div>
      </div>
    </div>
  );
};

export default SignalFlow;


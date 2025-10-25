import React, { useEffect, useRef, useState } from 'react';
import './InputMonitor.css';

const InputMonitor = ({ audioEngine, isActive }) => {
  const [inputLevel, setInputLevel] = useState(0);
  const [peakLevel, setPeakLevel] = useState(0);
  const [isClipping, setIsClipping] = useState(false);
  const animationFrameRef = useRef(null);

  useEffect(() => {
    if (!audioEngine || !isActive) {
      setInputLevel(0);
      setPeakLevel(0);
      return;
    }

    const analyzeInput = () => {
      try {
        const audioContext = audioEngine.audioContext;
        const inputNode = audioEngine.inputNode;

        if (!audioContext || !inputNode) {
          animationFrameRef.current = requestAnimationFrame(analyzeInput);
          return;
        }

        // Create analyzer if doesn't exist
        if (!audioEngine.inputAnalyzer) {
          audioEngine.inputAnalyzer = audioContext.createAnalyser();
          audioEngine.inputAnalyzer.fftSize = 256;
          audioEngine.inputAnalyzer.smoothingTimeConstant = 0.3;
          inputNode.connect(audioEngine.inputAnalyzer);
        }

        const analyzer = audioEngine.inputAnalyzer;
        const bufferLength = analyzer.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        
        analyzer.getByteTimeDomainData(dataArray);

        // Calculate RMS level
        let sum = 0;
        let peak = 0;
        for (let i = 0; i < bufferLength; i++) {
          const normalized = (dataArray[i] - 128) / 128;
          sum += normalized * normalized;
          peak = Math.max(peak, Math.abs(normalized));
        }
        
        const rms = Math.sqrt(sum / bufferLength);
        const level = Math.min(100, rms * 200); // Scale to 0-100
        const peakDb = Math.min(100, peak * 100);

        setInputLevel(level);
        setPeakLevel(peakDb);
        setIsClipping(peakDb > 95);

        animationFrameRef.current = requestAnimationFrame(analyzeInput);
      } catch (error) {
        console.error('Input monitor error:', error);
        animationFrameRef.current = requestAnimationFrame(analyzeInput);
      }
    };

    animationFrameRef.current = requestAnimationFrame(analyzeInput);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [audioEngine, isActive]);

  return (
    <div className="input-monitor">
      <div className="input-monitor-header">
        <span className="input-monitor-label">INPUT</span>
        <span className={`input-monitor-status ${isActive ? 'active' : 'inactive'}`}>
          {isActive ? '● LIVE' : '○ OFF'}
        </span>
      </div>
      
      <div className="input-monitor-meter">
        <div className="input-monitor-bar-container">
          {/* Background segments */}
          <div className="input-monitor-segments">
            {Array.from({ length: 20 }).map((_, i) => (
              <div 
                key={i} 
                className={`segment ${i >= 16 ? 'red' : i >= 12 ? 'yellow' : 'green'}`}
              />
            ))}
          </div>
          
          {/* Active level */}
          <div 
            className={`input-monitor-level ${isClipping ? 'clipping' : ''}`}
            style={{ width: `${inputLevel}%` }}
          />
          
          {/* Peak indicator */}
          {peakLevel > 5 && (
            <div 
              className="input-monitor-peak"
              style={{ left: `${peakLevel}%` }}
            />
          )}
        </div>
        
        <div className="input-monitor-scale">
          <span>-60</span>
          <span>-40</span>
          <span>-20</span>
          <span>-10</span>
          <span className={isClipping ? 'clip-indicator' : ''}>0</span>
        </div>
      </div>

      {!isActive && (
        <div className="input-monitor-message">
          Click START AUDIO to enable input monitoring
        </div>
      )}

      {isActive && inputLevel < 1 && (
        <div className="input-monitor-warning">
          ⚠️ No input signal detected - Check your audio interface
        </div>
      )}

      {isClipping && (
        <div className="input-monitor-warning clipping">
          🔴 CLIPPING! Reduce input gain
        </div>
      )}
    </div>
  );
};

export default InputMonitor;


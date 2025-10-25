import React, { useEffect, useRef, useState } from 'react';
import './VUMeter.css';

const VUMeter = ({ audioContext, inputNode }) => {
  const analyserRef = useRef(null);
  const animationRef = useRef(null);
  const [level, setLevel] = useState(0);

  useEffect(() => {
    if (!audioContext || !inputNode) return;

    // Create analyser
    const analyser = audioContext.createAnalyser();
    analyser.fftSize = 256;
    analyserRef.current = analyser;

    // Connect input to analyser
    inputNode.connect(analyser);

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const updateLevel = () => {
      analyser.getByteTimeDomainData(dataArray);
      
      // Calculate RMS level
      let sum = 0;
      for (let i = 0; i < bufferLength; i++) {
        const normalized = (dataArray[i] - 128) / 128;
        sum += normalized * normalized;
      }
      const rms = Math.sqrt(sum / bufferLength);
      setLevel(rms);

      animationRef.current = requestAnimationFrame(updateLevel);
    };

    updateLevel();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      if (analyserRef.current) {
        analyserRef.current.disconnect();
      }
    };
  }, [audioContext, inputNode]);

  const bars = 20;
  const activeBars = Math.floor(level * bars);

  return (
    <div className="vu-meter">
      <div className="vu-meter-label">INPUT</div>
      <div className="vu-meter-bars">
        {Array.from({ length: bars }).map((_, i) => (
          <div
            key={i}
            className={`vu-bar ${i < activeBars ? 'active' : ''} ${
              i > bars * 0.8 ? 'red' : i > bars * 0.6 ? 'yellow' : 'green'
            }`}
          />
        ))}
      </div>
      <div className="vu-meter-db">{(20 * Math.log10(level + 0.0001)).toFixed(1)} dB</div>
    </div>
  );
};

export default VUMeter;


import React, { useEffect, useRef } from 'react';
import './SpectrumAnalyzer.css';

const SpectrumAnalyzer = ({ audioContext, inputNode }) => {
  const canvasRef = useRef(null);
  const analyserRef = useRef(null);
  const animationRef = useRef(null);

  useEffect(() => {
    if (!audioContext || !inputNode || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    // Set canvas size
    canvas.width = canvas.offsetWidth * window.devicePixelRatio;
    canvas.height = canvas.offsetHeight * window.devicePixelRatio;
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

    // Create analyser
    const analyser = audioContext.createAnalyser();
    analyser.fftSize = 2048;
    analyser.smoothingTimeConstant = 0.8;
    analyserRef.current = analyser;

    // Connect
    inputNode.connect(analyser);

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const draw = () => {
      analyser.getByteFrequencyData(dataArray);

      const width = canvas.offsetWidth;
      const height = canvas.offsetHeight;

      // Clear canvas
      ctx.fillStyle = 'rgba(10, 10, 10, 0.3)';
      ctx.fillRect(0, 0, width, height);

      const barWidth = width / bufferLength * 2.5;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        const barHeight = (dataArray[i] / 255) * height;

        // Gradient based on frequency
        const gradient = ctx.createLinearGradient(0, height - barHeight, 0, height);
        if (i < bufferLength * 0.3) {
          // Bass - Red
          gradient.addColorStop(0, '#ff3333');
          gradient.addColorStop(1, '#ff6666');
        } else if (i < bufferLength * 0.6) {
          // Mid - Green
          gradient.addColorStop(0, '#33ff33');
          gradient.addColorStop(1, '#66ff66');
        } else {
          // High - Blue
          gradient.addColorStop(0, '#3333ff');
          gradient.addColorStop(1, '#6666ff');
        }

        ctx.fillStyle = gradient;
        ctx.fillRect(x, height - barHeight, barWidth - 1, barHeight);

        x += barWidth;
      }

      animationRef.current = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      if (analyserRef.current) {
        analyserRef.current.disconnect();
      }
    };
  }, [audioContext, inputNode]);

  return (
    <div className="spectrum-analyzer">
      <div className="spectrum-label">FREQUENCY SPECTRUM</div>
      <canvas ref={canvasRef} className="spectrum-canvas" />
      <div className="spectrum-labels">
        <span>BASS</span>
        <span>MID</span>
        <span>HIGH</span>
      </div>
    </div>
  );
};

export default SpectrumAnalyzer;


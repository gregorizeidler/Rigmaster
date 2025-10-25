import React, { useEffect, useRef } from 'react';
import './Cable.css';

const Cable = ({ from, to, color = '#333333' }) => {
  const canvasRef = useRef(null);
  const animationRef = useRef(null);
  const wobbleOffset = useRef(Math.random() * Math.PI * 2);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    let wobblePhase = wobbleOffset.current;

    const draw = () => {
      // Clear canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Get positions (simplified - would need real element positions)
      const startX = from.x || 50;
      const startY = from.y || 50;
      const endX = to.x || 250;
      const endY = to.y || 50;

      // Add wobble
      const wobble = Math.sin(wobblePhase) * 2;
      const midX = (startX + endX) / 2;
      const midY = (startY + endY) / 2 + wobble;

      // Draw cable with bezier curve
      ctx.beginPath();
      ctx.moveTo(startX, startY);
      
      // Add some sag
      const controlY = Math.max(midY + 30, Math.max(startY, endY) + 20);
      ctx.bezierCurveTo(
        startX, startY + 20,
        midX, controlY,
        endX, endY
      );

      // Cable outer (shadow)
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.5)';
      ctx.lineWidth = 8;
      ctx.stroke();

      // Cable main
      ctx.strokeStyle = color;
      ctx.lineWidth = 6;
      ctx.stroke();

      // Cable highlight
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Jacks (connectors)
      [{ x: startX, y: startY }, { x: endX, y: endY }].forEach(pos => {
        // Jack body
        ctx.fillStyle = '#1a1a1a';
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, 6, 0, Math.PI * 2);
        ctx.fill();

        // Jack tip
        ctx.fillStyle = '#888888';
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, 3, 0, Math.PI * 2);
        ctx.fill();

        // Jack highlight
        ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.beginPath();
        ctx.arc(pos.x - 1, pos.y - 1, 1.5, 0, Math.PI * 2);
        ctx.fill();
      });

      wobblePhase += 0.02;
      animationRef.current = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [from, to, color]);

  return <canvas ref={canvasRef} className="cable-canvas" width={400} height={200} />;
};

export default Cable;


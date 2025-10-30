import React from 'react';
import { ZoomIn, ZoomOut, Maximize2 } from 'lucide-react';
import Tooltip from './Tooltip';
import './PedalboardZoomControl.css';

const PedalboardZoomControl = ({ zoom, setZoom, minZoom = 0.5, maxZoom = 2.0 }) => {
  const zoomIn = () => {
    setZoom(Math.min(maxZoom, zoom + 0.1));
  };

  const zoomOut = () => {
    setZoom(Math.max(minZoom, zoom - 0.1));
  };

  const resetZoom = () => {
    setZoom(1.0);
  };

  const percentage = Math.round(zoom * 100);

  return (
    <div className="pedalboard-zoom-control">
      <Tooltip content="Zoom Out" description="Decrease pedalboard zoom">
        <button 
          className="zoom-btn"
          onClick={zoomOut}
          disabled={zoom <= minZoom}
        >
          <ZoomOut size={16} />
        </button>
      </Tooltip>

      <Tooltip content="Zoom" value={`${percentage}%`} description="Click to reset to 100%">
        <button 
          className="zoom-display"
          onClick={resetZoom}
        >
          {percentage}%
        </button>
      </Tooltip>

      <Tooltip content="Zoom In" description="Increase pedalboard zoom">
        <button 
          className="zoom-btn"
          onClick={zoomIn}
          disabled={zoom >= maxZoom}
        >
          <ZoomIn size={16} />
        </button>
      </Tooltip>

      <Tooltip content="Fit to Screen" description="Auto-adjust zoom to fit all pedals">
        <button 
          className="zoom-btn fit"
          onClick={resetZoom}
        >
          <Maximize2 size={16} />
        </button>
      </Tooltip>
    </div>
  );
};

export default PedalboardZoomControl;


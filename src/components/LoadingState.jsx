import React from 'react';
import { Loader, Zap } from 'lucide-react';
import './LoadingState.css';

const LoadingState = ({ message = 'Processing...', size = 'medium', inline = false }) => {
  const sizeClass = `loading-${size}`;
  const containerClass = inline ? 'loading-state inline' : 'loading-state';

  return (
    <div className={`${containerClass} ${sizeClass}`}>
      <div className="loading-spinner">
        <Zap className="loading-icon pulse" size={size === 'small' ? 24 : size === 'large' ? 64 : 40} />
        <div className="loading-ring" />
        <div className="loading-ring delay" />
      </div>
      {message && <p className="loading-message">{message}</p>}
    </div>
  );
};

export default LoadingState;


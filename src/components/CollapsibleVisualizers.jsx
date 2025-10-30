import React, { useState } from 'react';
import { ChevronUp, ChevronDown, Maximize2, Minimize2 } from 'lucide-react';
import './CollapsibleVisualizers.css';

const CollapsibleVisualizers = ({ children }) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);

  const toggleCollapse = () => {
    setIsCollapsed(!isCollapsed);
    if (!isCollapsed) {
      setIsMinimized(false); // Reset minimize when collapsing
    }
  };

  const toggleMinimize = () => {
    if (!isCollapsed) {
      setIsMinimized(!isMinimized);
    }
  };

  return (
    <div className={`collapsible-visualizers ${isCollapsed ? 'collapsed' : ''} ${isMinimized ? 'minimized' : ''}`}>
      <div className="visualizers-header">
        <div className="visualizers-title">
          <span>Audio Visualizers</span>
          {!isCollapsed && !isMinimized && (
            <span className="visualizers-count">2 Active</span>
          )}
        </div>
        <div className="visualizers-controls">
          {!isCollapsed && (
            <button
              className="visualizer-control-btn"
              onClick={toggleMinimize}
              title={isMinimized ? 'Expand' : 'Minimize'}
            >
              {isMinimized ? <Maximize2 size={14} /> : <Minimize2 size={14} />}
            </button>
          )}
          <button
            className="visualizer-control-btn"
            onClick={toggleCollapse}
            title={isCollapsed ? 'Show Visualizers' : 'Hide Visualizers'}
          >
            {isCollapsed ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
          </button>
        </div>
      </div>
      {!isCollapsed && (
        <div className={`visualizers-content ${isMinimized ? 'minimized' : ''}`}>
          {children}
        </div>
      )}
    </div>
  );
};

export default CollapsibleVisualizers;


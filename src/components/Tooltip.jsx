import React from 'react';
import './Tooltip.css';

const Tooltip = ({ 
  children, 
  content, 
  value, 
  description, 
  position = 'top',
  delay = 200,
  visible = true 
}) => {
  const [show, setShow] = React.useState(false);
  const [timeoutId, setTimeoutId] = React.useState(null);

  const handleMouseEnter = () => {
    if (!visible || !content) return;
    const id = setTimeout(() => setShow(true), delay);
    setTimeoutId(id);
  };

  const handleMouseLeave = () => {
    if (timeoutId) clearTimeout(timeoutId);
    setShow(false);
  };

  return (
    <div 
      className="tooltip-wrapper"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {children}
      {show && (
        <div className={`tooltip tooltip-${position}`}>
          <div className="tooltip-content">
            {content && <strong className="tooltip-title">{content}</strong>}
            {value !== undefined && <span className="tooltip-value">{value}</span>}
            {description && <small className="tooltip-description">{description}</small>}
          </div>
          <div className="tooltip-arrow" />
        </div>
      )}
    </div>
  );
};

export default Tooltip;


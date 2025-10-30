import React from 'react';
import { Guitar, Zap, Speaker, Power, Eye, EyeOff, ChevronDown, ChevronRight } from 'lucide-react';
import './SignalFlowTree.css';

const SignalFlowTree = ({ effectChain, amp, onEffectClick, onEffectToggle }) => {
  const [expandedItems, setExpandedItems] = React.useState(new Set(['input', 'pedals', 'amp', 'output']));

  const toggleExpand = (id) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedItems(newExpanded);
  };

  const isExpanded = (id) => expandedItems.has(id);

  return (
    <div className="signal-flow-tree">
      {/* INPUT */}
      <div className="flow-section">
        <div 
          className="flow-section-header"
          onClick={() => toggleExpand('input')}
        >
          {isExpanded('input') ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          <Guitar size={16} />
          <span>INPUT</span>
        </div>
        {isExpanded('input') && (
          <div className="flow-section-content">
            <div className="flow-item active">
              <div className="flow-item-indicator active" />
              <div className="flow-item-info">
                <span className="flow-item-name">Guitar Input</span>
                <span className="flow-item-level">-12 dB</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* PEDALS */}
      <div className="flow-section">
        <div 
          className="flow-section-header"
          onClick={() => toggleExpand('pedals')}
        >
          {isExpanded('pedals') ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          <Zap size={16} />
          <span>PEDALS</span>
          <span className="flow-count">{effectChain.length}</span>
        </div>
        {isExpanded('pedals') && (
          <div className="flow-section-content">
            {effectChain.length === 0 ? (
              <div className="flow-empty">No pedals in chain</div>
            ) : (
              effectChain.map((effect) => (
                <div 
                  key={effect.id}
                  className={`flow-item ${effect.bypassed ? 'bypassed' : 'active'}`}
                  onClick={() => onEffectClick && onEffectClick(effect.id)}
                >
                  <div className={`flow-item-indicator ${effect.bypassed ? 'bypassed' : 'active'}`} />
                  <div className="flow-item-info">
                    <span className="flow-item-name">{effect.name}</span>
                    <button
                      className="flow-item-toggle"
                      onClick={(e) => {
                        e.stopPropagation();
                        onEffectToggle && onEffectToggle(effect.id);
                      }}
                      title={effect.bypassed ? 'Activate' : 'Bypass'}
                    >
                      {effect.bypassed ? <EyeOff size={12} /> : <Eye size={12} />}
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* AMP */}
      {amp && (
        <div className="flow-section">
          <div 
            className="flow-section-header"
            onClick={() => toggleExpand('amp')}
          >
            {isExpanded('amp') ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            <Power size={16} />
            <span>AMP</span>
          </div>
          {isExpanded('amp') && (
            <div className="flow-section-content">
              <div className="flow-item active">
                <div className="flow-item-indicator active" />
                <div className="flow-item-info">
                  <span className="flow-item-name">{amp.name}</span>
                  <span className="flow-item-badge">ACTIVE</span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* OUTPUT */}
      <div className="flow-section">
        <div 
          className="flow-section-header"
          onClick={() => toggleExpand('output')}
        >
          {isExpanded('output') ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          <Speaker size={16} />
          <span>OUTPUT</span>
        </div>
        {isExpanded('output') && (
          <div className="flow-section-content">
            <div className="flow-item active">
              <div className="flow-item-indicator active" />
              <div className="flow-item-info">
                <span className="flow-item-name">Master Out</span>
                <span className="flow-item-level">-6 dB</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SignalFlowTree;


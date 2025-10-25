import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTheme, themes } from '../contexts/ThemeContext';
import './ThemeSelector.css';

const ThemeSelector = () => {
  const { themeName, changeTheme, zoomLevel, adjustZoom, isFullscreen, toggleFullscreen } = useTheme();
  const [showMenu, setShowMenu] = useState(false);

  return (
    <div className="theme-selector-container">
      <button 
        className="theme-button"
        onClick={() => setShowMenu(!showMenu)}
        title="Configurações de Tema"
      >
        🎨
      </button>

      <button 
        className="theme-button"
        onClick={() => adjustZoom(-0.1)}
        title="Zoom Out"
        disabled={zoomLevel <= 0.5}
      >
        🔍-
      </button>

      <button 
        className="theme-button"
        onClick={() => adjustZoom(0.1)}
        title="Zoom In"
        disabled={zoomLevel >= 2}
      >
        🔍+
      </button>

      <button 
        className="theme-button"
        onClick={toggleFullscreen}
        title={isFullscreen ? "Sair Fullscreen" : "Fullscreen"}
      >
        {isFullscreen ? '🗗' : '⛶'}
      </button>

      <AnimatePresence>
        {showMenu && (
          <motion.div
            className="theme-menu"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <div className="theme-menu-header">Temas</div>
            <div className="theme-grid">
              {Object.keys(themes).map((key) => (
                <motion.button
                  key={key}
                  className={`theme-option ${themeName === key ? 'active' : ''}`}
                  onClick={() => {
                    changeTheme(key);
                    setShowMenu(false);
                  }}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  style={{
                    background: themes[key].background,
                    borderColor: themes[key].accent
                  }}
                >
                  <div className="theme-option-name">{themes[key].name}</div>
                </motion.button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ThemeSelector;


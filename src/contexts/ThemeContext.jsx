import React, { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext();

export const themes = {
  dark: {
    name: 'Dark',
    background: 'linear-gradient(180deg, #0a0a0a 0%, #1a1a1a 50%, #0f0f0f 100%)',
    pedalboard: 'radial-gradient(ellipse at center bottom, rgba(40, 40, 40, 0.4) 0%, transparent 70%)',
    text: '#ffffff',
    accent: '#ff6b35',
    cardBg: '#1a1a1a',
  },
  light: {
    name: 'Light',
    background: 'linear-gradient(180deg, #f5f5f5 0%, #e0e0e0 50%, #d5d5d5 100%)',
    pedalboard: 'radial-gradient(ellipse at center bottom, rgba(200, 200, 200, 0.4) 0%, transparent 70%)',
    text: '#1a1a1a',
    accent: '#ff6b35',
    cardBg: '#ffffff',
  },
  vintage: {
    name: 'Vintage',
    background: 'linear-gradient(180deg, #3d2817 0%, #2a1810 50%, #1a0f08 100%)',
    pedalboard: 'radial-gradient(ellipse at center bottom, rgba(80, 50, 30, 0.4) 0%, transparent 70%)',
    text: '#f5deb3',
    accent: '#d4af37',
    cardBg: '#2a1810',
  },
  neon: {
    name: 'Neon',
    background: 'linear-gradient(180deg, #0a0014 0%, #1a0028 50%, #0f001c 100%)',
    pedalboard: 'radial-gradient(ellipse at center bottom, rgba(255, 0, 255, 0.2) 0%, transparent 70%)',
    text: '#00ffff',
    accent: '#ff00ff',
    cardBg: '#1a0028',
  },
  minimal: {
    name: 'Minimal',
    background: 'linear-gradient(180deg, #fafafa 0%, #f0f0f0 50%, #e8e8e8 100%)',
    pedalboard: 'linear-gradient(180deg, transparent 0%, rgba(0, 0, 0, 0.05) 100%)',
    text: '#2a2a2a',
    accent: '#000000',
    cardBg: '#ffffff',
  },
  cyberpunk: {
    name: 'Cyberpunk',
    background: 'linear-gradient(180deg, #0a1929 0%, #1a2942 50%, #0f1e35 100%)',
    pedalboard: 'radial-gradient(ellipse at center bottom, rgba(0, 255, 255, 0.2) 0%, transparent 70%)',
    text: '#00ffff',
    accent: '#ffff00',
    cardBg: '#1a2942',
  }
};

export const ThemeProvider = ({ children }) => {
  const [currentTheme, setCurrentTheme] = useState('dark');
  const [zoomLevel, setZoomLevel] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('rigmaster-theme');
    if (saved && themes[saved]) {
      setCurrentTheme(saved);
    }
  }, []);

  const changeTheme = (themeName) => {
    if (themes[themeName]) {
      setCurrentTheme(themeName);
      localStorage.setItem('rigmaster-theme', themeName);
    }
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  const adjustZoom = (delta) => {
    setZoomLevel(prev => Math.max(0.5, Math.min(2, prev + delta)));
  };

  return (
    <ThemeContext.Provider value={{
      theme: themes[currentTheme],
      themeName: currentTheme,
      changeTheme,
      zoomLevel,
      adjustZoom,
      isFullscreen,
      toggleFullscreen
    }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
};

export default ThemeContext;


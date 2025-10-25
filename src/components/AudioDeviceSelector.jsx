import React, { useState, useEffect } from 'react';
import './AudioDeviceSelector.css';

const AudioDeviceSelector = ({ onDeviceChange, currentDevice }) => {
  const [devices, setDevices] = useState([]);
  const [selectedDevice, setSelectedDevice] = useState('');
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    loadDevices();
    
    // Listen for device changes (plug/unplug)
    navigator.mediaDevices.addEventListener('devicechange', loadDevices);
    
    return () => {
      navigator.mediaDevices.removeEventListener('devicechange', loadDevices);
    };
  }, []);

  const loadDevices = async () => {
    try {
      // Request permission first
      await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // Get all audio input devices
      const allDevices = await navigator.mediaDevices.enumerateDevices();
      const audioInputs = allDevices.filter(device => device.kind === 'audioinput');
      
      console.log('Available audio inputs:', audioInputs);
      
      setDevices(audioInputs);
      
      // Set default device if not selected
      if (!selectedDevice && audioInputs.length > 0) {
        setSelectedDevice(audioInputs[0].deviceId);
      }
    } catch (error) {
      console.error('Error loading audio devices:', error);
    }
  };

  const handleDeviceSelect = (deviceId) => {
    setSelectedDevice(deviceId);
    setIsOpen(false);
    
    if (onDeviceChange) {
      const device = devices.find(d => d.deviceId === deviceId);
      onDeviceChange(deviceId, device);
    }
  };

  const getDeviceType = (label) => {
    const lower = label.toLowerCase();
    if (lower.includes('usb')) return 'USB';
    if (lower.includes('built-in')) return 'Built-in';
    if (lower.includes('bluetooth')) return 'Bluetooth';
    if (lower.includes('airpods')) return 'AirPods';
    if (lower.includes('external')) return 'External';
    return 'Unknown';
  };

  const getDeviceIcon = (label) => {
    const lower = label.toLowerCase();
    if (lower.includes('usb') || lower.includes('audio interface')) return '🎛️';
    if (lower.includes('microphone')) return '🎤';
    if (lower.includes('line')) return '🔌';
    if (lower.includes('bluetooth') || lower.includes('airpods')) return '📡';
    return '🎵';
  };

  const selectedDeviceInfo = devices.find(d => d.deviceId === selectedDevice);

  return (
    <div className="audio-device-selector">
      <div className="device-selector-header">
        <span className="device-selector-label">🎤 AUDIO INPUT</span>
        <button 
          className="device-refresh-btn" 
          onClick={loadDevices}
          title="Refresh devices"
        >
          🔄
        </button>
      </div>

      <div className={`device-selector-dropdown ${isOpen ? 'open' : ''}`}>
        <button 
          className="device-selector-current"
          onClick={() => setIsOpen(!isOpen)}
        >
          <div className="device-info">
            <span className="device-icon">
              {selectedDeviceInfo ? getDeviceIcon(selectedDeviceInfo.label) : '🎵'}
            </span>
            <div className="device-details">
              <span className="device-name">
                {selectedDeviceInfo ? selectedDeviceInfo.label : 'No device selected'}
              </span>
              <span className="device-type">
                {selectedDeviceInfo ? getDeviceType(selectedDeviceInfo.label) : ''}
              </span>
            </div>
          </div>
          <span className="dropdown-arrow">{isOpen ? '▲' : '▼'}</span>
        </button>

        {isOpen && (
          <div className="device-selector-list">
            {devices.length === 0 ? (
              <div className="device-selector-empty">
                No audio input devices found
              </div>
            ) : (
              devices.map((device) => (
                <button
                  key={device.deviceId}
                  className={`device-selector-item ${
                    device.deviceId === selectedDevice ? 'selected' : ''
                  }`}
                  onClick={() => handleDeviceSelect(device.deviceId)}
                >
                  <span className="device-icon">{getDeviceIcon(device.label)}</span>
                  <div className="device-details">
                    <span className="device-name">{device.label}</span>
                    <span className="device-type">{getDeviceType(device.label)}</span>
                  </div>
                  {device.deviceId === selectedDevice && (
                    <span className="device-check">✓</span>
                  )}
                </button>
              ))
            )}
          </div>
        )}
      </div>

      <div className="device-selector-info">
        <span className="info-icon">💡</span>
        <span className="info-text">
          {devices.length} device{devices.length !== 1 ? 's' : ''} available
        </span>
      </div>
    </div>
  );
};

export default AudioDeviceSelector;


import React, { useState, useEffect } from 'react';
import './RecorderPanel.css';

const RecorderPanel = ({ audioEngine }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [hasRecording, setHasRecording] = useState(false);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(100);

  // Update status every 100ms
  useEffect(() => {
    const interval = setInterval(() => {
      if (audioEngine) {
        const info = audioEngine.getRecordingInfo();
        if (info) {
          setIsRecording(info.isRecording);
          setIsPlaying(info.isPlaying);
          setHasRecording(info.hasRecording);
          setDuration(info.duration);
        }
      }
    }, 100);

    return () => clearInterval(interval);
  }, [audioEngine]);

  const handleStartRecording = () => {
    if (audioEngine && !isRecording) {
      audioEngine.startRecording();
    }
  };

  const handleStopRecording = () => {
    if (audioEngine && isRecording) {
      audioEngine.stopRecording();
    }
  };

  const handlePlay = () => {
    if (audioEngine && hasRecording && !isPlaying) {
      audioEngine.playRecording();
    }
  };

  const handleStop = () => {
    if (audioEngine && isPlaying) {
      audioEngine.stopPlayback();
    }
  };

  const handleClear = () => {
    if (audioEngine) {
      if (window.confirm('Tem certeza que deseja apagar a gravação?')) {
        audioEngine.clearRecording();
      }
    }
  };

  const handleExport = () => {
    if (audioEngine && hasRecording) {
      audioEngine.exportRecording();
    }
  };

  const handleVolumeChange = (e) => {
    const value = parseInt(e.target.value);
    setVolume(value);
    if (audioEngine) {
      audioEngine.setRecordingVolume(value);
    }
  };

  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (!audioEngine) {
    return null;
  }

  return (
    <div className="recorder-panel">
      <div className="recorder-header">
        <h3>🎙️ RECORDER</h3>
        {hasRecording && (
          <span className="recorder-duration">{formatDuration(duration)}</span>
        )}
      </div>

      <div className="recorder-controls">
        {/* Record Button */}
        <button
          className={`recorder-btn record-btn ${isRecording ? 'recording' : ''}`}
          onClick={isRecording ? handleStopRecording : handleStartRecording}
          disabled={isPlaying}
        >
          {isRecording ? '⏹️ STOP' : '🔴 REC'}
        </button>

        {/* Play Button */}
        <button
          className={`recorder-btn play-btn ${isPlaying ? 'playing' : ''}`}
          onClick={isPlaying ? handleStop : handlePlay}
          disabled={!hasRecording || isRecording}
        >
          {isPlaying ? '⏹️ STOP' : '▶️ PLAY'}
        </button>

        {/* Clear Button */}
        <button
          className="recorder-btn clear-btn"
          onClick={handleClear}
          disabled={!hasRecording || isRecording || isPlaying}
        >
          🗑️ CLEAR
        </button>

        {/* Export Button */}
        <button
          className="recorder-btn export-btn"
          onClick={handleExport}
          disabled={!hasRecording || isRecording}
        >
          💾 EXPORT
        </button>
      </div>

      {/* Volume Control */}
      {hasRecording && (
        <div className="recorder-volume">
          <label>Volume:</label>
          <input
            type="range"
            min="0"
            max="100"
            value={volume}
            onChange={handleVolumeChange}
            disabled={isRecording}
          />
          <span>{volume}%</span>
        </div>
      )}

      {/* Status Indicator */}
      <div className="recorder-status">
        {isRecording && <div className="status-indicator recording-indicator">● REC</div>}
        {isPlaying && <div className="status-indicator playing-indicator">▶ PLAYING</div>}
        {!isRecording && !isPlaying && hasRecording && (
          <div className="status-indicator ready-indicator">✓ READY</div>
        )}
      </div>
    </div>
  );
};

export default RecorderPanel;


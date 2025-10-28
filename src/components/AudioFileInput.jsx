import React, { useState, useRef } from 'react';
import { Upload, Play, Pause, RotateCw, Volume2, FileAudio, X } from 'lucide-react';
import './AudioFileInput.css';

/**
 * AudioFileInput - Upload audio files to test effects without guitar
 * Supports: .wav, .mp3, .ogg, .m4a
 * Features: Play/Pause, Loop, Volume control
 */
const AudioFileInput = ({ audioEngine, isActive, onToggle }) => {
  const [audioFile, setAudioFile] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLooping, setIsLooping] = useState(true);
  const [volume, setVolume] = useState(80);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const fileInputRef = useRef(null);

  const handleFileSelect = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    // Validate file type
    const validTypes = ['audio/wav', 'audio/mpeg', 'audio/ogg', 'audio/mp4', 'audio/x-m4a'];
    if (!validTypes.includes(file.type) && !file.name.match(/\.(wav|mp3|ogg|m4a)$/i)) {
      alert('Please select a valid audio file (.wav, .mp3, .ogg, .m4a)');
      return;
    }

    try {
      // Read file
      const arrayBuffer = await file.arrayBuffer();
      
      // Load into audio engine
      const success = await audioEngine.loadAudioFile(arrayBuffer, file.name);
      
      if (success) {
        setAudioFile({
          name: file.name,
          size: (file.size / 1024 / 1024).toFixed(2) + ' MB',
          type: file.type
        });
        setDuration(audioEngine.getAudioFileDuration());
        setIsPlaying(false);
        setCurrentTime(0);
      } else {
        alert('Failed to load audio file. Please try another file.');
      }
    } catch (error) {
      console.error('Error loading audio file:', error);
      alert('Error loading audio file: ' + error.message);
    }

    // Reset input
    event.target.value = '';
  };

  const handlePlayPause = () => {
    if (!audioFile) return;

    if (isPlaying) {
      audioEngine.pauseAudioFile();
      setIsPlaying(false);
    } else {
      audioEngine.playAudioFile(isLooping);
      setIsPlaying(true);
      startTimeTracking();
    }
  };

  const handleStop = () => {
    audioEngine.stopAudioFile();
    setIsPlaying(false);
    setCurrentTime(0);
  };

  const handleLoopToggle = () => {
    const newLoop = !isLooping;
    setIsLooping(newLoop);
    if (isPlaying) {
      audioEngine.setAudioFileLoop(newLoop);
    }
  };

  const handleVolumeChange = (e) => {
    const newVolume = parseInt(e.target.value);
    setVolume(newVolume);
    audioEngine.setAudioFileVolume(newVolume / 100);
  };

  const handleRemoveFile = () => {
    audioEngine.stopAudioFile();
    audioEngine.unloadAudioFile();
    setAudioFile(null);
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);
  };

  const startTimeTracking = () => {
    const interval = setInterval(() => {
      const time = audioEngine.getAudioFileCurrentTime();
      if (time !== null) {
        setCurrentTime(time);
      } else {
        clearInterval(interval);
        setIsPlaying(false);
      }
    }, 100);
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className={`audio-file-input ${isActive ? 'active' : ''}`}>
      {!audioFile ? (
        <div className="audio-file-upload">
          <input
            ref={fileInputRef}
            type="file"
            accept=".wav,.mp3,.ogg,.m4a,audio/*"
            onChange={handleFileSelect}
            style={{ display: 'none' }}
          />
          <button 
            className="upload-button"
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload size={16} />
            <span>Upload Audio</span>
          </button>
          <p className="upload-hint">
            WAV, MP3, OGG, M4A
          </p>
        </div>
      ) : (
        <div className="audio-file-player">
          <div className="file-info">
            <div className="file-name">
              <FileAudio size={16} />
              <span title={audioFile.name}>{audioFile.name}</span>
            </div>
            <button 
              className="remove-file-button"
              onClick={handleRemoveFile}
              title="Remove file"
            >
              <X size={16} />
            </button>
          </div>

          <div className="file-meta">
            <span>{audioFile.size}</span>
            <span>•</span>
            <span>{formatTime(duration)}</span>
          </div>

          <div className="playback-controls">
            <button 
              className={`play-pause-button ${isPlaying ? 'playing' : ''}`}
              onClick={handlePlayPause}
              title={isPlaying ? 'Pause' : 'Play'}
            >
              {isPlaying ? <Pause size={24} /> : <Play size={24} />}
            </button>

            <button 
              className={`loop-button ${isLooping ? 'active' : ''}`}
              onClick={handleLoopToggle}
              title={isLooping ? 'Loop On' : 'Loop Off'}
            >
              <RotateCw size={20} />
            </button>

            {isPlaying && (
              <button 
                className="stop-button"
                onClick={handleStop}
                title="Stop"
              >
                <div className="stop-icon" />
              </button>
            )}
          </div>

          <div className="progress-bar">
            <div 
              className="progress-fill" 
              style={{ width: `${(currentTime / duration) * 100}%` }}
            />
            <div className="progress-time">
              <span>{formatTime(currentTime)}</span>
              <span>{formatTime(duration)}</span>
            </div>
          </div>

          <div className="volume-control">
            <Volume2 size={18} />
            <input
              type="range"
              min="0"
              max="100"
              value={volume}
              onChange={handleVolumeChange}
              className="volume-slider"
            />
            <span className="volume-value">{volume}%</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default AudioFileInput;


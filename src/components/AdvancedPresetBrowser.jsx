import React, { useState, useMemo } from 'react';
import { Search, Filter, Star, Clock, Download, Upload, Trash2, Check } from 'lucide-react';
import './AdvancedPresetBrowser.css';

const AdvancedPresetBrowser = ({ presets, onLoad, onDelete, onClose }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState('all');
  const [selectedGenre, setSelectedGenre] = useState('all');
  const [sortBy, setSortBy] = useState('date');
  const [favorites, setFavorites] = useState(new Set());

  const toggleFavorite = (presetId) => {
    const newFavorites = new Set(favorites);
    if (newFavorites.has(presetId)) {
      newFavorites.delete(presetId);
    } else {
      newFavorites.add(presetId);
    }
    setFavorites(newFavorites);
  };

  const types = ['all', 'Clean', 'Crunch', 'Lead', 'High Gain', 'Ambient', 'Experimental'];
  const genres = ['all', 'Rock', 'Metal', 'Blues', 'Jazz', 'Pop', 'Alternative'];

  const filteredPresets = useMemo(() => {
    let filtered = presets || [];

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(preset =>
        preset.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (preset.description && preset.description.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    // Type filter
    if (selectedType !== 'all') {
      filtered = filtered.filter(preset => preset.type === selectedType);
    }

    // Genre filter
    if (selectedGenre !== 'all') {
      filtered = filtered.filter(preset => preset.genre === selectedGenre);
    }

    // Sort
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'date':
          return new Date(b.timestamp || 0) - new Date(a.timestamp || 0);
        case 'favorite':
          return favorites.has(b.id) - favorites.has(a.id);
        default:
          return 0;
      }
    });

    return filtered;
  }, [presets, searchTerm, selectedType, selectedGenre, sortBy, favorites]);

  return (
    <div className="advanced-preset-browser">
      <div className="preset-browser-header">
        <h2 className="browser-title">Preset Browser</h2>
        <button className="close-browser-btn" onClick={onClose}>×</button>
      </div>

      {/* SEARCH BAR */}
      <div className="browser-search-section">
        <div className="search-input-wrapper">
          <Search size={16} />
          <input
            type="text"
            className="browser-search-input"
            placeholder="Search presets..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* FILTERS */}
      <div className="browser-filters">
        <div className="filter-group">
          <label>
            <Filter size={14} />
            Type
          </label>
          <select 
            value={selectedType} 
            onChange={(e) => setSelectedType(e.target.value)}
            className="filter-select"
          >
            {types.map(type => (
              <option key={type} value={type}>
                {type === 'all' ? 'All Types' : type}
              </option>
            ))}
          </select>
        </div>

        <div className="filter-group">
          <label>
            <Filter size={14} />
            Genre
          </label>
          <select 
            value={selectedGenre} 
            onChange={(e) => setSelectedGenre(e.target.value)}
            className="filter-select"
          >
            {genres.map(genre => (
              <option key={genre} value={genre}>
                {genre === 'all' ? 'All Genres' : genre}
              </option>
            ))}
          </select>
        </div>

        <div className="filter-group">
          <label>Sort By</label>
          <select 
            value={sortBy} 
            onChange={(e) => setSortBy(e.target.value)}
            className="filter-select"
          >
            <option value="date">Date</option>
            <option value="name">Name</option>
            <option value="favorite">Favorites</option>
          </select>
        </div>
      </div>

      {/* PRESET LIST */}
      <div className="browser-preset-list">
        {filteredPresets.length === 0 ? (
          <div className="no-presets-found">
            <Search size={48} />
            <p>No presets found</p>
            <small>Try adjusting your filters</small>
          </div>
        ) : (
          filteredPresets.map((preset) => (
            <div key={preset.id} className="browser-preset-card">
              <button
                className={`favorite-btn ${favorites.has(preset.id) ? 'active' : ''}`}
                onClick={() => toggleFavorite(preset.id)}
              >
                <Star size={16} fill={favorites.has(preset.id) ? 'currentColor' : 'none'} />
              </button>

              <div className="preset-card-info">
                <h4 className="preset-card-name">{preset.name}</h4>
                {preset.description && (
                  <p className="preset-card-description">{preset.description}</p>
                )}
                <div className="preset-card-meta">
                  {preset.type && <span className="preset-badge type">{preset.type}</span>}
                  {preset.genre && <span className="preset-badge genre">{preset.genre}</span>}
                  {preset.timestamp && (
                    <span className="preset-date">
                      <Clock size={12} />
                      {new Date(preset.timestamp).toLocaleDateString()}
                    </span>
                  )}
                </div>
              </div>

              <div className="preset-card-actions">
                <button
                  className="preset-action-btn load"
                  onClick={() => {
                    onLoad(preset);
                    onClose();
                  }}
                  title="Load Preset"
                >
                  <Check size={16} />
                  Load
                </button>
                <button
                  className="preset-action-btn delete"
                  onClick={() => onDelete(preset.id)}
                  title="Delete Preset"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default AdvancedPresetBrowser;


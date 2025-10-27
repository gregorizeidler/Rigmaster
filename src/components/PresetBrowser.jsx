import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import './PresetBrowser.css';

const PresetBrowser = ({ presetManager, onLoadPreset, onClose, currentAmpConfig, currentEffects }) => {
  const [activeTab, setActiveTab] = useState('factory');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [presets, setPresets] = useState({ factory: [], user: [] });
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [saveForm, setSaveForm] = useState({
    name: '',
    description: '',
    category: 'User',
    tags: ''
  });

  useEffect(() => {
    if (presetManager) {
      const all = presetManager.getAllPresets();
      setPresets(all);
    }
  }, [presetManager]);

  const filteredPresets = () => {
    const source = activeTab === 'factory' ? presets.factory : presets.user;
    let filtered = source;

    // Filter by category
    if (selectedCategory !== 'All') {
      filtered = filtered.filter(p => p.category === selectedCategory);
    }

    // Filter by search
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(p =>
        p.name.toLowerCase().includes(query) ||
        p.description.toLowerCase().includes(query) ||
        (p.tags && p.tags.some(t => t.toLowerCase().includes(query)))
      );
    }

    return filtered;
  };

  const categories = ['All', 'Clean', 'Blues', 'Rock', 'Lead', 'Metal', 'Ambient', 'Studio', 'User'];

  const handleLoadPreset = (preset) => {
    onLoadPreset(preset);
    onClose();
  };

  const handleSavePreset = () => {
    if (!saveForm.name.trim()) {
      alert('Please enter a preset name');
      return;
    }

    const tags = saveForm.tags.split(',').map(t => t.trim()).filter(t => t);
    
    presetManager.savePreset(
      saveForm.name,
      saveForm.description,
      saveForm.category,
      tags,
      currentAmpConfig,
      currentEffects
    );

    // Refresh presets
    const all = presetManager.getAllPresets();
    setPresets(all);

    // Reset form
    setSaveForm({ name: '', description: '', category: 'User', tags: '' });
    setShowSaveDialog(false);
    setActiveTab('user');
  };

  const handleDeletePreset = (id) => {
    if (window.confirm('Are you sure you want to delete this preset?')) {
      presetManager.deletePreset(id);
      const all = presetManager.getAllPresets();
      setPresets(all);
    }
  };

  const handleExportPreset = (id) => {
    presetManager.exportPreset(id);
  };

  const handleImportPreset = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const preset = presetManager.importPreset(event.target.result);
        if (preset) {
          const all = presetManager.getAllPresets();
          setPresets(all);
          setActiveTab('user');
        } else {
          alert('Error importing preset');
        }
      };
      reader.readAsText(file);
    }
  };

  return (
    <motion.div
      className="preset-browser-overlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className="preset-browser"
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="preset-browser-header">
          <h2>Preset Browser</h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        {/* TABS */}
        <div className="preset-tabs">
          <button
            className={`preset-tab ${activeTab === 'factory' ? 'active' : ''}`}
            onClick={() => setActiveTab('factory')}
          >
            Factory ({presets.factory.length})
          </button>
          <button
            className={`preset-tab ${activeTab === 'user' ? 'active' : ''}`}
            onClick={() => setActiveTab('user')}
          >
            User ({presets.user.length})
          </button>
        </div>

        {/* SEARCH & ACTIONS */}
        <div className="preset-controls">
          <input
            type="text"
            className="preset-search"
            placeholder="🔍 Search presets..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          
          <div className="preset-actions">
            <button className="action-btn save-btn" onClick={() => setShowSaveDialog(true)}>
              💾 Save Current
            </button>
            {activeTab === 'user' && (
              <>
                <label className="action-btn import-btn">
                  📥 Import
                  <input type="file" accept=".json" onChange={handleImportPreset} style={{ display: 'none' }} />
                </label>
              </>
            )}
          </div>
        </div>

        {/* CATEGORIES */}
        <div className="preset-categories">
          {categories.map(cat => (
            <button
              key={cat}
              className={`category-btn ${selectedCategory === cat ? 'active' : ''}`}
              onClick={() => setSelectedCategory(cat)}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* PRESET LIST */}
        <div className="preset-list">
          <AnimatePresence>
            {filteredPresets().map((preset) => (
              <motion.div
                key={preset.id}
                className="preset-card"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                whileHover={{ scale: 1.02 }}
                onClick={() => handleLoadPreset(preset)}
              >
                <div className="preset-card-header">
                  <h3>{preset.name}</h3>
                  <span className="preset-category">{preset.category}</span>
                </div>
                
                <p className="preset-description">{preset.description}</p>
                
                {preset.tags && preset.tags.length > 0 && (
                  <div className="preset-tags">
                    {preset.tags.map((tag, i) => (
                      <span key={i} className="preset-tag">#{tag}</span>
                    ))}
                  </div>
                )}

                <div className="preset-info">
                  <span>Amp: {preset.amp?.ampType || 'N/A'}</span>
                  <span>FX: {preset.effects?.length || 0}</span>
                </div>

                {activeTab === 'user' && (
                  <div className="preset-card-actions" onClick={(e) => e.stopPropagation()}>
                    <button
                      className="preset-action-btn export-btn"
                      onClick={() => handleExportPreset(preset.id)}
                      title="Export"
                    >
                      📤
                    </button>
                    <button
                      className="preset-action-btn delete-btn"
                      onClick={() => handleDeletePreset(preset.id)}
                      title="Delete"
                    >
                      Delete
                    </button>
                  </div>
                )}
              </motion.div>
            ))}
          </AnimatePresence>

          {filteredPresets().length === 0 && (
            <div className="no-presets">
              <p>No presets found</p>
              {activeTab === 'user' && (
                <button className="action-btn" onClick={() => setShowSaveDialog(true)}>
                  Create Your First Preset
                </button>
              )}
            </div>
          )}
        </div>

        {/* SAVE DIALOG */}
        <AnimatePresence>
          {showSaveDialog && (
            <motion.div
              className="save-dialog-overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowSaveDialog(false)}
            >
              <motion.div
                className="save-dialog"
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
              >
                <h3>💾 Save Preset</h3>
                
                <div className="save-form">
                  <div className="form-group">
                    <label>Preset Name *</label>
                    <input
                      type="text"
                      value={saveForm.name}
                      onChange={(e) => setSaveForm({ ...saveForm, name: e.target.value })}
                      placeholder="e.g., My Awesome Tone"
                      autoFocus
                    />
                  </div>

                  <div className="form-group">
                    <label>Description</label>
                    <textarea
                      value={saveForm.description}
                      onChange={(e) => setSaveForm({ ...saveForm, description: e.target.value })}
                      placeholder="Describe your tone..."
                      rows="3"
                    />
                  </div>

                  <div className="form-group">
                    <label>Category</label>
                    <select
                      value={saveForm.category}
                      onChange={(e) => setSaveForm({ ...saveForm, category: e.target.value })}
                    >
                      <option value="User">User</option>
                      <option value="Clean">Clean</option>
                      <option value="Blues">Blues</option>
                      <option value="Rock">Rock</option>
                      <option value="Lead">Lead</option>
                      <option value="Metal">Metal</option>
                      <option value="Ambient">Ambient</option>
                      <option value="Studio">Studio</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Tags (comma-separated)</label>
                    <input
                      type="text"
                      value={saveForm.tags}
                      onChange={(e) => setSaveForm({ ...saveForm, tags: e.target.value })}
                      placeholder="e.g., blues, vintage, warm"
                    />
                  </div>

                  <div className="save-dialog-actions">
                    <button className="cancel-btn" onClick={() => setShowSaveDialog(false)}>
                      Cancel
                    </button>
                    <button className="confirm-btn" onClick={handleSavePreset}>
                      Save Preset
                    </button>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  );
};

export default PresetBrowser;


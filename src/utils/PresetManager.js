// PresetManager.js - Sistema profissional de gerenciamento de presets

class PresetManager {
  constructor() {
    this.currentPreset = null;
    this.factoryPresets = this.createFactoryPresets();
    this.userPresets = this.loadUserPresets();
  }

  // ==========================================
  // FACTORY PRESETS
  // ==========================================
  createFactoryPresets() {
    return [
      // CLEAN PRESETS
      {
        id: 'clean_jazz',
        name: 'Clean Jazz',
        category: 'Clean',
        description: 'Pristine clean tone for jazz',
        tags: ['jazz', 'clean', 'warm'],
        amp: {
          ampType: 'roland_jc120',
          params: {
            gain: 30,
            bass: 55,
            mid: 45,
            treble: 60,
            presence: 50,
            master: 70,
            chorus: true,
            cabinet: '2x12_closed',
            microphone: 'u87',
            micPosition: 'center'
          },
          bypassed: false
        },
        effects: []
      },
      {
        id: 'clean_funk',
        name: 'Funky Clean',
        category: 'Clean',
        description: 'Punchy clean with sparkle',
        tags: ['funk', 'clean', 'bright'],
        amp: {
          ampType: 'clean',
          params: {
            gain: 35,
            bass: 50,
            mid: 40,
            treble: 65,
            presence: 60,
            master: 75,
            reverb: 20,
            bright: true,
            cabinet: '2x12_closed',
            microphone: 'sm57',
            micPosition: 'edge'
          },
          bypassed: false
        },
        effects: [
          { type: 'compressor', params: { threshold: 40, ratio: 4, attack: 5, release: 50, makeup: 60 }, bypassed: false }
        ]
      },

      // BLUES/CRUNCH PRESETS
      {
        id: 'blues_crunch',
        name: 'Blues Crunch',
        category: 'Blues',
        description: 'Classic blues breakup',
        tags: ['blues', 'crunch', 'vintage'],
        amp: {
          ampType: 'fender_bassman',
          params: {
            gain: 60,
            bass: 55,
            mid: 50,
            treble: 55,
            presence: 50,
            master: 65,
            reverb: 30,
            bright: false,
            cabinet: '4x10_bassman',
            microphone: 'royer121',
            micPosition: 'center'
          },
          bypassed: false
        },
        effects: [
          { type: 'tubescreamer', params: { drive: 40, tone: 60, level: 70 }, bypassed: false }
        ]
      },
      {
        id: 'british_crunch',
        name: 'British Crunch',
        category: 'Rock',
        description: 'Classic Marshall crunch',
        tags: ['rock', 'british', 'crunch'],
        amp: {
          ampType: 'crunch',
          params: {
            gain: 55,
            bass: 50,
            mid: 60,
            treble: 58,
            presence: 55,
            master: 70,
            resonance: 50,
            cabinet: '4x12_greenback',
            microphone: 'sm57',
            micPosition: 'edge'
          },
          bypassed: false
        },
        effects: [
          { type: 'delay', params: { time: 380, feedback: 25, mix: 20 }, bypassed: false }
        ]
      },

      // ROCK PRESETS
      {
        id: 'classic_rock',
        name: 'Classic Rock',
        category: 'Rock',
        description: '70s rock tone',
        tags: ['rock', 'classic', 'led zeppelin'],
        amp: {
          ampType: 'marshall_jtm45',
          params: {
            gain: 65,
            bass: 55,
            mid: 58,
            treble: 60,
            presence: 60,
            master: 75,
            cabinet: '4x12_greenback',
            microphone: 'sm57',
            micPosition: 'edge'
          },
          bypassed: false
        },
        effects: []
      },
      {
        id: 'modern_rock',
        name: 'Modern Rock',
        category: 'Rock',
        description: 'Tight modern rock',
        tags: ['rock', 'modern', 'alt rock'],
        amp: {
          ampType: 'friedman_be100',
          params: {
            gain: 70,
            bass: 50,
            mid: 55,
            treble: 60,
            presence: 65,
            master: 65,
            depth: 55,
            tightswitch: true,
            cabinet: '4x12_vintage',
            microphone: 'sm57',
            micPosition: 'edge'
          },
          bypassed: false
        },
        effects: [
          { type: 'noisegate', params: { threshold: 35, attack: 1, release: 80 }, bypassed: false }
        ]
      },

      // LEAD PRESETS
      {
        id: 'singing_lead',
        name: 'Singing Lead',
        category: 'Lead',
        description: 'Smooth sustaining lead',
        tags: ['lead', 'solo', 'sustain'],
        amp: {
          ampType: 'soldano_slo100',
          params: {
            gain: 75,
            bass: 52,
            mid: 60,
            treble: 58,
            presence: 60,
            master: 60,
            depth: 50,
            cabinet: '4x12_vintage',
            microphone: 'sm57',
            micPosition: 'center'
          },
          bypassed: false
        },
        effects: [
          { type: 'delay', params: { time: 400, feedback: 35, mix: 25 }, bypassed: false },
          { type: 'reverb', params: { decay: 2.5, mix: 15 }, bypassed: false }
        ]
      },
      {
        id: 'shred_lead',
        name: 'Shred Lead',
        category: 'Lead',
        description: 'High gain shred tone',
        tags: ['lead', 'shred', 'technical'],
        amp: {
          ampType: 'lead',
          params: {
            gain: 80,
            bass: 48,
            mid: 65,
            treble: 62,
            presence: 70,
            master: 55,
            graphiceq: true,
            cabinet: '4x12_vintage',
            microphone: 'sm57',
            micPosition: 'edge'
          },
          bypassed: false
        },
        effects: [
          { type: 'noisegate', params: { threshold: 40, attack: 1, release: 60 }, bypassed: false },
          { type: 'eq', params: { bass: 45, mid: 60, treble: 65 }, bypassed: false }
        ]
      },

      // METAL PRESETS
      {
        id: 'thrash_metal',
        name: 'Thrash Metal',
        category: 'Metal',
        description: 'Aggressive thrash tone',
        tags: ['metal', 'thrash', 'aggressive'],
        amp: {
          ampType: 'peavey_5150',
          params: {
            gain: 85,
            bass: 45,
            mid: 55,
            treble: 65,
            presence: 70,
            master: 60,
            pregain: 70,
            postgain: 60,
            resonance: 45,
            cabinet: '4x12_vintage',
            microphone: 'sm57',
            micPosition: 'edge'
          },
          bypassed: false
        },
        effects: [
          { type: 'noisegate', params: { threshold: 45, attack: 1, release: 50 }, bypassed: false },
          { type: 'eq', params: { bass: 40, mid: 50, treble: 70 }, bypassed: false }
        ]
      },
      {
        id: 'djent',
        name: 'Djent',
        category: 'Metal',
        description: 'Modern djent tone',
        tags: ['metal', 'djent', 'modern'],
        amp: {
          ampType: 'diezel_vh4',
          params: {
            gain: 88,
            bass: 42,
            mid: 48,
            treble: 68,
            presence: 75,
            master: 55,
            depth: 40,
            deepcontrol: 45,
            cabinet: '4x12_vintage',
            microphone: 'sm57',
            micPosition: 'center'
          },
          bypassed: false
        },
        effects: [
          { type: 'noisegate', params: { threshold: 50, attack: 0.5, release: 40 }, bypassed: false },
          { type: 'tubescreamer', params: { drive: 20, tone: 50, level: 80 }, bypassed: false }
        ]
      },
      {
        id: 'doom_metal',
        name: 'Doom Metal',
        category: 'Metal',
        description: 'Heavy doom/sludge',
        tags: ['metal', 'doom', 'heavy'],
        amp: {
          ampType: 'orange_rockerverb',
          params: {
            gain: 82,
            bass: 65,
            mid: 60,
            treble: 52,
            presence: 55,
            master: 70,
            shape: 35,
            cabinet: '4x12_vintage',
            microphone: 'royer121',
            micPosition: 'center'
          },
          bypassed: false
        },
        effects: [
          { type: 'fuzz', params: { fuzz: 75, tone: 45, level: 70 }, bypassed: false }
        ]
      },

      // AMBIENT/EXPERIMENTAL
      {
        id: 'ambient_clean',
        name: 'Ambient Clean',
        category: 'Ambient',
        description: 'Spacious ambient tone',
        tags: ['ambient', 'clean', 'reverb'],
        amp: {
          ampType: 'vox_ac30',
          params: {
            gain: 35,
            bass: 52,
            mid: 48,
            treble: 58,
            presence: 55,
            master: 65,
            topboost: true,
            tremolo: 0,
            cut: 50,
            cabinet: '2x12_open',
            microphone: 'u87',
            micPosition: 'room'
          },
          bypassed: false
        },
        effects: [
          { type: 'delay', params: { time: 500, feedback: 45, mix: 40 }, bypassed: false },
          { type: 'reverb', params: { decay: 4.0, mix: 35 }, bypassed: false }
        ]
      },

      // BOUTIQUE/STUDIO
      {
        id: 'studio_clean',
        name: 'Studio Clean',
        category: 'Studio',
        description: 'Pristine studio clean',
        tags: ['studio', 'clean', 'recording'],
        amp: {
          ampType: 'tworock_classic',
          params: {
            gain: 32,
            bass: 53,
            mid: 48,
            treble: 60,
            presence: 58,
            master: 72,
            reverb: 25,
            boost: false,
            cabinet: '2x12_closed',
            microphone: 'u87',
            micPosition: 'center'
          },
          bypassed: false
        },
        effects: [
          { type: 'compressor', params: { threshold: 45, ratio: 3, attack: 10, release: 100, makeup: 55 }, bypassed: false }
        ]
      },
      {
        id: 'dumble_od',
        name: 'Dumble Overdrive',
        category: 'Blues',
        description: 'Legendary Dumble OD',
        tags: ['blues', 'boutique', 'dumble'],
        amp: {
          ampType: 'dumble_ods',
          params: {
            gain: 58,
            bass: 54,
            mid: 58,
            treble: 56,
            presence: 60,
            master: 68,
            oddrive: 55,
            ratio: 50,
            cabinet: '2x12_closed',
            microphone: 'royer121',
            micPosition: 'edge'
          },
          bypassed: false
        },
        effects: [
          { type: 'delay', params: { time: 350, feedback: 20, mix: 18 }, bypassed: false }
        ]
      }
    ];
  }

  // ==========================================
  // LOAD/SAVE USER PRESETS
  // ==========================================
  loadUserPresets() {
    try {
      const stored = localStorage.getItem('guitrard_user_presets');
      return stored ? JSON.parse(stored) : [];
    } catch (e) {
      console.warn('Error loading user presets:', e);
      return [];
    }
  }

  saveUserPresets() {
    try {
      localStorage.setItem('guitrard_user_presets', JSON.stringify(this.userPresets));
    } catch (e) {
      console.error('Error saving user presets:', e);
    }
  }

  // ==========================================
  // PRESET OPERATIONS
  // ==========================================
  getAllPresets() {
    return {
      factory: this.factoryPresets,
      user: this.userPresets
    };
  }

  getPresetsByCategory(category) {
    const all = [...this.factoryPresets, ...this.userPresets];
    return all.filter(p => p.category === category);
  }

  getPresetsByTag(tag) {
    const all = [...this.factoryPresets, ...this.userPresets];
    return all.filter(p => p.tags && p.tags.includes(tag));
  }

  searchPresets(query) {
    const all = [...this.factoryPresets, ...this.userPresets];
    const lowerQuery = query.toLowerCase();
    return all.filter(p => 
      p.name.toLowerCase().includes(lowerQuery) ||
      p.description.toLowerCase().includes(lowerQuery) ||
      (p.tags && p.tags.some(t => t.toLowerCase().includes(lowerQuery)))
    );
  }

  savePreset(name, description, category, tags, ampConfig, effectsConfig) {
    const preset = {
      id: 'user_' + Date.now(),
      name,
      category: category || 'User',
      description: description || '',
      tags: tags || [],
      amp: ampConfig,
      effects: effectsConfig,
      createdAt: new Date().toISOString()
    };

    this.userPresets.push(preset);
    this.saveUserPresets();
    return preset;
  }

  updatePreset(id, updates) {
    const index = this.userPresets.findIndex(p => p.id === id);
    if (index !== -1) {
      this.userPresets[index] = {
        ...this.userPresets[index],
        ...updates,
        updatedAt: new Date().toISOString()
      };
      this.saveUserPresets();
      return this.userPresets[index];
    }
    return null;
  }

  deletePreset(id) {
    const index = this.userPresets.findIndex(p => p.id === id);
    if (index !== -1) {
      this.userPresets.splice(index, 1);
      this.saveUserPresets();
      return true;
    }
    return false;
  }

  loadPreset(id) {
    const preset = [...this.factoryPresets, ...this.userPresets].find(p => p.id === id);
    if (preset) {
      this.currentPreset = preset;
      return preset;
    }
    return null;
  }

  exportPreset(id) {
    const preset = this.userPresets.find(p => p.id === id);
    if (preset) {
      const json = JSON.stringify(preset, null, 2);
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${preset.name.replace(/\s+/g, '_')}.json`;
      a.click();
      URL.revokeObjectURL(url);
    }
  }

  importPreset(jsonString) {
    try {
      const preset = JSON.parse(jsonString);
      preset.id = 'user_' + Date.now();
      preset.createdAt = new Date().toISOString();
      this.userPresets.push(preset);
      this.saveUserPresets();
      return preset;
    } catch (e) {
      console.error('Error importing preset:', e);
      return null;
    }
  }

  // ==========================================
  // CATEGORIES
  // ==========================================
  getCategories() {
    const all = [...this.factoryPresets, ...this.userPresets];
    const categories = new Set(all.map(p => p.category));
    return Array.from(categories).sort();
  }

  // ==========================================
  // TAGS
  // ==========================================
  getAllTags() {
    const all = [...this.factoryPresets, ...this.userPresets];
    const tags = new Set();
    all.forEach(p => {
      if (p.tags) {
        p.tags.forEach(t => tags.add(t));
      }
    });
    return Array.from(tags).sort();
  }
}

export default PresetManager;


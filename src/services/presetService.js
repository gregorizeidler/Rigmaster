import axios from 'axios';

const API_BASE_URL = 'http://localhost:5000/api';

const PresetService = {
  async getPresets() {
    try {
      const response = await axios.get(`${API_BASE_URL}/presets`);
      return response.data;
    } catch (error) {
      console.error('Error fetching presets:', error);
      return [];
    }
  },

  async getPreset(id) {
    try {
      const response = await axios.get(`${API_BASE_URL}/presets/${id}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching preset:', error);
      return null;
    }
  },

  async savePreset(name, effects) {
    try {
      const response = await axios.post(`${API_BASE_URL}/presets`, {
        name,
        effects: effects.map(e => ({
          type: e.type,
          params: e.params,
          ampType: e.ampType
        }))
      });
      return response.data;
    } catch (error) {
      console.error('Error saving preset:', error);
      return null;
    }
  },

  async updatePreset(id, name, effects) {
    try {
      const response = await axios.put(`${API_BASE_URL}/presets/${id}`, {
        name,
        effects: effects.map(e => ({
          type: e.type,
          params: e.params,
          ampType: e.ampType
        }))
      });
      return response.data;
    } catch (error) {
      console.error('Error updating preset:', error);
      return null;
    }
  },

  async deletePreset(id) {
    try {
      await axios.delete(`${API_BASE_URL}/presets/${id}`);
      return true;
    } catch (error) {
      console.error('Error deleting preset:', error);
      return false;
    }
  },

  async checkBackendStatus() {
    try {
      const response = await axios.get(`${API_BASE_URL}/health`);
      return response.data.status === 'ok';
    } catch (error) {
      return false;
    }
  }
};

export default PresetService;


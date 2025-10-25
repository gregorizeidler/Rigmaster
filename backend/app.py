from flask import Flask, jsonify, request
from flask_cors import CORS
import json
import os
from datetime import datetime

app = Flask(__name__)
CORS(app)

PRESETS_FILE = 'presets.json'

def load_presets():
    if os.path.exists(PRESETS_FILE):
        with open(PRESETS_FILE, 'r') as f:
            return json.load(f)
    return []

def save_presets(presets):
    with open(PRESETS_FILE, 'w') as f:
        json.dump(presets, f, indent=2)

@app.route('/api/health', methods=['GET'])
def health():
    return jsonify({'status': 'ok', 'message': 'Guitrard Backend Running'})

@app.route('/api/presets', methods=['GET'])
def get_presets():
    presets = load_presets()
    return jsonify(presets)

@app.route('/api/presets', methods=['POST'])
def create_preset():
    data = request.json
    presets = load_presets()
    
    new_preset = {
        'id': len(presets) + 1,
        'name': data.get('name', f'Preset {len(presets) + 1}'),
        'effects': data.get('effects', []),
        'created_at': datetime.now().isoformat(),
        'updated_at': datetime.now().isoformat()
    }
    
    presets.append(new_preset)
    save_presets(presets)
    
    return jsonify(new_preset), 201

@app.route('/api/presets/<int:preset_id>', methods=['GET'])
def get_preset(preset_id):
    presets = load_presets()
    preset = next((p for p in presets if p['id'] == preset_id), None)
    
    if preset:
        return jsonify(preset)
    return jsonify({'error': 'Preset not found'}), 404

@app.route('/api/presets/<int:preset_id>', methods=['PUT'])
def update_preset(preset_id):
    data = request.json
    presets = load_presets()
    
    preset = next((p for p in presets if p['id'] == preset_id), None)
    if preset:
        preset['name'] = data.get('name', preset['name'])
        preset['effects'] = data.get('effects', preset['effects'])
        preset['updated_at'] = datetime.now().isoformat()
        save_presets(presets)
        return jsonify(preset)
    
    return jsonify({'error': 'Preset not found'}), 404

@app.route('/api/presets/<int:preset_id>', methods=['DELETE'])
def delete_preset(preset_id):
    presets = load_presets()
    presets = [p for p in presets if p['id'] != preset_id]
    save_presets(presets)
    return jsonify({'message': 'Preset deleted'}), 200

# MIDI/OSC placeholder endpoints (requires additional libraries)
@app.route('/api/midi/devices', methods=['GET'])
def get_midi_devices():
    # Placeholder - requires python-rtmidi
    return jsonify({
        'devices': [],
        'message': 'Install python-rtmidi for MIDI support'
    })

@app.route('/api/osc/config', methods=['GET'])
def get_osc_config():
    # Placeholder - requires python-osc
    return jsonify({
        'host': '0.0.0.0',
        'port': 8000,
        'message': 'Install python-osc for OSC support'
    })

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)


"""
MIDI Controller for Guitrard
Allows controlling pedals via MIDI devices
"""

try:
    import rtmidi
    MIDI_AVAILABLE = True
except ImportError:
    MIDI_AVAILABLE = False
    print("Warning: python-rtmidi not installed. MIDI support disabled.")

class MIDIController:
    def __init__(self, callback=None):
        self.callback = callback
        self.midi_in = None
        self.midi_out = None
        
        if MIDI_AVAILABLE:
            self.midi_in = rtmidi.MidiIn()
            self.midi_out = rtmidi.MidiOut()
    
    def get_available_ports(self):
        if not MIDI_AVAILABLE:
            return []
        
        in_ports = self.midi_in.get_ports()
        return in_ports
    
    def open_port(self, port_index=0):
        if not MIDI_AVAILABLE:
            return False
        
        try:
            self.midi_in.open_port(port_index)
            self.midi_in.set_callback(self.on_midi_message)
            return True
        except Exception as e:
            print(f"Error opening MIDI port: {e}")
            return False
    
    def on_midi_message(self, message, data):
        """
        Handle incoming MIDI messages
        message[0] = status byte (144 = note on, 176 = CC)
        message[1] = data1 (note/CC number)
        message[2] = data2 (velocity/value)
        """
        midi_message, delta_time = message
        
        if self.callback:
            parsed = {
                'type': self.get_message_type(midi_message[0]),
                'channel': midi_message[0] & 0x0F,
                'data1': midi_message[1],
                'data2': midi_message[2]
            }
            self.callback(parsed)
    
    def get_message_type(self, status_byte):
        msg_type = status_byte & 0xF0
        
        types = {
            0x80: 'note_off',
            0x90: 'note_on',
            0xB0: 'control_change',
            0xC0: 'program_change',
            0xE0: 'pitch_bend'
        }
        
        return types.get(msg_type, 'unknown')
    
    def send_message(self, message):
        if MIDI_AVAILABLE and self.midi_out:
            self.midi_out.send_message(message)
    
    def close(self):
        if self.midi_in:
            self.midi_in.close_port()
        if self.midi_out:
            self.midi_out.close_port()

# MIDI CC mapping examples
# CC 1 = Modulation (can map to effect depth)
# CC 7 = Volume (can map to master volume)
# CC 10 = Pan
# CC 11 = Expression
# CC 64 = Sustain pedal (can map to bypass)
# CC 71-74 = Filter controls
# CC 91-93 = Reverb/Delay controls


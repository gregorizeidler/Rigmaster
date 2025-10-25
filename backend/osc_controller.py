"""
OSC Controller for Guitrard
Allows controlling pedals remotely via OSC (e.g., from phone apps)
"""

try:
    from pythonosc import dispatcher, osc_server, udp_client
    import threading
    OSC_AVAILABLE = True
except ImportError:
    OSC_AVAILABLE = False
    print("Warning: python-osc not installed. OSC support disabled.")

class OSCController:
    def __init__(self, callback=None, listen_port=8000):
        self.callback = callback
        self.listen_port = listen_port
        self.server = None
        self.server_thread = None
        self.client = None
        
    def start_server(self):
        if not OSC_AVAILABLE:
            return False
        
        try:
            disp = dispatcher.Dispatcher()
            
            # Map OSC addresses to effects
            disp.map("/effect/*/bypass", self.handle_bypass)
            disp.map("/effect/*/param/*", self.handle_param)
            disp.map("/preset/load", self.handle_preset_load)
            disp.map("/master/volume", self.handle_master_volume)
            
            self.server = osc_server.ThreadingOSCUDPServer(
                ("0.0.0.0", self.listen_port), disp
            )
            
            self.server_thread = threading.Thread(target=self.server.serve_forever)
            self.server_thread.daemon = True
            self.server_thread.start()
            
            print(f"OSC Server listening on port {self.listen_port}")
            return True
        except Exception as e:
            print(f"Error starting OSC server: {e}")
            return False
    
    def handle_bypass(self, address, *args):
        """Handle /effect/{effect_id}/bypass messages"""
        parts = address.split('/')
        effect_id = parts[2]
        bypass_state = args[0] if args else 1
        
        if self.callback:
            self.callback({
                'action': 'bypass',
                'effect_id': effect_id,
                'value': bypass_state
            })
    
    def handle_param(self, address, *args):
        """Handle /effect/{effect_id}/param/{param_name} messages"""
        parts = address.split('/')
        effect_id = parts[2]
        param_name = parts[4]
        value = args[0] if args else 0
        
        if self.callback:
            self.callback({
                'action': 'update_param',
                'effect_id': effect_id,
                'param': param_name,
                'value': value
            })
    
    def handle_preset_load(self, address, *args):
        """Handle /preset/load {preset_id} messages"""
        preset_id = args[0] if args else 1
        
        if self.callback:
            self.callback({
                'action': 'load_preset',
                'preset_id': preset_id
            })
    
    def handle_master_volume(self, address, *args):
        """Handle /master/volume messages"""
        volume = args[0] if args else 1.0
        
        if self.callback:
            self.callback({
                'action': 'master_volume',
                'value': volume
            })
    
    def setup_client(self, target_ip="127.0.0.1", target_port=9000):
        """Setup OSC client to send messages"""
        if OSC_AVAILABLE:
            self.client = udp_client.SimpleUDPClient(target_ip, target_port)
    
    def send_feedback(self, address, *values):
        """Send OSC feedback messages"""
        if self.client:
            self.client.send_message(address, values)
    
    def stop(self):
        if self.server:
            self.server.shutdown()

# OSC Address examples:
# /effect/distortion-1/bypass 1
# /effect/delay-1/param/time 500
# /effect/reverb-1/param/mix 0.5
# /preset/load 3
# /master/volume 0.8


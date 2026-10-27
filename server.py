#!/usr/bin/env python3
"""
QuickChat Local Development Server with Live Sync & LAN IP Auto-Detection.
Runs on standard Python 3 (no third-party dependencies required).
"""
import http.server
import json
import os
import socket
import sys
import urllib.parse

def get_lan_ip():
    """Detect local network IP for mobile QR code access."""
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.settimeout(0.5)
        # Connect to public DNS to detect active outbound interface
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except Exception:
        return "127.0.0.1"

# Shared in-memory message store for real-time cross-device sync
MESSAGES_STORE = {}
ROOMS_STORE = {}

class QuickChatHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        # Add CORS headers so any device / client can talk to the server
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(200)
        self.end_headers()

    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)

        # 1. IP & Config Endpoint
        if parsed.path == "/api/ip":
            lan_ip = get_lan_ip()
            port = self.server.server_port
            payload = {
                "ip": lan_ip,
                "port": port,
                "url": f"http://{lan_ip}:{port}"
            }
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_header("Cache-Control", "no-cache")
            self.end_headers()
            self.wfile.write(json.dumps(payload).encode("utf-8"))
            return

        # 2. Live Message Polling Endpoint for cross-device sync
        if parsed.path == "/api/sync":
            params = urllib.parse.parse_qs(parsed.query)
            room_id = params.get("roomId", [None])[0]
            since = 0
            try:
                since = float(params.get("since", [0])[0])
            except ValueError:
                since = 0

            new_msgs = []
            if room_id and room_id in MESSAGES_STORE:
                new_msgs = [m for m in MESSAGES_STORE[room_id] if m.get("timestamp", 0) > since]

            payload = {
                "roomId": room_id,
                "messages": new_msgs,
                "room": ROOMS_STORE.get(room_id)
            }
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_header("Cache-Control", "no-cache")
            self.end_headers()
            self.wfile.write(json.dumps(payload).encode("utf-8"))
            return

        return super().do_GET()

    def do_POST(self):
        parsed = urllib.parse.urlparse(self.path)

        # Post message to room
        if parsed.path == "/api/messages":
            length = int(self.headers.get("Content-Length", 0))
            body = self.rfile.read(length)
            try:
                data = json.loads(body.decode("utf-8"))
                room_id = data.get("roomId")
                msg = data.get("message")
                if room_id and msg:
                    if room_id not in MESSAGES_STORE:
                        MESSAGES_STORE[room_id] = []
                    # Deduplicate by id
                    if not any(m.get("id") == msg.get("id") for m in MESSAGES_STORE[room_id]):
                        MESSAGES_STORE[room_id].append(msg)

                self.send_response(200)
                self.send_header("Content-Type", "application/json")
                self.end_headers()
                self.wfile.write(b'{"status":"ok"}')
            except Exception as e:
                self.send_response(400)
                self.end_headers()
                self.wfile.write(str(e).encode("utf-8"))
            return

        # Register or update room state
        if parsed.path == "/api/rooms":
            length = int(self.headers.get("Content-Length", 0))
            body = self.rfile.read(length)
            try:
                data = json.loads(body.decode("utf-8"))
                room = data.get("room")
                if room and room.get("roomId"):
                    ROOMS_STORE[room["roomId"]] = room

                self.send_response(200)
                self.send_header("Content-Type", "application/json")
                self.end_headers()
                self.wfile.write(b'{"status":"ok"}')
            except Exception as e:
                self.send_response(400)
                self.end_headers()
                self.wfile.write(str(e).encode("utf-8"))
            return

        self.send_response(404)
        self.end_headers()

def run_server(port=3000):
    lan_ip = get_lan_ip()

    # Automatically write/update ip.json
    script_dir = os.path.dirname(os.path.abspath(__file__))
    ip_json_path = os.path.join(script_dir, "ip.json")
    try:
        with open(ip_json_path, "w") as f:
            json.dump({"ip": lan_ip, "port": port, "url": f"http://{lan_ip}:{port}"}, f, indent=2)
    except Exception as e:
        print(f"Notice: Could not write ip.json: {e}")

    server_address = ("", port)
    httpd = http.server.ThreadingHTTPServer(server_address, QuickChatHandler)

    print("=" * 64)
    print(" 🚀 QuickChat Server is Live with Cross-Device Sync!")
    print(f" 💻 On this computer:          http://localhost:{port}")
    print(f" 📱 Scan on phones / others:   http://{lan_ip}:{port}")
    print("=" * 64)
    print(" Press Ctrl+C to stop.")

    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nStopping QuickChat server.")
        httpd.server_close()

if __name__ == "__main__":
    port = 3000
    if len(sys.argv) > 1:
        try:
            port = int(sys.argv[1])
        except ValueError:
            pass
    run_server(port)

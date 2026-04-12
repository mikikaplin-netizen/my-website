#!/usr/bin/env python3
"""
שרת פיתוח מקומי — מיכאל קאפלין
הרץ: python3 serve.py
פתח בדפדפן: http://localhost:8080
"""
import http.server
import socketserver
import os
import webbrowser
import threading

PORT = 8080
DIR = os.path.dirname(os.path.abspath(__file__))

class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIR, **kwargs)

    def log_message(self, format, *args):
        # הצג רק בקשות (ללא noise של Python)
        print(f"  [{self.address_string()}] {format % args}")

def open_browser():
    import time
    time.sleep(0.8)
    webbrowser.open(f"http://localhost:{PORT}")

print(f"\n  ✓ שרת מקומי פעיל")
print(f"  → http://localhost:{PORT}")
print(f"  ← Ctrl+C לעצירה\n")

threading.Thread(target=open_browser, daemon=True).start()

with socketserver.TCPServer(("", PORT), Handler) as httpd:
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\n  שרת נעצר.")

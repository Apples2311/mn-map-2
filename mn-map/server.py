#!/usr/bin/env python3
"""
Simple HTTP server for serving the Minnesota School District Map
This is required because shapefile loading needs to be served over HTTP due to CORS restrictions.
"""

import http.server
import socketserver
import os
import sys
from pathlib import Path

# Get the current directory
current_dir = Path(__file__).parent.absolute()

# Change to the current directory
os.chdir(current_dir)

# Server configuration
PORT = 8000
Handler = http.server.SimpleHTTPRequestHandler

def main():
    """Start the HTTP server"""
    try:
        with socketserver.TCPServer(("", PORT), Handler) as httpd:
            print(f"🚀 Server started at http://localhost:{PORT}")
            print(f"📁 Serving files from: {current_dir}")
            print(f"🗺️  Open your browser and go to: http://localhost:{PORT}/mn-map.html")
            print("Press Ctrl+C to stop the server")
            print("-" * 50)
            httpd.serve_forever()
    except KeyboardInterrupt:
        print("\n🛑 Server stopped by user")
    except OSError as e:
        if e.errno == 48:  # Address already in use
            print(f"❌ Port {PORT} is already in use. Try a different port or stop the existing server.")
            print("You can change the PORT variable in this file to use a different port.")
        else:
            print(f"❌ Error starting server: {e}")
    except Exception as e:
        print(f"❌ Unexpected error: {e}")

if __name__ == "__main__":
    main() 
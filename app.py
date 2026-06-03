import os
import socket
from flask import Flask, jsonify

app = Flask(__name__)
hit_count = 0

APP_COLOR = os.environ.get("APP_COLOR", "steelblue")
APP_ENV   = os.environ.get("APP_ENV", "development")

@app.route("/")
def index():
    global hit_count
    hit_count += 1
    return f"""<!DOCTYPE html>
<html>
<head>
  <title>k8s demo</title>
  <style>
    body {{ font-family: sans-serif; display: flex; align-items: center;
           justify-content: center; min-height: 100vh; margin: 0;
           background: {APP_COLOR}; color: #fff; }}
    .card {{ background: rgba(0,0,0,0.25); border-radius: 12px;
             padding: 2rem 3rem; text-align: center; max-width: 480px; }}
    h1 {{ margin: 0 0 0.5rem; font-size: 2rem; }}
    p  {{ margin: 0.3rem 0; opacity: 0.85; }}
    .badge {{ display: inline-block; background: rgba(255,255,255,0.2);
              border-radius: 6px; padding: 2px 10px; font-size: 0.85rem;
              margin-top: 0.75rem; }}
  </style>
</head>
<body>
  <div class="card">
    <h1>Hello from Kubernetes!</h1>
    <p><strong>Pod:</strong> {socket.gethostname()}</p>
    <p><strong>Environment:</strong> {APP_ENV}</p>
    <p><strong>Hits (this pod):</strong> {hit_count}</p>
    <span class="badge">APP_COLOR = {APP_COLOR}</span>
  </div>
</body>
</html>"""

@app.route("/healthz")
def healthz():
    return jsonify(status="ok"), 200

@app.route("/readyz")
def readyz():
    return jsonify(status="ready"), 200

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=8080)

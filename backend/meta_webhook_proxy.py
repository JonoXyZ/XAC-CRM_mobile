"""
Standalone Meta Webhook Proxy - Runs on port 8088
Handles Meta's verification handshake and forwards leads to the main CRM backend.
This runs as a separate lightweight process to avoid any middleware interference.
"""
from http.server import HTTPServer, BaseHTTPRequestHandler
from urllib.parse import urlparse, parse_qs
import json
import urllib.request
import logging
import sys
import os

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(message)s')
logger = logging.getLogger('meta-webhook')

VERIFY_TOKEN = os.environ.get("META_VERIFY_TOKEN", "xac_crm_meta_verify")
CRM_BACKEND = os.environ.get("CRM_BACKEND_URL", "http://localhost:8001/api/webhooks/meta")
PORT = 8088

class MetaWebhookHandler(BaseHTTPRequestHandler):
    def do_GET(self):
        """Handle Meta's webhook verification challenge."""
        parsed = urlparse(self.path)
        params = parse_qs(parsed.query)
        
        mode = params.get('hub.mode', [None])[0]
        token = params.get('hub.verify_token', [None])[0]
        challenge = params.get('hub.challenge', [None])[0]
        
        logger.info(f"GET verification: mode={mode}, token_match={token == VERIFY_TOKEN}, challenge={challenge}")
        
        if mode == 'subscribe' and token == VERIFY_TOKEN and challenge:
            self.send_response(200)
            self.send_header('Content-Type', 'text/plain')
            self.end_headers()
            self.wfile.write(challenge.encode('utf-8'))
            logger.info(f"Verification SUCCESS - returned challenge: {challenge}")
        else:
            self.send_response(403)
            self.send_header('Content-Type', 'text/plain')
            self.end_headers()
            self.wfile.write(b'Verification failed')
            logger.warning(f"Verification FAILED")
    
    def do_POST(self):
        """Receive lead data from Meta and forward to CRM backend."""
        content_length = int(self.headers.get('Content-Length', 0))
        body = self.rfile.read(content_length)
        
        logger.info(f"POST received: {body[:500]}")
        
        try:
            # Forward to main CRM backend
            req = urllib.request.Request(
                CRM_BACKEND,
                data=body,
                headers={'Content-Type': 'application/json'},
                method='POST'
            )
            with urllib.request.urlopen(req, timeout=10) as response:
                result = response.read()
                logger.info(f"Forwarded to CRM: {result}")
        except Exception as e:
            logger.error(f"Forward failed: {e}")
        
        # Always respond 200 to Meta (they retry on errors)
        self.send_response(200)
        self.send_header('Content-Type', 'application/json')
        self.end_headers()
        self.wfile.write(json.dumps({"status": "received"}).encode('utf-8'))
    
    def log_message(self, format, *args):
        # Suppress default access log, we have our own logging
        pass

if __name__ == '__main__':
    server = HTTPServer(('0.0.0.0', PORT), MetaWebhookHandler)
    logger.info(f"Meta Webhook Proxy running on port {PORT}")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        server.server_close()
        logger.info("Server stopped")

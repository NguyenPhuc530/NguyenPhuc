// Simple LAN speed test server (Express + WebSocket)
// - Serves static UI from /public
// - WebSocket endpoint handles start_download and counts upload bytes
const express = require('express');
const http = require('http');
const path = require('path');
const WebSocket = require('ws');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.static(path.join(__dirname, 'public')));

// Simple echo endpoint for ping measurement via HTTP
app.get('/echo', (req, res) => {
  res.set('Cache-Control', 'no-store');
  res.send('pong');
});

const server = http.createServer(app);
const wss = new WebSocket.Server({ server, path: '/ws' });

wss.on('connection', (ws, req) => {
  ws._uploadedBytes = 0;
  ws._sending = false;

  // When receiving binary frames (client uploading), count bytes
  ws.on('message', (data, isBinary) => {
    if (isBinary) {
      ws._uploadedBytes += data.length;
      return;
    }

    // handle control JSON messages
    try {
      const msg = JSON.parse(data.toString());
      if (msg && msg.type === 'start_download') {
        // start sending binary chunks as fast as possible for durationMs
        if (ws._sending) return;
        ws._sending = true;
        const chunkSize = Math.min(256 * 1024, msg.chunkSize || 64 * 1024);
        const durationMs = (msg.duration || 5) * 1000;
        const endTime = Date.now() + durationMs;
        const chunk = Buffer.alloc(chunkSize, 0xAB);
        function sendChunk() {
          if (ws.readyState !== WebSocket.OPEN) return;
          if (Date.now() >= endTime) {
            ws._sending = false;
            // notify client test finished
            ws.send(JSON.stringify({ type: 'download_done' }));
            return;
          }
          // send binary chunk, use callback to continue and avoid buffer blow-up
          ws.send(chunk, { binary: true }, (err) => {
            if (err) {
              ws._sending = false;
              return;
            }
            // schedule next immediate send
            setImmediate(sendChunk);
          });
        }
        sendChunk();
      } else if (msg && msg.type === 'upload_done') {
        // client finished upload: reply with summary
        ws.send(JSON.stringify({ type: 'upload_summary', receivedBytes: ws._uploadedBytes || 0 }));
        // reset counter for subsequent tests
        ws._uploadedBytes = 0;
      }
    } catch (err) {
      // non-JSON / ignore
    }
  });

  ws.on('close', () => {
    // cleanup if necessary
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`LAN speed test server listening on http://0.0.0.0:${PORT}`);
});

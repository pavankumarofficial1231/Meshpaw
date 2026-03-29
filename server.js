import express from 'express';
import { ExpressPeerServer } from 'peer';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
const PORT = process.env.PORT || 9000;

// Serve the static files from the React app
app.use(express.static(path.join(__dirname, 'dist')));

const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`MeshPaw Server running at:`);
  console.log(`[Signaling] Mesh broker live at: http://0.0.0.0:${PORT}/peerjs`);
  console.log(`[Web] App interface: http://localhost:${PORT}`);
});

// Setup PeerJS Server
const peerServer = ExpressPeerServer(server, {
  path: '/',
  allow_discovery: true,
  proxied: true
});

peerServer.on('connection', (client) => {
  console.log(`[Mesh] Client Connected: ${client.getId()}`);
});

peerServer.on('disconnect', (client) => {
  console.log(`[Mesh] Client Disconnected: ${client.getId()}`);
});

app.use('/peerjs', peerServer);

// Handles any requests that don't match the ones above
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

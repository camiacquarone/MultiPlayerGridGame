import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { GameRoomManager } from './gameRoomManager.js';
import { GameEventHandler } from './gameEventHandler.js';
import { decideGptAction, decideGptTomAction, getGptConfigInfo } from './ai/gptAgent.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Lightweight .env loader (no external dependency)
// Loads key=value pairs from root .env if present and not already set
function loadEnvFromDotFile() {
  try {
    const envPath = path.join(__dirname, '..', '.env');
    if (!fs.existsSync(envPath)) return;
    const content = fs.readFileSync(envPath, 'utf8');
    content.split(/\r?\n/).forEach(line => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) return;
      const idx = trimmed.indexOf('=');
      if (idx === -1) return;
      const key = trimmed.slice(0, idx).trim();
      let value = trimmed.slice(idx + 1).trim();
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      if (!(key in process.env)) {
        process.env[key] = value;
      }
    });
    console.log('[env] Loaded .env file');
  } catch (e) {
    console.warn('[env] Failed to load .env:', e?.message || e);
  }
}

loadEnvFromDotFile();

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

app.use(cors());
app.use(express.json());

// Initialize game managers
const roomManager = new GameRoomManager();
const eventHandler = new GameEventHandler(roomManager);

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log(`Player connected: ${socket.id}`);

  // Handle game events
  eventHandler.handleConnection(socket, io);

  socket.on('disconnect', () => {
    console.log(`Player disconnected: ${socket.id}`);
    eventHandler.handleDisconnection(socket, io);
  });
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Get room stats
app.get('/api/rooms', (req, res) => {
  res.json(roomManager.getRoomStats());
});

// Serve map configuration files
app.get('/config/MapsFor1P1G.js', (req, res) => {
  const configPath = path.join(__dirname, '..', 'config', 'MapsFor1P1G.js');
  res.sendFile(configPath);
});

app.get('/config/MapsFor1P2G.js', (req, res) => {
  const configPath = path.join(__dirname, '..', 'config', 'MapsFor1P2G.js');
  res.sendFile(configPath);
});

app.get('/config/MapsFor2P2G.js', (req, res) => {
  const configPath = path.join(__dirname, '..', 'config', 'MapsFor2P2G.js');
  res.sendFile(configPath);
});

app.get('/config/MapsFor2P3G.js', (req, res) => {
  const configPath = path.join(__dirname, '..', 'config', 'MapsFor2P3G.js');
  res.sendFile(configPath);
});

// Generic map config endpoint with better error handling
app.get('/config/:mapFile', (req, res) => {
  const { mapFile } = req.params;

  // Validate map file name for security
  if (!/^MapsFor[12]P[123]G\.js$/.test(mapFile)) {
    return res.status(400).json({ error: 'Invalid map file name' });
  }

  const configPath = path.join(__dirname, '..', 'config', mapFile);

  // Check if file exists
  if (!fs.existsSync(configPath)) {
    return res.status(404).json({ error: 'Map file not found' });
  }

  res.sendFile(configPath);
});

// API endpoint to get parsed map data as JSON
app.get('/api/maps/:experimentType', (req, res) => {
  const { experimentType } = req.params;

  // Map experiment types to config files
  const mapFiles = {
    '1P1G': 'MapsFor1P1G.js',
    '1P2G': 'MapsFor1P2G.js',
    '2P2G': 'MapsFor2P2G.js',
    '2P3G': 'MapsFor2P3G.js'
  };

  const mapFile = mapFiles[experimentType];
  if (!mapFile) {
    return res.status(400).json({ error: 'Invalid experiment type' });
  }

  const configPath = path.join(__dirname, '..', 'config', mapFile);

  try {
    const fileContent = fs.readFileSync(configPath, 'utf8');

    // Extract the map data from the JavaScript file
    const varName = `MapsFor${experimentType}`;
    const regex = new RegExp(`var ${varName} = ({[\\s\\S]*?});`);
    const match = fileContent.match(regex);

    if (match) {
      const mapData = JSON.parse(match[1]);
      res.json({
        experimentType,
        mapCount: Object.keys(mapData).length,
        maps: mapData
      });
    } else {
      res.status(500).json({ error: 'Could not parse map data' });
    }
  } catch (error) {
    console.error('Error reading map file:', error);
    res.status(500).json({ error: 'Failed to read map file' });
  }
});

// GPT agent endpoints
app.get('/api/ai/gpt/config', (req, res) => {
  try {
    res.json(getGptConfigInfo());
  } catch (e) {
    res.status(500).json({ error: 'Failed to read GPT config' });
  }
});

app.post('/api/ai/gpt/action', async (req, res) => {
  try {
    const { guidance, matrix, currentPlayer, goals, relativeInfo, model, temperature, memory } = req.body || {};


    if (!Array.isArray(matrix) || matrix.length === 0) {
      return res.status(400).json({ error: 'Invalid matrix' });
    }
    if (!currentPlayer || !Array.isArray(currentPlayer.pos)) {
      return res.status(400).json({ error: 'Invalid currentPlayer' });
    }
    // Route to ToM variant if requested via model label
    let result;
    if (model && /^gpt-?tom$/i.test(String(model))) {
      result = await decideGptTomAction({ guidance, matrix, currentPlayer, goals, relativeInfo, model, temperature, memory });
    } else {
      result = await decideGptAction({ guidance, matrix, currentPlayer, goals, relativeInfo, model, temperature, memory });
    }


    // result: { action, inferredGoal?, usage, latencyMs, rate }
    res.json(result);
  } catch (err) {
    console.error('GPT action error:', err);
    res.status(500).json({ error: 'Failed to get GPT action', detail: String(err?.message || err) });
  }
});

// OpenAI Text-to-Speech endpoint
app.post('/api/tts/speak', async (req, res) => {
  try {
    const { text, voice = 'nova' } = req.body || {};

    if (!text || typeof text !== 'string') {
      return res.status(400).json({ error: 'Text is required' });
    }

    const openaiApiKey = process.env.OPENAI_API_KEY;
    if (!openaiApiKey) {
      return res.status(503).json({ error: 'OpenAI API key not configured' });
    }

    // Valid OpenAI TTS voices
    const validVoices = ['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer'];
    const selectedVoice = validVoices.includes(voice) ? voice : 'nova';

    // Call OpenAI TTS API
    const response = await fetch('https://api.openai.com/v1/audio/speech', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'tts-1',
        input: text,
        voice: selectedVoice
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI TTS API error:', response.status, errorText);
      return res.status(response.status).json({ 
        error: 'OpenAI TTS API error', 
        detail: errorText 
      });
    }

    // Get audio data as buffer
    const audioBuffer = await response.arrayBuffer();
    
    // Return audio as base64 or binary
    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Content-Length', audioBuffer.byteLength);
    res.send(Buffer.from(audioBuffer));
  } catch (err) {
    console.error('TTS error:', err);
    res.status(500).json({ error: 'Failed to generate speech', detail: String(err?.message || err) });
  }
});

// Serve client static files (single-service deployment)
// In production, serve built files from dist; in dev, serve from client
const clientDir = fs.existsSync(path.join(__dirname, '..', 'dist'))
  ? path.join(__dirname, '..', 'dist')
  : path.join(__dirname, '..', 'client');
app.use(express.static(clientDir));

// Fallback to index.html for SPA routes (exclude API/config/socket.io)
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api') || req.path.startsWith('/config') || req.path.startsWith('/socket.io')) {
    return next();
  }
  const indexPath = path.join(clientDir, 'index.html');
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.status(404).send('Client not found');
  }
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

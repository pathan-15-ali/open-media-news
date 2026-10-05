import express from 'express';
import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import rateLimit from 'express-rate-limit';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { authenticateToken } from './middleware/auth.js';
import { authRouter } from './routes/auth.js';
import { articlesRouter } from './routes/articles.js';
import { adminRouter } from './routes/admin.js';
import { userRouter } from './routes/user.js';
import { authorsRouter } from './routes/authors.js';
import { eventsRouter } from './routes/events.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const clientPath = path.resolve(__dirname, '../../');

const app = express();
const PORT = process.env.PORT || 4000;

// HTTP server for Express and Socket.IO
export const httpServer = http.createServer(app);

// Initialize Socket.io with permissive CORS for development
export const io = new SocketIOServer(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE']
  }
});

// Real-time helper to broadcast events to all connected clients
export const emitRealtime = (event: string, payload: any) => {
  try {
    io.emit(event, payload);
  } catch (err) {
    console.warn(`[Socket.io] Failed to emit event ${event}:`, err);
  }
};

io.on('connection', (socket) => {
  console.log(`🔌 Client connected to real-time engine: ${socket.id}`);
  socket.on('disconnect', () => {
    // client disconnected
  });
});

// CORS configuration - allow all origins for LAN and cross-device access
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Rate limiting for public and authentication endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' }
});

const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5000,
  standardHeaders: true,
  legacyHeaders: false
});

app.use('/api/', apiLimiter);
app.use('/api/auth/', authLimiter);

app.use(express.json());
app.use(authenticateToken);

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'OPEN MEDIA Backend API',
    realtime: 'Socket.io Active',
    timestamp: new Date().toISOString()
  });
});

// Mount modular routers
app.use('/api/auth', authRouter);
app.use('/api/articles', articlesRouter);
app.use('/api/authors', authorsRouter);
app.use('/api/admin', adminRouter);
app.use('/api/user', userRouter);
app.use('/api/events', eventsRouter);

// Serve frontend static assets securely if present
if (fs.existsSync(path.join(clientPath, 'index.html'))) {
  app.use('/assets', express.static(path.join(clientPath, 'assets')));
  app.use('/css', express.static(path.join(clientPath, 'css')));
  app.use('/js', express.static(path.join(clientPath, 'js')));
  app.get(['/', '/index.html'], (req, res) => {
    res.sendFile(path.join(clientPath, 'index.html'));
  });
}

// Global 404 / SPA fallback handler for unmatched routes
app.use((req, res) => {
  if (req.path.startsWith('/api')) {
    return res.status(404).json({ error: `Cannot ${req.method} ${req.path}` });
  }
  if (fs.existsSync(path.join(clientPath, 'index.html'))) {
    return res.sendFile(path.join(clientPath, 'index.html'));
  }
  return res.status(404).json({ error: `Cannot ${req.method} ${req.path}` });
});

// Global Error Handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('[Server Error]', err);
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'Malformed JSON payload in request body' });
  }
  return res.status(500).json({ error: err.message || 'Internal server error' });
});

// Start server explicitly bound to 0.0.0.0 for LAN access
if (process.env.NODE_ENV !== 'test') {
  httpServer.listen(Number(PORT), '0.0.0.0', () => {
    console.log(`🚀 OPEN MEDIA API server running on http://0.0.0.0:${PORT} (LAN accessible)`);
    console.log(`⚡ Socket.io real-time engine listening on port ${PORT}`);
  });
}

export default app;

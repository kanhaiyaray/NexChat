import express from 'express';
import http from 'http';
import cors from 'cors';
import { Server } from 'socket.io';
import { initSocket } from './socket/index.js';
import healthRoutes from './routes/health.routes.js';
import roomRoutes from './routes/room.routes.js';
import searchRoutes from './routes/search.routes.js';
import profileRoutes from './routes/profile.routes.js';
import adminRoutes from './routes/admin.routes.js';
import { allowedOrigins } from './config/cors.js';

const app = express();
const server = http.createServer(app);

app.use(cors({
  origin: allowedOrigins,
  credentials: true,
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ['GET', 'POST'],
    credentials: true,
  },
  maxHttpBufferSize: 10 * 1024 * 1024,
});

app.use('/', healthRoutes);
app.use('/api', roomRoutes);
app.use('/api', searchRoutes);
app.use('/api/user', profileRoutes);
app.use('/api/admin', adminRoutes);

initSocket(io);

app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

app.use((err, req, res, next) => {
  console.error('Error:', err.message);
  res.status(500).json({ error: err.message || 'Internal server error' });
});

export default server;

import app from './src/app.js';
import { connectDB } from './src/config/database.js';
import { initializeSystemSettings } from './src/services/admin.service.js';
import dotenv from 'dotenv';

dotenv.config();

const PORT = process.env.PORT || 1000;

(async () => {
  await connectDB();
  await initializeSystemSettings();

  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 NexChat server running on port ${PORT} on all interfaces`);
  });

  process.on('SIGTERM', () => {
    console.log('SIGTERM received, closing server...');
    server.close(() => {
      console.log('Server closed.');
      process.exit(0);
    });
  });
})();

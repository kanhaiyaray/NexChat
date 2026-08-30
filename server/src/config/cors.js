export const allowedOrigins = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:5174',
  'http://localhost:5175',
  'http://192.168.29.157:5173',
  'http://192.168.1.122:5173',
  process.env.CLIENT_ORIGIN,
].filter(Boolean);

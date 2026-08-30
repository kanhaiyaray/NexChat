export const allowedOrigins = [
  // Development
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:5174',
  'http://localhost:5175',
  'http://192.168.29.157:5173',
  'http://192.168.1.122:5173',
  
  // Production - Vercel
  'https://nexchat-red.vercel.app',
  'https://nexchat.vercel.app',
  'https://nexchat-client.onrender.com',
  
  // Production - Custom domain (if any)
  process.env.CLIENT_ORIGIN,
  
  // Render preview URLs (optional)
  process.env.RENDER_EXTERNAL_URL,
].filter(Boolean);

console.log('✅ CORS allowed origins:', allowedOrigins);

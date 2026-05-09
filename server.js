
import express from 'express';
import path from 'path';
import cors from 'cors';
import { fileURLToPath } from 'url';
import { createProxyMiddleware } from 'http-proxy-middleware';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
const PORT = process.env.PORT || 3000;

const SUPABASE_TARGET = process.env.REMOTE_SUPABASE_URL || 'http://72.60.195.163:9000';

console.log(`Starting server with Supabase target: ${SUPABASE_TARGET}`);

// 1. Proxy untuk Supabase Auth
app.use('/auth/v1', createProxyMiddleware({
  target: SUPABASE_TARGET,
  changeOrigin: true,
}));

// 2. Proxy untuk Supabase REST (Database)
app.use('/rest/v1', createProxyMiddleware({
  target: SUPABASE_TARGET,
  changeOrigin: true,
}));

// 3. Proxy untuk Supabase Realtime (Websocket)
app.use('/realtime/v1', createProxyMiddleware({
  target: SUPABASE_TARGET,
  changeOrigin: true,
  ws: true,
}));

// 4. Serve static files from 'dist'
app.use(express.static(path.join(__dirname, 'dist')));

// 5. Fallback to index.html for SPA routing
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on http://0.0.0.0:${PORT}`);
});

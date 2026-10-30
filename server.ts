import express from 'express';
import http from 'http';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import verifyHandler from './api/verify.js';
import chatHandler from './api/chat.js';
import wasteScanHandler from './api/waste-scan.js';
import reflectionHandler from './api/reflection.js';
import prayerHandler from './api/prayer.js';
import reportAssistHandler from './api/report-assist.js';
import leaderRegisterHandler from './api/leader-register.js';
import testAiHandler from './api/test-ai.js';
import socialSyncHandler from './api/social-sync.js';

dotenv.config({ path: '.env.local' });
dotenv.config();

// HMR is disabled in AI Studio preview environment per guidelines
process.env.DISABLE_HMR = 'true';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
  const isProd = process.env.NODE_ENV === 'production';

  // Support base64 image uploads up to 10MB
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // Health check endpoint
  app.get('/api/health', (_req, res) => {
    res.json({
      status: 'ok',
      app: 'Marsiadapari Hijau',
      model: process.env.GEMINI_MODEL || 'gemini-3.8-flash',
      hasApiKey: Boolean(process.env.GEMINI_API_KEY),
    });
  });

  // Mount API Handlers
  app.post('/api/verify', verifyHandler);
  app.post('/api/chat', chatHandler);
  app.post('/api/waste-scan', wasteScanHandler);
  app.post('/api/reflection', reflectionHandler);
  app.post('/api/prayer', prayerHandler);
  app.post('/api/report-assist', reportAssistHandler);
  app.post('/api/leader-register', leaderRegisterHandler);
  app.all('/api/test-ai', testAiHandler);
  app.all('/api/social-sync', socialSyncHandler);

  const httpServer = http.createServer(app);

  if (!isProd) {
    // Mount Vite dev server in middleware mode with HMR disabled
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: false,
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // Serve static production build
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`🌿 Marsiadapari Hijau server running at http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});

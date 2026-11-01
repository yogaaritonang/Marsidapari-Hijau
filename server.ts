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
import socialSyncHandler, { getSocialBrand } from './api/social-sync.js';

dotenv.config({ path: '.env.local' });
dotenv.config();

// HMR is disabled in AI Studio preview environment per guidelines
process.env.DISABLE_HMR = 'true';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;
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

  // Dynamic App Icon endpoint (serves admin-uploaded logo as real image for mobile Home Screen & PWA)
  app.get(
    [
      '/api/app-icon',
      '/apple-touch-icon.png',
      '/apple-touch-icon-precomposed.png',
      '/pwa-192x192.png',
      '/pwa-512x512.png',
      '/pwa-maskable-512x512.png',
      '/icon.svg',
      '/favicon.ico',
    ],
    (_req, res, next) => {
      const brand = getSocialBrand();
      const logoUrl = brand?.logoUrl;

      if (logoUrl && logoUrl.startsWith('data:')) {
        const commaIdx = logoUrl.indexOf(',');
        if (commaIdx !== -1) {
          const mimeMatch = logoUrl.substring(5, commaIdx).match(/^[a-zA-Z0-9.+_-]+\/[a-zA-Z0-9.+_-]+/);
          const mimeType = mimeMatch ? mimeMatch[0] : 'image/png';
          const buffer = Buffer.from(logoUrl.substring(commaIdx + 1), 'base64');
          res.setHeader('Content-Type', mimeType);
          res.setHeader('Cache-Control', 'public, max-age=60');
          return res.send(buffer);
        }
      } else if (logoUrl && /^https?:\/\//i.test(logoUrl)) {
        return res.redirect(302, logoUrl);
      }

      // If no custom logo is uploaded, pass to next static handler or serve default
      if (_req.path === '/api/app-icon' || _req.path.startsWith('/apple-touch-icon')) {
        const staticIcon = path.resolve(__dirname, 'public/pwa-192x192.png');
        return res.sendFile(staticIcon);
      }
      return next();
    }
  );

  // Dynamic Web App Manifest (updates PWA name, short_name, and icon on mobile Home Screen & splash screen)
  app.get(['/manifest.webmanifest', '/manifest.json'], (_req, res) => {
    const brand = getSocialBrand();
    const appName = brand?.name || 'Marsiadapari Hijau';
    const appShortName = appName.length > 12 ? appName.slice(0, 12) : appName;
    const appTagline = brand?.tagline || 'Ekoteologi Kristen Danau Toba';
    const primaryColor = brand?.primaryColor || '#2E6B34';

    const manifestObj = {
      id: '/',
      name: `${appName} - ${appTagline}`,
      short_name: appShortName,
      description: brand?.description || 'Aplikasi ekoteologi Kristen jemaat dan mahasiswa IAKN Tarutung di kawasan Danau Toba. Merawat ciptaan Tuhan, bergotong royong setiap hari.',
      theme_color: primaryColor,
      background_color: '#FAF6EC',
      display: 'standalone',
      orientation: 'portrait-primary',
      start_url: '/',
      scope: '/',
      lang: 'id',
      dir: 'ltr',
      categories: ['lifestyle', 'education', 'social'],
      prefer_related_applications: false,
      icons: [
        {
          src: '/api/app-icon',
          sizes: '192x192',
          type: 'image/png',
          purpose: 'any',
        },
        {
          src: '/api/app-icon',
          sizes: '512x512',
          type: 'image/png',
          purpose: 'any',
        },
        {
          src: '/api/app-icon',
          sizes: '512x512',
          type: 'image/png',
          purpose: 'maskable',
        },
        {
          src: '/pwa-192x192.png',
          sizes: '192x192',
          type: 'image/png',
          purpose: 'any',
        },
        {
          src: '/pwa-512x512.png',
          sizes: '512x512',
          type: 'image/png',
          purpose: 'any',
        },
      ],
    };

    res.setHeader('Content-Type', 'application/manifest+json; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=60');
    return res.json(manifestObj);
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

  // Email confirmation & callback handler to eliminate 404 errors on confirmation links
  const authConfirmPaths = [
    '/auth/confirm',
    '/auth/callback',
    '/auth/v1/verify',
    '/verify',
    '/pemimpin/auth/confirm',
    '/admin/auth/confirm',
  ];

  app.get(authConfirmPaths, async (req, res) => {
    const tokenHash = (req.query.token_hash || req.query.token) as string | undefined;
    const type = (req.query.type as string) || 'signup';
    const code = req.query.code as string | undefined;
    const errorCode = (req.query.error_code || req.query.errorCode) as string | undefined;
    const errorDesc = (req.query.error_description || req.query.error) as string | undefined;

    const isLeader = req.path.includes('pemimpin') || req.query.portal === 'leader' || req.query.next === '/pemimpin';
    const isAdmin = req.path.includes('admin') || req.query.portal === 'admin' || req.query.next === '/admin';
    const baseRedirectPath = isLeader ? '/pemimpin' : isAdmin ? '/admin' : '/';

    // If Supabase returned an error (e.g. 404 expired / link already used by email scanner)
    if (errorCode === '404' || (errorDesc && /invalid|expired|404|already/i.test(errorDesc))) {
      return res.redirect(302, `${baseRedirectPath}?email_confirmed=already_verified`);
    }

    const supabaseUrl = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '').replace(/\/+$/, '');
    const anonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

    // Verify token hash directly with Supabase
    if (tokenHash && supabaseUrl && anonKey) {
      try {
        const verifyUrl = `${supabaseUrl}/auth/v1/verify?token=${encodeURIComponent(tokenHash)}&type=${encodeURIComponent(type)}`;
        const verifyRes = await fetch(verifyUrl, {
          method: 'GET',
          headers: {
            apikey: anonKey,
            Authorization: `Bearer ${anonKey}`,
          },
          redirect: 'manual',
        });

        const location = verifyRes.headers.get('location');
        if (location) {
          try {
            const locUrl = new URL(location, 'http://localhost');
            const locErrCode = locUrl.searchParams.get('error_code') || new URLSearchParams(locUrl.hash.slice(1)).get('error_code');
            if (locErrCode === '404') {
              return res.redirect(302, `${baseRedirectPath}?email_confirmed=already_verified`);
            }
            if (locUrl.hash && locUrl.hash.includes('access_token')) {
              return res.redirect(302, `${baseRedirectPath}?email_confirmed=true${locUrl.hash}`);
            }
          } catch {
            return res.redirect(302, location);
          }
        }

        if (verifyRes.ok) {
          const payload = await verifyRes.json().catch(() => null) as {
            access_token?: string;
            refresh_token?: string;
            expires_in?: number;
          } | null;

          if (payload?.access_token && payload?.refresh_token) {
            const hashParams = new URLSearchParams({
              access_token: payload.access_token,
              refresh_token: payload.refresh_token,
              expires_in: String(payload.expires_in || 3600),
              type,
            });
            return res.redirect(302, `${baseRedirectPath}?email_confirmed=true#${hashParams.toString()}`);
          }
          return res.redirect(302, `${baseRedirectPath}?email_confirmed=true`);
        }

        // Supabase token already used or expired
        return res.redirect(302, `${baseRedirectPath}?email_confirmed=already_verified`);
      } catch (err) {
        console.error('Server auth verification failed:', err);
        return res.redirect(302, `${baseRedirectPath}?email_confirmed=already_verified`);
      }
    }

    // Exchange PKCE code if provided
    if (code && supabaseUrl && anonKey) {
      try {
        const tokenRes = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=pkce`, {
          method: 'POST',
          headers: {
            apikey: anonKey,
            Authorization: `Bearer ${anonKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ auth_code: code }),
        });
        if (tokenRes.ok) {
          const payload = await tokenRes.json().catch(() => null) as {
            access_token?: string;
            refresh_token?: string;
            expires_in?: number;
          } | null;
          if (payload?.access_token && payload?.refresh_token) {
            const hashParams = new URLSearchParams({
              access_token: payload.access_token,
              refresh_token: payload.refresh_token,
              expires_in: String(payload.expires_in || 3600),
            });
            return res.redirect(302, `${baseRedirectPath}?email_confirmed=true#${hashParams.toString()}`);
          }
          return res.redirect(302, `${baseRedirectPath}?email_confirmed=true`);
        }
        return res.redirect(302, `${baseRedirectPath}?email_confirmed=already_verified`);
      } catch (err) {
        console.error('PKCE exchange error:', err);
        return res.redirect(302, `${baseRedirectPath}?email_confirmed=already_verified`);
      }
    }

    return res.redirect(302, `${baseRedirectPath}?email_confirmed=true`);
  });

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

    // Fallback to guarantee index.html is always returned for GET requests (prevents 404 from missing Accept: text/html)
    const fs = await import('fs/promises');
    app.use(async (req, res, next) => {
      if (req.method !== 'GET') return next();
      if (req.path.startsWith('/api/')) return next();
      try {
        const template = await fs.readFile(path.resolve(__dirname, 'index.html'), 'utf-8');
        const html = await vite.transformIndexHtml(req.originalUrl, template);
        res.status(200).set({ 'Content-Type': 'text/html' }).end(html);
      } catch (e) {
        next(e);
      }
    });
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

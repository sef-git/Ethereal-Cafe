import express, { NextFunction, Request, Response } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { spawn } from 'child_process';
import { timingSafeEqual } from 'crypto';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------
const PYTHON_BIN = process.env.PYTHON_BIN || 'python3';
const PY_SCRIPT = path.join(__dirname, 'python_analytics.py');
const PY_TIMEOUT_MS = Number(process.env.PY_TIMEOUT_MS) || 30_000;
const PY_MAX_OUTPUT_BYTES = 5 * 1024 * 1024;
const CACHE_TTL_MS = Number(process.env.ANALYTICS_CACHE_TTL_MS ?? 60_000);
const ACCESS_TOKEN = process.env.DASHBOARD_ACCESS_TOKEN || ''; // optional
const RATE_LIMIT_MAX = Number(process.env.RATE_LIMIT_MAX) || 60; // requests / window / IP
const RATE_LIMIT_WINDOW_MS = Number(process.env.RATE_LIMIT_WINDOW_MS) || 60_000;

// Only these actions can ever reach the Python process.
const ALLOWED_ACTIONS = new Set(['all', 'hourly', 'units', 'forecast', 'rfm']);

app.disable('x-powered-by');
app.set('trust proxy', process.env.TRUST_PROXY === '1');
app.use(express.json({ limit: '10kb' }));

// Basic security headers (no extra dependency needed).
app.use((_req: Request, res: Response, next: NextFunction) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'no-referrer');
  next();
});

// ---------------------------------------------------------------------------
// Rate limiting (in-memory, fixed window)
// ---------------------------------------------------------------------------
const hits = new Map<string, { count: number; resetAt: number }>();

setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of hits) if (entry.resetAt <= now) hits.delete(key);
}, RATE_LIMIT_WINDOW_MS).unref();

function rateLimit(req: Request, res: Response, next: NextFunction) {
  const key = req.ip || 'unknown';
  const now = Date.now();
  const entry = hits.get(key);

  if (!entry || entry.resetAt <= now) {
    hits.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return next();
  }
  entry.count += 1;
  if (entry.count > RATE_LIMIT_MAX) {
    res.setHeader('Retry-After', Math.ceil((entry.resetAt - now) / 1000).toString());
    return res.status(429).json({ error: 'Too many requests' });
  }
  next();
}

// ---------------------------------------------------------------------------
// Optional access-token auth (enabled only when DASHBOARD_ACCESS_TOKEN is set)
// Client sends:  Authorization: Bearer <token>   or   x-dashboard-token: <token>
// ---------------------------------------------------------------------------
function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

function requireToken(req: Request, res: Response, next: NextFunction) {
  if (!ACCESS_TOKEN) return next();
  const bearer = (req.header('authorization') || '').replace(/^Bearer\s+/i, '');
  const provided = bearer || req.header('x-dashboard-token') || '';
  if (provided && safeEqual(provided, ACCESS_TOKEN)) return next();
  return res.status(401).json({ error: 'Unauthorized' });
}

// ---------------------------------------------------------------------------
// Python runner with cache + in-flight request de-duplication
// ---------------------------------------------------------------------------
type PyResult = Record<string, unknown>;

class PyError extends Error {
  constructor(message: string, public status = 500) {
    super(message);
  }
}

function runPython(action: string): Promise<PyResult> {
  return new Promise((resolve, reject) => {
    // Fixed argv: the script path and a whitelisted action. No user code is executed.
    const child = spawn(PYTHON_BIN, [PY_SCRIPT, action], {
      env: process.env,
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stderr = '';
    let outputBytes = 0;
    let settled = false;

    const finish = (fn: () => void) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      fn();
    };

    const timer = setTimeout(() => {
      try { child.kill('SIGKILL'); } catch { /* already gone */ }
      finish(() => reject(new PyError('Analytics timed out', 504)));
    }, PY_TIMEOUT_MS);

    child.stdout.on('data', (chunk: Buffer) => {
      outputBytes += chunk.length;
      if (outputBytes > PY_MAX_OUTPUT_BYTES) {
        try { child.kill('SIGKILL'); } catch { /* already gone */ }
        finish(() => reject(new PyError('Analytics output too large')));
        return;
      }
      stdout += chunk.toString();
    });
    child.stderr.on('data', (chunk: Buffer) => {
      if (stderr.length < 8_000) stderr += chunk.toString();
    });

    child.on('error', (err) => {
      console.error('Failed to start Python:', err.message);
      finish(() => reject(new PyError('Analytics engine unavailable')));
    });

    child.on('close', (code) => {
      finish(() => {
        if (code !== 0) {
          // Details stay in the server log, never in the HTTP response.
          console.error(`Python analytics exited with code ${code}:`, stderr.trim());
          return reject(new PyError('Analytics execution failed'));
        }
        try {
          resolve(JSON.parse(stdout) as PyResult);
        } catch {
          console.error('Python returned invalid JSON:', stdout.slice(0, 500));
          reject(new PyError('Analytics returned invalid data'));
        }
      });
    });
  });
}

const cache = new Map<string, { expiresAt: number; data: PyResult }>();
const inflight = new Map<string, Promise<PyResult>>();

async function getAnalytics(action: string): Promise<PyResult> {
  const now = Date.now();
  const cached = cache.get(action);
  if (cached && cached.expiresAt > now) return cached.data;

  // If an identical request is already running, share its result.
  const running = inflight.get(action);
  if (running) return running;

  const promise = runPython(action)
    .then((data) => {
      // Do not cache failures.
      if (!('error' in data) && CACHE_TTL_MS > 0) {
        cache.set(action, { expiresAt: Date.now() + CACHE_TTL_MS, data });
      }
      return data;
    })
    .finally(() => inflight.delete(action));

  inflight.set(action, promise);
  return promise;
}

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    system: 'Ethereal Cafe Analytics Server',
    time: new Date().toISOString(),
  });
});

app.get('/api/python-analytics', rateLimit, requireToken, async (req: Request, res: Response) => {
  const action = typeof req.query.action === 'string' ? req.query.action : 'all';
  if (!ALLOWED_ACTIONS.has(action)) {
    return res.status(400).json({
      error: 'Invalid action',
      allowed: [...ALLOWED_ACTIONS],
    });
  }

  try {
    const data = await getAnalytics(action);
    res.json(data);
  } catch (err) {
    const e = err instanceof PyError ? err : new PyError('Analytics execution failed');
    res.status(e.status).json({ error: e.message });
  }
});

// NOTE: the former POST /api/python-custom endpoint was removed on purpose.
// It executed arbitrary client-supplied Python (remote code execution).
// For new statistics, add a new function + whitelisted action in python_analytics.py.

// ---------------------------------------------------------------------------
// Vite (dev) / static files (prod)
// ---------------------------------------------------------------------------
async function startServer() {
  const isDev = process.env.NODE_ENV !== 'production';

  if (isDev) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true, hmr: false },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Ethereal Cafe Server listening on http://0.0.0.0:${PORT}`);
    if (!ACCESS_TOKEN) {
      console.warn('DASHBOARD_ACCESS_TOKEN is not set: analytics endpoints are unauthenticated.');
    }
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
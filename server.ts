import express from 'express';
import type { Request, Response } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { spawn } from 'child_process';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

app.use(express.json());

// API: Health check
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    system: 'Ethereal Cafe Analytics Server',
    python: 'Python 3.10',
    time: new Date().toISOString(),
  });
});

interface AnalyticsCacheEntry {
  data: unknown;
  timestamp: number;
}
const analyticsCache = new Map<string, AnalyticsCacheEntry>();
const CACHE_TTL_MS = 60 * 1000;

// API: Run Python 3 Analytics Engine
app.get('/api/python-analytics', (req: Request, res: Response) => {
  const action = (req.query.action as string) || 'all';

  // Return fresh cache if available to respond in < 1ms
  const cached = analyticsCache.get(action);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return res.json(cached.data);
  }

  const pyProcess = spawn('python3', [path.join(__dirname, 'python_analytics.py'), action]);

  let stdoutData = '';
  let stderrData = '';
  let responded = false;

  const timer = setTimeout(() => {
    if (!responded) {
      responded = true;
      try {
        pyProcess.kill();
      } catch {}
      if (cached) {
        return res.json(cached.data);
      }
      return res.status(200).json({ error: 'Python execution timed out', fallback: true });
    }
  }, 9000);

  pyProcess.stdout.on('data', (data) => {
    stdoutData += data.toString();
  });

  pyProcess.stderr.on('data', (data) => {
    stderrData += data.toString();
  });

  pyProcess.on('close', (code) => {
    clearTimeout(timer);
    if (responded) return;
    responded = true;

    if (code !== 0) {
      console.warn('Python analytics process exited with non-zero code:', code, stderrData);
      if (cached) {
        return res.json(cached.data);
      }
      return res.status(200).json({
        error: 'Python analytics unavailable',
        details: stderrData,
        fallback: true,
      });
    }

    try {
      const parsed = JSON.parse(stdoutData);
      analyticsCache.set(action, { data: parsed, timestamp: Date.now() });
      return res.json(parsed);
    } catch {
      if (cached) return res.json(cached.data);
      return res.status(200).json({
        error: 'Invalid JSON returned from Python engine',
        fallback: true,
      });
    }
  });
});

// API: Run Custom Python Snippet for Custom Statistical Calculations
app.post('/api/python-custom', (req: Request, res: Response) => {
  const { code } = req.body;
  if (!code || typeof code !== 'string') {
    return res.status(400).json({ error: 'Code string is required' });
  }

  // Execute custom python script with safety timeout
  const py = spawn('python3', ['-c', code]);
  let output = '';
  let err = '';
  let responded = false;

  const timer = setTimeout(() => {
    if (!responded) {
      responded = true;
      try {
        py.kill();
      } catch {}
      return res.json({
        exitCode: 1,
        output: output.trim(),
        error: 'Script execution timeout (7s limit reached)',
      });
    }
  }, 7000);

  py.stdout.on('data', (d) => {
    output += d.toString();
  });
  py.stderr.on('data', (d) => {
    err += d.toString();
  });

  py.on('error', (spawnErr) => {
    clearTimeout(timer);
    if (responded) return;
    responded = true;
    res.json({
      exitCode: 1,
      output: '',
      error: spawnErr.message,
    });
  });

  py.on('close', (exitCode) => {
    clearTimeout(timer);
    if (responded) return;
    responded = true;
    res.json({
      exitCode: exitCode ?? 0,
      output: output.trim(),
      error: err.trim(),
    });
  });
});

// Setup Vite middleware in dev or static serving in production
async function startServer() {
  const isDev = process.env.NODE_ENV !== 'production';

  if (isDev) {
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
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Ethereal Cafe Server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
});

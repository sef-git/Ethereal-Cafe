import express, { Request, Response } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { spawn } from 'child_process';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json());

// API: Health check
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    system: 'Ethereal Cafe Analytics Server',
    python: 'Python 3.10',
    time: new Date().toISOString()
  });
});

// API: Run Python 3 Analytics Engine
app.get('/api/python-analytics', (req: Request, res: Response) => {
  const action = (req.query.action as string) || 'all';
  const pyProcess = spawn('python3', [path.join(__dirname, 'python_analytics.py'), action]);

  let stdoutData = '';
  let stderrData = '';

  pyProcess.stdout.on('data', (data) => {
    stdoutData += data.toString();
  });

  pyProcess.stderr.on('data', (data) => {
    stderrData += data.toString();
  });

  pyProcess.on('close', (code) => {
    if (code !== 0) {
      console.error('Python analytics process failed:', stderrData);
      return res.status(500).json({
        error: 'Python analytics execution failed',
        details: stderrData
      });
    }

    try {
      const parsed = JSON.parse(stdoutData);
      return res.json(parsed);
    } catch {
      return res.status(500).json({
        error: 'Invalid JSON returned from Python engine',
        raw: stdoutData
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

  // Execute custom python script
  const py = spawn('python3', ['-c', code]);
  let output = '';
  let err = '';

  py.stdout.on('data', (d) => { output += d.toString(); });
  py.stderr.on('data', (d) => { err += d.toString(); });

  py.on('close', (exitCode) => {
    res.json({
      exitCode,
      output: output.trim(),
      error: err.trim()
    });
  });
});

// Setup Vite middleware in dev or static serving in production
async function startServer() {
  const isDev = process.env.NODE_ENV !== 'production';

  if (isDev) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
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

import express from 'express';
import type { Request, Response } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { spawn } from 'child_process';
import dotenv from 'dotenv';
import { GoogleGenAI, ThinkingLevel } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

app.use(express.json());

// AI Studio Control Plane & Health Check routes
app.get('/__aistudio_internal_control_plane/dev/status', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    ready: true,
    env: process.env.NODE_ENV || 'development',
    time: new Date().toISOString(),
  });
});

app.get('/__aistudio_internal_control_plane/*', (_req: Request, res: Response) => {
  res.json({ status: 'ok', ready: true });
});

app.get(['/healthz', '/_health'], (_req: Request, res: Response) => {
  res.status(200).send('OK');
});

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
  const forceRefresh = req.query.refresh === 'true';

  // Return fresh cache if available to respond in < 1ms unless forceRefresh is requested
  const cached = analyticsCache.get(action);
  if (!forceRefresh && cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
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

interface ParsedGeminiError {
  code?: number;
  status?: string;
  message: string;
}

function parseGeminiError(err: unknown): ParsedGeminiError {
  const raw = err instanceof Error ? err.message : String(err || 'Unknown Gemini API error');
  try {
    const parsed = JSON.parse(raw) as {
      error?: { code?: number; status?: string; message?: string };
    };
    if (parsed?.error?.message) {
      return {
        code: parsed.error.code,
        status: parsed.error.status,
        message: parsed.error.message,
      };
    }
  } catch {
    // Not raw JSON
  }
  return { message: raw };
}

function isTransientGeminiError(parsed: ParsedGeminiError): boolean {
  if (parsed.code && [429, 500, 502, 503, 504].includes(parsed.code)) {
    return true;
  }
  if (parsed.status && ['UNAVAILABLE', 'RESOURCE_EXHAUSTED', 'INTERNAL', 'DEADLINE_EXCEEDED'].includes(parsed.status)) {
    return true;
  }
  return /503|429|unavailable|high demand|overloaded|try again later|timeout|econnreset/i.test(
    parsed.message
  );
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// API: Hatsune Miku On-the-Spot AI Generation for open-ended queries
app.post('/api/miku/ask', async (req: Request, res: Response) => {
  const { query, cafeSummary, history } = req.body as {
    query?: string;
    cafeSummary?: string;
    history?: Array<{ sender: 'user' | 'miku'; text: string }>;
  };

  if (!query || typeof query !== 'string' || !query.trim()) {
    return res.status(400).json({ error: 'Query text is required.' });
  }

  if (!process.env.GEMINI_API_KEY) {
    return res.status(503).json({
      code: 'UNAVAILABLE',
      error: 'AI response generation is currently unavailable.',
    });
  }

  const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });

  const systemInstruction = [
    'You are Hatsune Miku, the cheerful, energetic, encouraging virtual idol assistant and guide for Ethereal Cafe (a modern computer/gaming cafe management and analytics website).',
    'Website sections you know well: Home (main summary & greeting), Cafe Log (front-desk form to start sessions, order food/drinks, record payments, add customers/staff/PCs/restocks), PC Stations, Gaming Sessions, Sales & Profit, Customers, Food & Drinks, Staff Shifts, and Data Analysis.',
    cafeSummary ? `Live Cafe Snapshot:\n${cafeSummary}` : '',
    'Guidelines:',
    '- When the user asks about things outside the cafe database (general knowledge, cafe ideas, advice, creative questions, or conceptual questions), answer helpfully, accurately, and cheerfully on the spot.',
    '- Keep replies concise (2 to 4 sentences), easy to read, and encouraging.',
    '- Do NOT repeat "Mikudayo~" inside your sentences. Put "Mikudayo~" ONLY ONCE at the very end of your entire answer.',
  ]
    .filter(Boolean)
    .join('\n');

  const recentContext =
    Array.isArray(history) && history.length > 0
      ? history
          .slice(-6)
          .map((h) => `${h.sender === 'user' ? 'User' : 'Hatsune Miku'}: ${h.text}`)
          .join('\n')
      : '';

  const contents = recentContext
    ? `${recentContext}\nUser: ${query.trim()}`
    : query.trim();

  const modelCandidates: Array<{ model: string; useLowThinking: boolean }> = [
    { model: 'gemini-4-hydrogen', useLowThinking: true },
    { model: 'gemini-3.1-flash-lite', useLowThinking: false },
  ];

  let lastParsedError: ParsedGeminiError = { message: 'Failed to generate answer with Gemini.' };

  for (const candidate of modelCandidates) {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const response = await ai.models.generateContent({
          model: candidate.model,
          contents,
          config: candidate.useLowThinking
            ? {
                systemInstruction,
                thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
              }
            : {
                systemInstruction,
              },
        });

        const text = (response.text || '').trim();
        if (text) {
          return res.json({ text });
        }
        lastParsedError = { message: 'Gemini returned an empty response.' };
      } catch (err: unknown) {
        lastParsedError = parseGeminiError(err);
        if (!isTransientGeminiError(lastParsedError)) {
          console.error('Miku Gemini API error:', lastParsedError.message);
          return res.status(lastParsedError.code === 400 || lastParsedError.code === 403 ? lastParsedError.code : 502).json({
            code: 'GEMINI_ERROR',
            error: lastParsedError.message,
          });
        }
        const backoffMs = 450 * Math.pow(2, attempt) + Math.floor(Math.random() * 200);
        console.warn(
          `Transient Gemini response on ${candidate.model} (attempt ${attempt + 1}), retrying/falling back...`
        );
        await sleep(backoffMs);
      }
    }
  }

  console.warn('Miku Gemini API temporarily busy after retries:', lastParsedError.message);
  return res.status(503).json({
    code: 'HIGH_DEMAND',
    error: 'The AI model is currently experiencing high demand. Please try again in a few seconds.',
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

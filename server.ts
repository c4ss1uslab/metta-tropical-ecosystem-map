import express from 'express';
import type { Request, Response } from 'express';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI, Type, Modality } from '@google/genai';
import type { LiveServerMessage } from '@google/genai';
import { WebSocketServer } from 'ws';
import type { WebSocket } from 'ws';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function getPort(): number {
  const portArgIndex = process.argv.indexOf('--port');
  if (portArgIndex !== -1 && process.argv[portArgIndex + 1]) {
    const p = parseInt(process.argv[portArgIndex + 1], 10);
    if (!isNaN(p)) return p;
  }
  // In Cloud Run deployment (production), listen on process.env.PORT as required by Cloud Run.
  // In local/dev container, CONTROL_PLANE_PORT is set and nginx proxies 8080 -> 3000, so listen on 3000.
  if (process.env.PORT && !process.env.CONTROL_PLANE_PORT) {
    const envPort = parseInt(process.env.PORT, 10);
    if (!isNaN(envPort)) return envPort;
  }
  return 3000;
}

const PORT = getPort();
const app = express();
app.use(express.json({ limit: '15mb' }));

// Gemini initialization
const API_KEY = (process.env.GEMINI_API_KEY || '').trim();
const rawModel = (process.env.GEMINI_TRANSLATION_MODEL || process.env.VITE_GEMINI_TRANSLATION_MODEL || 'gemini-3.8-flash').trim();
const DEFAULT_TRANSLATION_MODEL = (rawModel === 'gemini-flash-latest' || !rawModel) ? 'gemini-3.8-flash' : rawModel;

let genAiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI {
  if (!genAiClient) {
    genAiClient = new GoogleGenAI({
      apiKey: API_KEY,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return genAiClient;
}

function isGeminiConfigured(): boolean {
  return API_KEY.length > 0 && API_KEY !== 'MY_GEMINI_API_KEY';
}

const TRANSLATION_SYSTEM_INSTRUCTION = `You are a professional English to Brazilian Portuguese (pt-BR) translator for the "Metta Tropical Ecosystem Map", a cartography of organizations, people and ideas working on inner (spiritual/contemplative), social, cultural and systems change: regenerative practice, wisdom traditions, education, indigenous and quilombola allyship, metacrisis research, alternative economics.

Rules:
- Translate each item's "text" into natural, fluent Brazilian Portuguese (not European Portuguese).
- Keep proper nouns unchanged: names of organizations, people, projects, brands, books, and established acronyms.
- Keep URLs, emails, @handles, numbers, dates, and leading numbering such as "22. " exactly as they are.
- Preserve line breaks, bullet markers, markdown, and punctuation structure.
- If an item is already in Portuguese or is only a proper noun, return it unchanged.
- Return exactly one output per input item, with the same "i".`;

// ---------------------------------------------------------------------------
// REST Endpoints
// ---------------------------------------------------------------------------

// Status & Health
app.get('/api/gemini/status', (_req: Request, res: Response) => {
  res.json({
    available: isGeminiConfigured(),
    defaultModel: DEFAULT_TRANSLATION_MODEL,
  });
});

// Translation Endpoint (Batch)
app.post('/api/gemini/translate', async (req: Request, res: Response) => {
  if (!isGeminiConfigured()) {
    res.status(503).json({
      error: 'GEMINI_API_KEY is not configured on the server.',
      available: false,
    });
    return;
  }

  const { items, texts, model } = req.body;
  let targetModel = (typeof model === 'string' && model.trim()) || DEFAULT_TRANSLATION_MODEL;
  if (targetModel === 'gemini-flash-latest') {
    targetModel = 'gemini-3.8-flash';
  }

  // Format 1: items: [{ i: number, text: string }]
  // Format 2: texts: string[]
  let batchItems: Array<{ i: number; text: string }> = [];
  if (Array.isArray(items)) {
    batchItems = items;
  } else if (Array.isArray(texts)) {
    batchItems = texts.map((t, idx) => ({ i: idx, text: String(t) }));
  }

  if (batchItems.length === 0) {
    res.json({ translations: [] });
    return;
  }

  try {
    const ai = getGeminiClient();
    const response = await ai.models.generateContent({
      model: targetModel,
      contents: JSON.stringify({ items: batchItems }),
      config: {
        systemInstruction: TRANSLATION_SYSTEM_INSTRUCTION,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              i: { type: Type.INTEGER },
              t: { type: Type.STRING },
            },
            required: ['i', 't'],
            propertyOrdering: ['i', 't'],
          },
        },
      },
    });

    const raw = response.text || '[]';
    const parsed = JSON.parse(raw) as Array<{ i: number; t: string }>;
    const wanted = new Set(batchItems.map((it) => it.i));
    const validTranslations: Array<{ i: number; t: string }> = [];

    for (const row of Array.isArray(parsed) ? parsed : []) {
      if (row && wanted.has(row.i) && typeof row.t === 'string' && row.t.trim()) {
        validTranslations.push({ i: row.i, t: row.t });
      }
    }

    res.json({ translations: validTranslations });
  } catch (err: any) {
    console.error('[Gemini Server] Translation error:', err);
    res.status(500).json({
      error: err?.message || 'Gemini translation request failed',
    });
  }
});

// General Text / Multimodal Generation
app.post('/api/gemini/generate', async (req: Request, res: Response) => {
  if (!isGeminiConfigured()) {
    res.status(503).json({ error: 'GEMINI_API_KEY is not configured.' });
    return;
  }

  const { prompt, contents, model, systemInstruction, config } = req.body;
  const targetModel = (typeof model === 'string' && model.trim()) || 'gemini-3.8-flash';
  const contentPayload = contents || prompt;

  if (!contentPayload) {
    res.status(400).json({ error: 'Missing prompt or contents in request body.' });
    return;
  }

  try {
    const ai = getGeminiClient();
    const response = await ai.models.generateContent({
      model: targetModel,
      contents: contentPayload,
      config: {
        ...(systemInstruction ? { systemInstruction } : {}),
        ...(config || {}),
      },
    });

    res.json({ text: response.text });
  } catch (err: any) {
    console.error('[Gemini Server] Generate content error:', err);
    res.status(500).json({ error: err?.message || 'Generate content failed' });
  }
});

// Streaming Text Generation via Server-Sent Events (SSE)
app.post('/api/gemini/stream', async (req: Request, res: Response) => {
  if (!isGeminiConfigured()) {
    res.status(503).json({ error: 'GEMINI_API_KEY is not configured.' });
    return;
  }

  const { prompt, contents, model, systemInstruction, config } = req.body;
  const targetModel = (typeof model === 'string' && model.trim()) || 'gemini-3.8-flash';
  const contentPayload = contents || prompt;

  if (!contentPayload) {
    res.status(400).json({ error: 'Missing prompt or contents in request body.' });
    return;
  }

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  try {
    const ai = getGeminiClient();
    const responseStream = await ai.models.generateContentStream({
      model: targetModel,
      contents: contentPayload,
      config: {
        ...(systemInstruction ? { systemInstruction } : {}),
        ...(config || {}),
      },
    });

    for await (const chunk of responseStream) {
      if (chunk.text) {
        res.write(`data: ${JSON.stringify({ text: chunk.text })}\n\n`);
      }
    }
    res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
    res.end();
  } catch (err: any) {
    console.error('[Gemini Server] Streaming error:', err);
    res.write(`data: ${JSON.stringify({ error: err?.message || 'Streaming failed' })}\n\n`);
    res.end();
  }
});

// ---------------------------------------------------------------------------
// HTTP Server & Live API WebSocket Bridge
// ---------------------------------------------------------------------------

const server = http.createServer(app);
const wss = new WebSocketServer({ noServer: true });

wss.on('connection', async (clientWs: WebSocket) => {
  if (!isGeminiConfigured()) {
    clientWs.send(JSON.stringify({ error: 'GEMINI_API_KEY is not configured.' }));
    clientWs.close();
    return;
  }

  try {
    const ai = getGeminiClient();
    const session = await ai.live.connect({
      model: 'gemini-3.8-live',
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } },
        },
        systemInstruction: 'You are a voice assistant for the Metta Tropical Ecosystem Map.',
      },
      callbacks: {
        onmessage: (message: LiveServerMessage) => {
          for (const part of message.serverContent?.modelTurn?.parts ?? []) {
            if (part.inlineData?.data) {
              clientWs.send(JSON.stringify({ audio: part.inlineData.data }));
            }
          }
          if (message.serverContent?.interrupted) {
            clientWs.send(JSON.stringify({ interrupted: true }));
          }
        },
      },
    });

    clientWs.on('message', (data) => {
      try {
        const payload = JSON.parse(data.toString());
        if (payload.audio) {
          session.sendRealtimeInput({
            audio: { data: payload.audio, mimeType: 'audio/pcm;rate=16000' },
          });
        } else if (payload.text) {
          session.sendRealtimeInput({
            text: payload.text,
          });
        }
      } catch (e) {
        console.warn('[Live API WebSocket] Message format error:', e);
      }
    });

    clientWs.on('close', () => {
      try {
        session.close();
      } catch {
        // ignore
      }
    });
  } catch (err: any) {
    console.error('[Live API WebSocket] Session initialization error:', err);
    clientWs.send(JSON.stringify({ error: err?.message || 'Live API connection failed' }));
    clientWs.close();
  }
});

server.on('upgrade', (request, socket, head) => {
  const parsedUrl = new URL(request.url || '', `http://${request.headers.host || 'localhost'}`);
  if (parsedUrl.pathname === '/live' || parsedUrl.pathname === '/api/gemini/live') {
    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit('connection', ws, request);
    });
  }
});

// ---------------------------------------------------------------------------
// Vite Dev vs. Production Static Server
// ---------------------------------------------------------------------------

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: { server },
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`\n  VITE v6.2.3  ready in 120 ms\n\n  ➜  Local:   http://localhost:${PORT}/\n  ➜  Network: http://0.0.0.0:${PORT}/\n`);
    console.log(`Server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});

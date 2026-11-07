/**
 * Client-side utilities for server-proxied Gemini API operations.
 *
 * All operations call the server endpoints (/api/gemini/*) or the WebSocket bridge (/live),
 * ensuring that the Google GenAI SDK runs purely on the server.
 */

export interface GenerateTextOptions {
  prompt: string;
  model?: string;
  systemInstruction?: string;
}

export async function generateText(options: GenerateTextOptions): Promise<string> {
  const res = await fetch('/api/gemini/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(options),
  });

  if (!res.ok) {
    const errorBody = await res.json().catch(() => ({}));
    throw new Error(errorBody.error || `Generate text failed with HTTP ${res.status}`);
  }

  const data = await res.json();
  return data.text || '';
}

export interface StreamTextOptions {
  prompt: string;
  model?: string;
  systemInstruction?: string;
  onChunk: (text: string) => void;
  onError?: (err: Error) => void;
  onDone?: () => void;
}

/**
 * Stream text generation from server-side SSE endpoint (/api/gemini/stream).
 */
export async function streamText(options: StreamTextOptions): Promise<void> {
  const res = await fetch('/api/gemini/stream', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      prompt: options.prompt,
      model: options.model,
      systemInstruction: options.systemInstruction,
    }),
  });

  if (!res.ok) {
    const errorBody = await res.json().catch(() => ({}));
    const err = new Error(errorBody.error || `Stream request failed with HTTP ${res.status}`);
    options.onError?.(err);
    throw err;
  }

  if (!res.body) {
    options.onDone?.();
    return;
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.startsWith('data: ')) {
          try {
            const data = JSON.parse(trimmed.slice(6));
            if (data.text) {
              options.onChunk(data.text);
            }
            if (data.done) {
              options.onDone?.();
              return;
            }
            if (data.error) {
              const err = new Error(data.error);
              options.onError?.(err);
              return;
            }
          } catch {
            // Ignore parse errors on partial frames
          }
        }
      }
    }
  } catch (err: any) {
    options.onError?.(err);
    throw err;
  } finally {
    options.onDone?.();
  }
}

export interface LiveConnectionCallbacks {
  onAudio?: (base64Audio: string) => void;
  onInterrupted?: () => void;
  onError?: (error: string) => void;
  onClose?: () => void;
}

export interface LiveConnection {
  sendAudio: (base64Audio: string) => void;
  sendText: (text: string) => void;
  close: () => void;
}

/**
 * Connect to the server's Gemini Live API WebSocket bridge.
 */
export function connectLiveApi(callbacks: LiveConnectionCallbacks): LiveConnection {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const ws = new WebSocket(`${protocol}//${window.location.host}/live`);

  ws.onmessage = (event) => {
    try {
      const msg = JSON.parse(event.data);
      if (msg.audio) callbacks.onAudio?.(msg.audio);
      if (msg.interrupted) callbacks.onInterrupted?.();
      if (msg.error) callbacks.onError?.(msg.error);
    } catch {
      // ignore
    }
  };

  ws.onerror = () => {
    callbacks.onError?.('WebSocket connection encountered an error.');
  };

  ws.onclose = () => {
    callbacks.onClose?.();
  };

  return {
    sendAudio: (base64Audio: string) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ audio: base64Audio }));
      }
    },
    sendText: (text: string) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ text }));
      }
    },
    close: () => {
      ws.close();
    },
  };
}

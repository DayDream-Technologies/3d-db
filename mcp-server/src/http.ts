import { createServer, type IncomingMessage, type ServerResponse } from 'http';
import { readFileSync, existsSync } from 'fs';
import { join, extname, resolve, sep } from 'path';
import { fileURLToPath } from 'url';
import { WebSocketServer, WebSocket } from 'ws';
import { randomUUID } from 'crypto';
import { validateToken } from './token.js';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const STATIC_DIR = resolve(__dirname, '..', 'static');

const MIME: Record<string, string> = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.ttf': 'font/ttf',
};

type PendingRequest = {
  resolve: (payload: unknown) => void;
  reject: (err: Error) => void;
  timeout: ReturnType<typeof setTimeout>;
};

export type OutboundMessage =
  | { type: 'load_schema'; payload: string }
  | { type: 'highlight_query'; payload: { sql: string } }
  | { type: 'get_schema_request'; id: string };

type InboundMessage = { type: 'schema_response'; id: string; payload: unknown };

export function isValidHost(host: string): boolean {
  const hostWithoutPort = host.split(':')[0];
  return hostWithoutPort === 'localhost' || hostWithoutPort === '127.0.0.1';
}

export function extractTokenFromUrl(url: string, host: string): string | null {
  try {
    const parsed = new URL(url, `http://${host}`);
    return parsed.searchParams.get('token');
  } catch {
    return null;
  }
}

export function createHttpServer(token: string, port: number) {
  const clients = new Set<WebSocket>();
  const pending = new Map<string, PendingRequest>();

  function jsonError(res: ServerResponse, status: number, error: string, description: string): void {
    res.writeHead(status, { 'Content-Type': 'application/json' })
      .end(JSON.stringify({ error, error_description: description }));
  }

  function serveStatic(req: IncomingMessage, res: ServerResponse): void {
    const host = req.headers.host ?? '';
    if (!isValidHost(host)) {
      res.writeHead(403).end('Forbidden');
      return;
    }

    const parsedUrl = new URL(req.url ?? '/', `http://${host}`);
    const urlPath = parsedUrl.pathname;

    // Return proper JSON for OAuth discovery so MCP clients get a parseable
    // response instead of the SPA fallback HTML. This server is not an MCP
    // authorization server — OAuth applies to remote HTTP MCP servers only.
    if (urlPath === '/.well-known/oauth-authorization-server') {
      jsonError(res, 404, 'not_found', 'This server does not implement OAuth — connect via stdio transport');
      return;
    }

    if (req.method !== 'GET' && req.method !== 'HEAD') {
      jsonError(res, 405, 'method_not_allowed', `${req.method} is not supported on this server`);
      return;
    }

    const filePath = urlPath === '/' ? '/index.html' : urlPath;
    const safePath = resolve(join(STATIC_DIR, filePath));
    if ((!safePath.startsWith(STATIC_DIR + sep) && safePath !== STATIC_DIR) || !existsSync(safePath)) {
      const index = join(STATIC_DIR, 'index.html');
      if (existsSync(index)) {
        res.writeHead(200, { 'Content-Type': 'text/html' }).end(readFileSync(index));
        return;
      }
      res.writeHead(404).end('Not found');
      return;
    }

    const mime = MIME[extname(safePath)] ?? 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': mime }).end(readFileSync(safePath));
  }

  const httpServer = createServer(serveStatic);
  const wss = new WebSocketServer({ server: httpServer, path: '/ws', maxPayload: 1024 * 1024 });

  wss.on('connection', (ws, req) => {
    const host = req.headers.host ?? '';
    if (!isValidHost(host)) { ws.close(1008, 'Forbidden'); return; }

    const clientToken = extractTokenFromUrl(req.url ?? '', host);
    if (!validateToken(clientToken, token)) { ws.close(1008, 'Invalid token'); return; }

    clients.add(ws);

    ws.on('message', (data) => {
      try {
        const msg = JSON.parse(data.toString()) as InboundMessage;
        if (msg.type === 'schema_response') {
          const p = pending.get(msg.id);
          if (p) {
            clearTimeout(p.timeout);
            pending.delete(msg.id);
            p.resolve(msg.payload);
          }
        }
      } catch { /* ignore malformed */ }
    });

    ws.on('close', () => clients.delete(ws));
    ws.on('error', () => clients.delete(ws));
  });

  function broadcast(msg: OutboundMessage): void {
    const json = JSON.stringify(msg);
    for (const ws of clients) {
      if (ws.readyState === WebSocket.OPEN) ws.send(json);
    }
  }

  function requestSchema(): Promise<unknown> {
    return new Promise((resolve, reject) => {
      if (clients.size === 0) {
        reject(new Error('No browser tab connected. Open the visualizer first.'));
        return;
      }
      const id = randomUUID();
      const timeout = setTimeout(() => {
        pending.delete(id);
        reject(new Error('Schema request timed out (5s). Is the browser tab still open?'));
      }, 5000);
      pending.set(id, { resolve, reject, timeout });
      broadcast({ type: 'get_schema_request', id });
    });
  }

  function start(): Promise<void> {
    return new Promise((resolve) => httpServer.listen(port, '127.0.0.1', resolve));
  }

  function stop(): void {
    for (const ws of clients) ws.terminate();
    clients.clear();
    for (const [, p] of pending) {
      clearTimeout(p.timeout);
      p.reject(new Error('Server shut down'));
    }
    pending.clear();
    wss.close();
    httpServer.close();
  }

  return { start, stop, broadcast, requestSchema };
}

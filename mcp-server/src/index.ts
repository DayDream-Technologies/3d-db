#!/usr/bin/env node
import { runSetup } from './setup.js';

if (process.argv[2] === 'setup') {
  runSetup();
  process.exit(0);
}

import { createServer } from 'net';
import { createHttpServer } from './http.js';
import { createMcpServer } from './mcp.js';
import { generateToken } from './token.js';
import open from 'open';

async function findFreePort(start: number): Promise<number> {
  for (let port = start; port < start + 20; port++) {
    const free = await new Promise<boolean>((resolve) => {
      const probe = createServer();
      probe.once('error', () => resolve(false));
      probe.once('listening', () => { probe.close(); resolve(true); });
      probe.listen(port, '127.0.0.1');
    });
    if (free) return port;
  }
  throw new Error(`No free port found in range ${start}–${start + 19}`);
}

const port = await findFreePort(4242);
const token = generateToken();

const http = createHttpServer(token, port);
const mcp = createMcpServer(http);

await http.start();

const url = `http://localhost:${port}?token=${token}`;
await open(url);

process.stdin.on('end', () => {
  http.stop();
  process.exit(0);
});

process.on('SIGTERM', () => {
  http.stop();
  process.exit(0);
});

process.on('SIGINT', () => {
  http.stop();
  process.exit(0);
});

await mcp.connect();

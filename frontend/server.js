// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2024-2026 Gracker (Chris)
// This file is part of SmartPerfetto. See LICENSE for details.

/**
 * SmartPerfetto Frontend Server
 *
 * Serves pre-built Perfetto UI static files on port 10000.
 * No build step required — just run: node server.js
 *
 * Environment variables:
 *   SMARTPERFETTO_FRONTEND_PORT  Listening port (default: 10000)
 *   PORT                         Legacy listening port fallback
 */

'use strict';

const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = Number(safePort(process.env.SMARTPERFETTO_FRONTEND_PORT || process.env.PORT, '10000'));
const DIST_DIR = __dirname;

const MIME_TYPES = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.js.map': 'application/json',
  '.css': 'text/css',
  '.css.map': 'application/json',
  '.wasm': 'application/wasm',
  '.json': 'application/json',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.ttf': 'font/ttf',
};

function getMime(filePath) {
  // Check double extensions first (.js.map)
  if (filePath.endsWith('.js.map') || filePath.endsWith('.css.map')) return 'application/json';
  const ext = path.extname(filePath).toLowerCase();
  return MIME_TYPES[ext] || 'application/octet-stream';
}

function safePort(value, fallback) {
  const text = String(value || '').trim();
  if (!/^\d+$/.test(text)) return fallback;
  const parsed = Number(text);
  return Number.isInteger(parsed) && parsed >= 1 && parsed <= 65535
    ? String(parsed)
    : fallback;
}

function runtimeConfigScript() {
  const backendUrl = (
    process.env.SMARTPERFETTO_BACKEND_PUBLIC_URL ||
    process.env.SMARTPERFETTO_BACKEND_URL ||
    ''
  ).trim();
  const config = {
    backendPort: safePort(
      process.env.SMARTPERFETTO_BACKEND_PUBLIC_PORT ||
      process.env.SMARTPERFETTO_BACKEND_PORT,
      '3000',
    ),
    frontendPort: safePort(
      process.env.SMARTPERFETTO_FRONTEND_PORT ||
      process.env.PORT,
      '10000',
    ),
    ...(backendUrl ? {backendUrl} : {}),
  };
  return `<script>window.__SMARTPERFETTO_CONFIG__=${JSON.stringify(config)};</script>`;
}

function injectRuntimeConfig(filePath, data) {
  if (path.basename(filePath) !== 'index.html') return data;
  const html = data.toString('utf8');
  const script = runtimeConfigScript();
  const marker = '</head>';
  if (html.includes(marker)) {
    return Buffer.from(html.replace(marker, `${script}\n${marker}`));
  }
  return Buffer.from(`${script}\n${html}`);
}

const server = http.createServer((req, res) => {
  // CORS headers for cross-origin requests from Perfetto UI
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');

  let urlPath = req.url.split('?')[0];

  // Live reload endpoint (no-op stub so browser doesn't error)
  if (urlPath === '/live_reload') {
    res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache' });
    res.write('data: connected\n\n');
    return;
  }

  // Resolve file path
  let filePath = path.join(DIST_DIR, urlPath);

  // Serve index.html for root
  if (urlPath === '/' || urlPath === '') {
    filePath = path.join(DIST_DIR, 'index.html');
  }

  fs.stat(filePath, (err, stat) => {
    if (err || !stat.isFile()) {
      if (path.extname(urlPath)) {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('Not found');
        return;
      }

      // Fallback to index.html for SPA routing
      filePath = path.join(DIST_DIR, 'index.html');
    }

    fs.readFile(filePath, (err2, data) => {
      if (err2) {
        res.writeHead(404);
        res.end('Not found');
        return;
      }
      const body = injectRuntimeConfig(filePath, data);
      res.writeHead(200, { 'Content-Type': getMime(filePath) });
      res.end(body);
    });
  });
});

server.listen(PORT, () => {
  console.log(`[Frontend] Serving Perfetto UI on http://localhost:${PORT}`);
});

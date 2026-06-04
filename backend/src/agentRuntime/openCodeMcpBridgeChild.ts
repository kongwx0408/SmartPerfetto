// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2024-2026 Gracker (Chris)
// This file is part of SmartPerfetto. See LICENSE for details.

import * as net from 'net';
import * as readline from 'readline';
import type { JsonRpcRequest, JsonRpcResponse } from '../agentv3/standaloneMcpServer';
import { RPC_ERROR_CODES } from '../agentv3/standaloneMcpServer';

const port = Number.parseInt(process.env.SMARTPERFETTO_OPENCODE_BRIDGE_PORT || '', 10);
const token = process.env.SMARTPERFETTO_OPENCODE_BRIDGE_TOKEN || '';

function rpcError(
  id: string | number | null,
  code: number,
  message: string,
): JsonRpcResponse {
  return { jsonrpc: '2.0', id, error: { code, message } };
}

function forwardToParent(request: JsonRpcRequest): Promise<JsonRpcResponse> {
  if (!Number.isFinite(port) || port <= 0 || !token) {
    return Promise.resolve(
      rpcError(
        request.id ?? null,
        RPC_ERROR_CODES.INTERNAL_ERROR,
        'OpenCode SmartPerfetto MCP bridge is not configured',
      ),
    );
  }

  return new Promise((resolve) => {
    const socket = net.createConnection({ host: '127.0.0.1', port });
    let buffer = '';
    let settled = false;
    const finish = (response: JsonRpcResponse) => {
      if (settled) return;
      settled = true;
      socket.destroy();
      resolve(response);
    };

    socket.setEncoding('utf-8');
    socket.setTimeout(30_000, () => {
      finish(
        rpcError(
          request.id ?? null,
          RPC_ERROR_CODES.INTERNAL_ERROR,
          'OpenCode SmartPerfetto MCP bridge request timed out',
        ),
      );
    });
    socket.on('connect', () => {
      socket.write(`${JSON.stringify({ token, request })}\n`);
    });
    socket.on('data', (chunk: string) => {
      buffer += chunk;
      const newline = buffer.indexOf('\n');
      if (newline < 0) return;
      const line = buffer.slice(0, newline);
      try {
        finish(JSON.parse(line) as JsonRpcResponse);
      } catch {
        finish(
          rpcError(
            request.id ?? null,
            RPC_ERROR_CODES.PARSE_ERROR,
            'OpenCode SmartPerfetto MCP bridge returned invalid JSON',
          ),
        );
      }
    });
    socket.on('error', (err) => {
      finish(
        rpcError(
          request.id ?? null,
          RPC_ERROR_CODES.INTERNAL_ERROR,
          `OpenCode SmartPerfetto MCP bridge connection failed: ${err.message}`,
        ),
      );
    });
    socket.on('end', () => {
      if (!settled) {
        finish(
          rpcError(
            request.id ?? null,
            RPC_ERROR_CODES.INTERNAL_ERROR,
            'OpenCode SmartPerfetto MCP bridge closed without a response',
          ),
        );
      }
    });
  });
}

async function main(): Promise<void> {
  const lines = readline.createInterface({
    input: process.stdin,
    crlfDelay: Infinity,
  });

  for await (const line of lines) {
    if (!line.trim()) continue;
    let request: JsonRpcRequest;
    try {
      request = JSON.parse(line) as JsonRpcRequest;
    } catch {
      process.stdout.write(
        `${JSON.stringify(rpcError(null, RPC_ERROR_CODES.PARSE_ERROR, 'Invalid JSON'))}\n`,
      );
      continue;
    }

    if (request.id === undefined) continue;
    const response = await forwardToParent(request);
    process.stdout.write(`${JSON.stringify(response)}\n`);
  }
}

void main().catch((err) => {
  const response = rpcError(
    null,
    RPC_ERROR_CODES.INTERNAL_ERROR,
    err instanceof Error ? err.message : String(err),
  );
  process.stdout.write(`${JSON.stringify(response)}\n`);
});

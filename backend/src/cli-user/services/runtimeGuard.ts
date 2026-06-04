// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2024-2026 Gracker (Chris)
// This file is part of SmartPerfetto. See LICENSE for details.

import * as fs from 'fs';
import { spawnSync } from 'child_process';
import {
  resolveAgentRuntimeSelection,
  type BackendAgentRuntimeKind,
  type RuntimeSelection,
} from '../../agentRuntime/runtimeSelection';
import {
  EXPERIMENTAL_PI_AGENT_CORE_RUNTIME_KIND,
  getPiAgentCoreRuntimeDiagnostics,
  PI_AGENT_CORE_RUNTIME_KIND,
} from '../../agentRuntime/piAgentCoreRuntime';
import {
  EXPERIMENTAL_OPENCODE_RUNTIME_KIND,
  getOpenCodeRuntimeDiagnostics,
  OPENCODE_RUNTIME_KIND,
} from '../../agentRuntime/openCodeRuntime';
import { getClaudeRuntimeDiagnostics } from '../../agentv3/claudeConfig';
import { getOpenAIRuntimeDiagnostics, hasOpenAICredentials } from '../../agentOpenAI/openAiConfig';
import { getTraceProcessorPath } from '../../services/workingTraceProcessor';
import { getProviderService } from '../../services/providerManager';
import { parseAdbDevices } from './androidCapture';
import { resolveAdbTool, resolveTraceboxTool } from './captureTools';
import type { CaptureToolResolution } from '../types';

export interface RuntimeGuardResult {
  selection: RuntimeSelection;
  diagnostics: any;
}

export interface RuntimeGuardOptions {
  providerId?: string | null;
  runtimeOverride?: BackendAgentRuntimeKind;
}

function providerIdFor(selection: RuntimeSelection): string | null {
  return selection.source === 'provider' ? selection.providerId ?? null : null;
}

export function assertAnalysisRuntimeReady(options: RuntimeGuardOptions = {}): RuntimeGuardResult {
  const selection = resolveAgentRuntimeSelection(options.providerId, options.runtimeOverride);
  const providerId = providerIdFor(selection);

  if (selection.kind === 'openai-agents-sdk') {
    const diagnostics = getOpenAIRuntimeDiagnostics(providerId);
    if (!hasOpenAICredentials(providerId)) {
      throw new Error(
        [
          'OpenAI runtime is selected but no usable OpenAI-compatible credentials were found.',
          'Set OPENAI_API_KEY, configure an active OpenAI/Ollama provider, or use a localhost OpenAI-compatible endpoint.',
          'Run `smp doctor --format text` for the resolved runtime and provider details.',
        ].join(' '),
      );
    }
    return { selection, diagnostics };
  }

  if (
    selection.kind === EXPERIMENTAL_PI_AGENT_CORE_RUNTIME_KIND ||
    selection.kind === PI_AGENT_CORE_RUNTIME_KIND
  ) {
    return {
      selection,
      diagnostics: getPiAgentCoreRuntimeDiagnostics(process.env, selection.kind),
    };
  }

  if (selection.kind === EXPERIMENTAL_OPENCODE_RUNTIME_KIND || selection.kind === OPENCODE_RUNTIME_KIND) {
    return {
      selection,
      diagnostics: getOpenCodeRuntimeDiagnostics(process.env, selection.kind),
    };
  }

  const diagnostics = getClaudeRuntimeDiagnostics(providerId);
  if (!isClaudeSdkBinaryUsable(diagnostics.sdkBinary)) {
    throw new Error(
      [
        'Claude Agent SDK runtime is selected but its native binary is not executable.',
        diagnostics.sdkBinary?.chosenPath
          ? `Resolved binary: ${diagnostics.sdkBinary.chosenPath}`
          : 'No SDK native binary was resolved.',
        'Reinstall backend dependencies, or set CLAUDE_BINARY_PATH to an executable Claude Agent SDK binary.',
      ].join(' '),
    );
  }

  // Claude Agent SDK can use API/proxy credentials, Bedrock/Vertex env, or a
  // local Claude Code login. Do not reject the local-auth fallback here; the SDK
  // will surface a precise auth error if the local account is unavailable.
  return { selection, diagnostics };
}

export interface DoctorCheck {
  name: string;
  ok: boolean;
  status: 'ok' | 'warn' | 'error';
  message: string;
  details?: Record<string, unknown>;
}

export interface DoctorReport {
  ok: boolean;
  generatedAt: string;
  node: {
    version: string;
    expected: string;
    ok: boolean;
  };
  cliHome: string;
  runtime: RuntimeSelection;
  runtimeDiagnostics: any;
  traceProcessor: {
    path: string;
    exists: boolean;
    executable: boolean;
  };
  captureTools: {
    adb: CaptureToolResolution;
    tracebox: CaptureToolResolution;
    devices: {
      count: number;
      readyCount: number;
      serials: string[];
    };
  };
  providers: {
    count: number;
    active?: {
      id: string;
      name: string;
      type: string;
    };
  };
  checks: DoctorCheck[];
}

export function collectDoctorReport(cliHome: string): DoctorReport {
  const selection = resolveAgentRuntimeSelection();
  const providerId = providerIdFor(selection);
  const runtimeDiagnostics = selection.kind === 'openai-agents-sdk'
    ? getOpenAIRuntimeDiagnostics(providerId)
    : selection.kind === EXPERIMENTAL_PI_AGENT_CORE_RUNTIME_KIND ||
      selection.kind === PI_AGENT_CORE_RUNTIME_KIND
      ? getPiAgentCoreRuntimeDiagnostics(process.env, selection.kind)
      : selection.kind === EXPERIMENTAL_OPENCODE_RUNTIME_KIND ||
        selection.kind === OPENCODE_RUNTIME_KIND
        ? getOpenCodeRuntimeDiagnostics(process.env, selection.kind)
        : getClaudeRuntimeDiagnostics(providerId);
  const traceProcessorPath = getTraceProcessorPath();
  const traceProcessorExists = fs.existsSync(traceProcessorPath);
  const traceProcessorExecutable = traceProcessorExists && isExecutable(traceProcessorPath);
  const adb = resolveAdbTool();
  const tracebox = resolveTraceboxTool();
  const adbDevices = collectAdbDevices(adb);
  const providerSvc = getProviderService();
  const providers = providerSvc.list();
  const active = providers.find((p) => p.isActive);
  const nodeMajor = Number.parseInt(process.version.replace(/^v/, '').split('.')[0] || '0', 10);

  const checks: DoctorCheck[] = [
    {
      name: 'node',
      ok: nodeMajor >= 24 && nodeMajor < 25,
      status: nodeMajor >= 24 && nodeMajor < 25 ? 'ok' : 'error',
      message: `Node.js ${process.version} (expected >=24 <25)`,
    },
    {
      name: 'runtime',
      ok: runtimeDiagnostics.configured || selection.kind === 'claude-agent-sdk',
      status: runtimeDiagnostics.configured
        ? 'ok'
        : selection.kind === 'claude-agent-sdk'
          ? 'warn'
          : 'error',
      message: runtimeDiagnostics.configured
        ? `${selection.kind} credentials/configuration detected`
        : selection.kind === 'claude-agent-sdk'
          ? 'Claude SDK has no explicit credentials; local Claude login fallback will be used if available'
          : selection.kind === PI_AGENT_CORE_RUNTIME_KIND ||
              selection.kind === EXPERIMENTAL_PI_AGENT_CORE_RUNTIME_KIND
            ? 'Pi agent-core runtime needs SMARTPERFETTO_PI_AGENT_CORE_MODEL_JSON or a configured custom provider'
            : selection.kind === EXPERIMENTAL_OPENCODE_RUNTIME_KIND ||
              selection.kind === OPENCODE_RUNTIME_KIND
              ? 'OpenCode runtime needs @opencode-ai/sdk and opencode-ai available, plus OpenAI-compatible model configuration'
            : 'OpenAI runtime needs OPENAI_API_KEY or a localhost/OpenAI-compatible provider',
      details: {
        source: selection.source,
        providerId: selection.providerId,
        providerName: selection.providerName,
      },
    },
    ...(selection.kind === 'claude-agent-sdk'
      ? [buildClaudeSdkBinaryCheck((runtimeDiagnostics as any).sdkBinary)]
      : []),
    {
      name: 'trace_processor_shell',
      ok: traceProcessorExists && traceProcessorExecutable,
      status: traceProcessorExists && traceProcessorExecutable ? 'ok' : 'warn',
      message: traceProcessorExists
        ? traceProcessorExecutable
          ? 'trace_processor_shell is present and executable'
          : 'trace_processor_shell exists but is not executable'
        : 'trace_processor_shell is missing; CLI will download the pinned binary on first trace command',
      details: { path: traceProcessorPath },
    },
    {
      name: 'adb',
      ok: adb.exists && adb.executable,
      status: adb.exists && adb.executable ? 'ok' : 'warn',
      message: adb.exists && adb.executable
        ? `adb is available (${adb.source})`
        : 'adb is not available; Android capture needs ADB_PATH, bundled adb, or adb on PATH',
      details: { path: adb.path, source: adb.source, devices: adbDevices.readyCount },
    },
    {
      name: 'tracebox',
      ok: tracebox.exists && tracebox.executable,
      status: tracebox.exists && tracebox.executable ? 'ok' : 'warn',
      message: tracebox.exists && tracebox.executable
        ? `tracebox is available for sideload capture (${tracebox.source})`
        : 'tracebox is not bundled; sideload capture requires --tracebox or an approved packaged binary',
      details: { path: tracebox.path, source: tracebox.source },
    },
  ];

  return {
    ok: checks.every((c) => c.status !== 'error'),
    generatedAt: new Date().toISOString(),
    node: {
      version: process.version,
      expected: '>=24.0.0 <25.0.0',
      ok: nodeMajor >= 24 && nodeMajor < 25,
    },
    cliHome,
    runtime: selection,
    runtimeDiagnostics,
    traceProcessor: {
      path: traceProcessorPath,
      exists: traceProcessorExists,
      executable: traceProcessorExecutable,
    },
    captureTools: {
      adb,
      tracebox,
      devices: adbDevices,
    },
    providers: {
      count: providers.length,
      ...(active ? { active: { id: active.id, name: active.name, type: active.type } } : {}),
    },
    checks,
  };
}

function collectAdbDevices(adb: CaptureToolResolution): DoctorReport['captureTools']['devices'] {
  if (!adb.exists || !adb.executable) {
    return { count: 0, readyCount: 0, serials: [] };
  }
  const result = spawnSync(adb.path, ['devices', '-l'], {
    encoding: 'utf-8',
    timeout: 5000,
  });
  if (result.error || result.status !== 0) {
    return { count: 0, readyCount: 0, serials: [] };
  }
  const devices = parseAdbDevices(`${result.stdout ?? ''}\n${result.stderr ?? ''}`);
  const ready = devices.filter((device) => device.state === 'device');
  return {
    count: devices.length,
    readyCount: ready.length,
    serials: ready.map((device) => device.serial),
  };
}

function isExecutable(filePath: string): boolean {
  try {
    fs.accessSync(filePath, fs.constants.X_OK);
    return true;
  } catch {
    return false;
  }
}

export function isClaudeSdkBinaryUsable(sdkBinary: any): boolean {
  if (!sdkBinary?.chosenPath || sdkBinary.source === 'none') return false;
  return isExecutable(sdkBinary.chosenPath);
}

function buildClaudeSdkBinaryCheck(sdkBinary: any): DoctorCheck {
  const usable = isClaudeSdkBinaryUsable(sdkBinary);
  return {
    name: 'claude_sdk_binary',
    ok: usable,
    status: usable ? 'ok' : 'error',
    message: usable
      ? 'Claude Agent SDK native binary is present and executable'
      : 'Claude Agent SDK native binary is missing or not executable',
    details: {
      path: sdkBinary?.chosenPath ?? null,
      source: sdkBinary?.source ?? 'none',
      detectedPlatformKey: sdkBinary?.detectedPlatformKey ?? null,
      fallbackUsed: sdkBinary?.fallbackUsed ?? false,
    },
  };
}

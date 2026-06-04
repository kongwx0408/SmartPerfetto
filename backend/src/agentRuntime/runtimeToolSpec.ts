// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2024-2026 Gracker (Chris)
// This file is part of SmartPerfetto. See LICENSE for details.

import {
  tool as createClaudeSdkTool,
  type SdkMcpToolDefinition,
} from '@anthropic-ai/claude-agent-sdk';
import { z } from 'zod';
import type { McpToolExposure } from '../types/sparkContracts';

type ClaudeSdkToolHandler = SdkMcpToolDefinition['handler'];
export type RuntimeToolResult = Awaited<ReturnType<ClaudeSdkToolHandler>>;
export type RuntimeToolAnnotations = NonNullable<SdkMcpToolDefinition['annotations']>;

export type RuntimeToolHandler = (
  args: Record<string, unknown>,
  extra: unknown,
) => Promise<RuntimeToolResult>;

export interface SharedToolSpec {
  name: string;
  description: string;
  exposure: McpToolExposure;
  inputSchema: z.ZodRawShape;
  handler: RuntimeToolHandler;
  summary?: string;
  requires?: string[];
  annotations?: RuntimeToolAnnotations;
}

export interface ClaudeSdkToolLike {
  name: string;
  description: string;
  inputSchema: z.ZodRawShape;
  annotations?: RuntimeToolAnnotations;
  handler: (args: Record<string, unknown>, extra: unknown) => Promise<RuntimeToolResult>;
}

export function isClaudeSdkToolLike(value: unknown): value is ClaudeSdkToolLike {
  const toolLike = value as Partial<ClaudeSdkToolLike>;
  return !!toolLike
    && typeof toolLike.name === 'string'
    && typeof toolLike.description === 'string'
    && !!toolLike.inputSchema
    && typeof toolLike.inputSchema === 'object'
    && typeof toolLike.handler === 'function';
}

export function sharedToolSpecFromClaudeSdkTool(
  name: string,
  sdkTool: unknown,
  exposure: McpToolExposure,
  extras: Pick<SharedToolSpec, 'summary' | 'requires'> = {},
): SharedToolSpec {
  if (!isClaudeSdkToolLike(sdkTool)) {
    throw new Error(`Cannot build shared tool spec for ${name}: unsupported SDK descriptor shape`);
  }
  return {
    name,
    description: sdkTool.description,
    exposure,
    inputSchema: sdkTool.inputSchema,
    handler: sdkTool.handler,
    annotations: sdkTool.annotations,
    ...extras,
  };
}

export function createClaudeSdkToolFromSharedSpec(
  spec: SharedToolSpec,
): SdkMcpToolDefinition {
  const sdkTool = createClaudeSdkTool(
    spec.name,
    spec.description,
    spec.inputSchema,
    async (args, extra) => spec.handler(args as Record<string, unknown>, extra),
    spec.annotations ? { annotations: spec.annotations } : undefined,
  );
  return Object.assign(sdkTool, {
    inputSchema: spec.inputSchema,
    annotations: spec.annotations,
  });
}

/** Detect open `z.record(z.string(), z.any())` argument containers. */
function isOpenRecordAnySchema(entries: Array<[string, unknown]>): boolean {
  const record = Object.fromEntries(entries) as Record<string, unknown>;
  const additionalProperties = record.additionalProperties;
  return record.type === 'object'
    && (!('properties' in record) || Object.keys(record.properties as Record<string, unknown> || {}).length === 0)
    && !!additionalProperties
    && typeof additionalProperties === 'object'
    && !Array.isArray(additionalProperties)
    && Object.keys(additionalProperties as Record<string, unknown>).length === 0;
}

/** Remove Zod JSON Schema fragments that tool adapters do not accept or need. */
export function sanitizeToolJsonSchema(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => sanitizeToolJsonSchema(item));
  }

  if (!value || typeof value !== 'object') {
    return value;
  }

  const entries = Object.entries(value);
  if (isOpenRecordAnySchema(entries)) {
    const description = (value as Record<string, unknown>).description;
    return {
      type: 'string',
      ...(typeof description === 'string'
        ? { description: `${description} Pass as a JSON object string.` }
        : { description: 'JSON object string.' }),
    };
  }

  const sanitized: Record<string, unknown> = {};
  for (const [key, nested] of entries) {
    if (key === '$schema' || key === 'propertyNames') {
      continue;
    }
    const sanitizedNested = sanitizeToolJsonSchema(nested);
    if (sanitizedNested !== undefined) {
      sanitized[key] = sanitizedNested;
    }
  }
  return sanitized;
}

export function createJsonSchemaFromZodRawShape(
  inputSchema: z.ZodRawShape,
): Record<string, unknown> {
  const zodObject = z.object(inputSchema);
  const jsonSchema = z.toJSONSchema(zodObject);
  return sanitizeToolJsonSchema(jsonSchema) as Record<string, unknown>;
}

function parseJsonContainerString(value: string): unknown {
  const trimmed = value.trim();
  if (!trimmed.startsWith('{') && !trimmed.startsWith('[')) {
    return value;
  }
  try {
    return JSON.parse(trimmed);
  } catch {
    return value;
  }
}

export function normalizeRuntimeToolArgs(value: unknown): unknown {
  if (typeof value === 'string') {
    const parsed = parseJsonContainerString(value);
    return parsed === value ? value : normalizeRuntimeToolArgs(parsed);
  }

  if (Array.isArray(value)) {
    return value.map((item) => normalizeRuntimeToolArgs(item));
  }

  if (!value || typeof value !== 'object') {
    return value;
  }

  return Object.fromEntries(
    Object.entries(value).map(([key, nested]) => [key, normalizeRuntimeToolArgs(nested)]),
  );
}

export function stringifyRuntimeToolResult(result: unknown): string {
  const maybeResult = result as { content?: Array<Record<string, unknown>> };
  if (Array.isArray(maybeResult?.content)) {
    return maybeResult.content.map((block) => {
      if (block.type === 'text' && typeof block.text === 'string') return block.text;
      if (typeof block.text === 'string') return block.text;
      return JSON.stringify(block);
    }).join('\n');
  }
  return typeof result === 'string' ? result : JSON.stringify(result);
}

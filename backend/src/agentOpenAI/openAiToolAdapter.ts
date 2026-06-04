// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2024-2026 Gracker (Chris)
// This file is part of SmartPerfetto. See LICENSE for details.

import { tool, type Tool } from '@openai/agents';
import type { McpToolDefinition } from '../agentv3/mcpToolRegistry';
import {
  createJsonSchemaFromZodRawShape,
  normalizeRuntimeToolArgs,
  sharedToolSpecFromClaudeSdkTool,
  stringifyRuntimeToolResult,
  type SharedToolSpec,
} from '../agentRuntime/runtimeToolSpec';

function getSharedToolSpec(definition: McpToolDefinition): SharedToolSpec {
  if (definition.shared) return definition.shared;
  try {
    return sharedToolSpecFromClaudeSdkTool(
      definition.name,
      definition.tool,
      definition.exposure,
      {summary: definition.summary, requires: definition.requires},
    );
  } catch {
    throw new Error(`Cannot adapt MCP tool ${definition.name}: unsupported SDK descriptor shape`);
  }
}

/**
 * Adapts SmartPerfetto's existing in-process Claude MCP tool registry to
 * OpenAI Agents SDK function tools. The SmartPerfetto tool contract remains
 * the single source of truth; only the SDK adapter changes.
 */
export function createOpenAIToolsFromMcpDefinitions(
  definitions: readonly McpToolDefinition[],
): Tool[] {
  return definitions.map((definition) => {
    const shared = getSharedToolSpec(definition);
    return tool({
      name: definition.name,
      description: shared.description,
      parameters: createJsonSchemaFromZodRawShape(shared.inputSchema) as any,
      strict: true,
      execute: async (args) => {
        const normalizedArgs = normalizeRuntimeToolArgs(args) as Record<string, unknown>;
        const result = await shared.handler(normalizedArgs, {});
        return stringifyRuntimeToolResult(result);
      },
      errorFunction: (_context, error) => {
        const message = error instanceof Error ? error.message : String(error);
        return JSON.stringify({
          success: false,
          error: message,
          tool: definition.name,
        });
      },
    });
  });
}

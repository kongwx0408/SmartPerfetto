// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2024-2026 Gracker (Chris)
// This file is part of SmartPerfetto. See LICENSE for details.

export interface BreakpadFunction {
  address: bigint;
  size: bigint;
  parameterSize: bigint;
  name: string;
}

export interface BreakpadModule {
  os?: string;
  arch?: string;
  buildId?: string;
  moduleName?: string;
  functions: BreakpadFunction[];
}

export function parseBreakpadSym(text: string): BreakpadModule {
  const module: BreakpadModule = {functions: []};
  for (const line of text.replace(/\r\n?/g, '\n').split('\n')) {
    const moduleMatch = line.match(/^MODULE\s+(\S+)\s+(\S+)\s+(\S+)\s+(.+)$/);
    if (moduleMatch) {
      module.os = moduleMatch[1];
      module.arch = moduleMatch[2];
      module.buildId = moduleMatch[3];
      module.moduleName = moduleMatch[4].trim();
      continue;
    }
    const funcMatch = line.match(/^FUNC\s+([0-9a-fA-F]+)\s+([0-9a-fA-F]+)\s+([0-9a-fA-F]+)\s+(.+)$/);
    if (!funcMatch) continue;
    module.functions.push({
      address: BigInt(`0x${funcMatch[1]}`),
      size: BigInt(`0x${funcMatch[2]}`),
      parameterSize: BigInt(`0x${funcMatch[3]}`),
      name: funcMatch[4].trim(),
    });
  }
  module.functions.sort((a, b) => a.address < b.address ? -1 : a.address > b.address ? 1 : 0);
  return module;
}

export function resolveBreakpadAddress(
  module: BreakpadModule,
  address: bigint,
): {func: BreakpadFunction; offset: bigint} | undefined {
  for (const func of module.functions) {
    if (address >= func.address && address < func.address + func.size) {
      return {func, offset: address - func.address};
    }
  }
  return undefined;
}


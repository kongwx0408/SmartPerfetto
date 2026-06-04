// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2024-2026 Gracker (Chris)
// This file is part of SmartPerfetto. See LICENSE for details.

export interface R8ClassMapping {
  originalClass: string;
  obfuscatedClass: string;
  methods: R8MethodMapping[];
}

export interface R8MethodMapping {
  originalName: string;
  obfuscatedName: string;
  originalClass: string;
  obfuscatedClass: string;
  originalLineRange?: {start: number; end: number};
  obfuscatedLineRange?: {start: number; end: number};
  signature?: string;
}

export interface R8RetraceResult {
  success: boolean;
  originalClass?: string;
  originalName?: string;
  originalSymbol?: string;
  lineRange?: {start: number; end: number};
  inlineFrames: R8MethodMapping[];
  degradedReason?: 'no_mapping' | 'class_only';
}

function parseLineRange(value: string | undefined): {start: number; end: number} | undefined {
  if (!value) return undefined;
  const parts = value.split(':').map(part => Number(part));
  if (parts.length !== 2 || parts.some(part => !Number.isFinite(part))) return undefined;
  return {start: parts[0], end: parts[1]};
}

export function parseR8Mapping(text: string): R8ClassMapping[] {
  const classes: R8ClassMapping[] = [];
  let current: R8ClassMapping | undefined;
  for (const rawLine of text.replace(/\r\n?/g, '\n').split('\n')) {
    if (!rawLine.trim() || rawLine.trim().startsWith('#')) continue;
    const classMatch = rawLine.match(/^(\S.*?)\s+->\s+([A-Za-z0-9_.$]+):\s*$/);
    if (classMatch) {
      current = {
        originalClass: classMatch[1].trim(),
        obfuscatedClass: classMatch[2].trim(),
        methods: [],
      };
      classes.push(current);
      continue;
    }
    if (!current) continue;
    const line = rawLine.trim();
    const arrow = line.match(/^(.*?)\s+->\s+([A-Za-z_$][A-Za-z0-9_$]*)$/);
    if (!arrow) continue;
    const lhs = arrow[1].trim();
    const obfuscatedName = arrow[2].trim();
    const ranged = lhs.match(/^(?:(\d+:\d+):)?(.+?)(?::(\d+:\d+))?$/);
    if (!ranged) continue;
    const signature = ranged[2].trim();
    const nameMatch = signature.match(/([A-Za-z_$][A-Za-z0-9_$<>]*)\s*\([^)]*\)\s*$/);
    if (!nameMatch) continue;
    current.methods.push({
      originalName: nameMatch[1],
      obfuscatedName,
      originalClass: current.originalClass,
      obfuscatedClass: current.obfuscatedClass,
      ...(parseLineRange(ranged[3]) ? {originalLineRange: parseLineRange(ranged[3])} : {}),
      ...(parseLineRange(ranged[1]) ? {obfuscatedLineRange: parseLineRange(ranged[1])} : {}),
      signature,
    });
  }
  return classes;
}

export function retraceR8Symbol(
  mappings: readonly R8ClassMapping[],
  opts: {obfuscatedClass?: string; obfuscatedMethod?: string; obfuscatedSymbol?: string; line?: number},
): R8RetraceResult {
  const className = opts.obfuscatedClass ?? opts.obfuscatedSymbol?.split('.').slice(0, -1).join('.');
  const methodName = opts.obfuscatedMethod ?? opts.obfuscatedSymbol?.split('.').pop();
  const classMapping = mappings.find(mapping => mapping.obfuscatedClass === className);
  if (!classMapping) return {success: false, inlineFrames: [], degradedReason: 'no_mapping'};
  if (!methodName) {
    return {
      success: true,
      originalClass: classMapping.originalClass,
      originalSymbol: classMapping.originalClass,
      inlineFrames: [],
      degradedReason: 'class_only',
    };
  }
  const candidates = classMapping.methods.filter(method => method.obfuscatedName === methodName);
  const byLine = opts.line
    ? candidates.filter(method =>
        !method.obfuscatedLineRange ||
        (opts.line! >= method.obfuscatedLineRange.start && opts.line! <= method.obfuscatedLineRange.end))
    : candidates;
  const selected = byLine[0] ?? candidates[0];
  if (!selected) {
    return {
      success: true,
      originalClass: classMapping.originalClass,
      originalName: methodName,
      originalSymbol: `${classMapping.originalClass}.${methodName}`,
      inlineFrames: [],
      degradedReason: 'class_only',
    };
  }
  return {
    success: true,
    originalClass: selected.originalClass,
    originalName: selected.originalName,
    originalSymbol: `${selected.originalClass}.${selected.originalName}`,
    ...(selected.originalLineRange ? {lineRange: selected.originalLineRange} : {}),
    inlineFrames: byLine.length > 0 ? byLine : [selected],
  };
}


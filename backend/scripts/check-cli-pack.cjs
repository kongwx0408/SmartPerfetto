#!/usr/bin/env node
// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2024-2026 Gracker (Chris)
// This file is part of SmartPerfetto. See LICENSE for details.

const { execFileSync } = require('child_process');

const raw = execFileSync('npm', ['pack', '--dry-run', '--json', '--ignore-scripts'], {
  encoding: 'utf-8',
});
const pack = JSON.parse(raw)[0];
const files = new Set(pack.files.map((file) => file.path));
const failures = [];
const packageJsonEntry = pack.files.find((file) => file.path === 'package.json');
if (!packageJsonEntry) {
  failures.push('missing required package file: package.json');
}
const packageJson = require('../package.json');

const requiredFiles = [
  'LICENSE',
  'package.json',
  'dist/cli-user/bin.js',
  'dist/trace-processor-pin.env',
  'dist/perfetto-recording-tools-pin.env',
  'data/perfettoSqlIndex.light.json',
  'data/perfettoSqlIndex.json',
  'data/perfettoStdlibSymbols.json',
  'prebuilts/trace_processor/linux-x64/trace_processor_shell',
  'prebuilts/trace_processor/darwin-arm64/trace_processor_shell',
  'prebuilts/trace_processor/win32-x64/trace_processor_shell.exe',
  'prebuilts/android-platform-tools/README.md',
  'prebuilts/perfetto-recording-tools/README.md',
  'skills/composite/scrolling_analysis.skill.yaml',
  'strategies/scrolling.strategy.md',
];

for (const file of requiredFiles) {
  if (!files.has(file)) failures.push(`missing required package file: ${file}`);
}

for (const [name, binPath] of Object.entries(packageJson.bin ?? {})) {
  if (typeof binPath !== 'string') {
    failures.push(`bin entry ${name} must point to a string path`);
    continue;
  }
  if (!files.has(binPath)) failures.push(`bin entry ${name} points to missing package file: ${binPath}`);
}

for (const file of files) {
  if (file.includes('/__tests__/') || file.includes('__tests__/')) {
    failures.push(`test artifact should not be packed: ${file}`);
  }
  if (/\.test\.(js|d\.ts)(\.map)?$/.test(file)) {
    failures.push(`test artifact should not be packed: ${file}`);
  }
  if (file.startsWith('dist/tests/')) {
    failures.push(`test artifact should not be packed: ${file}`);
  }
}

if (failures.length > 0) {
  console.error('CLI package check failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(`CLI package check passed (${pack.entryCount} files, ${pack.unpackedSize} bytes unpacked).`);

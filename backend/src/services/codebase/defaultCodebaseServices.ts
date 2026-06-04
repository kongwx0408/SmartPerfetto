// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2024-2026 Gracker (Chris)
// This file is part of SmartPerfetto. See LICENSE for details.

import {backendLogPath} from '../../runtimePaths';
import {CodebaseRegistry} from './codebaseRegistry';

export const CODEBASE_REGISTRY_PATH = backendLogPath('codebase_registry.json');

let cachedRegistry: CodebaseRegistry | null = null;

export function getDefaultCodebaseRegistry(): CodebaseRegistry {
  if (!cachedRegistry) cachedRegistry = new CodebaseRegistry(CODEBASE_REGISTRY_PATH);
  return cachedRegistry;
}

export function resetDefaultCodebaseRegistryForTests(): void {
  cachedRegistry = null;
}

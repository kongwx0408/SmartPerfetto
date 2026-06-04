// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2024-2026 Gracker (Chris)
// This file is part of SmartPerfetto. See LICENSE for details.

import * as fs from 'fs';
import * as path from 'path';
import {createHash, randomUUID} from 'crypto';

import type {RagSourceKind} from '../../types/sparkContracts';

export type CodebaseKind = Extract<RagSourceKind, 'app_source' | 'aosp' | 'kernel_source' | 'oem_sdk'>;
const CODEBASE_KINDS: readonly CodebaseKind[] = ['app_source', 'aosp', 'kernel_source', 'oem_sdk'];

export interface CodebaseRef {
  codebaseId: string;
  kind: CodebaseKind;
  displayName: string;
  rootPath: string;
  rootRealpath: string;
  commitHash?: string;
  vendor?: string;
  buildId?: string;
  pathFilters?: string[];
  excludeGlobs?: string[];
  symbolMapPaths?: string[];
  licenseTag?: string;
  consent: {
    sendToProvider: boolean;
    consentedAt: number;
    consentedBy: string;
    consentHash: string;
  };
  indexGeneration: number;
  lastIngestAt?: number;
  lastIngestStatus?: 'ok' | 'partial' | 'failed' | 'blocked_by_security';
  lastIngestError?: string;
  chunkCount?: number;
  blockedFileCount?: number;
  redactionHitCount?: number;
  tenantId?: string;
  workspaceId?: string;
  userId?: string;
  createdAt: number;
  updatedAt: number;
}

export interface CodebaseRefSummary {
  codebaseId: string;
  kind: CodebaseRef['kind'];
  displayName: string;
  commitHash?: string;
  vendor?: string;
  buildId?: string;
  indexGeneration: number;
  chunkCount: number;
  eligibleForSendToProvider: boolean;
}

export interface RegisterCodebaseInput {
  kind: CodebaseKind;
  displayName: string;
  rootPath: string;
  rootRealpath?: string;
  commitHash?: string;
  vendor?: string;
  buildId?: string;
  pathFilters?: string[];
  excludeGlobs?: string[];
  symbolMapPaths?: string[];
  licenseTag?: string;
  sendToProvider?: boolean;
  consentedBy?: string;
  tenantId?: string;
  workspaceId?: string;
  userId?: string;
}

interface RegistryEnvelope {
  schemaVersion: 1;
  codebases: CodebaseRef[];
}

function consentHash(input: Pick<CodebaseRef, 'kind' | 'rootRealpath' | 'commitHash' | 'buildId' | 'vendor'>): string {
  return createHash('sha256')
    .update(JSON.stringify(input))
    .digest('hex')
    .slice(0, 16);
}

function toSummary(ref: CodebaseRef): CodebaseRefSummary {
  return {
    codebaseId: ref.codebaseId,
    kind: ref.kind,
    displayName: ref.displayName,
    ...(ref.commitHash ? {commitHash: ref.commitHash} : {}),
    ...(ref.vendor ? {vendor: ref.vendor} : {}),
    ...(ref.buildId ? {buildId: ref.buildId} : {}),
    indexGeneration: ref.indexGeneration,
    chunkCount: ref.chunkCount ?? 0,
    eligibleForSendToProvider: ref.consent.sendToProvider,
  };
}

export class CodebaseRegistry {
  private readonly registryPath: string;
  private readonly codebases = new Map<string, CodebaseRef>();
  private loaded = false;

  constructor(registryPath: string) {
    this.registryPath = registryPath;
  }

  load(): void {
    if (this.loaded) return;
    this.loaded = true;
    if (!fs.existsSync(this.registryPath)) return;
    try {
      const parsed = JSON.parse(fs.readFileSync(this.registryPath, 'utf-8')) as RegistryEnvelope;
      if (parsed.schemaVersion !== 1 || !Array.isArray(parsed.codebases)) return;
      for (const ref of parsed.codebases) {
        this.codebases.set(ref.codebaseId, ref);
      }
    } catch {
      // Preserve corrupt registry for operator inspection.
    }
  }

  register(input: RegisterCodebaseInput): CodebaseRef {
    this.load();
    if (!CODEBASE_KINDS.includes(input.kind)) {
      throw new Error(`Unsupported codebase kind: ${input.kind}`);
    }
    const rootRealpath = input.rootRealpath ?? fs.realpathSync(input.rootPath);
    const now = Date.now();
    const ref: CodebaseRef = {
      codebaseId: `cb_${randomUUID()}`,
      kind: input.kind,
      displayName: input.displayName,
      rootPath: input.rootPath,
      rootRealpath,
      ...(input.commitHash ? {commitHash: input.commitHash} : {}),
      ...(input.vendor ? {vendor: input.vendor} : {}),
      ...(input.buildId ? {buildId: input.buildId} : {}),
      ...(input.pathFilters ? {pathFilters: input.pathFilters} : {}),
      ...(input.excludeGlobs ? {excludeGlobs: input.excludeGlobs} : {}),
      ...(input.symbolMapPaths ? {symbolMapPaths: input.symbolMapPaths} : {}),
      ...(input.licenseTag ? {licenseTag: input.licenseTag} : {}),
      consent: {
        sendToProvider: input.sendToProvider ?? false,
        consentedAt: now,
        consentedBy: input.consentedBy ?? input.userId ?? 'local-user',
        consentHash: consentHash({
          kind: input.kind,
          rootRealpath,
          commitHash: input.commitHash,
          buildId: input.buildId,
          vendor: input.vendor,
        }),
      },
      indexGeneration: 1,
      ...(input.tenantId ? {tenantId: input.tenantId} : {}),
      ...(input.workspaceId ? {workspaceId: input.workspaceId} : {}),
      ...(input.userId ? {userId: input.userId} : {}),
      createdAt: now,
      updatedAt: now,
    };
    this.codebases.set(ref.codebaseId, ref);
    this.persist();
    return ref;
  }

  get(codebaseId: string): CodebaseRef | undefined {
    this.load();
    return this.codebases.get(codebaseId);
  }

  list(): CodebaseRefSummary[] {
    this.load();
    return Array.from(this.codebases.values()).map(toSummary);
  }

  updateIngestStatus(codebaseId: string, patch: Pick<CodebaseRef, 'lastIngestStatus'> & Partial<CodebaseRef>): void {
    this.load();
    const existing = this.codebases.get(codebaseId);
    if (!existing) return;
    this.codebases.set(codebaseId, {
      ...existing,
      ...patch,
      updatedAt: Date.now(),
    });
    this.persist();
  }

  private persist(): void {
    const dir = path.dirname(this.registryPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, {recursive: true});
    const tmp = `${this.registryPath}.tmp.${process.pid}.${Math.random().toString(36).slice(2)}`;
    const envelope: RegistryEnvelope = {
      schemaVersion: 1,
      codebases: Array.from(this.codebases.values()),
    };
    fs.writeFileSync(tmp, JSON.stringify(envelope, null, 2), 'utf-8');
    fs.renameSync(tmp, this.registryPath);
  }
}

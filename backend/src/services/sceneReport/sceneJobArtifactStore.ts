// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2024-2026 Gracker (Chris)
// This file is part of SmartPerfetto. See LICENSE for details.

/**
 * Out-of-band storage for Smart Scene job payloads.
 *
 * Smart reports persist only bounded projections in SceneReport JSON. When a
 * projection omits rows, the full job payload is written here and referenced by
 * jobs[].result.projection.artifactRef so the projection never points at lost
 * evidence.
 */

import crypto from 'crypto';
import fsp from 'fs/promises';
import path from 'path';
import type { SceneJobProjection } from '../../agent/scene/types';

export interface SceneJobArtifactPayload {
  traceId: string;
  jobId: string;
  displayedSceneId: string;
  skillId: string;
  displayResults: unknown[];
  dataEnvelopes: unknown[];
  createdAt: number;
}

export interface SceneJobArtifactStore {
  save(
    payload: SceneJobArtifactPayload,
  ): Promise<NonNullable<SceneJobProjection['artifactRef']>>;
  load?(artifactId: string): Promise<SceneJobArtifactPayload | null>;
}

export class FileSystemSceneJobArtifactStore implements SceneJobArtifactStore {
  constructor(private readonly artifactDir: string) {}

  async save(
    payload: SceneJobArtifactPayload,
  ): Promise<NonNullable<SceneJobProjection['artifactRef']>> {
    await fsp.mkdir(this.artifactDir, { recursive: true });
    const body = `${JSON.stringify(payload, null, 2)}\n`;
    const checksum = crypto.createHash('sha256').update(body).digest('hex');
    const sizeBytes = Buffer.byteLength(body, 'utf8');
    const artifactId = `scene-job-${sanitizeId(payload.jobId)}-${checksum.slice(0, 12)}`;
    const target = this.artifactPath(artifactId);
    const tmp = path.join(
      this.artifactDir,
      `${artifactId}.${process.pid}.${Date.now()}.tmp`,
    );

    await fsp.writeFile(tmp, body, 'utf8');
    await fsp.rename(tmp, target);

    return {
      artifactId,
      artifactType: 'scene_job_envelopes',
      sizeBytes,
      checksum,
    };
  }

  async load(artifactId: string): Promise<SceneJobArtifactPayload | null> {
    try {
      const raw = await fsp.readFile(this.artifactPath(artifactId), 'utf8');
      return JSON.parse(raw) as SceneJobArtifactPayload;
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === 'ENOENT') return null;
      throw err;
    }
  }

  private artifactPath(artifactId: string): string {
    if (!/^scene-job-[a-zA-Z0-9_.-]+$/.test(artifactId)) {
      throw new Error(`Invalid scene job artifact id: ${artifactId}`);
    }
    return path.join(this.artifactDir, `${artifactId}.json`);
  }
}

function sanitizeId(value: string): string {
  const safe = value.replace(/[^a-zA-Z0-9_.-]+/g, '-').slice(0, 120);
  return safe || 'job';
}

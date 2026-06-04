// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2024-2026 Gracker (Chris)
// This file is part of SmartPerfetto. See LICENSE for details.

export type IdentityContractVersion = 'identity_contract@1';
export type TraceTimestampNs = string | number;

export type IdentityTraceSide = 'current' | 'reference' | 'unknown';

export type IdentityRole =
  | 'app_main'
  | 'render_thread'
  | 'binder_thread'
  | 'producer'
  | 'surfaceflinger'
  | 'hwc'
  | 'unknown';

export type IdentityResolutionStatus =
  | 'verified'
  | 'ambiguous'
  | 'weak'
  | 'missing'
  | 'not_required'
  | 'error';

export interface AnalysisIdentityTargetV1 {
  traceId: string;
  traceSide?: IdentityTraceSide;
  packageName?: string;
  processName?: string;
  threadName?: string;
  role?: IdentityRole;
  upid?: number;
  utid?: number;
  pid?: number;
  tid?: number;
  timeRange?: { startTs: TraceTimestampNs; endTs: TraceTimestampNs };
  source: 'user_param' | 'skill_param' | 'selection' | 'visible_window' | 'sql_filter' | 'derived';
}

export interface ResolvedProcessIdentityV1 {
  upid: number;
  pid?: number;
  processName?: string;
  packageName?: string;
  startTs?: TraceTimestampNs;
  endTs?: TraceTimestampNs;
  matchSources: string[];
  confidence: number;
}

export interface ResolvedThreadIdentityV1 {
  utid: number;
  tid?: number;
  threadName?: string;
  role?: IdentityRole;
  owningUpid?: number;
  processName?: string;
  activeRange?: { startTs?: TraceTimestampNs; endTs?: TraceTimestampNs };
  matchSources: string[];
  confidence: number;
}

export interface IdentityResolutionV1 {
  version: IdentityContractVersion;
  identityRefId: string;
  target: AnalysisIdentityTargetV1;
  status: IdentityResolutionStatus;
  processes: ResolvedProcessIdentityV1[];
  threads: ResolvedThreadIdentityV1[];
  warnings: string[];
  recommendedParams?: Record<string, string | number | boolean>;
}

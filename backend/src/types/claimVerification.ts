// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2024-2026 Gracker (Chris)
// This file is part of SmartPerfetto. See LICENSE for details.

export type ClaimVerificationSchemaVersion = 'claim_verifier@1';

export type ClaimVerificationStatus = 'passed' | 'failed' | 'partial' | 'not_checked';
export type ClaimVerificationPolicy = 'block' | 'retry' | 'warn_only' | 'record_only';
export type ClaimVerificationClaimStatus =
  | 'verified'
  | 'partial'
  | 'inference'
  | 'unsupported'
  | 'not_checked';

export type ClaimReferenceVerificationStatus =
  | 'matched'
  | 'missing'
  | 'ambiguous'
  | 'value_mismatch'
  | 'not_checked';

export interface ClaimReferenceVerificationResult {
  evidenceRefId?: string;
  sourceRef?: string;
  artifactId?: string;
  sourceToolCallId?: string;
  status: ClaimReferenceVerificationStatus;
  message?: string;
}

export interface ClaimVerificationClaimResult {
  claimId: string;
  status: ClaimVerificationClaimStatus;
  referenceResults?: ClaimReferenceVerificationResult[];
}

export interface ClaimVerificationIssue {
  claimId: string;
  severity: 'error' | 'warning';
  code: string;
  message: string;
  evidenceRefId?: string;
}

export interface ClaimVerificationResult {
  schemaVersion: ClaimVerificationSchemaVersion;
  status: ClaimVerificationStatus;
  policy: ClaimVerificationPolicy;
  notCheckedReason?: string;
  /** Compatibility boolean. Must equal status === 'passed'. */
  passed: boolean;
  checkedClaimCount: number;
  unsupportedClaimCount: number;
  claimResults: ClaimVerificationClaimResult[];
  issues: ClaimVerificationIssue[];
}

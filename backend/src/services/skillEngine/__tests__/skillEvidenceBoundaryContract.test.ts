// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2024-2026 Gracker (Chris)
// This file is part of SmartPerfetto. See LICENSE for details.

import fs from 'fs';
import path from 'path';
import { describe, expect, it } from '@jest/globals';

const repoRoot = path.resolve(__dirname, '../../../..');

function readBackendFile(relativePath: string): string {
  return fs.readFileSync(path.join(repoRoot, relativePath), 'utf8');
}

describe('Skill evidence boundary contracts', () => {
  it('keeps network_analysis scoped to packet evidence unless request telemetry exists', () => {
    const content = readBackendFile('skills/composite/network_analysis.skill.yaml');

    expect(content).toContain('id: evidence_scope');
    expect(content).toContain('trace_direct:packet_activity');
    expect(content).toContain('不能直接证明 DNS/TCP/TLS/TTFB/请求体/响应体/解码/服务端处理阶段耗时');
    expect(content).toContain('HTTPDNS 缓存/TTL');
    expect(content).toContain('ECH/CT/local-network permission/NetworkCallback');
    expect(content).toContain('OkHttp/Cronet/HttpEngine/自研网络库阶段埋点');
    expect(content).toContain('NETWORK_DNS_PACKET_ACTIVITY');
    expect(content).toContain('当前 packet trace 不能直接证明 DNS 阶段耗时或请求延迟');
    expect(content).not.toContain('DNS 查询频繁，可能导致网络延迟');
  });

  it('keeps wakelock vitals hints tied to the observed window', () => {
    const content = readBackendFile('skills/atomic/android_kernel_wakelock_summary.skill.yaml');

    expect(content).toContain('observed_window_hours');
    expect(content).toContain('evidence_scope');
    expect(content).toContain('partial_trace_window');
    expect(content).toContain('partial_window_not_vitals_judgment');
    expect(content).not.toContain('excessive_if_24h_window');
  });
});

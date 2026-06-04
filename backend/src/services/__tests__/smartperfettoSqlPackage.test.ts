// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2024-2026 Gracker (Chris)
// This file is part of SmartPerfetto. See LICENSE for details.

import {describe, it, expect} from '@jest/globals';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import {
  loadSmartPerfettoSqlPackage,
  readSmartPerfettoSqlSymbol,
} from '../smartperfettoSqlPackage';
import {isUnsupported} from '../../types/sparkContracts';

describe('smartperfettoSqlPackage', () => {
  it('loads the real bundled package', () => {
    const contract = loadSmartPerfettoSqlPackage();
    expect(isUnsupported(contract)).toBe(false);
    expect(contract.symbols.length).toBeGreaterThan(0);
    expect(contract.symbols[0].dependencies?.length).toBeGreaterThan(0);
    expect(contract.bootSnippet).toMatch(/INCLUDE PERFETTO MODULE/);
    expect(contract.coverage.find(c => c.sparkId === 3)?.status).toBe('implemented');
  });

  it('reads raw SQL for a symbol', () => {
    const result = readSmartPerfettoSqlSymbol('smartperfetto.scrolling.jank_frames');
    expect(result).not.toBeNull();
    if (result) {
      expect(result.sql).toMatch(/CREATE PERFETTO VIEW/);
    }
  });

  it('marks the contract unsupported when PACKAGE.json is missing', () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'smp-sql-'));
    const contract = loadSmartPerfettoSqlPackage(tmp);
    expect(isUnsupported(contract)).toBe(true);
    expect(contract.symbols).toHaveLength(0);
    fs.rmSync(tmp, {recursive: true, force: true});
  });

  it('moves missing-file symbols into removed[] rather than dropping them', () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'smp-sql-'));
    const manifest = {
      packageVersion: '0.0.1',
      symbols: [
        {
          name: 'smartperfetto.test.never_built',
          kind: 'view',
          module: 'never/built.sql',
          stability: 'experimental',
        },
      ],
    };
    fs.writeFileSync(path.join(tmp, 'PACKAGE.json'), JSON.stringify(manifest), 'utf-8');
    const contract = loadSmartPerfettoSqlPackage(tmp);
    expect(contract.symbols).toHaveLength(0);
    expect(contract.removed && contract.removed[0].name).toBe(
      'smartperfetto.test.never_built',
    );
    fs.rmSync(tmp, {recursive: true, force: true});
  });
});

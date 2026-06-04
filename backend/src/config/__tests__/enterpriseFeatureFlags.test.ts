// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2024-2026 Gracker (Chris)
// This file is part of SmartPerfetto. See LICENSE for details.

import { describe, expect, it } from '@jest/globals';
import {
  DEFAULT_BACKEND_PORT,
  DEFAULT_FRONTEND_PORT,
  ENTERPRISE_FEATURE_FLAG_ENV,
  resolveFeatureConfig,
  resolveServerConfig,
  SMARTPERFETTO_BACKEND_PORT_ENV,
  SMARTPERFETTO_FRONTEND_PORT_ENV,
} from '../index';

describe('enterprise feature flag', () => {
  it('defaults enterprise mode off', () => {
    expect(resolveFeatureConfig({}).enterprise).toBe(false);
  });

  it.each(['1', 'true', 'TRUE', 'yes', 'on', 'enabled'])(
    'enables enterprise mode for %s',
    (value) => {
      expect(resolveFeatureConfig({ [ENTERPRISE_FEATURE_FLAG_ENV]: value }).enterprise).toBe(true);
    }
  );

  it.each(['0', 'false', 'FALSE', 'no', 'off', 'disabled'])(
    'keeps enterprise mode off for %s',
    (value) => {
      expect(resolveFeatureConfig({ [ENTERPRISE_FEATURE_FLAG_ENV]: value }).enterprise).toBe(false);
    }
  );

  it('does not enable enterprise mode for unknown values', () => {
    expect(resolveFeatureConfig({ [ENTERPRISE_FEATURE_FLAG_ENV]: 'enterprise' }).enterprise).toBe(false);
  });
});

describe('server port config', () => {
  it('keeps default backend and frontend ports', () => {
    expect(resolveServerConfig({}).port).toBe(DEFAULT_BACKEND_PORT);
    expect(resolveServerConfig({}).frontendPort).toBe(DEFAULT_FRONTEND_PORT);
  });

  it('prefers SMARTPERFETTO_BACKEND_PORT over PORT', () => {
    expect(resolveServerConfig({
      PORT: '3100',
      [SMARTPERFETTO_BACKEND_PORT_ENV]: '3200',
    }).port).toBe(3200);
  });

  it('falls back to PORT when the preferred backend port is invalid', () => {
    expect(resolveServerConfig({
      PORT: '3100',
      [SMARTPERFETTO_BACKEND_PORT_ENV]: '3000abc',
    }).port).toBe(3100);
  });

  it('rejects out-of-range frontend ports and keeps the default', () => {
    expect(resolveServerConfig({
      [SMARTPERFETTO_FRONTEND_PORT_ENV]: '70000',
    }).frontendPort).toBe(DEFAULT_FRONTEND_PORT);
  });

  it('includes the configured frontend port in default CORS origins', () => {
    expect(resolveServerConfig({
      [SMARTPERFETTO_FRONTEND_PORT_ENV]: '11000',
    }).corsOrigins).toEqual(expect.arrayContaining([
      'http://localhost:11000',
      'http://127.0.0.1:11000',
    ]));
  });
});

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2024-2026 Gracker (Chris)
// This file is part of SmartPerfetto. See LICENSE for details.

import { parseSlashCommand } from '../slashCommands';

describe('parseSlashCommand', () => {
  test('empty input is noop', () => {
    expect(parseSlashCommand('')).toEqual({ kind: 'noop' });
    expect(parseSlashCommand('   ')).toEqual({ kind: 'noop' });
  });

  test('non-slash text becomes /ask shorthand', () => {
    expect(parseSlashCommand('what is jank')).toEqual({ kind: 'ask', query: 'what is jank' });
  });

  test('non-slash text preserves multi-word and embedded slashes', () => {
    expect(parseSlashCommand('how does /api/v1/foo work')).toEqual({
      kind: 'ask',
      query: 'how does /api/v1/foo work',
    });
  });

  test('/load with path', () => {
    expect(parseSlashCommand('/load /tmp/foo.pftrace')).toEqual({
      kind: 'load',
      path: '/tmp/foo.pftrace',
    });
  });

  test('/load without path returns usage', () => {
    expect(parseSlashCommand('/load')).toEqual({
      kind: 'usage',
      command: 'load',
      hint: '/load <trace-path>',
    });
  });

  test('/ask with multi-word question', () => {
    expect(parseSlashCommand('/ask why is this jank')).toEqual({
      kind: 'ask',
      query: 'why is this jank',
    });
  });

  test('/resume with id', () => {
    expect(parseSlashCommand('/resume agent-123-abc')).toEqual({
      kind: 'resume',
      sessionId: 'agent-123-abc',
    });
  });

  test('/report alone — open=false', () => {
    expect(parseSlashCommand('/report')).toEqual({ kind: 'report', open: false });
  });

  test('/report --open sets open=true', () => {
    expect(parseSlashCommand('/report --open')).toEqual({ kind: 'report', open: true });
  });

  test('/focus, /clear, /help, /exit, /quit', () => {
    expect(parseSlashCommand('/focus')).toEqual({ kind: 'focus' });
    expect(parseSlashCommand('/clear')).toEqual({ kind: 'clear' });
    expect(parseSlashCommand('/help')).toEqual({ kind: 'help' });
    expect(parseSlashCommand('/?')).toEqual({ kind: 'help' });
    expect(parseSlashCommand('/exit')).toEqual({ kind: 'exit' });
    expect(parseSlashCommand('/quit')).toEqual({ kind: 'exit' });
  });

  test('case-insensitive command names', () => {
    expect(parseSlashCommand('/EXIT')).toEqual({ kind: 'exit' });
    expect(parseSlashCommand('/Help')).toEqual({ kind: 'help' });
  });

  test('unknown command surfaces command name', () => {
    expect(parseSlashCommand('/foobar')).toEqual({ kind: 'unknown', command: 'foobar' });
  });

  test('argument with internal whitespace is preserved', () => {
    expect(parseSlashCommand('/ask   spaces   inside  ')).toEqual({
      kind: 'ask',
      query: 'spaces   inside',
    });
  });
});

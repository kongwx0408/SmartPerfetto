// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2024-2026 Gracker (Chris)
// This file is part of SmartPerfetto. See LICENSE for details.

import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import {describe, it, expect, beforeEach, afterEach} from '@jest/globals';
import express from 'express';
import request from 'supertest';

import {createCaseRoutes} from '../caseRoutes';
import {CaseLibrary} from '../../services/caseLibrary';
import {CaseGraph} from '../../services/caseGraph';
import {
  type CaseEdge,
  type CaseNode,
  makeSparkProvenance,
} from '../../types/sparkContracts';

let tmpDir: string;
let library: CaseLibrary;
let graph: CaseGraph;
let app: express.Express;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'case-routes-test-'));
  library = new CaseLibrary(path.join(tmpDir, 'cases.json'));
  graph = new CaseGraph(path.join(tmpDir, 'edges.json'));
  app = express();
  app.use(express.json({limit: '5mb'}));
  app.use('/api/cases', createCaseRoutes(library, graph));
});

afterEach(() => {
  if (fs.existsSync(tmpDir)) {
    fs.rmSync(tmpDir, {recursive: true, force: true});
  }
});

function makeCase(overrides: Partial<CaseNode> = {}): CaseNode {
  return {
    ...makeSparkProvenance({source: 'case-routes-test'}),
    caseId: 'case-001',
    title: 'Heavy mixed scrolling',
    status: 'draft',
    redactionState: 'raw',
    traceArtifactId: 'artifact-001',
    tags: ['scrolling'],
    findings: [{id: 'f1', severity: 'critical', title: 'Binder S>5ms'}],
    ...overrides,
  };
}

function makeEdge(overrides: Partial<CaseEdge> = {}): CaseEdge {
  return {
    edgeId: 'e1',
    fromCaseId: 'a',
    toCaseId: 'b',
    relation: 'similar_root_cause',
    ...overrides,
  };
}

describe('POST /api/cases', () => {
  it('saves a draft case', async () => {
    const c = makeCase();
    const res = await request(app).post('/api/cases').send(c);
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
  });

  it('rejects published-status saves with 400 (use /publish)', async () => {
    const c = makeCase({status: 'published', redactionState: 'redacted'});
    const res = await request(app).post('/api/cases').send(c);
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/publishCase/);
  });

  it('400 on missing required fields', async () => {
    const res = await request(app).post('/api/cases').send({});
    expect(res.status).toBe(400);
  });
});

describe('GET /api/cases', () => {
  it('lists cases with count', async () => {
    library.saveCase(makeCase({caseId: 'a'}));
    library.saveCase(makeCase({caseId: 'b'}));
    const res = await request(app).get('/api/cases');
    expect(res.status).toBe(200);
    expect(res.body.count).toBe(2);
  });

  it('filters by status', async () => {
    library.saveCase(makeCase({caseId: 'a', status: 'draft'}));
    library.saveCase(makeCase({caseId: 'b', status: 'reviewed'}));
    const res = await request(app).get('/api/cases?status=reviewed');
    expect(res.body.count).toBe(1);
    expect(res.body.cases[0].caseId).toBe('b');
  });

  it('filters by tag', async () => {
    library.saveCase(makeCase({caseId: 'a', tags: ['scrolling']}));
    library.saveCase(makeCase({caseId: 'b', tags: ['anr']}));
    const res = await request(app).get('/api/cases?tag=scrolling');
    expect(res.body.count).toBe(1);
    expect(res.body.cases[0].caseId).toBe('a');
  });
});

describe('GET / DELETE /api/cases/:caseId', () => {
  it('returns 200 + case body for known id', async () => {
    library.saveCase(makeCase({caseId: 'a'}));
    const res = await request(app).get('/api/cases/a');
    expect(res.status).toBe(200);
    expect(res.body.case.caseId).toBe('a');
  });

  it('returns 404 for unknown id', async () => {
    const res = await request(app).get('/api/cases/missing');
    expect(res.status).toBe(404);
  });

  it('DELETE removes the case', async () => {
    library.saveCase(makeCase({caseId: 'a'}));
    const res = await request(app).delete('/api/cases/a');
    expect(res.status).toBe(200);
    expect(library.getCase('a')).toBeUndefined();
  });
});

describe('POST /api/cases/:caseId/publish', () => {
  it('publishes when redactionState is redacted + reviewer supplied', async () => {
    library.saveCase(makeCase({caseId: 'a', redactionState: 'redacted'}));
    const res = await request(app)
      .post('/api/cases/a/publish')
      .send({reviewer: 'chris'});
    expect(res.status).toBe(200);
    expect(res.body.case.status).toBe('published');
    expect(res.body.case.curatedBy).toBe('chris');
  });

  it('returns 400 when redactionState != redacted', async () => {
    library.saveCase(makeCase({caseId: 'a', redactionState: 'partial'}));
    const res = await request(app)
      .post('/api/cases/a/publish')
      .send({reviewer: 'chris'});
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/redactionState/);
  });

  it('returns 400 when reviewer is missing', async () => {
    library.saveCase(makeCase({caseId: 'a', redactionState: 'redacted'}));
    const res = await request(app).post('/api/cases/a/publish').send({});
    expect(res.status).toBe(400);
  });

  it('returns 404 when case is missing', async () => {
    const res = await request(app)
      .post('/api/cases/missing/publish')
      .send({reviewer: 'chris'});
    expect(res.status).toBe(404);
  });
});

describe('POST /api/cases/:caseId/archive', () => {
  it('archives a case with reason', async () => {
    library.saveCase(makeCase({caseId: 'a'}));
    const res = await request(app)
      .post('/api/cases/a/archive')
      .send({reason: 'archived after 90 days'});
    expect(res.status).toBe(200);
    expect(res.body.case.traceArtifactId).toBeUndefined();
    expect(res.body.case.traceUnavailableReason).toBe(
      'archived after 90 days',
    );
  });

  it('returns 400 when reason is missing', async () => {
    library.saveCase(makeCase({caseId: 'a'}));
    const res = await request(app).post('/api/cases/a/archive').send({});
    expect(res.status).toBe(400);
  });

  it('returns 404 when case is missing', async () => {
    const res = await request(app)
      .post('/api/cases/missing/archive')
      .send({reason: 'gone'});
    expect(res.status).toBe(404);
  });
});

describe('Edge endpoints', () => {
  it('POST /api/cases/edges adds an edge', async () => {
    const res = await request(app).post('/api/cases/edges').send(makeEdge());
    expect(res.status).toBe(201);
    expect(graph.size()).toBe(1);
  });

  it('POST /api/cases/edges rejects self-loops as 400', async () => {
    const res = await request(app)
      .post('/api/cases/edges')
      .send(makeEdge({edgeId: 'self', fromCaseId: 'x', toCaseId: 'x'}));
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/self-loop/i);
  });

  it('POST /api/cases/edges rejects malformed body', async () => {
    const res = await request(app).post('/api/cases/edges').send({});
    expect(res.status).toBe(400);
  });

  it('GET /api/cases/edges lists all edges', async () => {
    graph.addEdge(makeEdge({edgeId: 'e1'}));
    graph.addEdge(makeEdge({edgeId: 'e2', relation: 'before_after_fix'}));
    const res = await request(app).get('/api/cases/edges');
    expect(res.body.count).toBe(2);
  });

  it('GET /api/cases/edges/:caseId returns related entries', async () => {
    graph.addEdge(makeEdge({edgeId: 'e1', fromCaseId: 'a', toCaseId: 'b'}));
    graph.addEdge(
      makeEdge({
        edgeId: 'e2',
        fromCaseId: 'c',
        toCaseId: 'a',
        relation: 'same_app',
      }),
    );
    const res = await request(app).get('/api/cases/edges/a?direction=in');
    expect(res.body.count).toBe(1);
    expect(res.body.related[0].caseId).toBe('c');
  });

  it('DELETE /api/cases/edges/:edgeId removes', async () => {
    graph.addEdge(makeEdge({edgeId: 'e1'}));
    const res = await request(app).delete('/api/cases/edges/e1');
    expect(res.status).toBe(200);
    expect(graph.size()).toBe(0);
  });

  it('DELETE /api/cases/edges/:edgeId returns 404 for missing edge', async () => {
    const res = await request(app).delete('/api/cases/edges/missing');
    expect(res.status).toBe(404);
  });
});

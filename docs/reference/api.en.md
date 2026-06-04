# API Reference

[English](api.en.md) | [中文](api.md)

The default backend address is `http://localhost:3000`. Set
`SMARTPERFETTO_BACKEND_PORT` to use a different backend port. If
`SMARTPERFETTO_API_KEY` is set, protected APIs require:

```http
Authorization: Bearer <token>
```

## Health

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/health` | Backend status, runtime, model configuration, auth status |
| `GET` | `/debug` | Development diagnostics and legacy API usage snapshot |

## Trace Management

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/api/traces/health` | Trace service health |
| `POST` | `/api/traces/upload` | Upload a trace file with field name `file` |
| `GET` | `/api/traces` | List known traces |
| `GET` | `/api/traces/stats` | Trace statistics |
| `POST` | `/api/traces/cleanup` | Cleanup trace data |
| `POST` | `/api/traces/register-rpc` | Register an external trace_processor RPC endpoint |
| `GET` | `/api/traces/:id` | Trace metadata |
| `DELETE` | `/api/traces/:id` | Delete a trace |
| `GET` | `/api/traces/:id/file` | Download a trace file |

Upload example:

```bash
curl -F "file=@trace.pftrace" http://localhost:3000/api/traces/upload
```

## Agent v1 Main Path

Base path: `/api/agent/v1`

| Method | Path | Purpose |
|---|---|---|
| `POST` | `/analyze` | Start analysis |
| `GET` | `/:sessionId/stream` | Subscribe to SSE |
| `GET` | `/:sessionId/status` | Poll status |
| `GET` | `/:sessionId/turns` | Get multi-turn history |
| `GET` | `/:sessionId/turns/:turnId` | Get a single turn |
| `POST` | `/resume` | Resume an existing session |
| `POST` | `/:sessionId/respond` | Continue an awaiting-user session |
| `POST` | `/:sessionId/intervene` | User intervention endpoint; agentv3 gracefully rejects unsupported runtime abilities |
| `POST` | `/:sessionId/cancel` | Cancel analysis |
| `POST` | `/:sessionId/interaction` | Record UI interaction |
| `GET` | `/:sessionId/focus` | Query focus state |
| `GET` | `/:sessionId/report` | Fetch generated report |
| `DELETE` | `/:sessionId` | Delete a session |
| `POST` | `/:sessionId/feedback` | Submit feedback into the self-improving path |
| `POST` | `/scene-detect-quick` | Quick scene detection |
| `POST` | `/teaching/pipeline` | Rendering pipeline teaching |
| `GET` | `/sessions` | Session catalog |
| `GET` | `/logs` | Agent logs, gated by feature flag |

Start analysis:

```bash
curl -X POST http://localhost:3000/api/agent/v1/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "traceId": "trace-id",
    "query": "Analyze scrolling jank",
    "options": {
      "analysisMode": "auto"
    }
  }'
```

The response returns `sessionId`. Then subscribe:

```bash
curl -N http://localhost:3000/api/agent/v1/<sessionId>/stream
```

Dual-trace comparison requires `referenceTraceId`, and it must be different from `traceId`.

Smart analysis uses the same `/analyze` endpoint. The first request should usually run only the scene inventory:

```json
{
  "traceId": "trace-id",
  "query": "/smart",
  "options": {
    "analysisMode": "auto",
    "preset": "smart",
    "smartAction": "preview"
  }
}
```

When the preview completes, the `analysis_completed` payload includes `smartScenePreview.reportId` and the selectable scene ranges. Submit the selected scope with another `/analyze` request:

```json
{
  "traceId": "trace-id",
  "query": "/smart",
  "options": {
    "analysisMode": "auto",
    "preset": "smart",
    "smartAction": "analyze",
    "smartSelection": {
      "scope": "scene_types",
      "sceneTypes": ["scroll", "inertial_scroll"],
      "reportId": "scene-report-id"
    }
  }
}
```

`smartSelection.scope` accepts `all`, `scene_types`, and `scene_ids`. Smart analysis currently rejects `referenceTraceId` and existing-session continuation runs.

## Scene Reconstruction

Base path: `/api/agent/v1`

| Method | Path | Purpose |
|---|---|---|
| `POST` | `/scene-reconstruct/preview` | Check cache and estimate cost without starting heavy work |
| `GET` | `/scene-reconstruct/report/:reportId` | Fetch a persisted SceneReport |
| `POST` | `/scene-reconstruct` | Start scene reconstruction |
| `GET` | `/scene-reconstruct/:analysisId/stream` | Subscribe to scene reconstruction SSE |
| `GET` | `/scene-reconstruct/:analysisId/tracks` | Fetch tracks |
| `GET` | `/scene-reconstruct/:analysisId/status` | Poll status |
| `POST` | `/scene-reconstruct/:analysisId/deep-dive` | Deep-dive one scene |
| `POST` | `/scene-reconstruct/:analysisId/cancel` | Cancel |
| `DELETE` | `/scene-reconstruct/:analysisId` | Delete |

This capability is controlled by `FEATURE_AGENT_SCENE_RECONSTRUCT`.

## Reports and Export

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/api/reports/:reportId` | Fetch report |
| `DELETE` | `/api/reports/:reportId` | Delete report |
| `POST` | `/api/export/result` | Export one result |
| `POST` | `/api/export/session` | Export session |
| `POST` | `/api/export/analysis` | Export analysis |
| `GET` | `/api/export/formats` | Supported formats |

## Legacy and Compatibility APIs

The following APIs still exist, but new integrations should prefer `/api/agent/v1/*`:

- `/api/perfetto-sql/*`
- `/api/template-analysis/*`

The legacy agent API base is rejected by `rejectLegacyAgentApi` to avoid new external use of deprecated paths. Legacy direct AI routes such as `/api/advanced-ai/*`, `/api/auto-analysis/*`, and `/api/agent/v1/llm/*` have been removed; use `/api/agent/v1/analyze`.

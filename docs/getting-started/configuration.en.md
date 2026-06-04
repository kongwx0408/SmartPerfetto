# Configuration Guide

[English](configuration.en.md) | [中文](configuration.md)

For local source runs, SmartPerfetto can use Claude Code's local authentication and configuration directly. If `claude` already works in the same terminal, you do not need to create `.env`. Use env files when you need explicit API keys, compatible proxies, or Docker runtime credentials.

## First Answer: Which Runtime Do I Configure?

Claude Code, OpenAI Agents SDK, Pi Agent Core, and OpenCode are alternative runtime paths, not a checklist of required setup steps. Pick one source for your first setup:

| What you have | Recommended path | What to configure |
|---|---|---|
| You do not want to edit env files, or you use Docker/portable packages | UI Provider Manager | Add the provider key on the `Providers` tab, test it, then activate it |
| Local source run where `claude` already works in the same terminal | Local Claude Code config | No `.env`, no `OPENAI_*` variables |
| Anthropic API key or a Claude/Anthropic-compatible provider | Claude Agent SDK | `ANTHROPIC_*` + `CLAUDE_*` |
| OpenAI API key, Ollama, or an OpenAI-compatible provider | OpenAI Agents SDK | `SMARTPERFETTO_AGENT_RUNTIME=openai-agents-sdk` + `OPENAI_*` |
| Pi Agent Core model configuration | Pi Agent Core | Custom Provider Manager profile or `SMARTPERFETTO_AGENT_RUNTIME=pi-agent-core` + `SMARTPERFETTO_PI_AGENT_CORE_MODEL_JSON` |
| OpenCode model configuration | OpenCode | Custom Provider Manager profile or `SMARTPERFETTO_AGENT_RUNTIME=opencode` + OpenAI-compatible fields or `SMARTPERFETTO_OPENCODE_MODEL_JSON` |

If a third-party provider exposes both Claude-compatible and OpenAI-compatible endpoints, the UI can store both endpoints and one shared key, but only one side is active at runtime. With `.env` only, uncomment either the Claude-compatible block or the OpenAI-compatible block; do not enable both just to be "complete."

The AI Assistant settings panel in Perfetto UI has two configuration areas: the `Connection` tab configures the SmartPerfetto backend URL, and the `Providers` tab configures model-provider profiles. The advanced backend auth token on the `Connection` tab is optional; fill it only when the backend was started with `SMARTPERFETTO_API_KEY`. It is not a model-provider key field. Model-provider credentials can come from Claude Code local config, from the backend/Docker env files below, or from Provider Manager profiles created in the frontend.

For beginners, the UI path is the least ambiguous:

1. Start SmartPerfetto and open `http://localhost:10000`.
2. Open **AI Assistant Settings → Providers → Add Provider**.
3. Choose the provider type, paste the **Provider API Key**, then check the preset Base URLs and SDK Runtime.
4. Click **Create Provider**. This only saves the profile.
5. Back in the provider list, click the plug icon to test the connection, then click the provider row or choose it in the provider switcher to activate it.
6. Verify with `/health`. `aiEngine.credentialSource=provider-manager` means the UI provider is active; `env-or-default` means SmartPerfetto is using env or local Claude Code fallback.

An active Provider Manager profile overrides `.env`. To make `.env` changes take effect again, choose `System Default` in the provider switcher or deactivate the active provider.

The preset Base URLs come from public provider information and public documentation. They are not guaranteed to be correct for every account, plan, region, or future provider change. If connection, streaming, or tool/function calling fails, first verify the Base URL, model ID, and protocol in your provider console.

If you choose the local source env-file path, the backend reads `backend/.env`. Start from the template:

```bash
cp backend/.env.example backend/.env
```

If you choose the Docker env-file path, both Docker Hub images and local source Docker builds read the repository-root `.env`:

```bash
cp .env.example .env
```

npm CLI does not use the Web UI `Connection` settings. For first-time CLI setup, run:

```bash
smp config init
```

It creates `~/.smartperfetto/env`. When `--env-file` is not passed, the CLI loads package/source `backend/.env` first, then `~/.smartperfetto/env`, with the user file taking priority. If you pass `--env-file /path/to/env`, the CLI reads only that file. CLI configuration follows the same rule: choose one runtime block, not every block.

## LLM Configuration

SmartPerfetto has these runtime paths:

- `claude-agent-sdk`: the default runtime. Use it for Anthropic, Claude Code local auth, Bedrock, Vertex, and Anthropic/Claude Code-compatible providers.
- `openai-agents-sdk`: the OpenAI runtime. Use it for OpenAI Responses API, Ollama, and OpenAI-compatible gateways that support streaming function/tool calling.
- `pi-agent-core`: optional public runtime. With a real model config it reuses SmartPerfetto's shared prompt, SQL/Skill, planning/hypothesis, and report/claim-verification pipeline. It dynamically loads `@earendil-works/pi-agent-core` and does not enable `.pi` project discovery, package extensions, shell tools, or file tools.
- `opencode`: optional public runtime. It runs a hardened isolated OpenCode server, feeds it explicit OpenAI-compatible or OpenCode model configuration, and exposes only request-scoped SmartPerfetto MCP tools. It does not read the user's OpenCode CLI login, project config, extensions, or built-in file/shell/web/edit tools.

These runtimes are mutually selected backend orchestration paths. OpenAI runtime setup does not require installing or logging in to Claude Code; local Claude Code setup does not require an OpenAI key. Pi Agent Core and OpenCode setup are separate from both. Real-model analysis quality should be verified with startup/scrolling E2E; fake-stream is smoke/test-only and does not represent parity.

Runtime selection priority is: request/session `providerId`, active Provider Manager profile, `SMARTPERFETTO_AGENT_RUNTIME`, then the default `claude-agent-sdk`. Do not enable both `ANTHROPIC_*` and `OPENAI_*` for first setup; if an advanced deployment does contain both without `SMARTPERFETTO_AGENT_RUNTIME=openai-agents-sdk`, analysis still uses Claude Agent SDK. An active Provider Manager profile overrides `.env` fallback; confirm the current source with `aiEngine.credentialSource` and `aiEngine.providerOverridesEnv` from `/health`.

Perfetto UI Provider Management can store both endpoint families for the same provider: `claudeBaseUrl` / `claudeApiKey` / `claudeAuthToken` for Claude Code SDK, and `openaiBaseUrl` / `openaiApiKey` / `openaiProtocol` for OpenAI SDK. Custom providers can also select `pi-agent-core` with `piAgentCoreModelJson` and an optional module path/system prompt, or `opencode` with `openCodeModelJson` / `openCodeSdkModulePath` / `openCodeSystemPrompt`. The provider switcher beside the AI input shows the active runtime.

For dual-surface providers such as DeepSeek, Qwen, Kimi, MiMo, TokenHub, MiniMax, StepFun, SiliconFlow, and custom gateways, the UI shows a shared Provider API Key plus optional runtime-specific key overrides. If the provider uses one key for both endpoint families, fill only the shared key. Change the runtime selector only when you intentionally want to switch between the Claude-compatible URL and the OpenAI-compatible URL.

Existing analysis sessions pin the credential source used at creation time. A session created with Provider A will try to resume with Provider A; a session created from `.env` fallback does not switch to a later active provider.

For direct Anthropic API access:

```bash
ANTHROPIC_API_KEY=your_anthropic_api_key_here
```

For third-party models that expose Claude Code / Anthropic-compatible endpoints, start from `backend/.env.example`. Usually you only replace the API key/token and keep SmartPerfetto's model variable names:

```bash
ANTHROPIC_BASE_URL=https://api.deepseek.com/anthropic
ANTHROPIC_AUTH_TOKEN=sk-your-deepseek-key
CLAUDE_MODEL=deepseek-v4-pro
CLAUDE_LIGHT_MODEL=deepseek-v4-flash
```

Xiaomi MiMo Token Plan example. The two blocks below are alternatives; do not paste both into the same env file.

```bash
# Anthropic-compatible / Claude SDK
ANTHROPIC_BASE_URL=https://token-plan-sgp.xiaomimimo.com/anthropic
ANTHROPIC_API_KEY=your_xiaomi_mimo_api_key_here
CLAUDE_MODEL=mimo-v2.5-pro
CLAUDE_LIGHT_MODEL=mimo-v2.5-pro
```

```bash
# OpenAI-compatible / OpenAI Agents SDK
SMARTPERFETTO_AGENT_RUNTIME=openai-agents-sdk
OPENAI_BASE_URL=https://token-plan-sgp.xiaomimimo.com/v1
OPENAI_API_KEY=your_xiaomi_mimo_api_key_here
OPENAI_AGENTS_PROTOCOL=chat_completions
OPENAI_MODEL=mimo-v2.5-pro
OPENAI_LIGHT_MODEL=mimo-v2.5-pro
```

Provider model catalogs, Base URLs, and plan permissions can change; if your account console lists a different model ID or dedicated domain, replace the corresponding fields.

The table below is a manual-env and troubleshooting reference, not a checklist you must fully configure.

| Provider | Claude / Anthropic-compatible Base URL | OpenAI-compatible Base URL | Recommended main model | Recommended light model |
|---|---|---|---|---|
| DeepSeek | `https://api.deepseek.com/anthropic` | `https://api.deepseek.com/v1` | `deepseek-v4-pro` | `deepseek-v4-flash` |
| GLM / Zhipu | `https://open.bigmodel.cn/api/anthropic` | `https://open.bigmodel.cn/api/paas/v4` | `glm-5.1` | `glm-4.5-air` |
| Qwen / Bailian pay-as-you-go | `https://dashscope.aliyuncs.com/apps/anthropic` | `https://dashscope.aliyuncs.com/compatible-mode/v1` | `qwen3.6-plus` | `qwen3.6-flash` |
| Qwen Coding Plan | `https://coding-intl.dashscope.aliyuncs.com/apps/anthropic` | `https://coding-intl.dashscope.aliyuncs.com/v1` | `qwen3-coder-plus` | `qwen3-coder-plus` |
| Kimi Code membership | `https://api.kimi.com/coding/` | `https://api.kimi.com/coding/v1` | `kimi-for-coding` | `kimi-for-coding` |
| Kimi / Moonshot platform | `https://api.moonshot.cn/anthropic` | `https://api.moonshot.cn/v1` | `kimi-k2.5` | `kimi-k2.5` |
| Doubao / Volcano Ark Coding Plan | `https://ark.cn-beijing.volces.com/api/coding` | `https://ark.cn-beijing.volces.com/api/coding/v3` | `doubao-seed-2.0-code` | `doubao-seed-2.0-code` |
| MiniMax China | `https://api.minimaxi.com/anthropic` | `https://api.minimaxi.com/v1` | `MiniMax-M2.7` | `MiniMax-M2.7` |
| Xiaomi MiMo Token Plan | `https://token-plan-sgp.xiaomimimo.com/anthropic` | `https://token-plan-sgp.xiaomimimo.com/v1` | `mimo-v2.5-pro` | `mimo-v2.5-pro` |
| Tencent TokenHub Token Plan | `https://api.lkeap.cloud.tencent.com/plan/anthropic` | `https://api.lkeap.cloud.tencent.com/plan/v3` | `tc-code-latest` | `tc-code-latest` |
| Tencent TokenHub Coding Plan | `https://api.lkeap.cloud.tencent.com/coding/anthropic` | `https://api.lkeap.cloud.tencent.com/coding/v3` | `tc-code-latest` | `tc-code-latest` |
| Tencent Hunyuan legacy | `https://api.hunyuan.cloud.tencent.com/anthropic` | `https://api.hunyuan.cloud.tencent.com/v1` | `hunyuan-2.0-thinking-20251109` | `hunyuan-2.0-instruct-20251111` |
| Baidu Qianfan | `https://qianfan.baidubce.com/anthropic` | `https://qianfan.baidubce.com/v2` | `deepseek-v3.2` | `deepseek-v3.2` |
| StepFun Step Plan | `https://api.stepfun.com/step_plan` | `https://api.stepfun.com/step_plan/v1` | `step-3.5-flash-2603` | `step-3.5-flash` |
| SiliconFlow | `https://api.siliconflow.com/` | `https://api.siliconflow.com/v1` | `Qwen/Qwen3-235B-A22B-Thinking-2507` | `Qwen/Qwen3-30B-A3B-Instruct-2507` |
| Huawei Cloud ModelArts MaaS | `https://api.modelarts-maas.com/anthropic` | `https://api.modelarts-maas.com/v1` | `deepseek-v3.2` | `qwen3-32b` |

Provider docs may use `ANTHROPIC_MODEL` / `ANTHROPIC_DEFAULT_HAIKU_MODEL`, but SmartPerfetto uses `CLAUDE_MODEL` / `CLAUDE_LIGHT_MODEL`. Models must reliably support streaming output and tool/function calling.

OpenAI official API:

```bash
SMARTPERFETTO_AGENT_RUNTIME=openai-agents-sdk
OPENAI_API_KEY=sk-your-openai-key
OPENAI_BASE_URL=https://api.openai.com/v1
OPENAI_AGENTS_PROTOCOL=responses
OPENAI_MODEL=gpt-5.5
OPENAI_LIGHT_MODEL=gpt-5.4-mini
```

Keep official OpenAI direct connections on `OPENAI_AGENTS_PROTOCOL=responses`. `chat_completions` is a compatibility fallback for gateways, not the recommended official OpenAI path; switching to it disables Responses-side session continuation such as the `previousResponseId` used by the SmartPerfetto OpenAI runtime.

Ollama or OpenAI-compatible gateways:

```bash
SMARTPERFETTO_AGENT_RUNTIME=openai-agents-sdk
OPENAI_BASE_URL=http://localhost:11434/v1
OPENAI_API_KEY=ollama
OPENAI_AGENTS_PROTOCOL=chat_completions
OPENAI_MODEL=qwen3:30b
OPENAI_LIGHT_MODEL=qwen3:30b
```

If a third-party provider exposes both endpoint families, fill both in Provider Manager and use `agentRuntime` or the frontend switcher to choose the active side. With `.env` only, one side is active at a time through `SMARTPERFETTO_AGENT_RUNTIME`.

Pi Agent Core:

```bash
SMARTPERFETTO_AGENT_RUNTIME=pi-agent-core
SMARTPERFETTO_PI_AGENT_CORE_MODEL_JSON='{"id":"your-model-id","name":"Your Model","api":"openai-responses","provider":"openai","baseUrl":"https://api.openai.com/v1","reasoning":false,"input":["text"],"cost":{"input":0,"output":0,"cacheRead":0,"cacheWrite":0},"contextWindow":128000,"maxTokens":4096,"apiKeyEnv":"OPENAI_API_KEY"}'
# Optional local checkout or unpacked package:
# SMARTPERFETTO_PI_AGENT_CORE_MODULE_PATH=/absolute/path/to/@earendil-works/pi-agent-core/dist/index.js
# Optional runtime-level prompt; SmartPerfetto analysis contracts still come from strategies:
# SMARTPERFETTO_PI_AGENT_CORE_SYSTEM_PROMPT=
```

`SMARTPERFETTO_PI_AGENT_CORE_MODEL_JSON` should use the
`@earendil-works/pi-ai` Model object shape. `apiKey`, `apiKeyEnv`, `transport`,
`thinkingLevel`, `thinkingBudgets`, and `maxRetryDelayMs` may live in the same
JSON as SmartPerfetto runtime options; `apiKey` is stripped before the model is
passed into Pi Agent Core state so it does not enter snapshots or reports. The
real model path uses SmartPerfetto's shared prompt, SQL/Skill,
planning/hypothesis, and report/claim-verification pipeline.
`SMARTPERFETTO_PI_AGENT_CORE_FAKE_STREAM=1` is smoke/test-only and does not
represent real analysis quality.

The `openai-responses` example above targets the official OpenAI Responses API.
For OpenAI-compatible gateways that only expose chat/completions, set
`"api":"openai-completions"` in the JSON and use that gateway's `baseUrl`, model
id, and key.

Pi Agent Core is custom-only in Provider Manager. Removing the custom provider
or switching `SMARTPERFETTO_AGENT_RUNTIME` back to `claude-agent-sdk` /
`openai-agents-sdk` is the rollback path.

OpenCode:

```bash
SMARTPERFETTO_AGENT_RUNTIME=opencode
# Recommended when you want OpenCode-specific provider/model wiring:
SMARTPERFETTO_OPENCODE_MODEL_JSON='{"providerID":"smartperfetto","modelID":"your-model-id","baseUrl":"https://api.openai.com/v1","apiKeyEnv":"OPENAI_API_KEY","smallModel":"your-light-model"}'
OPENAI_API_KEY=sk-your-provider-key
# Optional local checkout or unpacked package:
# SMARTPERFETTO_OPENCODE_SDK_MODULE_PATH=/absolute/path/to/@opencode-ai/sdk/dist/index.js
# Optional isolated project directory; otherwise SmartPerfetto creates a temp directory:
# SMARTPERFETTO_OPENCODE_PROJECT_DIR=/absolute/path/to/empty/project
# Optional runtime-level prompt; SmartPerfetto analysis contracts still come from strategies:
# SMARTPERFETTO_OPENCODE_SYSTEM_PROMPT=
```

Alternatively, omit `SMARTPERFETTO_OPENCODE_MODEL_JSON` and configure OpenCode
through OpenAI-compatible fields:

```bash
SMARTPERFETTO_AGENT_RUNTIME=opencode
OPENAI_BASE_URL=https://api.openai.com/v1
OPENAI_API_KEY=sk-your-provider-key
OPENAI_MODEL=your-model-id
OPENAI_LIGHT_MODEL=your-light-model
```

OpenCode is custom-only in Provider Manager. SmartPerfetto starts OpenCode with
isolated HOME/config/project state, disabled built-in file/shell/web/edit tools,
and a request-scoped MCP bridge for SmartPerfetto trace tools. It does not read
your personal OpenCode login or project extensions. Removing the custom provider
or switching `SMARTPERFETTO_AGENT_RUNTIME` back to `claude-agent-sdk` /
`openai-agents-sdk` is the rollback path.

## Runtime and Provider Diagnostics

SmartPerfetto does not read Codex CLI, Gemini CLI, or personal OpenCode login state; those tools manage their own config files. The `opencode` runtime is configured explicitly through Provider Manager or env.

Restart the backend after changing `.env`. Saving or activating a Provider Manager profile in the UI usually does not require a backend restart, but existing analysis sessions keep the provider source they were created with. Verify explicit env/proxy credentials with:

```bash
curl http://localhost:3000/health
```

Read these `/health` fields before debugging provider complaints:

| Field | What to check |
|---|---|
| `aiEngine.credentialSource` | `provider-manager` means UI profile is active; `env-or-default` means `.env` or Claude Code fallback |
| `aiEngine.providerOverridesEnv` | `true` means `.env` changes will not affect analysis until the active provider is disabled |
| `aiEngine.runtime` | Must be `claude-agent-sdk`, `openai-agents-sdk`, `pi-agent-core`, or `opencode`, not a provider name |
| `aiEngine.providerMode` | Shows the effective connection family, such as `anthropic_compatible_proxy` or `openai_chat_completions_compatible` |

`aiEngine.providerMode` can be:

| providerMode | Meaning |
|---|---|
| `anthropic_direct` | Uses `ANTHROPIC_API_KEY` / `ANTHROPIC_AUTH_TOKEN` without a custom Base URL |
| `anthropic_compatible_proxy` | Uses `ANTHROPIC_BASE_URL` for a Claude Code / Anthropic-compatible provider or proxy |
| `aws_bedrock` | Uses AWS Bedrock |
| `google_vertex` | Uses Google Vertex AI |
| `openai_responses` | Uses OpenAI Agents SDK + Responses API |
| `openai_chat_completions_compatible` | Uses OpenAI Agents SDK + Chat Completions-compatible endpoint |
| `pi-agent-core` | Uses Pi Agent Core custom model JSON through the shared SmartPerfetto analysis pipeline |
| `opencode` | Uses OpenCode custom model JSON or OpenAI-compatible fields through the shared SmartPerfetto analysis pipeline |
| `unconfigured` | No explicit env credentials; if local `claude` works, the SDK can still use Claude Code local auth/config during analysis |

## Budgets and Timeouts

Slow or local models usually need longer per-turn timeouts:

```bash
CLAUDE_FULL_PER_TURN_MS=60000
CLAUDE_QUICK_PER_TURN_MS=40000
CLAUDE_VERIFIER_TIMEOUT_MS=60000
CLAUDE_CLASSIFIER_TIMEOUT_MS=30000

OPENAI_FULL_PER_TURN_MS=60000
OPENAI_QUICK_PER_TURN_MS=40000
OPENAI_CLASSIFIER_TIMEOUT_MS=30000
```

| Mode | Behavior | Use case |
|---|---|---|
| `fast` | Default 10 turns, lightweight tools | Package, process, simple facts |
| `full` | Default 60 turns, full toolset | Startup, scrolling, ANR, complex root-cause analysis |
| `auto` | Keyword rules, hard rules, and lightweight classifier choose the mode | Default mode |

The frontend persists the selected mode in `localStorage['ai-analysis-mode']`.

## Service Configuration

```bash
SMARTPERFETTO_BACKEND_PORT=3000
SMARTPERFETTO_FRONTEND_PORT=10000
PORT=3000
NODE_ENV=development
FRONTEND_URL=http://localhost:10000
# For reverse proxies, HTTPS, or custom Docker host ports:
# SMARTPERFETTO_BACKEND_PUBLIC_URL=http://localhost:3000
```

Default local ports:

- Backend: `3000`
- Perfetto UI: `10000`
- trace_processor HTTP RPC pool: `9100-9900`

Use `SMARTPERFETTO_BACKEND_PORT` for the backend port. `PORT` remains a
compatibility fallback for Node/Docker/PaaS environments. Use
`SMARTPERFETTO_FRONTEND_PORT` for the Perfetto UI server. When the browser
cannot infer the backend address, set `SMARTPERFETTO_BACKEND_PUBLIC_URL`.

## API Authentication

If the backend is exposed to multiple users or a network, set:

```bash
# Leave unset for local single-user runs.
SMARTPERFETTO_API_KEY=replace_with_a_strong_random_secret
```

Protected APIs then require:

```http
Authorization: Bearer <SMARTPERFETTO_API_KEY>
```

## Uploads and Trace Processor

```bash
MAX_FILE_SIZE=2147483648
UPLOAD_DIR=./uploads
TRACE_PROCESSOR_PATH=/path/to/trace_processor_shell
PERFETTO_PATH=/path/to/perfetto
```

`TRACE_PROCESSOR_PATH` usually does not need manual configuration. If download is blocked, use:

```bash
TRACE_PROCESSOR_PATH=/absolute/path/to/trace_processor_shell ./start.sh
TRACE_PROCESSOR_DOWNLOAD_BASE=https://your-mirror/perfetto-luci-artifacts ./start.sh
TRACE_PROCESSOR_DOWNLOAD_URL=https://your-mirror/trace_processor_shell ./start.sh
```

Mirror downloads are still checked against the SHA256 pinned in `scripts/trace-processor-pin.env`.

## Rate Limiting

```bash
SMARTPERFETTO_USAGE_MAX_REQUESTS=200
SMARTPERFETTO_USAGE_MAX_TRACE_REQUESTS=100
SMARTPERFETTO_USAGE_WINDOW_MS=86400000
```

Rate-limit state is lost after restart. For strict production quotas, add persistent rate limiting at the reverse proxy or API gateway layer.

## Runtime and Provider Boundary

`SMARTPERFETTO_AGENT_RUNTIME` only selects the backend orchestration runtime and only accepts `claude-agent-sdk`, `openai-agents-sdk`, `pi-agent-core`, or `opencode`. Do not put provider names here.

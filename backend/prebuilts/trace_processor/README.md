# trace_processor_shell Prebuilts

This directory stores the pinned Perfetto `trace_processor_shell` binaries used
by SmartPerfetto source, npm, and portable-package flows.

Supported committed targets:

- `linux-x64/trace_processor_shell`
- `darwin-arm64/trace_processor_shell`
- `win32-x64/trace_processor_shell.exe`

The pin source of truth is `scripts/trace-processor-pin.env`. To refresh these
binaries after changing the pin, run:

```bash
npm run trace-processor:sync-prebuilts
```

The sync script downloads the official Perfetto LUCI artifacts and verifies
SHA256 before replacing any binary.

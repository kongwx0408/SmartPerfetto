# Perfetto Recording Tool Slot

This directory is reserved for approved `tracebox` prebuilts used by
`smp capture android --sideload` and Android devices older than API 29.

Expected layout:

```text
prebuilts/perfetto-recording-tools/android-arm64/tracebox
prebuilts/perfetto-recording-tools/android-arm/tracebox
prebuilts/perfetto-recording-tools/android-x64/tracebox
prebuilts/perfetto-recording-tools/android-x86/tracebox
```

The pin source is `scripts/perfetto-recording-tools-pin.env`. SmartPerfetto
does not download these binaries at capture time; use `--tracebox` to point at
a local binary until approved artifacts are packaged.

# Android Platform-Tools Slot

This directory is reserved for approved bundled ADB binaries used by
`smp capture android`.

Resolution order is:

1. `ADB_PATH`
2. `prebuilts/android-platform-tools/<platform>/adb[.exe]`
3. `adb` on `PATH`

Do not copy Google SDK Platform-Tools binaries here unless the release process
has explicitly approved the license and redistribution path.

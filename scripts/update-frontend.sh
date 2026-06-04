#!/bin/bash
# SPDX-License-Identifier: AGPL-3.0-or-later
# Copyright (C) 2024-2026 Gracker (Chris)
# This file is part of SmartPerfetto. See LICENSE for details.

# Update pre-built frontend after modifying the AI Assistant plugin.
#
# Run this after ./scripts/start-dev.sh has compiled the frontend and
# you have verified your changes in the browser.
#
# Usage:
#   ./scripts/update-frontend.sh

set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DIST_DIR="${SMARTPERFETTO_FRONTEND_DIST_DIR:-$PROJECT_ROOT/perfetto/out/ui/ui/dist}"
FRONTEND_DIR="$PROJECT_ROOT/frontend"

inject_smartperfetto_static_assets() {
  local index_file="$1"
  if grep -q 'assistant-flamegraph.js' "$index_file"; then
    return 0
  fi

  local insert_before
  if grep -q '</head>' "$index_file"; then
    insert_before='</head>'
  elif grep -q '</body>' "$index_file"; then
    insert_before='</body>'
  elif grep -q '</html>' "$index_file"; then
    insert_before='</html>'
  else
    echo "ERROR: Could not find an insertion point for SmartPerfetto static assets in $index_file" >&2
    return 2
  fi

  local tmp
  tmp="$(mktemp)"
  awk -v insert_before="$insert_before" '
    index($0, insert_before) && !inserted {
      print "  <link rel=\"stylesheet\" href=\"/assistant-flamegraph.css\">";
      print "  <script defer src=\"/assistant-flamegraph.js\"></script>";
      print "  <script defer src=\"/assistant-critical-path.js\"></script>";
      inserted=1;
    }
    { print }
    END { if (!inserted) exit 2 }
  ' "$index_file" > "$tmp"
  mv "$tmp" "$index_file"
}

# Find the versioned dist directory
VERSION_DIR=$(find "$DIST_DIR" -maxdepth 1 -type d -name 'v*' -print 2>/dev/null | sort -V | tail -n 1 || true)
if [ -z "$VERSION_DIR" ]; then
  echo "ERROR: No compiled frontend found at $DIST_DIR"
  echo "       Run ./scripts/start-dev.sh first to build the frontend."
  exit 1
fi

VERSION=$(basename "$VERSION_DIR")
echo "Found compiled frontend: $VERSION"

# Remember stale version directories. We remove them after restoring the JS
# engine bundles because a --only-wasm-memory64 build may need to copy those
# bundles from the previous committed version.
STALE_DIRS=$(find "$FRONTEND_DIR" -maxdepth 1 -type d -name 'v*' ! -name "$VERSION" 2>/dev/null || true)
if [ -n "$STALE_DIRS" ]; then
  echo "Stale version directories found:"
  while IFS= read -r stale_dir; do
    printf '     %s\n' "$stale_dir"
  done <<< "$STALE_DIRS"
  echo ""
fi

echo "Updating frontend/ ..."

is_usable_runtime_bundle() {
  local bundle="$1"
  local candidate="$2"

  if [ ! -f "$candidate" ]; then
    return 1
  fi
  if [ "$(wc -c < "$candidate")" -lt 100000 ]; then
    return 1
  fi
  if [ "$bundle" = "engine_bundle.js" ] && ! grep -q 'function requireTrace_processor()' "$candidate"; then
    return 1
  fi
  if [ "$bundle" = "engine_bundle.js" ] && ! grep -q 'return locateFile("trace_processor.wasm")' "$candidate"; then
    return 1
  fi

  return 0
}

# Keep the current checked-in engine bundles available while rsync replaces the
# versioned directory. Some --only-wasm-memory64 builds emit a partial
# engine_bundle.js that is large enough to pass a size-only stub check but lacks
# the classic trace_processor.wasm JS glue required by older runtime paths.
BUNDLE_BACKUP_DIR="$(mktemp -d)"
trap 'rm -rf "$BUNDLE_BACKUP_DIR"' EXIT
if [ -d "$FRONTEND_DIR/$VERSION" ]; then
  for BUNDLE in engine_bundle.js traceconv_bundle.js; do
    if [ -f "$FRONTEND_DIR/$VERSION/$BUNDLE" ]; then
      cp "$FRONTEND_DIR/$VERSION/$BUNDLE" "$BUNDLE_BACKUP_DIR/$BUNDLE"
    fi
  done
fi

# Copy top-level files
cp "$DIST_DIR/index.html"          "$FRONTEND_DIR/index.html"
inject_smartperfetto_static_assets "$FRONTEND_DIR/index.html"
cp "$DIST_DIR/service_worker.js"   "$FRONTEND_DIR/service_worker.js" 2>/dev/null || true

# Upstream Vite emits shared runtime assets at dist/assets/. Some bundled
# plugins load them with relative "assets/..." URLs, so the committed prebuild
# must ship these top-level assets alongside the versioned directory.
if [ -d "$DIST_DIR/assets" ]; then
  mkdir -p "$FRONTEND_DIR/assets"
  rsync -a --delete "$DIST_DIR/assets/" "$FRONTEND_DIR/assets/"
fi

# Sync versioned directory.
# Exclude source maps (repo size). JS engine bundles are copied from the build
# output by default; the fallback below only restores previous real bundles when
# a --only-wasm-memory64 build produced small stubs.
# WASM files ARE real products of the build and must be copied.
rsync -a --delete \
  --exclude="*.map" \
  "$VERSION_DIR/" \
  "$FRONTEND_DIR/$VERSION/"

# Some upstream UI builds emit only the memory64 trace processor into
# ui/dist/<version>/ while the classic wasm is left under the GN output wasm/
# directory. The prebuild still needs both assets for older browser/runtime
# paths, so copy the classic wasm from the same out tree when dist omits it.
if [ ! -f "$FRONTEND_DIR/$VERSION/trace_processor.wasm" ]; then
  OUT_ROOT="$(cd "$VERSION_DIR/../../.." && pwd)"
  TRACE_PROCESSOR_WASM="$OUT_ROOT/wasm/trace_processor.wasm"
  if [ -f "$TRACE_PROCESSOR_WASM" ]; then
    cp "$TRACE_PROCESSOR_WASM" "$FRONTEND_DIR/$VERSION/trace_processor.wasm"
  fi
fi

# Rollup and upstream runtime assets can emit indented blank lines. Keep
# checked-in generated text artifacts compatible with git diff --check.
for TEXT_ARTIFACT in \
  "$FRONTEND_DIR/$VERSION/frontend_bundle.js" \
  "$FRONTEND_DIR/$VERSION/syntaqlite-runtime.js" \
  "$FRONTEND_DIR/assets/syntaqlite-runtime.js"; do
  if [ -f "$TEXT_ARTIFACT" ]; then
    perl -pi -e 's/[ \t]+$//' "$TEXT_ARTIFACT"
  fi
done

# Restore JS engine bundles if they are missing or are small stubs. The real
# bundles live in the previous versioned directory committed in git; stubs from
# --only-wasm-memory64 are ~38KB and must not be used.
for BUNDLE in engine_bundle.js traceconv_bundle.js; do
  TARGET="$FRONTEND_DIR/$VERSION/$BUNDLE"
  NEEDS_RESTORE=false
  if [ ! -f "$TARGET" ] || [ "$(wc -c < "$TARGET")" -lt 100000 ]; then
    NEEDS_RESTORE=true
  elif [ "$BUNDLE" = "engine_bundle.js" ] && ! grep -q 'function requireTrace_processor()' "$TARGET"; then
    NEEDS_RESTORE=true
  elif [ "$BUNDLE" = "engine_bundle.js" ] && ! grep -q 'return locateFile("trace_processor.wasm")' "$TARGET"; then
    NEEDS_RESTORE=true
  elif is_usable_runtime_bundle "$BUNDLE" "$BUNDLE_BACKUP_DIR/$BUNDLE" && ! cmp -s "$TARGET" "$BUNDLE_BACKUP_DIR/$BUNDLE"; then
    NEEDS_RESTORE=true
  fi
  if [ "$NEEDS_RESTORE" = true ]; then
    PREV=""
    if is_usable_runtime_bundle "$BUNDLE" "$BUNDLE_BACKUP_DIR/$BUNDLE"; then
      PREV="$BUNDLE_BACKUP_DIR/$BUNDLE"
    else
      while IFS= read -r candidate; do
        if is_usable_runtime_bundle "$BUNDLE" "$candidate"; then
          PREV="$candidate"
          break
        fi
      done < <(find "$FRONTEND_DIR" -maxdepth 2 -name "$BUNDLE" ! -path "$TARGET" 2>/dev/null)
    fi
    if [ -n "$PREV" ]; then
      echo "  Restoring $BUNDLE from previous build: $(basename "$(dirname "$PREV")")"
      cp "$PREV" "$TARGET"
    else
      echo "ERROR: $BUNDLE is incomplete and no usable previous bundle was found." >&2
      echo "       Run a full frontend build that emits classic wasm loader glue before updating frontend/." >&2
      exit 1
    fi
  fi
done

# The generated manifest hashes the files from the build output. When we
# preserve real JS engine bundles from a previous build, refresh those hashes
# so the checked-in prebuild is internally consistent.
node - "$FRONTEND_DIR/$VERSION/manifest.json" "$FRONTEND_DIR/$VERSION" <<'NODE'
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const [manifestPath, versionDir] = process.argv.slice(2);
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
manifest.resources ??= {};
for (const required of ['trace_processor.wasm', 'trace_processor_memory64.wasm']) {
  const filePath = path.join(versionDir, required);
  if (fs.existsSync(filePath)) {
    const hash = crypto
      .createHash('sha256')
      .update(fs.readFileSync(filePath))
      .digest('base64');
    manifest.resources[required] = `sha256-${hash}`;
  }
}
for (const name of Object.keys(manifest.resources ?? {})) {
  const filePath = path.join(versionDir, name);
  if (!fs.existsSync(filePath)) continue;
  const hash = crypto
    .createHash('sha256')
    .update(fs.readFileSync(filePath))
    .digest('base64');
  manifest.resources[name] = `sha256-${hash}`;
}
fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
NODE

if [ -n "$STALE_DIRS" ]; then
  echo "Removing stale frontend version directories..."
  while IFS= read -r stale_dir; do
    rm -rf "$stale_dir"
    printf '  Removed %s\n' "$stale_dir"
  done <<< "$STALE_DIRS"
fi

node "$PROJECT_ROOT/scripts/check-frontend-prebuild.cjs"

echo "✅ frontend/ updated to $VERSION"
echo ""
echo "Next steps:"
echo "  git add frontend/"
echo "  git commit -m 'chore(frontend): update prebuilt to $VERSION'"

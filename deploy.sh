#!/bin/bash
# Build + deploy pipeline for Westline Future.
# Usage: bash deploy.sh
set -e

echo "==> Building..."
npm run build

echo "==> Verifying build output..."
INDEX_SCRIPT=$(grep -o 'src="/assets/index-[^"]*"' "dist/index.html" | head -1 | sed 's/src="//;s/"//')
if [ -z "$INDEX_SCRIPT" ]; then
  echo "ERROR: Could not find entry script in dist/index.html" >&2
  exit 1
fi
if [ ! -f "dist$INDEX_SCRIPT" ]; then
  echo "ERROR: Entry chunk 'dist$INDEX_SCRIPT' missing — chunk hash mismatch!" >&2
  exit 1
fi
echo "    index.html references: $INDEX_SCRIPT ✓"

echo "==> Deploying Firestore rules + Hosting..."
firebase deploy --only hosting,firestore

echo "==> Done."

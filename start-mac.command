#!/bin/bash
# ============================================================
#  Trace - double-click launcher for macOS.
#  Double-click this file in Finder. (First time: right-click ->
#  Open, to get past the "unidentified developer" warning.)
# ============================================================

# Always run from this script's own folder.
cd "$(dirname "$0")" || exit 1

echo
echo "  Starting Trace..."
echo "  Folder: $(pwd)"
echo

# 1. Node installed?
if ! command -v node >/dev/null 2>&1; then
  echo "  [X] Node.js is not installed."
  echo "      Install it once from https://nodejs.org (pick the LTS button),"
  echo "      then double-click this file again."
  echo
  read -r -p "  Press Return to close." _
  exit 1
fi

# 2. In the project?
if [ ! -f package.json ]; then
  echo "  [X] This isn't the Trace project folder (no package.json next to it)."
  read -r -p "  Press Return to close." _
  exit 1
fi

# 3. Dependencies
if [ ! -d node_modules ]; then
  echo "  First run - installing dependencies (a few minutes)..."
  echo
  if ! npm install; then
    echo
    echo "  [X] npm install failed - usually a flaky network. Run again to retry."
    read -r -p "  Press Return to close." _
    exit 1
  fi
fi

# 4. Environment file
[ -f .env ] || { echo "  Creating .env from the template..."; cp .env.example .env; }

# 5. Launch
echo
echo "  Ready. A QR code will appear below."
echo "  On BOTH phones: iOS scan it with the Camera app; Android scan inside Expo Go."
echo "  Different Wi-Fi? Stop with Ctrl+C and run:  npx expo start --tunnel"
echo
npx expo start

echo
read -r -p "  Press Return to close." _

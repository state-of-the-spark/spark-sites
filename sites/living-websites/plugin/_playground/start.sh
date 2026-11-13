#!/bin/sh
# Start WordPress Playground (PHP 8.2) with the plugin mounted. Run from anywhere.
export MSYS_NO_PATHCONV=1
cd "$(dirname "$0")"
P="$(pwd -W 2>/dev/null || pwd)"
PLUG="$(cd ../spark-living && pwd -W 2>/dev/null || pwd)"
exec npx wp-playground-cli server --php 8.2 --port 9400 --login \
  --blueprint "$P/blueprint.json" \
  --mount-dir "$PLUG" /wordpress/wp-content/plugins/spark-living \
  --mount-dir "$P/work" /wordpress/test-tools \
  --define WP_ENVIRONMENT_TYPE local --define-bool WP_DEBUG true --define-bool WP_DEBUG_LOG true --define-bool WP_DEBUG_DISPLAY false

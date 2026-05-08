#!/bin/sh
set -eu

cat > /usr/share/nginx/html/env.js <<ENVEOF
window.__GRADUWAYSE_CONFIG__ = {
  API_BASE_URL: "${API_BASE_URL:-}",
  WS_BASE_URL: "${WS_BASE_URL:-}"
};
ENVEOF

exec "$@"

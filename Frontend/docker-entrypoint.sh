#!/bin/sh
set -eu

cat > /usr/share/nginx/html/env.js <<EOF
window.__GRADUWAYSE_CONFIG__ = {
  API_BASE_URL: "${API_BASE_URL:-}",
  WS_BASE_URL: "${WS_BASE_URL:-}"
};
EOF

exec "$@"
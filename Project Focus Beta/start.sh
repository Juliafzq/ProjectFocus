#!/usr/bin/env bash
# Launch Fable / Flow (Project Focus Beta) preview server on port 8090
# Uses GFE2 proxy wrapper on Cloudtop so http://zuqi.c.googlers.com:8090 works in your laptop browser.

cd "$(dirname "$0")"

BACKEND_PORT=8091
PUBLIC_PORT=8090

cleanup() {
  kill $PY_PID $GFE_PID 2>/dev/null || true
}
trap cleanup EXIT SIGINT SIGTERM

fuser -k ${PUBLIC_PORT}/tcp >/dev/null 2>&1 || true
fuser -k ${BACKEND_PORT}/tcp >/dev/null 2>&1 || true

python3 -m http.server "$BACKEND_PORT" --bind 127.0.0.1 &
PY_PID=$!

if [[ -x /google/data/ro/projects/gfe/siloed_gfe2_bin ]]; then
  echo "Starting GFE2 authenticated proxy on port ${PUBLIC_PORT} -> 127.0.0.1:${BACKEND_PORT}..."
  /google/data/ro/projects/gfe/siloed_gfe2_bin \
    --gfe2_configuration="$(/google/data/ro/projects/gfe/tools/gfe2_config_gen.par \
      --gfe2_port=${PUBLIC_PORT} \
      --gfe2_backend_port=${BACKEND_PORT} \
      --gfe2_backend_ip="127.0.0.1" \
      --allow_upgrade_websocket)" \
    --gfe_conductor_client_group_port=0 \
    --gfe2_blast_radius_limited_canary_percentage=1 \
    --gfe2_blast_radius_limited_canary_minimum=1 \
    --disable_permission_validation \
    --run_container_client=false \
    --alsologtostderr &
  GFE_PID=$!
  echo "Ready! Open http://$(hostname -f):${PUBLIC_PORT} in your browser."
  wait -n
else
  kill $PY_PID 2>/dev/null || true
  exec python3 -m http.server "$PUBLIC_PORT" --bind ::
fi

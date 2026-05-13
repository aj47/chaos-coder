#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")"

now_ms() {
  node -e 'console.log(Date.now())'
}

find_free_port() {
  node - <<'NODE'
const net = require('node:net');
const server = net.createServer();
server.listen(0, '127.0.0.1', () => {
  console.log(server.address().port);
  server.close();
});
NODE
}

has_portkey_env_file() {
  grep -qsE '^PORTKEY_API_KEY=' \
    .env \
    .env.local \
    .env.development \
    .env.development.local \
    .env.production \
    .env.production.local 2>/dev/null
}

if ! node -e "import('@playwright/test')" >/dev/null 2>&1; then
  echo "ERROR: Playwright is not installed. Run: npm install" >&2
  exit 1
fi

if ! node - <<'NODE' >/dev/null 2>&1
import { chromium } from '@playwright/test';
import { existsSync } from 'node:fs';
process.exit(existsSync(chromium.executablePath()) ? 0 : 1);
NODE
then
  echo "ERROR: Playwright Chromium is not installed. Run: npx playwright install chromium" >&2
  exit 1
fi

node --check benchmarks/pokedex-generation-e2e.mjs >/dev/null

export NEXT_TELEMETRY_DISABLED=1
export BENCHMARK_NUM_GENERATIONS="${BENCHMARK_NUM_GENERATIONS:-3}"
export BENCHMARK_TIMEOUT_MS="${BENCHMARK_TIMEOUT_MS:-240000}"

SERVER_PID=""
SERVER_LOG=""
BUILD_LOG=""
cleanup() {
  if [[ -n "${SERVER_PID}" ]] && kill -0 "${SERVER_PID}" 2>/dev/null; then
    pkill -TERM -P "${SERVER_PID}" 2>/dev/null || true
    kill -TERM "${SERVER_PID}" 2>/dev/null || true
    wait "${SERVER_PID}" 2>/dev/null || true
  fi
}
trap cleanup EXIT

if [[ -n "${BENCHMARK_BASE_URL:-}" ]]; then
  BASE_URL="${BENCHMARK_BASE_URL%/}"
else
  if [[ -z "${PORTKEY_API_KEY:-}" ]] && ! has_portkey_env_file; then
    echo "ERROR: PORTKEY_API_KEY is required for the real /api/generate benchmark." >&2
    echo "Set it in the shell or in .env.local, then rerun ./autoresearch.sh." >&2
    exit 1
  fi

  PORT="${BENCHMARK_PORT:-$(find_free_port)}"
  BASE_URL="http://127.0.0.1:${PORT}"
  SERVER_MODE="${BENCHMARK_SERVER_MODE:-production}"
  SERVER_READY_TIMEOUT_MS="${BENCHMARK_SERVER_READY_TIMEOUT_MS:-120000}"
  SERVER_LOG="$(mktemp -t chaos-coder-next-server.XXXXXX.log)"

  if [[ "${SERVER_MODE}" == "production" ]]; then
    if [[ "${BENCHMARK_SKIP_BUILD:-0}" != "1" ]]; then
      BUILD_LOG="$(mktemp -t chaos-coder-next-build.XXXXXX.log)"
      build_start_ms="$(now_ms)"
      if ! npm run build >"${BUILD_LOG}" 2>&1; then
        echo "ERROR: npm run build failed. Last 120 lines:" >&2
        tail -120 "${BUILD_LOG}" >&2 || true
        exit 1
      fi
      build_ms=$(( $(now_ms) - build_start_ms ))
      echo "METRIC build_ms=${build_ms}"
    fi

    ./node_modules/.bin/next start -H 127.0.0.1 -p "${PORT}" >"${SERVER_LOG}" 2>&1 &
    SERVER_PID=$!
  elif [[ "${SERVER_MODE}" == "dev" ]]; then
    ./node_modules/.bin/next dev --turbopack -H 127.0.0.1 -p "${PORT}" >"${SERVER_LOG}" 2>&1 &
    SERVER_PID=$!
  else
    echo "ERROR: BENCHMARK_SERVER_MODE must be 'production' or 'dev' (got '${SERVER_MODE}')." >&2
    exit 1
  fi

  ready_start_ms="$(now_ms)"
  until curl -fsS "${BASE_URL}" >/dev/null 2>&1; do
    if ! kill -0 "${SERVER_PID}" 2>/dev/null; then
      echo "ERROR: Next.js server exited before becoming ready. Last 120 lines:" >&2
      tail -120 "${SERVER_LOG}" >&2 || true
      exit 1
    fi

    if (( $(now_ms) - ready_start_ms > SERVER_READY_TIMEOUT_MS )); then
      echo "ERROR: Timed out waiting for ${BASE_URL}. Last 120 server log lines:" >&2
      tail -120 "${SERVER_LOG}" >&2 || true
      exit 1
    fi
    sleep 1
  done
  startup_ms=$(( $(now_ms) - ready_start_ms ))
  echo "METRIC server_startup_ms=${startup_ms}"
fi

set +e
BENCHMARK_BASE_URL="${BASE_URL}" node benchmarks/pokedex-generation-e2e.mjs
benchmark_status=$?
set -e

if [[ ${benchmark_status} -ne 0 ]]; then
  if [[ -n "${SERVER_LOG}" ]]; then
    echo "ERROR: benchmark failed. Last 120 server log lines:" >&2
    tail -120 "${SERVER_LOG}" >&2 || true
  fi
  exit "${benchmark_status}"
fi

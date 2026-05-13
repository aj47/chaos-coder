# Autoresearch: Pokedex generation latency

## Objective
Optimize the end-to-end time for Chaos Coder to generate 3 websites from the homepage Pokédex template prompt:

> A Pokédex web app that displays Pokémon information with search and filter functionality

The benchmark uses Playwright to click the real homepage template, submit it, wait for exactly 3 `/api/generate` POSTs, and wait until all generated previews are rendered.

## Metrics
- **Primary**: `generate_3_websites_ms` (ms, lower is better) — click on Generate → all 3 generated previews rendered.
- **Secondary**: `api_wall_ms`, `api_max_ms`, `api_mean_ms`, `api_min_ms`, `api_count`, `browser_error_count`, `build_ms`, `server_startup_ms`.

## How to Run
```bash
./autoresearch.sh
```

Useful overrides:
- `BENCHMARK_BASE_URL=https://... ./autoresearch.sh` — use an already-running app instead of building/starting local Next.js.
- `BENCHMARK_SERVER_MODE=dev ./autoresearch.sh` — run against `next dev` (not recommended; React Strict Mode may duplicate API calls).
- `BENCHMARK_SKIP_BUILD=1 ./autoresearch.sh` — reuse the existing `.next` build.
- `BENCHMARK_HEADLESS=0 ./autoresearch.sh` — show the browser.

The script emits `METRIC name=value` lines for pi autoresearch parsing. This benchmark always uses real `/api/generate` LLM calls; mocks are not allowed for primary or smoke runs.

## Files in Scope
- `src/app/results/page.tsx` — launches the 3 generation requests and renders previews.
- `src/app/api/generate/route.ts` — calls Portkey/LLM providers and returns generated HTML.
- `src/app/page.tsx` — homepage prompt/template and submit flow.
- `benchmarks/pokedex-generation-e2e.mjs` — Playwright benchmark harness.
- `autoresearch.sh` — benchmark entrypoint.

## Off Limits
- Do not change the benchmark prompt or reduce the generation count below 3 to improve the metric.
- Do not mock `/api/generate` for primary benchmark runs.

## Constraints
- Requires `PORTKEY_API_KEY` in the shell or `.env.local` when running locally.
- Default server mode is production (`next build` + `next start`) so React dev Strict Mode does not double-run generation effects.

## What's Been Tried
- Initial benchmark harness only.
- User clarified that all baseline and experiment runs must use real LLM calls only; mock generation support was removed from the harness.

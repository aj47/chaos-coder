#!/usr/bin/env node
import { chromium } from "@playwright/test";
import { performance } from "node:perf_hooks";

const DEFAULT_PROMPT =
  "A Pokédex web app that displays Pokémon information with search and filter functionality";

const baseURL = (process.env.BENCHMARK_BASE_URL || "http://127.0.0.1:3000").replace(/\/$/, "");
const promptText = process.env.BENCHMARK_PROMPT || DEFAULT_PROMPT;
const numGenerations = Number.parseInt(process.env.BENCHMARK_NUM_GENERATIONS || "3", 10);
const timeoutMs = Number.parseInt(process.env.BENCHMARK_TIMEOUT_MS || "240000", 10);
const headless = process.env.BENCHMARK_HEADLESS !== "0";
const slowMo = Number.parseInt(process.env.BENCHMARK_SLOW_MO_MS || "0", 10);

if (!Number.isFinite(numGenerations) || numGenerations !== 3) {
  throw new Error("This benchmark is intentionally pinned to BENCHMARK_NUM_GENERATIONS=3.");
}

function metric(name, value) {
  const normalized = Number.isFinite(value) ? Math.round(value) : value;
  console.log(`METRIC ${name}=${normalized}`);
}

function info(name, value) {
  console.log(`INFO ${name}=${value}`);
}

function isGeneratePost(request) {
  try {
    const url = new URL(request.url());
    return request.method() === "POST" && url.pathname === "/api/generate";
  } catch {
    return false;
  }
}

async function waitUntil(predicate, timeout, label) {
  const start = performance.now();
  while (performance.now() - start < timeout) {
    if (predicate()) return;
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error(`Timed out waiting for ${label} after ${timeout}ms`);
}

function summarizeApiTimings(apiTimings) {
  const durations = apiTimings.map((entry) => entry.durationMs);
  const sum = durations.reduce((total, value) => total + value, 0);
  return {
    max: Math.max(...durations),
    min: Math.min(...durations),
    mean: sum / durations.length,
  };
}

const browser = await chromium.launch({
  headless,
  slowMo,
  args: ["--disable-dev-shm-usage"],
});

const context = await browser.newContext({
  viewport: { width: 1440, height: 1000 },
  reducedMotion: "reduce",
});
const page = await context.newPage();
page.setDefaultTimeout(timeoutMs);


const browserErrors = [];
let apiStartedCount = 0;
let firstApiStartMs = null;
const apiTimings = [];
const apiFailures = [];
const pendingGenerateRequests = new Map();

page.on("console", (message) => {
  if (["error", "warning"].includes(message.type())) {
    browserErrors.push(`${message.type()}: ${message.text()}`);
  }
});

page.on("pageerror", (error) => {
  browserErrors.push(`pageerror: ${error.message}`);
});

page.on("request", (request) => {
  if (!isGeneratePost(request)) return;

  apiStartedCount += 1;
  const now = performance.now();
  firstApiStartMs ??= now;
  pendingGenerateRequests.set(request, now);
});

page.on("response", (response) => {
  const request = response.request();
  if (!pendingGenerateRequests.has(request)) return;

  const startedAt = pendingGenerateRequests.get(request);
  pendingGenerateRequests.delete(request);
  const completedAt = performance.now();
  const durationMs = completedAt - startedAt;
  const status = response.status();

  apiTimings.push({ durationMs, status, completedAt });
  if (status < 200 || status >= 300) {
    apiFailures.push({ status, url: response.url(), durationMs });
  }
});

page.on("requestfailed", (request) => {
  if (!pendingGenerateRequests.has(request)) return;

  const startedAt = pendingGenerateRequests.get(request);
  pendingGenerateRequests.delete(request);
  const completedAt = performance.now();
  apiFailures.push({
    status: "requestfailed",
    url: request.url(),
    durationMs: completedAt - startedAt,
    completedAt,
    failure: request.failure()?.errorText || "unknown",
  });
});

try {
  info("base_url", baseURL);
  info("prompt", JSON.stringify(promptText));

  // Warm the app shell, results page, and API route compilation before timing the paid generation flow.
  await page.goto(`${baseURL}/`, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.locator("textarea").first().waitFor({ state: "visible", timeout: 60000 });
  await page.goto(`${baseURL}/results`, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForLoadState("networkidle", { timeout: 15000 }).catch(() => {});
  await page.evaluate(async () => {
    await fetch("/api/generate", { method: "GET" }).catch(() => null);
  });

  // Reset instrumentation after warmup so the metric captures only this benchmark run.
  apiStartedCount = 0;
  firstApiStartMs = null;
  apiTimings.length = 0;
  apiFailures.length = 0;
  pendingGenerateRequests.clear();
  browserErrors.length = 0;

  await page.goto(`${baseURL}/`, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.locator("textarea").first().waitFor({ state: "visible", timeout: 60000 });

  const templateButton = page.getByRole("button", { name: /Pokédex/i });
  if ((await templateButton.count()) > 0) {
    await templateButton.first().click();
  } else {
    await page.locator("textarea").first().fill(promptText);
  }

  await page.waitForFunction(
    (expectedPrompt) => document.querySelector("textarea")?.value === expectedPrompt,
    promptText,
    { timeout: 10000 }
  );

  const runStartedAt = performance.now();
  await page.getByRole("button", { name: /Generate Web Apps/i }).click();
  await page.waitForURL(/\/results\?/, { timeout: 30000 });

  await waitUntil(
    () => apiTimings.length + apiFailures.length >= numGenerations,
    timeoutMs,
    `${numGenerations} /api/generate responses`
  );
  const lastApiCompletedAt = Math.max(...apiTimings.map((entry) => entry.completedAt));
  const apiWallMs = lastApiCompletedAt - (firstApiStartMs ?? runStartedAt);

  // Give accidental duplicate effects enough time to start, then fail loudly if this was not exactly 3 generations.
  await page.waitForTimeout(750);
  if (apiStartedCount !== numGenerations) {
    throw new Error(
      `Expected exactly ${numGenerations} /api/generate POSTs, saw ${apiStartedCount}. ` +
        "Use production server mode for this benchmark; dev React Strict Mode can double-run effects."
    );
  }

  if (apiFailures.length > 0) {
    throw new Error(`Generation API failures: ${JSON.stringify(apiFailures)}`);
  }

  await page.waitForFunction(
    (expectedGenerations) => {
      const text = document.body.innerText || "";
      const stillGenerating = /\bGenerating\b/.test(text);
      const nonEmptyPreviews = Array.from(document.querySelectorAll("iframe[title='Preview']"))
        .filter((iframe) => iframe.srcdoc && iframe.srcdoc.trim().length > 200).length;

      // There is one detailed preview plus one grid preview per generated site.
      return !stillGenerating && nonEmptyPreviews >= expectedGenerations + 1;
    },
    numGenerations,
    { timeout: 30000 }
  );

  const totalMs = performance.now() - runStartedAt;
  const api = summarizeApiTimings(apiTimings);

  metric("generate_3_websites_ms", totalMs);
  metric("api_wall_ms", apiWallMs);
  metric("api_max_ms", api.max);
  metric("api_mean_ms", api.mean);
  metric("api_min_ms", api.min);
  metric("api_count", apiTimings.length);
  metric("browser_error_count", browserErrors.length);

  if (browserErrors.length > 0) {
    console.log("INFO browser_errors=" + JSON.stringify(browserErrors.slice(0, 5)));
  }
} finally {
  await context.close().catch(() => {});
  await browser.close().catch(() => {});
}

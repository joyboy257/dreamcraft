# G6 Engineering Evidence

Status: **engineering-complete / independently certified PASS**.

No OpenAI request was made while collecting this evidence. The browser suite ran
with `DREAMCRAFT_OPENAI_ENABLED=false` and used the deterministic local provider.
No Vercel project was created and no deployment was attempted.

The G6 hardening work was performed as a sequential repository pass followed by
an independent Terra gate review. It was not an exhaustive multi-agent security
scan. Terra independently returned PASS after reviewing the changed security,
reliability, accessibility, performance, and test paths and reproducing the gate
commands.

## Security findings ledger

| Severity | Finding and credible path | Evidence | Remediation / disposition |
| --- | --- | --- | --- |
| Pass | Model and user data cannot become executable browser content. | Repository review found no `eval`, `new Function`, generated import, generated shader, raw HTML rendering, or model-controlled URL path. Dream output crosses strict server schema, sanitizer, reference, budget, spawn, and client validation boundaries. React renders generated strings as text. | Keep these checks as architecture invariants. |
| Pass | The OpenAI credential remains server-only and live use is double gated. | `src/server/**` owns the SDK and key; client code calls `/api/dream`. Public environment parsing rejects secret-shaped `VITE_*` keys. Tracked and full-history scans found zero OpenAI/GitHub/Vercel token-pattern matches; only `.env.example` is tracked. | Rotate the previously exposed development key before the eventual authorized live proof, as already recorded. |
| Pass | Request and output resource exhaustion is bounded. | The route accepts JSON POST only, rate-limits before reading, enforces declared and streamed body limits, strict fields, 1,200 characters, control/markup/URL normalization, and a basic meaningful-detail check. Model retries, deadlines, output tokens, response-stream bytes, schema collections, geometry, particles, world radius, and runtime queues are bounded. Hostile fixtures repair or reject invalid references, all-air/all-solid terrain, invalid spawn, and budget floods. | Retain the limits and hostile aggregate test. |
| Pass | Errors and logs avoid secrets and raw dream text. | API errors use stable generic codes/messages and `no-store`; optional metrics logs include request ID, outcome, status, duration, and category only. Provider errors are normalized. No raw prompt, key, authorization header, or stack trace is sent to the user. | Keep debug metrics opt-in and structured. |
| Pass | Production responses receive a restrictive browser policy. | `vercel.json` sets CSP without `unsafe-eval`, remote scripts, remote connections, frames, objects, or permissive base URLs; it also sets HSTS, MIME sniffing, framing, referrer, permissions, opener/resource, DNS-prefetch, and cross-domain policy headers. API responses are `no-store`. A configuration test locks the directives. Production source maps are disabled. | After preview deploy, verify the actual edge response headers with a browser and `curl`; configuration evidence is not live-edge evidence. |
| Pass | Service-worker caching cannot retain generation responses. | The worker ignores all `/api/` requests, caches same-origin GETs only, writes successful basic/default responses only, uses versioned owned caches, and deletes only stale DreamCraft caches. Navigation has a bounded offline fallback. | Bump the cache version when shell compatibility changes. |
| Medium (approved change required) | The in-memory limiter is process-local, so requests distributed across serverless instances do not share a global budget. Direct non-browser callers can still consume local-generation CPU while the API is disabled and model spend when it is later enabled. | `InMemoryRateLimitHook` has bounded per-client/global buckets, but state is per function instance. No dependency vulnerability is involved. | Before enabling live generation publicly, configure Vercel Firewall/shared rate protection or approve a distributed limiter. Rate-limit policy was not changed in this pass. |
| Low (approved change required) | The route does not explicitly reject a foreign `Origin`. Browser cross-origin calls are constrained by JSON preflight and the absence of `Access-Control-Allow-Origin`, and the endpoint has no cookies/account authority, so classical CSRF impact is low; non-browser requests remain possible. | Route tests lock JSON-only behavior and confirm no permissive CORS header. | Before public live generation, approve an exact same-origin check/allowlist. CORS/origin policy was not changed in this pass. |
| Informational | True GPU/driver context restoration remains device-dependent. | Browser proof dispatches context-loss/restoration events, confirms the engine pauses, shows an actionable return path, resumes, and clears recovery UI. Initialization failure already has an actionable exit. | Recheck on the physical demo device and keep the return-to-description path for unrecoverable devices. |

`pnpm audit --prod` reported no known vulnerabilities. No critical or high
security finding remains. Authentication, accounts, cookies, databases, file
uploads, and PII persistence are not present in the scoped product.

## Performance evidence

Synthetic Chromium measurements were captured from the deterministic default
fixture after all chunk work settled. These numbers are reproducible release
guards, not real-user monitoring.

| Metric | Desktop balanced | Pixel 7 emulation, reduced | Budget |
| --- | ---: | ---: | ---: |
| Automated input-to-playable wall time | 939 ms | not separately captured | under 15 s |
| Engine initialization to central playable chunk | 5 ms | 17 ms | under 1 s practical target |
| FPS / frame p50 / frame p95 | 119 / 8.4 ms / 16.7 ms | 120 / 8.3 ms / 9.1 ms | desktop near 60 and p95 under 22 ms; mobile at least 30 |
| Draw calls | 23 | 18 | under 100 |
| Visible triangles | 11,738 | 7,628 | under 500,000 |
| Loaded / queued chunks | 25 / 0 | 25 / 0 | radius 2, bounded queue |
| Chunk generate+mesh p95 | 4.9 ms | 4.2 ms | below the 50 ms long-task boundary |
| Active entities / particles | 1 / 62 | 1 / 62 | reduced particles at most 120 |

The reduced profile was independently observed with render radius 2, DPR cap
1.25, and antialiasing disabled. Desktop used the balanced profile with render
radius 2 and DPR cap 1.5.

After garbage collection, desktop heap usage across the initial dream and two
full return-to-input/rematerialize lifecycles was 18,365,740 bytes,
19,077,252 bytes, and 19,594,752 bytes. Final growth was 1,229,012 bytes
(approximately 6.7%), inside the automated stability guard of 35% plus 8 MB.
Each lifecycle disposes the renderer, geometry, materials, audio, entities,
listeners, world chunks, and gameplay subscriptions.

## Worker and recovery architecture

The current bounded renderer does not instantiate a chunk Web Worker. Spawn
generation and meshing therefore use the trusted synchronous generator, with
the central chunk built first and one outer chunk processed per fixed update.
The measured chunk p95 is under 5 ms on both profiles, and the frame p95 remains
inside budget. Worker-crash recovery is consequently not applicable to this
release implementation; no fake worker or fake crash path was added. If a real
worker is introduced later, versioned jobs, stale-result rejection, restart,
and synchronous spawn fallback become required before release.

## Commands and results

- Full unit/integration run: 48 files, 192/192 tests passed.
- Full eval run: 4 files, 6/6 tests passed, including the hostile aggregate.
- Focused independent changed-path verification: 44/44 tests passed.
- Official Playwright matrix: 9/9 journeys passed with `workers: 1`, including
  the deterministic twenty-prompt, single-page fallback journey. Luna reproduced
  this result three consecutive times; Terra then independently reran the same
  9/9 matrix and passed it.
- Production PWA browser check: 1/1 passed.
- Typecheck, lint, pack validator, service-worker syntax validation, production
  build, diff whitespace checks, and production audit were rerun and passed as
  part of final certification.
- Production JavaScript bundle: 980.52 kB raw / 271.31 kB gzip. Vite's raw
  500 kB advisory is not a documented release gate; the measured desktop and
  mobile runtime budgets passed.
- Production dependency audit: zero known vulnerabilities.
- Secret-safe tracked/history scans: zero token-pattern hits; only
  `.env.example` is tracked.

The official browser suite is intentionally deterministic and serialized to
remove cross-test GPU and service interference. Live Vercel edge-header
verification, physical-device ergonomics/GPU behavior, and Safari observation
remain G7 release-verification items; they are not hidden G6 engineering claims.

## Independent gate conclusion

Terra certified Gate G6 PASS with no Critical or High finding. The residual
risks are bounded and explicitly carried forward: the application limiter is
process-local across serverless instances; an exact Origin allowlist still
requires an approved public-live policy change; true WebGL driver recovery and
mobile ergonomics require physical-device confirmation; the main-thread chunk
pipeline remains acceptable only while its measured sub-5 ms p95 stays within
budget; and the raw client bundle remains above Vite's advisory despite its
271.31 kB gzip size and passing runtime metrics.

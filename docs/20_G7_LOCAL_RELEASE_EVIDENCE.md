# G7 Local Release Candidate Evidence

Status: **engineering-complete / generation-disabled production edge verified / physical-proof-pending**.

Gate G7 has a public, generation-disabled production deployment. This report
does not claim physical-device proof, live OpenAI proof, or completed hackathon
submission placeholders.

## Vercel deployment behavior and evidence

The Vercel project is linked with Git integration disconnected. Preview and
Production each have exactly seven safe non-secret generation-disabled settings,
and neither environment has `OPENAI_API_KEY`. No OpenAI API request was made.

The initial preview-intended build failed before application output because a
nested PATH pnpm 10.28 violated the pnpm 11 engine. Its deployment record was
removed. The durable repair makes `build` execute `tsc --noEmit && vite build`
inside the original Corepack-controlled pnpm process and locks that invariant
with a static test.

The repaired deployment was invoked with `--target=preview` and built Ready.
Vercel nevertheless classified it as production and created a production alias,
because Vercel automatically promotes a new project's first successful
deployment to production. It was immediately removed without any HTTP
application/API request. `vercel ls` now reports zero deployments and no alias
remains. This is not a production release or preview proof. The official
behavior is documented at
[Vercel: Default Production Domain](https://vercel.com/blog/default-production-domain).

The owner authorized the required first production-target deployment. Production
deployment `dpl_GtwUnH595kvDhxmfiDchukMuojXp` is Ready at
`https://dreamcraft-psi.vercel.app`, with deployment-specific URL
`https://dreamcraft-q1eou2zv4-deonaqwx-9156s-projects.vercel.app`. It deployed
certified commit `34c01ee` with generation disabled. The production build
contains only the bounded `/api/dream` and `/api/health` functions.

Independent edge evidence passed:

- `corepack pnpm smoke:deployed -- https://dreamcraft-q1eou2zv4-deonaqwx-9156s-projects.vercel.app`
  passed with deterministic `api_disabled` fallback output on two same-origin
  requests and no provider call.
- The stable alias returned the restrictive CSP, HSTS, `nosniff`, `DENY`,
  no-referrer, and restrictive Permissions-Policy headers.
- `GET /api/health` returned only the safe health shape, `no-store`,
  `generationEnabled: false`, and `fallbackAvailable: true`; manifest and
  service worker both returned 200.

## Independent release-security review

Terra returned **PASS** for the G7 release-security slice.

- `POST /api/dream` requires an exact same-origin `Origin` before rate limiting,
  body parsing, or provider work. Missing and foreign origins return a generic
  `403 origin_not_allowed` response with no permissive CORS header.
- The browser, deployed-smoke validator, and locked live validator deliberately
  send the endpoint origin. Credential-bearing, redirected, non-HTTPS deployed
  targets are rejected; loopback HTTP remains available only for local proof.
- `GET /api/health` exposes exactly `status`, `generationEnabled`,
  `fallbackAvailable`, and a sanitized version identifier. Responses are
  `no-store`, `nosniff`, and have no permissive CORS header.
- The deployed-smoke validator fails closed if generation is enabled, security
  headers are missing, CORS is permissive, fetch fails, fallback is not caused
  by the kill switch, or repeated local DreamSpecs differ. It suppresses fetch
  and response internals.
- GitHub Actions are pinned to immutable commit SHAs for Checkout `v4.3.1` and
  Setup Node `v4.4.0`; checkout credentials are not persisted. CI explicitly
  clears the OpenAI key and live confirmation, enables pinned pnpm through
  Corepack, installs from the frozen lockfile, and contains no deployment or
  artifact-upload step.
- Vercel configuration bounds health to 5 seconds and dream generation to 30
  seconds, locks the Vite `dist` output, configures restrictive browser headers,
  and marks API responses `no-store`.

No Critical or High release-security finding remained in the reviewed local
candidate. Vercel Firewall/shared rate protection remains mandatory before live
public generation because application memory is not global across serverless
instances.

## Serialized local release matrix

Sol reran the complete candidate with Playwright `workers: 1` and certified the
original local matrix. Terra then reran the complete deployment-build repair;
the direct build path, 202-test suite, smoke/eval/browser/PWA checks, pack, and
audit all passed without a deployment or OpenAI request.

| Check | Result |
| --- | --- |
| Typecheck | Pass |
| Lint | Pass, zero warnings |
| Unit/integration | 50 files, 204/204 passed |
| Deployed-smoke validator | 4/4 passed |
| Dream evals | 4 files, 6/6 passed |
| Production build | Pass; JavaScript 981.62 kB raw / 271.80 kB gzip |
| Chromium E2E | 9/9 passed, serialized, twice consecutively after CI repair |
| Production PWA | 1/1 passed |
| Pack validator | Pass |
| Smoke/live/service-worker script syntax | Pass |
| Production dependency audit | Zero known vulnerabilities |
| Diff whitespace check | Pass |

The raw bundle remains above Vite's 500 kB advisory, but the separately
certified desktop/mobile runtime budgets pass. The advisory is recorded rather
than hidden.

## CI semantic-readiness repair

GitHub run `29484083270` exposed three renderer-speed-sensitive E2E failures;
the runtime performance contracts continued to pass and were not relaxed.

- The awakened objective was incorrectly asserted through the transient aiming
  prompt. The objective now has a polite live `status` semantic, while the
  bootstrap flow waits for the real `Awaken the Fragment` interaction prompt
  before issuing `E`.
- The mobile interaction flow now waits for the resolved guide prompt and
  verifies that the Interact control is the actual hit target before invoking a
  normal click. It does not use forced clicks, retries, skips, or delay-based
  synchronization.
- The six-world screenshot regression now has a test-local 60-second envelope
  (ten seconds per complete materialization/entry/capture scenario), rather
  than the global 30-second single-scenario default. Visual distinctness and
  all six captures remain mandatory.

The final repair removed an invalid assumption in the bootstrap journey: after
the dialogue, the staged camera is explicitly aligned through the engine's real
look/targeting path before the visible interaction cue and the real `E` action
are asserted. The test-only helper exists only in development under automated
browser control; it does not bypass play-graph events or interaction handling.
The engine also refreshes its interaction cue when dialogue resumes gameplay.

Verification after the repair: `CI=true` local bootstrap passed; full local
browser E2E passed 9/9; typecheck and lint passed. GitHub Actions run
[`29493511135`](https://github.com/joyboy257/dreamcraft/actions/runs/29493511135)
then passed the complete release chain independently, including Chromium E2E,
PWA, pack, service-worker syntax, and audit.

## CI renderer attestation and empirical performance proof

GitHub-hosted Chromium is a software-rendered environment, not a representative
desktop GPU or physical mobile device. The normal `pnpm test:e2e` suite therefore
attests the WebGL renderer and verifies real rendering plus all renderer-
independent release constraints: quality profile, draw calls, triangle count,
chunk completion, time-to-playable, and restart-memory stability. Its attached
performance JSON explicitly records `hardwarePerformanceAttested: false` when
the backend is software; it does not present VM frame cadence as a physical
frame-rate result.

The unchanged empirical contracts remain mandatory: desktop >=50 FPS with p95
frame time <22 ms, and reduced mobile >=30 FPS with p95 <34 ms. Run
`pnpm test:performance:hardware` on an attested hardware renderer to prove
those numbers. That command fails closed on software or unknown renderers, so a
CI structural pass cannot substitute for the hardware proof.

## External activity statement

- No OpenAI API request was made.
- Vercel project `dreamcraft` is linked with Git integration disconnected.
- The owner-approved, generation-disabled production deployment is Ready at
  `https://dreamcraft-psi.vercel.app`; the original failed pre-build and
  unintended first-success records were removed.
- Preview and Production each have exactly seven safe non-secret settings and
  no `OPENAI_API_KEY`.
- No environment secret was read, uploaded, staged, or committed.
- The deterministic local generator remains the mandatory fallback.

## Remaining Gate G7 proof and human actions

- Complete incognito, second-device, physical-mobile, slow-network, offline,
  and full bundled-ending checks against the public production URL. These are
  human/device proofs and cannot be represented by the CI software renderer.
- GitHub branch protection is active on `main`: `release-checks` is required
  and strict, while force pushes and branch deletion are disabled. The final
  evidence update passed GitHub Actions run
  [`29493914628`](https://github.com/joyboy257/dreamcraft/actions/runs/29493914628).
- Obtain owner approval before adopting the MIT draft as `LICENSE`.
- Rotate/fund the OpenAI key and obtain separate explicit authorization before
  the locked ten-prompt proof.
- Configure Vercel Firewall/shared limiting and OpenAI spend controls before any
  live public generation.
- Populate the deployment/video/team/session placeholders before submission.

Until the physical/device and submission actions pass, the accurate release
state is **engineering-complete / public fallback release verified /
physical-proof-pending**, not Gate G7 complete.

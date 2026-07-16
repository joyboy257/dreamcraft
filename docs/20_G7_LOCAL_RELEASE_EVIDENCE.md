# G7 Local Release Candidate Evidence

Status: **engineering-complete / Vercel-proof-pending**.

Gate G7 is not complete. This report certifies the local repository candidate;
it does not claim a Ready preview, authorized production release, live OpenAI
proof, or public URL.

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

An independently verifiable preview cannot be created until there is a first
successful production-target deployment. That next action is a human-only
authorization gate; it must be explicitly authorized by the owner, and it will
remain generation-disabled with no key.

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
| Unit/integration | 49 files, 202/202 passed |
| Deployed-smoke validator | 4/4 passed |
| Dream evals | 4 files, 6/6 passed |
| Production build | Pass; JavaScript 980.52 kB raw / 271.31 kB gzip |
| Chromium E2E | 9/9 passed, serialized |
| Production PWA | 1/1 passed |
| Pack validator | Pass |
| Smoke/live/service-worker script syntax | Pass |
| Production dependency audit | Zero known vulnerabilities |
| Diff whitespace check | Pass |

The raw bundle remains above Vite's 500 kB advisory, but the separately
certified desktop/mobile runtime budgets pass. The advisory is recorded rather
than hidden.

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
- The failed pre-build record and the Ready first-success record have both been
  removed. No deployment or alias remains, and no HTTP application/API request
  was made against either record.
- Preview and Production each have exactly seven safe non-secret settings and
  no `OPENAI_API_KEY`.
- No environment secret was read, uploaded, staged, or committed.
- The deterministic local generator remains the mandatory fallback.

## Remaining Gate G7 proof and human actions

- Obtain explicit owner authorization for the first successful production-target
  deployment. The exact conditional command is in
  `docs/19_RELEASE_AND_ROLLBACK_RUNBOOK.md`.
- After that authorized deployment exists, create and verify the
  generation-disabled preview with
  `vercel deploy --yes --target=preview --scope deonaqwx-9156s-projects`.
- Prove the real edge health, same-origin, CSP/security-header, and deterministic
  fallback behavior with the deployed smoke.
- Complete incognito, second-device, physical-mobile, slow-network, offline, and
  full bundled-ending checks against the preview.
- Configure GitHub required checks/branch protection after the workflow exists
  on the remote.
- Obtain owner approval before adopting the MIT draft as `LICENSE`.
- Obtain separate explicit authorization before production deployment.
- Rotate/fund the OpenAI key and obtain separate explicit authorization before
  the locked ten-prompt proof.
- Configure Vercel Firewall/shared limiting and OpenAI spend controls before any
  live public generation.
- Populate the deployment/video/team/session placeholders before submission.

Until these items pass, the accurate release state is
**engineering-complete / Vercel-proof-pending**, not Gate G7 complete.

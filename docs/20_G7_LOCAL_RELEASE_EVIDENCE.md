# G7 Local Release Candidate Evidence

Status: **engineering-complete / preview-proof-pending**.

Gate G7 is not complete. This report certifies the local repository candidate;
it does not claim a Vercel project, preview, production deployment, live OpenAI
proof, or public URL.

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

## Sol final serialized release matrix

Sol reran the complete candidate with Playwright `workers: 1` and certified the
local matrix:

| Check | Result |
| --- | --- |
| Typecheck | Pass |
| Lint | Pass, zero warnings |
| Unit/integration | 49 files, 201/201 passed |
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

## External activity statement

- No OpenAI API request was made.
- No Vercel project was created or linked.
- No preview or production deployment was attempted.
- No environment secret was read, uploaded, staged, or committed.
- The deterministic local generator remains the mandatory fallback.

## Remaining Gate G7 proof and human actions

- Create/link Vercel only from the synchronized release-candidate checkpoint.
- Configure Preview with generation disabled and no OpenAI key.
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
**engineering-complete / preview-proof-pending**, not Gate G7 complete.

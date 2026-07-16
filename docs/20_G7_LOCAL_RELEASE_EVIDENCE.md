# G7 Local Release Candidate Evidence

Status: **engineering-complete / preview-proof-pending**.

Gate G7 is not complete. This report certifies the local repository candidate;
it does not claim a Ready preview, authorized production release, live OpenAI
proof, or public URL.

## Failed deployment attempt and corrective action

The Vercel project is now linked with Git integration disconnected and the safe
Preview environment contains no OpenAI key. A first preview-intended CLI command
omitted an explicit target and created failed deployment
`dpl_CiC9DEQH949T2FBYPvsZqTt77d39`; inspection reported target `production` and
status `Error`. It failed before application output because Vercel entered the
build with Corepack pnpm 11.13, while the package build script recursively ran
an unqualified PATH `pnpm` that resolved to 10.28 and violated the repository's
pnpm 11 engine requirement.

This attempt made no OpenAI request and produced no live application/API proof.
It is non-release evidence and must be removed before retry. The durable fix
makes `build` execute `tsc --noEmit && vite build` directly inside the original
Corepack-controlled pnpm process and locks that invariant with a static test.
The Preview retry command now explicitly uses `--target=preview`.

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

## External activity statement

- No OpenAI API request was made.
- Vercel project `dreamcraft` was linked with Git integration disconnected.
- One failed deployment record was created before application output; it is not
  a Ready preview or an authorized production release and must be removed.
- No environment secret was read, uploaded, staged, or committed.
- The deterministic local generator remains the mandatory fallback.

## Remaining Gate G7 proof and human actions

- Remove failed deployment `dpl_CiC9DEQH949T2FBYPvsZqTt77d39`.
- Retry only from the synchronized release-candidate checkpoint with
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
**engineering-complete / preview-proof-pending**, not Gate G7 complete.

# G7 Release and Rollback Runbook

Status: **engineering-complete / Vercel-proof-pending**.

This runbook never authorizes an OpenAI request. Vercel's documented behavior
for a new project changes the deployment order: its first successful deployment
is automatically promoted to production. The first successful DreamCraft
deployment therefore needs separate, explicit owner authorization even though
it keeps generation disabled and has no OpenAI key.

The initial preview-intended build failed before application output when a nested
unqualified `pnpm` resolved to 10.28 under a pnpm 11-only engine. Its deployment
record was removed. A repaired command with `--target=preview` then built Ready,
but Vercel classified the first successful deployment as production and assigned
a production alias. It was immediately removed without any HTTP application/API
request. There is now no deployment or alias.

## 1. Preconditions

- `main` is clean, synchronized, and independently reviewed for G7.
- GitHub CI is green for typecheck, lint, unit/integration, smoke-validator,
  eval, build, Chromium E2E, production PWA, pack, service-worker syntax, and
  production audit.
- The Vercel CLI is authenticated to the intended team.
- The local project link points to Vercel project `dreamcraft` in team
  `deonaqwx-9156s-projects`; Git integration remains disconnected.
- `vercel ls --scope deonaqwx-9156s-projects` reports no DreamCraft deployment;
  no alias remains. No Ready preview exists.
- Preview and Production each contain exactly the seven safe non-secret settings
  listed below; neither contains `OPENAI_API_KEY`.
- The previously exposed local development key is not reused, funded, or
  uploaded.
- Explicit owner authorization is required before the first successful
  production-target deployment. Without it, stop here.

## 2. Vercel project configuration

Use these values when creating/linking the project:

| Setting | Value |
| --- | --- |
| Repository | `joyboy257/dreamcraft` |
| Framework | Vite |
| Node.js | 24.x |
| Install command | `corepack pnpm install --frozen-lockfile` |
| Build command | `corepack pnpm build` |
| Output directory | `dist` |
| Production branch | `main` after production authorization |
| Function region | Vercel default |

The project is already linked. Do not relink it or enable Git integration during
the preview-first phase. The ignored `.vercel/project.json` identifies project
`dreamcraft`; it must never be committed.

Vercel documents that the first successful deployment in a new project is
automatically promoted to production. `--target=preview` is still required for
subsequent preview deployments, but it does not override that first-deployment
promotion behavior.

## 3. Generation-disabled Preview environment

These values are already set for **both Preview and Production**:

```text
DREAMCRAFT_OPENAI_ENABLED=false
DREAMCRAFT_ENABLE_DIRECTOR_PIPELINE=false
DREAMCRAFT_GENERATION_STRATEGY=single-sol
DREAMCRAFT_MAX_DREAM_CHARS=1200
DREAMCRAFT_MAX_BODY_BYTES=8192
DREAMCRAFT_REQUEST_TIMEOUT_MS=12000
DREAMCRAFT_ENABLE_DEBUG_METRICS=false
```

Do **not** create `OPENAI_API_KEY` in either environment. Do not add any secret
under a `VITE_*` name. Environment changes apply only to a new deployment.

## 4. First successful deployment — owner authorization required

Do not run this command unless the owner has explicitly authorized the first
successful production-target deployment. It is safe with respect to generation:
Production has the seven disabled/non-secret settings above and no OpenAI key.

```bash
cd /Users/deon/Developer/Dreamcraft
FIRST_PRODUCTION_URL="$(vercel deploy --yes --prod --scope deonaqwx-9156s-projects)"
vercel inspect "$FIRST_PRODUCTION_URL" --scope deonaqwx-9156s-projects
```

Record the deployment ID and URL, then run only the generation-disabled smoke
and security checks. Do not enable a key or live generation. After this approved
first deployment exists, create a true preview with the explicit target:

```bash
cd /Users/deon/Developer/Dreamcraft
PREVIEW_URL="$(vercel deploy --yes --target=preview --scope deonaqwx-9156s-projects)"
vercel inspect "$PREVIEW_URL" --scope deonaqwx-9156s-projects
corepack pnpm smoke:deployed -- "$PREVIEW_URL"
```

The smoke validator requires an explicit credential-free HTTPS origin and:

1. checks `GET /` and its security headers;
2. checks `GET /api/health` has the exact safe, uncached shape;
3. stops before generation if `generationEnabled` is not `false`;
4. calls canonical `POST /api/dream` twice with same-origin headers;
5. requires `api_disabled` deterministic fallback and identical DreamSpec data;
6. never prints dream text, keys, billing state, or response internals.

Record after each applicable pass:

```text
Preview URL: [PENDING]
Deployment ID: [PENDING]
Health version: [PENDING]
Smoke timestamp: [PENDING]
Reviewer: [PENDING]
```

## 5. Manual preview release checks

Run each item against the exact preview URL and record evidence:

- [ ] Incognito desktop: input → stable fragment → guide → objective → ending.
- [ ] Second device: same complete path.
- [ ] Mobile device in landscape: touch move/look/jump/interact and pause/return.
- [ ] Browser Slow 3G: understandable materialization, cancellation, retry, and
      no uncaught console error.
- [ ] Offline after one online load: PWA input shell reloads and remains usable.
- [ ] API-disabled response visibly says **Stable fragment** and remains playable.
- [ ] `/api/health` reveals no key state, billing, prompt, or internal error.
- [ ] `POST /api/dream` rejects missing or foreign `Origin`.
- [ ] Actual edge responses contain CSP, HSTS, `nosniff`, framing, referrer, and
      API `no-store` headers.
- [ ] Vercel function logs contain no raw dream text or credential material.

Any failure holds G7. Fix locally, rerun CI, deploy a new preview, and repeat the
whole preview checklist.

## 6. Production authorization and promotion

Production is a separate external action. After the preview is fully verified:

1. Present the preview URL, commit, smoke results, residual risks, and rollback
   target to the owner.
2. Obtain explicit production-deployment authorization.
3. Confirm the Production environment still has generation disabled and no
   OpenAI key.
4. Promote the exact verified deployment rather than rebuilding different code:

   ```bash
   vercel promote "$PREVIEW_URL"
   ```

5. Run the deployed smoke against the production URL.
6. Repeat incognito and second-device complete-flow checks.
7. Record the public URL and evidence in `.ai-bridge/status.md` and the
   submission placeholders.

Do not enable Git auto-production from `main` until this authorization gate is
complete and required checks are enforced.

## 7. Rollback

### Rollback triggers

Rollback immediately for a broken shell, failing health/smoke, new uncaught
client errors, missing security headers, incorrect generation state, secret/raw
prompt logging, severe performance regression, or a security finding.

### Previous-deployment rollback

1. Identify the last known-good `READY` production deployment in Vercel
   Deployments or with `vercel ls`.
2. Confirm its commit and environment state. Prefer a known generation-disabled
   deployment.
3. Repoint production:

   ```bash
   vercel rollback <previous-deployment-url-or-id>
   ```

   The equivalent dashboard action is **Deployments → known-good deployment →
   Promote to Production**.

4. Verify the rollback target:

   ```bash
   vercel inspect <production-url>
   corepack pnpm smoke:deployed -- <production-url>
   ```

5. Repeat the incognito critical path and inspect function logs.
6. Record the trigger, old/new deployment IDs, timestamps, and verification.

DreamCraft has no database or migration rollback. Application state is local to
the browser, so rollback is an immutable deployment/alias change.

### Live-generation emergency stop

If live generation is enabled later, first stop spend with Vercel Firewall or
the OpenAI project control, set `DREAMCRAFT_OPENAI_ENABLED=false`, remove/rotate
the affected key when appropriate, and create a new deployment. Environment
changes do not alter an existing deployment in place.

## 8. Separate live-generation gate

The deployed release and G3 live proof are not the same approval:

- Rotate the development key whose value appeared in historical local output.
- Create a dedicated OpenAI project/key and a `$10` proof budget.
- Keep `single-sol`; do not enable the director experiment.
- Follow [`docs/13_G3_LIVE_VALIDATION_RUNBOOK.md`](13_G3_LIVE_VALIDATION_RUNBOOK.md)
  only after explicit live-call authorization.
- Before live **public** generation, configure Vercel Firewall/shared rate
  protection; the in-memory limiter is not global across serverless instances.
- Set production spend alerts/caps and verify model access.
- Redeploy after environment changes, then rerun security, health, fallback, and
  live-path smoke checks without exposing the key.

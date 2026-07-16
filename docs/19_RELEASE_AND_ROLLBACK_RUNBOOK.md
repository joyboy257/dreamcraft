# G7 Release and Rollback Runbook

Status: **preview retry pending after a failed non-release build attempt**.

This runbook creates a generation-disabled preview first. It does not authorize
a production deployment or an OpenAI request.

The initial preview-intended command omitted an explicit target and created
failed deployment `dpl_CiC9DEQH949T2FBYPvsZqTt77d39`, which Vercel reported as
target `production`. The build stopped before application output when a nested
unqualified `pnpm` resolved to 10.28 under a pnpm 11-only engine. The repository
fix removes that recursive package-manager call. The failed deployment is not a
preview proof and must be removed before the retry below.

## 1. Preconditions

- `main` is clean, synchronized, and independently reviewed for G7.
- GitHub CI is green for typecheck, lint, unit/integration, smoke-validator,
  eval, build, Chromium E2E, production PWA, pack, service-worker syntax, and
  production audit.
- The Vercel CLI is authenticated to the intended team.
- The local project link points to Vercel project `dreamcraft` in team
  `deonaqwx-9156s-projects`; Git integration remains disconnected.
- Before retry, confirm failed deployment
  `dpl_CiC9DEQH949T2FBYPvsZqTt77d39` has been removed. It still exists at the
  time of this runbook revision. No Ready preview exists yet.
- The previously exposed local development key is not reused, funded, or
  uploaded.
- Production deployment/promotion has separate explicit owner authorization.

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

CLI preview deployments are sufficient and must name the target explicitly.

## 3. Generation-disabled Preview environment

Set these values for **Preview** in the Vercel dashboard:

```text
DREAMCRAFT_OPENAI_ENABLED=false
DREAMCRAFT_ENABLE_DIRECTOR_PIPELINE=false
DREAMCRAFT_GENERATION_STRATEGY=single-sol
DREAMCRAFT_MAX_DREAM_CHARS=1200
DREAMCRAFT_MAX_BODY_BYTES=8192
DREAMCRAFT_REQUEST_TIMEOUT_MS=12000
DREAMCRAFT_ENABLE_DEBUG_METRICS=false
```

Do **not** create `OPENAI_API_KEY` in Preview. If one already exists, remove it
before deploying. Do not add any secret under a `VITE_*` name. Environment
changes apply only to a new deployment.

Use the same generation-disabled/no-key values for the initial Production
environment, but do not deploy Production until the owner authorizes it.

## 4. Create and inspect a preview

First remove the failed non-release deployment. This cleanup command is an
instruction and was not run while preparing the repository fix:

```bash
vercel remove dpl_CiC9DEQH949T2FBYPvsZqTt77d39 --yes --scope deonaqwx-9156s-projects
```

Only after removal and a clean synchronized local checkpoint, create an
explicit Preview deployment. Vercel CLI 54 exposes `--target <TARGET>` and
`--prod` is the production shorthand, so the retry must spell out
`--target=preview`:

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

Record after a pass:

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

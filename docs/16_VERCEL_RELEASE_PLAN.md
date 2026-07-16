# Vercel Release Plan

Date: 2026-07-16 (Asia/Singapore)

Vercel is the selected DreamCraft host. The application remains Vite/React with
serverless API functions; it will not be migrated to Next.js. No database,
authentication system, paid domain, or separate backend is required for the
hackathon release.

## Project settings

- Repository: `joyboy257/dreamcraft`
- Production branch: `main`
- Framework preset: Vite
- Node.js: 24.x
- Install: `corepack pnpm install --frozen-lockfile`
- Build: `corepack pnpm build`
- Output: `dist`
- Function region: Vercel default until measurements justify a change

The authenticated account/team and CLI connection have already been verified,
but project creation and deployment remain deferred until G6 passes.

## Safe initial environment

The repository's authoritative names are documented in `.env.example`. Initial
preview and production configuration keeps live generation off:

```text
OPENAI_API_KEY=replace_me
DREAMCRAFT_OPENAI_ENABLED=false
DREAMCRAFT_ENABLE_DIRECTOR_PIPELINE=false
DREAMCRAFT_GENERATION_STRATEGY=single-sol
DREAMCRAFT_MAX_DREAM_CHARS=1200
DREAMCRAFT_MAX_BODY_BYTES=8192
DREAMCRAFT_REQUEST_TIMEOUT_MS=12000
```

The key must never use a `VITE_` prefix. Environment changes require a new
deployment. The ignored development key that appeared in historical local tool
output must be rotated before funding or upload.

## Release protections

The existing `/api/dream` route already provides bounded input/body size,
structured validation, deadline/abort behavior, one shared retry, deterministic
fallback, API kill switch, and per-client/global in-memory limits. Before public
production, G6 must additionally provide or verify:

- same-origin enforcement at the public edge;
- Vercel WAF/shared rate protection, because serverless memory is not global;
- OpenAI project spend alerts/cap;
- safe `/api/health` output with no key/billing/prompt/internal-error details;
- GitHub required checks for typecheck, lint, tests, evals, build, Chromium E2E,
  and production dependency audit;
- deployed smoke tests for `/`, health, API-disabled fallback, mocked-provider
  behavior where supported, and one bundled dream through its ending.

## Deployment order

1. Certify G4, G5, and G6 locally.
2. Create/link the Vercel project without enabling live generation.
3. Configure safe Preview environment values.
4. Deploy and verify Preview.
5. Ask the user before any production deployment.
6. Separately ask before the locked live OpenAI ten-prompt proof.

The three judge-facing showcase dreams and submission media/assets are G5/G6
deliverables. A stable `vercel.app` URL is sufficient; custom-domain work stays
optional.

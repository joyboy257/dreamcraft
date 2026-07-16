# Vercel Release Plan

Date: 2026-07-16 (Asia/Singapore)

Status: the `dreamcraft` Vercel project is linked to the intended team with Git
integration disconnected. No deployment or alias remains. The initial
preview-intended build failed before application output because a nested PATH
`pnpm` resolved to 10.28 instead of the Corepack-selected 11.13; that record was
removed. A repaired command with `--target=preview` then built Ready, but Vercel
classified the first successful deployment in the new project as production and
created a production alias. It was immediately removed without any HTTP
application/API request. Vercel documents that a new project's first deployment
is automatically promoted to production. Therefore an independently verifiable
preview requires an explicitly authorized first successful production-target
deployment; no such authorization has been given. See
[Vercel: Default Production Domain](https://vercel.com/blog/default-production-domain).

DreamCraft remains a Vite/React PWA with small serverless functions. It will not
be migrated to Next.js. The hackathon release does not need a database,
authentication system, paid domain, or separate backend.

## Fixed project settings

- Repository: `joyboy257/dreamcraft`
- Production branch after authorization: `main`
- Framework preset: Vite
- Node.js: 24.x
- Install: `corepack pnpm install --frozen-lockfile`
- Build: `corepack pnpm build`
- Output: `dist`
- Canonical generation endpoint: `POST /api/dream`
- Health endpoint: `GET /api/health`
- Function region: Vercel default until measurements justify a change

## Release policy

1. Finish and independently review the local G7 candidate.
2. Keep the existing CLI link and disconnected Git integration unchanged.
3. Keep the seven safe non-secret settings in both Preview and Production,
   including `DREAMCRAFT_OPENAI_ENABLED=false`, and keep `OPENAI_API_KEY` absent.
4. Obtain explicit owner authorization for the first successful production-target
   deployment. Vercel's first-deployment behavior makes this an authorization
   gate, not a preview-target selection issue.
5. After that first deployment is established, create and verify the
   generation-disabled preview with the explicit CLI target `--target=preview`.
6. Run the deployed smoke plus incognito, second-device, slow-network, offline,
   and complete-sample checks.
7. Ask the owner before any later production deployment or promotion.
8. Keep key rotation/funding and the locked live ten-prompt proof as a separate
   authorization event.
9. Before live public generation, configure Vercel Firewall/shared rate
   protection and OpenAI project spend controls.

The repository now contains a safe health contract, generation-disabled
deployed smoke validator, restrictive Vercel headers, same-origin dream request
enforcement, and a pinned GitHub CI workflow. These remain local claims until a
preview proves their real edge behavior.

The exact environment, preview, verification, production, and rollback commands
are in [`docs/19_RELEASE_AND_ROLLBACK_RUNBOOK.md`](19_RELEASE_AND_ROLLBACK_RUNBOOK.md).

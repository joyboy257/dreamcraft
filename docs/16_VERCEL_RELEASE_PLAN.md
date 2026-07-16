# Vercel Release Plan

Date: 2026-07-16 (Asia/Singapore)

Status: the `dreamcraft` Vercel project is linked to the intended team with Git
integration disconnected. The initial preview-intended build failed before
application output because a nested PATH `pnpm` resolved to 10.28 instead of the
Corepack-selected 11.13; that record was removed. Vercel documents that a new
project's first successful deployment is automatically promoted to production.
The owner authorized that unavoidable first production target: deployment
`dpl_GtwUnH595kvDhxmfiDchukMuojXp` is Ready at
`https://dreamcraft-psi.vercel.app`, from certified commit `34c01ee`, with
generation disabled and no OpenAI key. See
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

1. Keep the existing CLI link and disconnected Git integration unchanged.
2. Keep the seven safe non-secret settings in both Preview and Production,
   including `DREAMCRAFT_OPENAI_ENABLED=false`, and keep `OPENAI_API_KEY` absent.
3. Require a green independent GitHub release run before every production
   deployment; `34c01ee` passed run `29493511135` before deployment.
4. Run the deployed smoke plus incognito, second-device, slow-network, offline,
   and complete-sample checks. The automated deployed smoke and public header
   inspection have passed; the device checks remain human proof.
5. Keep key rotation/funding and the locked live ten-prompt proof as a separate
   authorization event.
6. Before live public generation, configure Vercel Firewall/shared rate
   protection and OpenAI project spend controls.

The repository now contains a safe health contract, generation-disabled
deployed smoke validator, restrictive Vercel headers, same-origin dream request
enforcement, and a pinned GitHub CI workflow. Their generation-disabled edge
behavior is now verified on the public production alias; live generation remains
separately blocked.

The exact environment, preview, verification, production, and rollback commands
are in [`docs/19_RELEASE_AND_ROLLBACK_RUNBOOK.md`](19_RELEASE_AND_ROLLBACK_RUNBOOK.md).

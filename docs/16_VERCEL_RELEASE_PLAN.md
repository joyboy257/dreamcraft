# Vercel Release Plan

Date: 2026-07-16 (Asia/Singapore)

Status: the `dreamcraft` Vercel project is linked to the intended team with Git
integration disconnected. The first preview-intended CLI attempt created failed
deployment `dpl_CiC9DEQH949T2FBYPvsZqTt77d39`; Vercel classified it as a
production target and stopped during the build before producing application
output because a nested PATH `pnpm` resolved to 10.28 instead of the
Corepack-selected 11.13. It is not release evidence, must be removed before a
retry, and no Ready preview or authorized production release exists.

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
3. Remove the failed non-release deployment, then deploy with the explicit CLI
   target `--target=preview`, generation disabled, and no OpenAI key.
4. Run the deployed smoke plus incognito, second-device, slow-network, offline,
   and complete-sample checks.
5. Ask the owner before any production deployment or promotion.
6. Keep key rotation/funding and the locked live ten-prompt proof as a separate
   authorization event.
7. Before live public generation, configure Vercel Firewall/shared rate
   protection and OpenAI project spend controls.

The repository now contains a safe health contract, generation-disabled
deployed smoke validator, restrictive Vercel headers, same-origin dream request
enforcement, and a pinned GitHub CI workflow. These remain local claims until a
preview proves their real edge behavior.

The exact environment, preview, verification, production, and rollback commands
are in [`docs/19_RELEASE_AND_ROLLBACK_RUNBOOK.md`](19_RELEASE_AND_ROLLBACK_RUNBOOK.md).

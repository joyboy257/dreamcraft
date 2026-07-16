# G5 Product Experience and PWA Engineering Evidence

Date: 2026-07-16 (Asia/Singapore)

Status: **engineering-complete / independently certified PASS**

No OpenAI API request or deployment was used to implement or validate G5. The
browser journeys exercised the API-disabled route and mandatory deterministic
local generator. An independent Terra gate reviewer inspected the final tree,
reproduced the certification commands, and returned an explicit PASS.

## Delivered work

- DC-WI-050: a no-login dream input with a clear value proposition, sample
  prompts, validation, multiline editing, explicit submit, and `Ctrl+Enter` /
  `Cmd+Enter` keyboard submission.
- DC-WI-051: staged materialization tied to validated compilation and real spawn
  preparation, progressive canvas reveal, cancellation that preserves the dream
  description, retry, and a clear transition to the deterministic fragment when
  the remote provider is unavailable.
- DC-WI-052: an in-game HUD with title, objective and journal progress,
  crosshair, contextual interaction prompt, dialogue choices, pause, mute,
  comfort controls, completion state, replay, remix, and new-dream recovery.
- DC-WI-053: touch movement, drag-to-look, jump and interaction controls that use
  the same runtime input paths as desktop; portrait-to-landscape guidance,
  safe-area handling, live FOV and sensitivity controls, and reduced mobile
  quality/particle behavior.
- DC-WI-054: installable PWA metadata, local icon placeholders, a production-only
  service worker, versioned shell/runtime caches, API exclusion, network-first
  navigation with an offline fallback, and a tested offline reload path.
- WebGL startup failure now returns the user to the preserved dream description
  instead of trapping them on an inert canvas.

## User-journey evidence

The desktop browser suite verifies that a new user can understand the landing
screen, materialize a deterministic fragment, enter the canvas, interact with
the guide, complete the objective and ending, replay, remix, start a new dream,
cancel and retry materialization, and recover without developer guidance.

The mobile Chromium journey uses the real runtime to verify visible touch
controls and landscape guidance, changes camera yaw and pitch through touch
look, opens real dialogue through the shared interaction path, and measures
actual player movement from a held touch-control input. Browser console and
page errors remain clean.

The production PWA journey waits for service-worker control, verifies the
manifest and hashed JavaScript/CSS shell assets in cache, switches the browser
offline, reloads, and confirms that the usable dream input shell remains
available.

## Local certification

| Check | Result |
|---|---|
| `corepack pnpm typecheck` | Pass |
| `corepack pnpm lint` | Pass, zero warnings |
| `corepack pnpm test` | Pass, 46 files and 189/189 tests |
| `corepack pnpm eval` | Pass, 5/5 |
| `corepack pnpm build` | Pass |
| `corepack pnpm test:e2e` | Pass, 4/4 Playwright journeys |
| `corepack pnpm test:pwa` | Pass, 1/1 production offline journey |
| `bash scripts/validate-pack.sh` | Pass |
| `git diff --check` | Pass |

The production build emitted:

- `dist/index.html`: 1.35 kB raw, 0.60 kB gzip
- main CSS: 23.74 kB raw, 5.81 kB gzip
- main JavaScript: 979.63 kB raw, 271.02 kB gzip

Vite's warning for a JavaScript chunk above 500 kB raw is nonblocking for G5.
Performance measurement and any justified code splitting remain part of G6.

## Residual risks and release discipline

- Automated mobile Chromium proves the shared touch paths, but real-device
  mobile ergonomics, GPU performance, and thermal behavior remain for G6.
- The service worker deletes only old DreamCraft-owned cache versions. Every
  shell-cache behavior change must include a cache-version bump so deployed
  clients do not retain stale assets.
- The current main JavaScript chunk remains above Vite's raw-size advisory;
  G6 owns profiling and release-budget certification.

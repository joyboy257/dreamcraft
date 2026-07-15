# Human Decisions and External Blockers

Codex should proceed with the defaults below unless a decision requires credentials, legal acceptance, payment, or an external account action.

## Decisions with safe defaults

| Decision | Recommended default | Can Codex proceed? |
|---|---|---|
| Frontend | Vite + TypeScript + Three.js | Yes |
| UI framework | Lightweight React shell; no heavy design system | Yes |
| Package manager | `pnpm` when available, otherwise `npm` | Yes |
| Runtime strategy | `single-sol` first; benchmark director pipeline behind a feature flag | Yes |
| World size | Bounded 64×64-ish playable region, streamed in chunks | Yes |
| Deployment | Vercel-compatible serverless deployment | Yes locally; credentials later |
| Storage | No accounts; local cache first; optional KV only for share links | Yes |
| License | MIT | Codex may prepare it, owner should approve |
| Analytics | None in MVP | Yes |
| iOS | PWA only; Capacitor after web release gate | Yes |

## Inputs a human must eventually provide

### OpenAI API access

Required for live generation:

- `OPENAI_API_KEY`
- A reasonable spend limit
- Confirmation of the production runtime model alias

The application must still run locally with a deterministic mock and local fallback before a key is available.

### Deployment access

One of:

- Connected Vercel project
- Cloudflare equivalent
- Another HTTPS host supporting a server-side API route

Codex may produce configuration and instructions but must not invent credentials.

### Public repository licensing

Recommendation: MIT. Confirm there is no copied code whose license conflicts with the repository license. Keep `THIRD_PARTY_NOTICES.md` current.

### Hackathon submission

A person must:

- Own or join the Devpost submission.
- Upload the final public YouTube video.
- Paste the repository and public deployment links.
- Enter the `/feedback` Codex session ID.
- Attest to the official rules.

## Nice-to-have decisions that must not block development

- Custom domain.
- Final logo.
- Music in the demo video.
- Persistent public dream gallery.
- Native iOS packaging.
- Team member names and credits.

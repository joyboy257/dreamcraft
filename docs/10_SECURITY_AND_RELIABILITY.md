# Security and Reliability

## Primary rule

No model-generated executable content enters the browser runtime.

Prohibited:

- `eval`
- `new Function`
- Generated script/module imports
- Generated shaders
- Generated URLs or asset fetches
- Generated DOM/HTML
- Model-provided frame callbacks

## Secret boundary

- OpenAI SDK and key exist only in server-side modules.
- Client code calls the application's API route.
- `.env*` with real values is ignored by Git.
- Logs never include keys or authorization headers.
- Production source maps and logging choices are reviewed.

## Input controls

- Trim and cap dream text length.
- Reject empty/meaningless requests with user-safe guidance.
- Cap request body size.
- Allowlist generation strategy/intensity.
- Normalize unusual control characters.
- Add rate-limit hooks or platform controls before public sharing.

## Output controls

Model output passes:

1. Strict structured parsing
2. Server schema validation
3. Client schema validation
4. Sanitizer and budget clamp
5. Reference integrity checks
6. Spawn/reachability repair
7. Trusted compile

Never use TypeScript casts as validation.

## Denial-of-service budgets

Bound:

- World dimensions
- Block types
- Terrain operations/octaves
- Structures and dimensions
- Entity definitions/instances
- Geometry parts/segments/control points
- Dialogue nodes/text length
- Story beats/effects/condition depth
- Physics fields/dynamic bodies
- Particle count/lifetime
- Worker job duration
- Retry count

Terminate/recreate stuck workers and discard stale job results.

## XSS/DOM

- Render generated strings as text nodes/framework text.
- Do not use `innerHTML`, raw HTML markdown, inline event handlers, or CSS from model output.
- Validate color/number values before applying styles.
- Keep CSP as restrictive as hosting/runtime permits.

Suggested policy shape:

```text
default-src 'self';
script-src 'self';
style-src 'self' 'unsafe-inline';
img-src 'self' data:;
connect-src 'self';
worker-src 'self' blob:;
object-src 'none';
frame-src 'none';
base-uri 'none';
```

Adjust only for actual platform requirements.

## Data/privacy

Dream descriptions can contain sensitive personal memories.

Default posture:

- No account
- No public gallery
- No analytics/tracking
- No raw dream text in durable server logs
- `store: false` for model calls unless intentionally changed
- Recent dreams stored locally and clearable
- Explain actual handling in UI/README without medical claims

## Content handling

The runtime prompt should avoid graphic gore, explicit sexual content, hateful content, or targeting real people. Nightmares may be eerie and tense without graphic depiction.

The fallback should remain neutral when a request cannot be safely represented.

## Reliability state machine

Every asynchronous stage has:

- Abort signal
- Timeout
- Typed error
- User-safe state transition
- Cleanup
- Fallback/retry policy

No promise rejection should leave the UI permanently loading.

## Recovery rules

- API timeout/refusal/invalid response → local fragment
- Chunk worker failure → restart worker and reduce radius or generate spawn synchronously
- Invalid spawn → search outward, then create emergency platform
- Player non-finite/out of world → safe respawn
- WebGL context loss → pause and rebuild resources if possible; otherwise clear recovery message
- Audio context denied → continue silently
- Enrichment patch failure → discard patch, keep core world

## Dependency policy

- Keep dependency count small.
- Prefer mature direct dependencies.
- Record licenses in third-party notices.
- Avoid remote scripts/CDNs.
- Run available package audit without treating every advisory as equally exploitable; assess actual path.

## Server abuse controls

Before public launch:

- Request timeout
- Body limit
- Rate-limit hook/platform protection
- Origin/CSRF considerations based on hosting
- Error response normalization
- No arbitrary model/tool selection by client
- No user-controlled system prompt fields
- No forwarding arbitrary headers/URLs

## Security review output

Findings should include:

- Severity
- Affected file/symbol
- Credible attack/failure path
- Reproduction where safe
- Minimal remediation
- Verification

A release cannot pass while a known critical arbitrary-execution, secret-exposure, or easy resource-exhaustion path remains.

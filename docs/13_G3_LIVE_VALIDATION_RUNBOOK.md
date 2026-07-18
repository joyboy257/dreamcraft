# G3 live validation runbook

## Current gate state

G3 is **engineering-complete / live-proof-pending**. All provider and recovery paths have been verified with injected mocks. No OpenAI API call was made during engineering validation.

Do not run this proof until the repository owner explicitly authorizes live calls, replaces the exposed development key, and places credit on the replacement key's project.

## Spend envelope

The proof is fixed to ten sequential `single-sol` prompts. Each prompt permits at most one retry.

- Maximum attempts: `10 × 2 = 20`
- Maximum serialized request envelope: `70,553` UTF-8 bytes per attempt, locked by test
- Conservative input-token ceiling: one token per request byte
- Sol input price used by this runbook: `$5 / 1M tokens`
- Output ceiling: `4,000 × 20 = 80,000` tokens
- Sol output price used by this runbook: `$30 / 1M tokens`
- Conservative input projection: `70,553 × 20 × $5 / 1M = $7.0553`
- Maximum output projection: `80,000 × $30 / 1M = $2.4000`
- **Projected maximum: $9.4553 (round up to $9.46)**

Set a `$10` project budget before the run. The script also records usage returned by the API and reports a conservative actual cost. The byte-based input ceiling is intentionally much more conservative than normal tokenization.

## Preconditions

1. Rotate the current development key; do not fund the key whose value appeared in local validator output.
2. Put the replacement key in `.env.local` under the variable named `OPENAI_API_KEY`.
3. Confirm the replacement project has at least `$10` available and a `$10` budget alert/limit.
4. Leave these defaults in place:

   ```dotenv
   DREAMCRAFT_GENERATION_STRATEGY=single-sol
   DREAMCRAFT_ENABLE_DIRECTOR_PIPELINE=false
   VITE_DREAMCRAFT_GENERATION_STRATEGY=single-sol
   ```

5. Obtain an explicit instruction from the repository owner authorizing the live proof.

## Exact run

Terminal 1:

```bash
cd /Users/deon/Developer/Dreamcraft
DREAMCRAFT_OPENAI_ENABLED=true \
DREAMCRAFT_ENABLE_DIRECTOR_PIPELINE=false \
corepack pnpm dev --host 127.0.0.1 --port 5173
```

Terminal 2:

```bash
cd /Users/deon/Developer/Dreamcraft
G3_LIVE_CONFIRM=I_AUTHORIZE_LIVE_OPENAI_CALLS \
DREAMCRAFT_LIVE_ENDPOINT=http://127.0.0.1:5173/api/dream \
corepack pnpm validate:g3:live
```

The script runs the fixed ten-prompt corpus, waits once for the server's
`retry-after` interval if the local six-per-minute limiter is reached, requires
ten non-fallback validated worlds with at least three anchors, one entity, one
beat, and one ending, and writes redacted operational evidence to
`artifacts/local/g3-live-proof.json`. A rate-limited HTTP attempt occurs before
the provider and therefore does not add model spend.

## Pass and stop rules

- Pass only on `10/10`, with `fallbackUsed=false` for every prompt.
- Stop immediately on authentication, quota, rate-limit, unexpected fallback, invalid world, or cumulative project spend reaching `$9.46`.
- Do not enable `director-parallel` in this proof. It remains an experiment until a larger human-scored benchmark demonstrates a material quality gain within the p95 latency target.
- After the pass, update `.ai-bridge/status.md`, commit only redacted evidence summaries, and keep the local evidence file ignored.

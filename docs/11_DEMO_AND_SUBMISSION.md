# Demo, Judge, and Submission Package

Status: local package prepared; public URL, video, team display names, legal
license approval, and primary `/feedback` session ID remain human placeholders.

## Submission copy

### Recommended category

**Apps for Your Life** — verify the category name and current rules on the final
submission form. Position DreamCraft as creative expression and accessible game
creation; do not make medical or therapy claims.

### Short description

> DreamCraft turns a dream described in plain English into a short, explorable
> voxel game. GPT-5.6 produces a bounded declarative DreamSpec covering terrain,
> characters, physics, atmosphere, dialogue, and story. Trusted TypeScript
> compilers validate and materialize that data in a Three.js world with a clear
> objective and ending. If the model or network is unavailable, the same input
> becomes a deterministic playable fragment instead of an error screen.

### Technical/Codex description

> Codex built DreamCraft through a Sol-led, evidence-gated workflow: Sol owned
> architecture and integration, Luna handled bounded implementation/tests/docs,
> and Terra handled difficult systems work, security, and independent gate
> verification. GPT-5.6 is used only before gameplay to generate strict
> DreamSpec data. DreamCraft never executes generated JavaScript.

## Under-three-minute video — 2:55 target

Record at 16:9 with legible text and an English voiceover. Product sound should
sit below narration. Do not show API dashboards, keys, emails, notifications,
private URLs, or raw prompts in logs.

| Time | Shot/action | English voiceover |
| --- | --- | --- |
| 0:00–0:15 | Title, then Dream Studio input. | “Dreams can contain places, people, and impossible rules, but most of us cannot turn them into games. DreamCraft lets you describe one and step inside it.” |
| 0:15–0:35 | Enter a vivid prompt, choose intensity, select Enter Dream; show real materialization phases. | “I describe the place, a character, and what felt strange. DreamCraft reads those details, validates the laws of the dream, builds the safe spawn first, and stages a playable objective.” |
| 0:35–1:25 | Enter world; move/look/jump; approach guide; press E; choose Follow the dream; interact again; show transformation and ending. | “This is not a static scene. The dream changes terrain, atmosphere, physics, and the guide itself. I can move through it, make a dialogue choice, follow the objective, trigger a world response, and reach a real ending.” |
| 1:25–1:48 | Return to input and show a contrasting bundled cached sample/world. | “The same runtime can express a flooded repeating school, a tiny moonlit kitchen, or a golden family celebration. Each bundled sample is validated and cached in memory with a different deterministic seed, staging, palette, entity, and scenario.” |
| 1:48–2:20 | Show the README Mermaid diagram or a clean architecture card. | “At runtime GPT-5.6 returns DreamSpec: bounded declarative data, never executable code. Schema, reference, budget, and spawn checks run before trusted TypeScript compilers create terrain, EntityKit characters, dream physics, and the DreamPlayGraph inside Three.js.” |
| 2:20–2:43 | Show a clean Codex task/gate screenshot and test summary. | “Codex built the product through sequential gates. Sol owned architecture and release decisions, Luna implemented routine slices, and Terra independently tested difficult systems and security. Mocked provider failures, browser journeys, mobile budgets, and the offline PWA are automated.” |
| 2:43–2:55 | Ending screen, product name, public URL. | “A model failure never ends the experience—the deterministic fragment remains playable. DreamCraft turns memories, fears, celebrations, and impossible places into worlds you can enter. Your dreams, playable.” |

If live generation has not been authorized and proven before recording, say
“DreamCraft compiles the description” over the deterministic path. Do not imply
the shown world came from a live model call.

## Demo prompt and backup ladder

### Preferred novel prompt — only after live authorization/proof

> I was a tiny robot in a candy-cane forest where licorice trees whispered and
> a giant gummy bear guarded a singing treasure chest.

### Guaranteed current path

1. Use **Tiny wonder**, **Lost messages**, or **Golden celebration**.
2. Select Enter Dream.
3. When **Stable fragment** appears, explicitly say: “The API is disabled, so
   DreamCraft is using its deterministic local compiler.”
4. Select Enter the fragment and complete the objective normally.

### Contrasting cached sample

At startup DreamCraft warms a bounded, validated, memory-only cache for the three
bundled samples. After the first demo world, choose **Lost messages** or
**Golden celebration** at Vivid intensity for the contrast shot. If the HTTP
route is unavailable, the matching validated cached DreamSpec can be restored;
if not, the deterministic local generator remains the final fallback. This cache
does not persist across a full page reload and is not presented as a prior live
model result.

### Failure ladder during recording/live judging

1. If a live request succeeds, continue.
2. If it times out/refuses/fails validation, continue through the automatic
   Stable fragment path; do not reload.
3. If the network is unavailable, use the already loaded PWA shell and a bundled
   sample.
4. If the browser/GPU fails, use Return to your description and switch browser
   or device.
5. Keep a local 16:9 recording of the complete deterministic path as the final
   presentation backup.

## Judge testing guide

Expected time: **60–90 seconds**, no account required.

1. Open `[PUBLIC_DEPLOYMENT_URL — PENDING]` in desktop Chrome/Edge/Safari.
2. Choose a sample or type at least 12 characters with a place, strange rule,
   and character. Choose an intensity and select **Enter Dream**.
3. If the screen says **Stable fragment**, select **Enter the fragment**. This
   is expected when live generation is disabled or unavailable.
4. Select **Step into the dream**. Use `WASD`, mouse, `Space`, `Shift`, `E`/click,
   and `Esc`. Press `E` at the guide, choose **Follow the dream**, then press `E`
   again to awaken the fragment and reach the ending.
5. Try Replay, Remix this dream, or Remember another. On mobile, rotate to
   landscape and use the visible touch controls.

Expected fallback copy includes the **Stable fragment** label and an
**Enter the fragment** action. A fallback is a passing recovery path; an
uncaught error, reload requirement, or non-playable world is not.

## Submission fields

| Field | Value/status |
| --- | --- |
| Project name | DreamCraft |
| Recommended category | Apps for Your Life — final form confirmation required |
| Repository URL | `https://github.com/joyboy257/dreamcraft` — confirm public visibility |
| Public deployment URL | `[PENDING — populate after authorized production deployment]` |
| Public video URL | `[PENDING — populate after upload and under-3-minute check]` |
| Team member display names | `[HUMAN INPUT REQUIRED — do not infer legal names]` |
| Codex `/feedback` session ID | `[PENDING — capture from the primary Sol build task]` |
| Repository license | `[OWNER APPROVAL REQUIRED — MIT draft prepared, not adopted]` |
| OpenAI live-proof status | `[PENDING — do not claim until 10/10 authorized proof passes]` |

## Screenshot and evidence checklist

- [ ] Hero/thumbnail image with DreamCraft title and readable world.
- [ ] Dream input with three sample prompts.
- [ ] Real materialization phase.
- [ ] Stable fragment fallback notice.
- [ ] G1 movement/collision/editing vertical slice.
- [ ] G2 validated DreamSpec/semantic staging evidence.
- [ ] Three contrasting final worlds.
- [ ] Guide dialogue, HUD objective, transformation, and ending.
- [ ] Mobile landscape touch controls.
- [ ] Offline PWA shell.
- [ ] Sol root orchestration and sequential Luna/Terra activity.
- [ ] Unit/eval/E2E/PWA/CI pass summary with no secrets visible.
- [ ] Desktop/mobile performance evidence.
- [ ] Safe `/api/health` and deployed smoke pass.
- [ ] Incognito and second-device production checks.
- [ ] Final public deployment and public video URLs.

Repository evidence already available: G0–G6 reports in `docs/12_*` through
`docs/18_*`. Capture visual assets only from a clean browser/terminal with
notifications disabled and secrets excluded.

## Final submission checklist

- [ ] Production deployment explicitly authorized and verified.
- [ ] Public URL passes deployed smoke, incognito, second device, slow network,
      API-disabled fallback, and one complete bundled dream.
- [ ] README placeholders replaced without changing historical evidence.
- [ ] Demo video is public, English, and under three minutes after processing.
- [ ] Thumbnail/screenshots are readable and contain no private material.
- [ ] Owner approves/adopts a repository license.
- [ ] Third-party notices reviewed.
- [ ] Team display names confirmed.
- [ ] Primary Sol `/feedback` session ID captured.
- [ ] Category/rules rechecked at submission time.
- [ ] Live GPT-5.6 proof claimed only if the separate authorized run passed.

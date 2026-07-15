# Risk Register

| ID | Risk | Probability | Impact | Detection | Mitigation | Owner |
|---|---|---:|---:|---|---|---|
| R-01 | Runtime generation exceeds 15 seconds | Medium | Critical | Strategy timing metrics and p95 eval | Single-call default, low/medium reasoning, stable prompt prefix, timeout, local fallback, progressive shell | Dream compiler |
| R-02 | Model output validates but creates a dull/generic world | High | High | Semantic-anchor and human rubric | Blueprint, three anchors near spawn, staging compiler, varied eval corpus | Root/compiler |
| R-03 | Generated world is unplayable | Medium | Critical | Spawn/reachability validators, browser fixtures | Safe spawn search, emergency platform, objective repair, bounded world | Compiler/QA |
| R-04 | Too many voxels/draw calls freeze browser | Medium | Critical | Runtime metrics, profiler, mobile smoke | Combined chunk geometry, radius limits, worker meshing, quality tiers | Engine |
| R-05 | Procedural entity is not recognizable | High | High | Entity readability report and screenshots | Body plans, iconic features, face/focal point, material/accessory, animation contract | EntityKit |
| R-06 | Parallel agents overwrite each other | Medium | High | Git diff/status and conflicts | Disjoint lane ownership, root-only shared files, bounded handoffs | Root |
| R-07 | API key leaks to client or repository | Low | Critical | Build inspection, grep, security review | Server-only route, env validation, secret scanning, no logs | Compiler/security |
| R-08 | Arbitrary generated content causes XSS/code execution | Low | Critical | Security review and malicious fixtures | No eval, strict schema, textContent/rendered text, CSP | All/security |
| R-09 | Input/spec creates memory or CPU denial of service | Medium | Critical | Hostile budget fixtures, memory trend | Hard counts/sizes, timeouts, clamps, worker termination | Compiler/engine |
| R-10 | Pointer lock or controls fail during demo | Medium | High | Browser smoke on demo machine | Clear enter flow, retry, keyboard fallback, preflight runbook | UI/QA |
| R-11 | Production deployment differs from local | Medium | High | Preview/prod smoke | Environment parity, build-time checks, health route, rollback | QA/root |
| R-12 | Network unavailable live | Medium | Critical | Offline smoke | Cached shell, cached showcase dreams, local fragment | Compiler/PWA |
| R-13 | Mobile work consumes core schedule | High | Medium | Milestone burn | Desktop release first, reduced mobile controls only, no native build before G7 | Root |
| R-14 | Demo lacks emotional payoff | Medium | High | Rehearsal and rubric | 60–90 second arc, climax transformation, ending narration | Gameplay/UI |
| R-15 | Submission misses required evidence | Medium | Critical | Submission checklist | Record early, README evidence, `/feedback` reminder, final owner checklist | Release scribe |
| R-16 | Third-party license issue | Low | High | Dependency/license review | Small dependency set, notices, MIT-compatible choices | Root/security |
| R-17 | Scope expands into Minecraft clone | High | Critical | Plan drift | Cut list, bounded region, no crafting/multiplayer/infinite world | Root |

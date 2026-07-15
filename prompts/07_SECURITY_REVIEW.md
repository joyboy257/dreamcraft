# Security Review Prompt

Perform a read-only security review of DreamCraft.

Focus on:

- Model-generated arbitrary execution
- XSS/unsafe DOM rendering
- API-key/client bundle exposure
- Secret logging
- Server-route abuse and unrestricted model options
- Body/input limits
- Geometry/physics/dialogue resource exhaustion
- Worker timeouts
- Cache/storage privacy
- CSP and deployment headers
- Dependency/remote asset risks
- Production error leakage

For each real finding, provide severity, affected file/symbol, credible path, minimal remediation, and verification. Confirm safeguards that are correctly implemented. Ignore style-only issues.

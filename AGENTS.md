<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Knowledge base — MUST keep current

Agent-facing project knowledge lives in `docs/kb/` (cross-repo contracts:
`walmal/docs/kb/SYSTEM.md`). Read the relevant file before working in an
unfamiliar area.

**Maintenance rule:** any change that adds, updates, or removes a feature,
endpoint, contract, config, or workflow MUST update the affected
`docs/kb/*.md` file(s) in the same commit. If a cross-repo contract changed
(auth, error bodies, events, ports, env vars), also update
`walmal/docs/kb/SYSTEM.md` in the walmal repo — in the same work session;
cross-repo commit atomicity is not required.

**Review check:** every code review must answer: "Does this change require a
KB update, and was it made?" Refactors and test-only changes that alter no
documented fact need none.

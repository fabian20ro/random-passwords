# AGENTS.md

work style: telegraph; noun-phrases ok; drop grammar; min tokens.

> bootstrap context only. discoverable from codebase → don't put here.
> corrections + patterns → LESSONS_LEARNED.md.

## Constraints

- **CSP blocks external resources** — `index.html` has strict CSP. no CDN scripts, no external stylesheets. ES modules from same origin only.
- **rejection sampling intentional** — `while (val >= REJECT_THRESHOLD)` in `src/password.ts` eliminates modulo bias. security hardening — do not simplify.
- **zero runtime deps by design** — only `devDependencies`. intentional. do not add runtime deps.
- **Vite base path required** — `base: "/random-passwords/"` needed for GitHub Pages deployment. removing breaks live site.

## Legacy & Deprecated

<!-- nothing currently deprecated. -->

## Learning System

Every session:
1. start: read `LESSONS_LEARNED.md`
2. during: note surprises
3. end: append `ITERATION_LOG.md`
4. reusable insight? → also add `LESSONS_LEARNED.md`
5. same issue 2+ times in log? → promote to `LESSONS_LEARNED.md`
6. surprise? → flag to developer

| File | Purpose | Write When |
|------|---------|------------|
| `LESSONS_LEARNED.md` | curated wisdom + corrections | reusable insight gained |
| `ITERATION_LOG.md` | raw session journal, append-only | every iteration |

Rules: never delete from ITERATION_LOG. Obsolete lessons → Archive in LESSONS_LEARNED. Date-stamp YYYY-MM-DD.

### Periodic Maintenance
Config files audited periodically via `SETUP_AI_AGENT_CONFIG.md`.

## Sub-Agents

`.claude/agents/`. Invoke proactively.

| Agent | File | When |
|-------|------|------|
| Architect | `.claude/agents/architect.md` | system design, scalability, ADRs |
| Planner | `.claude/agents/planner.md` | complex multi-step — plan before code |
| UX Expert | `.claude/agents/ux-expert.md` | UI, interaction, a11y |
| Agent Creator | `.claude/agents/agent-creator.md` | new agent needed for recurring domain |

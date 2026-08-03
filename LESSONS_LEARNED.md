# Lessons Learned

> Maintained by AI agents. Contains validated, reusable insights.
> **Read at the start of every task. Update at the end of every iteration.**

## How to Use This File

### Reading (Start of Every Task)
Read this before writing any code to avoid repeating known mistakes.

### Writing (End of Every Iteration)
If a new reusable insight was gained, add it to the appropriate category.

### Promotion from Iteration Log
Patterns appearing 2+ times in `ITERATION_LOG.md` should be promoted here.

### Pruning
Obsolete lessons → Archive section at bottom (with date and reason). Never delete.

---

## Architecture & Design Decisions

<!-- Format: **[YYYY-MM-DD]** Brief title — Explanation -->

## Code Patterns & Pitfalls

**[2026-05-15] Use shared generators in renderers — If a UI already exposes a helper that returns the full collection, call that helper from the render loop instead of re-deriving the same sequence from constants. One source of truth keeps labels, counts, and item markup aligned.
**[2026-05-15] Cancel stale UI reset timers per target — When an action schedules a delayed visual reset, clear any prior timer for the same element before scheduling the next one so rapid repeats do not let older timers overwrite newer state.

<!-- Format: **[YYYY-MM-DD]** Brief title — Explanation -->

## Testing & Quality

**[2026-05-08] Fresh checkout needs dependencies installed before test runs — On a clean clone in this repo, `npm test` can fail with `vitest: not found` until `npm ci` has populated `node_modules`. Install once before running the suite in unattended jobs.
**[2026-05-05] Vitest pool mode in constrained containers — In low-memory CI/container runs, `vitest run` may fail via fork-worker OOM; `vitest run --pool=threads` is a stable fallback for this repo's test suite.
**[2026-05-10] Reject non-integer password lengths early — `Uint32Array(length)` throws on non-integer lengths; guard with `Number.isInteger(length)` before allocating so utility callers get a safe empty-string result instead of a runtime RangeError.
**[2026-05-12] Invalid password inputs should short-circuit before crypto sampling — zero, negative, non-integer, and empty-charset cases stay deterministic and cheap when the guard returns before `crypto.getRandomValues()`.
**[2026-05-12] Single-character charsets deserve explicit password coverage — a `charset.length === 1` case exercises the no-resample path and guards against accidental over-rejection in custom-charset generators.
**[2026-05-13] Optional browser APIs can be shape-missing, not just absent — For helpers like clipboard adapters, cover both `undefined` APIs and present objects missing the expected method (`writeText`) so optional platform support stays predictable.
**[2026-05-13] Callable shape checks beat bare presence checks for browser helpers — When an API can be monkey-patched or stubbed, treat non-function `writeText`/similar properties as unavailable so the guard fails fast instead of relying on a later TypeError.

## Performance & Infrastructure


<!-- Format: **[YYYY-MM-DD]** Brief title — Explanation -->

## Dependencies & External Services

**[2026-08-03] Fresh GitHub repository migrations need explicit control-plane restoration** — Git history does not carry Pages, Actions permissions, security settings, rulesets, or external webhook credentials. Inventory and restore these separately, then verify the replacement repository has a distinct ID.

<!-- Format: **[YYYY-MM-DD]** Brief title — Explanation -->

## Process & Workflow

**[2026-05-13] Document newly visible UI interactions in README — When a shipped screen adds a concrete affordance like copy-to-clipboard with status feedback, a short README line keeps the public surface aligned with the app.
**[2026-05-16] Document repeated-row metadata in README — When the UI shows a per-item label or count alongside a repeated list, name that row-level metadata in the README too so the public surface matches the shipped affordance, not just the aggregate summary.

<!-- Format: **[YYYY-MM-DD]** Brief title — Explanation -->

---

## Archive

<!-- Format: **[YYYY-MM-DD] Archived [YYYY-MM-DD]** Title — Reason for archival -->

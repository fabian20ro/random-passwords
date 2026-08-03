# Iteration Log

> Append-only journal of AI agent work sessions.
> **Add an entry at the end of every iteration.**
> Same issue 2+ times? Promote to `LESSONS_LEARNED.md`.

## Entry Format

---

### [YYYY-MM-DD] Brief Description

**Context:** What was the goal
**What happened:** Key actions, decisions
**Outcome:** Success / partial / failure
**Insight:** (optional) What would you tell the next agent?
**Promoted to Lessons Learned:** Yes / No

---

### [2026-03-17] Periodic Maintenance — First Audit

**Context:** First periodic maintenance run on AI agent config system.
**What happened:** Full 5-phase audit per SETUP_AI_AGENT_CONFIG.md protocol. AGENTS.md condensed: removed discoverable details (full CSP string, base path value), removed "README is stale" (flagged as codebase fix), added telegraph style header. agent-creator.md updated to list itself in Existing Agents. LESSONS_LEARNED and ITERATION_LOG had no entries to process.
**Outcome:** Success. AGENTS.md reduced from 52 to 42 lines. All cross-file consistency checks pass.
**Insight:** README.md is stale (says "5 passwords 23-27" but code generates 10 passwords 23-32). Should be fixed in codebase, not tracked in AGENTS.md.
**Promoted to Lessons Learned:** No

---


### [2026-05-05] Repo hardening + UX accessibility + docs alignment

**Context:** Implement full quality plan from repo review (README accuracy, CSP tightening, accessibility, test resilience, security policy).
**What happened:** Updated README to match actual output sizes. Replaced template SECURITY.md with actionable policy. Removed external badge image dependency and tightened CSP img-src to 'self'. Added status/live-region announcements and better button accessibility in UI. Refactored tests to explicitly mock Web Crypto and keep rejection-sampling validation deterministic.
**Outcome:** Success. Build passes and tests pass with thread pool in current environment.
**Insight:** Vitest default worker/fork mode can OOM in constrained containers; thread pool flag stabilizes execution without changing production code.
**Promoted to Lessons Learned:** Yes

---

### [2026-05-08] Clipboard fallback hardening

**Context:** Improve password-generator copy flow with a low-risk usability fix.
**What happened:** Added a small clipboard helper, taught the UI to treat missing clipboard support the same as a clipboard failure, and added focused unit coverage for success/failure/unavailable cases. Initial `npm test` failed because `vitest` was not installed in the fresh checkout; ran `npm ci` once, then reran tests and build successfully.
**Outcome:** Success. UI behavior hardened, tests and build pass.
**Insight:** Fresh checkouts in this repo may need `npm ci` before the first test run.
**Promoted to Lessons Learned:** Yes

---

### [2026-05-10] Password length validation hardening

**Context:** Small correctness improvement in the password utility.
**What happened:** Tightened `generatePasswordWithCharset` to reject non-integer lengths before allocating a `Uint32Array`, added a focused test for `NaN`/fractional/infinite lengths, and verified with `npm test` and `npm run build`.
**Outcome:** Success. Valid inputs unchanged; invalid lengths now fail safely with an empty string instead of a runtime range error.
**Insight:** Guarding numeric inputs early keeps utility functions predictable and easier to reuse.
**Promoted to Lessons Learned:** Yes

---

### [2026-05-11] Dynamic generated-password status message

**Context:** Small UX polish in the password generator UI.
**What happened:** Replaced the hardcoded "Generated 10 new passwords." status text with a message derived from `LENGTHS.length`, so the announcement stays accurate if the password count changes later. Verified with `npm test` and `npm run build`.
**Outcome:** Success. Behavior unchanged for current output; status text is now future-proofed.
**Insight:** User-facing counts are safer when derived from the same source of truth as the rendered list.
**Promoted to Lessons Learned:** No

---

### [2026-05-11] Negative password-length coverage

**Context:** Tighten boundary coverage around the password generator utility.
**What happened:** Added a test asserting `generatePasswordWithCharset` returns an empty string for negative lengths, matching the function's existing guard for non-positive lengths. Verified with `npm exec vitest run tests/password.test.ts --pool=threads`.
**Outcome:** Success. Behavior unchanged; coverage now documents the negative-length boundary explicitly.
**Insight:** Boundary tests are cheap insurance when the implementation already encodes a broad guard.
**Promoted to Lessons Learned:** No

---

### [2026-05-11] README character-set clarification

**Context:** Keep the public summary aligned with the actual password output details.
**What happened:** Updated the README to say the generator emits alphanumeric passwords and to note that rejection sampling avoids modulo bias.
**Outcome:** Success. The docs now describe the same contract the code and tests already enforce.
**Insight:** User-facing summaries should name the output shape and security-relevant generation detail when those facts are already stable in code.
**Promoted to Lessons Learned:** No

---

### [2026-05-12] Invalid input no-op coverage

**Context:** Tighten boundary coverage around the password generator's early-return guards.
**What happened:** Added a regression test asserting `generatePasswordWithCharset` returns an empty string without sampling crypto for zero, negative, or empty-charset inputs. Verified with a focused Vitest run, then full `npm test` and `npm run build`.
**Outcome:** Success. The guard path is now explicitly covered and stays cheap.
**Insight:** Boundary tests are useful not only for return values but also for proving expensive work is skipped on invalid inputs.
**Promoted to Lessons Learned:** Yes

### [2026-05-12] Single-character charset boundary coverage

**Context:** Add one focused regression around a custom-charset edge case.
**What happened:** Added a Vitest case asserting `generatePasswordWithCharset(8, "X")` returns eight `X` characters and only calls `crypto.getRandomValues()` once, which exercises the no-resample path for a one-character charset. Verified with the focused password test file, the full test suite, and `npm run build`.
**Outcome:** Success. Boundary coverage expanded without changing runtime behavior.
**Insight:** Single-character charsets are a cheap edge case that can catch accidental over-rejection in custom-charset generators.
**Promoted to Lessons Learned:** Yes

---
### [2026-05-13] Clipboard writeText shape coverage

**Context:** Tighten the clipboard helper's boundary coverage after a small regression pass.
**What happened:** Added a Vitest case asserting `copyTextToClipboard` returns `false` when a clipboard object exists but `writeText` is missing, matching the helper's existing guard for unavailable clipboard support. Verified with the focused clipboard test file and the full `npm test` suite.
**Outcome:** Success. Coverage now documents both clipboard-unavailable and clipboard-shape-missing paths.
**Insight:** Availability checks and method-shape checks are distinct boundaries; cover both when a browser API is optional.
**Promoted to Lessons Learned:** No

---
### [2026-05-13] README clipboard feature note

**Context:** Keep public docs aligned with the shipped UI surface.
**What happened:** Added a short README note that each generated password has a copy button with success/failure feedback, matching the existing clipboard flow in the app.
**Outcome:** Success. Docs now reflect a shipped user-facing capability that was previously undocumented.
**Insight:** Tiny UI helpers still merit a one-line README mention when they change the visible interaction model.
**Promoted to Lessons Learned:** Yes

---
### [2026-05-13] Clipboard callable-shape hardening

**Context:** Tighten the clipboard helper against odd browser API shapes.
**What happened:** Updated `copyTextToClipboard` to require a callable `writeText` method, added a regression test for a non-callable clipboard stub, and verified with the focused clipboard test plus the full Vitest suite and production build.
**Outcome:** Success. Clipboard fallback now fails fast for missing or malformed clipboard shapes.
**Insight:** Optional browser APIs are safer when helpers check callability, not just presence.
**Promoted to Lessons Learned:** Yes

---
### [2026-05-13] README regenerate control sync

**Context:** Keep the public docs aligned with the shipped password-generator UI.
**What happened:** Added a brief README note describing the Regenerate button and its status-message refresh behavior, matching the existing UI affordance in `index.html` and `src/main.ts`.
**Outcome:** Success. README now covers both visible interaction paths: per-password copy and full-list regeneration.
**Insight:** When a screen has both item-level actions and page-level refresh controls, documenting both avoids leaving the public surface half-described.
**Promoted to Lessons Learned:** No

---
### [2026-05-14] README live-region note

**Context:** Keep the public summary aligned with the shipped password generator UI.
**What happened:** Added a short README line noting that the status updates are mirrored to a screen-reader live region, matching the existing `aria-live`/`sr-status` affordance in `index.html` and `src/main.ts`.
**Outcome:** Success. Docs now mention the accessible status announcement path.
**Insight:** When a UI has both visible status text and an assistive-tech mirror, documenting both keeps the public surface honest.
**Promoted to Lessons Learned:** No

---

### [2026-05-14] Password test cleanup

**Context:** Keep the password-generator test suite lean and avoid redundant assertions.
**What happened:** Removed a duplicate empty-charset test from `tests/password.test.ts`; the earlier invalid-input coverage already proves the same contract alongside the no-crypto-sampling assertion.
**Outcome:** Success. Test coverage stayed intact and the suite is slightly less repetitive.
**Insight:** Duplicate boundary assertions are easiest to delete when one test already proves the shared contract.
**Promoted to Lessons Learned:** No

---

### [2026-05-14] Rejection-threshold source-of-truth cleanup

**Context:** Small maintainability pass on the password generator internals.
**What happened:** Reused the shared 32-bit modulus constant in `src/password.ts` instead of re-declaring the literal inside `generatePasswordWithCharset`, and added a focused test that locks `REJECT_THRESHOLD` to the modulus/charset-length formula.
**Outcome:** Success. Focused password tests, full test suite, and production build all passed.
**Insight:** Small numeric constants are easier to trust when the production code and contract test derive from the same named source of truth.
**Promoted to Lessons Learned:** No

---

### [2026-05-15] README footer status link sync

**Context:** Keep the public docs aligned with the live footer affordance.
**What happened:** Added a short README note that the footer links to the deployment workflow status, matching the existing link in `index.html`.
**Outcome:** Success. README now mentions the visible status link alongside the other user-facing controls.
**Insight:** Small footer affordances still count as public surface when they are present in the shipped UI.
**Promoted to Lessons Learned:** No

---

### [2026-05-15] Render loop source-of-truth cleanup

**Context:** Small maintainability pass in the password generator UI.
**What happened:** Swapped `src/main.ts` over to `generateAll()` so the password list renderer consumes the same helper the module already exports, instead of duplicating the `LENGTHS` loop. Verified with `npm test` and `npm run build`.
**Outcome:** Success. Behavior stayed the same; the render path now follows a single source of truth.
**Insight:** When a module already owns the full collection, reusing that helper in the UI keeps future count/shape changes from drifting.
**Promoted to Lessons Learned:** Yes

---

### [2026-05-15] Clipboard reset timer deduplication

**Context:** Harden the copy-button state reset path against rapid repeated clicks.
**What happened:** Added a small `scheduleButtonReset` helper that cancels any prior timeout for the same button before scheduling the next reset, then switched the copy-success and copy-failure paths to use it. Added focused tests for delayed reset behavior and timer replacement, then verified with `npm test` and `npm run build`.
**Outcome:** Success. The copy UI now keeps the newest state visible instead of letting an older timeout revert it early.
**Insight:** Delayed visual resets should be keyed by target element when the same control can be activated repeatedly.
**Promoted to Lessons Learned:** Yes

---
### [2026-05-15] README copy-button reset note

**Context:** Keep the public docs aligned with the copy-button interaction already shipped in the UI.
**What happened:** Updated the README to mention that copy-button success/failure feedback is temporary and resets automatically after a short delay, matching the existing button-reset behavior in `src/main.ts` and `src/button-reset.ts`.
**Outcome:** Success. Docs now describe the full visible copy-button interaction, including the transient state.
**Insight:** User-facing feedback that self-clears is part of the public surface and is worth naming explicitly in the README.
**Promoted to Lessons Learned:** No

---
### [2026-05-16] README row-length label sync

**Context:** Keep the public docs aligned with the shipped password-generator list layout.
**What happened:** Updated the README to mention the visible per-row length label alongside the existing copy button, regenerate control, status text, and live-region note. This matches the `len` display rendered next to each password row in `index.html`.
**Outcome:** Success. The README now names one more shipped affordance that was already visible in the UI.
**Insight:** When a repeated list exposes item-level metadata, document that metadata explicitly so the docs describe the actual row affordance, not just the aggregate count.
**Promoted to Lessons Learned:** Yes

---

### [2026-05-17] Rejection-sampling test cleanup

**Context:** Small test-maintenance pass while keeping password-generation behavior unchanged.
**What happened:** Tightened the biased-value rejection-sampling test to assert the expected resample call count, removed stray draft comments, fixed indentation on the LENGTHS assertion, and grouped the boundary tests under the rejection-sampling describe block.
**Outcome:** Success. Focused password tests and production build pass.
**Insight:** If a deterministic crypto mock exposes call counts, assert the count in boundary tests so the test proves resampling happened instead of only checking output shape.
**Promoted to Lessons Learned:** No

---

### [2026-05-27] Username generator section below password list

**Context:** Add a new UI section that generates copyable usernames in `adjective_noun_number` format.
**What happened:** Added a new `Usernames` section below the password list in `index.html`. Updated `src/main.ts` with hardcoded lists of 20 adjectives and 20 animal nouns, added a 4-digit lowercase username generator, reused existing row/copy UI for both passwords and usernames, and wired regenerate to refresh both lists.
**Outcome:** Success. Username rows now render below passwords and support one-click copy behavior.
**Insight:** Shared row rendering keeps password + username sections visually and behaviorally aligned with less UI duplication.
**Promoted to Lessons Learned:** No

---
### [2026-06-24] Dashboard auth CLI

**Context:** Generate local Hermes dashboard basic-auth credentials without adding runtime dependencies.
**What happened:** Added `npm run dashboard-auth`, a small Node CLI that writes username, password, and session-secret YAML or JSON to a required create-exclusive `--output` file with mode `0600`; secrets are never printed to the terminal.
**Outcome:** Success. CLI output, lint, tests, and build pass after refreshing missing npm optional native dependencies.
**Insight:** Utility CLIs can live beside the app when they are dependency-free and covered by tests, without changing the browser runtime surface.
**Promoted to Lessons Learned:** No

---

### [2026-08-03] Repository migration to Random Passwords

**Context:** Replace the Git-transport-disabled `fabian20ro/password-generator` repository with a fresh repository and product name.
**What happened:** Preserved all 24 live branches in a verified bundle, archived the original repository as `random-passwords-disabled-archive`, published the history to the new `random-passwords` repository, and updated the package name, GitHub Pages base path, workflow links, and visible product title.
**Outcome:** Success. Lint, all 396 tests, and the production build passed; deployment and GitHub control-plane checks continue outside the source iteration.
**Insight:** A repository replacement requires both Git ref migration and explicit restoration of GitHub-hosted settings.
**Promoted to Lessons Learned:** Yes

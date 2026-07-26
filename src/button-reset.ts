const resetTimeouts = new WeakMap<object, ReturnType<typeof setTimeout>>();

/** Parallel WeakMap storing optional semantic labels attached to scheduled resets. */
const resetDescriptions = new WeakMap<object, string>();

/** Default delay (ms) used when callers omit an explicit `delayMs`. */
export const DEFAULT_RESET_DELAY_MS = 300;

export { resetTimeouts, resetDescriptions };

/** Cancel any pending reset for the given target. Returns true if a scheduled
 *  timeout was actually cleared, false if nothing was pending (no-op). No-op
 *  targets do NOT throw; they just report their empty state via return value. */
export function cancelButtonReset(target: object): boolean {
  if (!(target instanceof Object)) throw new TypeError("cancelButtonReset requires an object target");
  const timeoutId = resetTimeouts.get(target);
  if (timeoutId !== undefined) {
    clearTimeout(timeoutId);
    resetTimeouts.delete(target);
    resetDescriptions.delete(target);
    return true;
  }
  return false;
}

/** Returns true if a reset has been scheduled for the target and not yet cancelled or fired. */
export function isResetScheduled(target: object): boolean {
  return target instanceof Object && resetTimeouts.has(target);
}

/** Retrieve the semantic description attached to a scheduled reset, or undefined if none was set.
 *  Safe to call on any target — returns undefined for non-objects, unscheduled targets, and
 *  targets whose description was never set. */
export function getResetDescription(target: object): string | undefined {
  return (target instanceof Object && resetDescriptions.has(target)) ? resetDescriptions.get(target) : undefined;
}

/** Schedule a delayed reset callback for the given target.
 *  Cancels any prior pending reset first (idempotent).
 *  The `reset` closure fires exactly once at or after `delayMs`.
 *  Rescheduling before expiry replaces the pending callback with the new one;
 *  stale closures from earlier schedules are suppressed via timeout-id identity.
 *  An optional `description` string is attached to the target and can be retrieved later
 *  with {@link getResetDescription}. It survives cancellation and fires alongside the reset.
 *  Throws if `target` is not an object (null, primitive, undefined). */
export function scheduleButtonReset(
  target: object,
  delayMs = DEFAULT_RESET_DELAY_MS,
  reset: () => void,
  description?: string,
): void {
  cancelButtonReset(target);

  // Reject a missing or non-callable reset callback — a stale schedule with no
  // handler would fire and silently throw on `reset()`, crashing the page.
  if (typeof reset !== "function") {
    return;
  }

  // Attach the semantic description alongside the timeout identity so callers
  // can introspect what is pending at any time. Replacing a prior schedule also
  // replaces its description; cancelling clears it entirely. Set after all
  // validations pass — failed schedules must not leak orphaned descriptions into
  // the WeakMap, which would otherwise confuse callers of getResetDescription().
  if (description !== undefined) resetDescriptions.set(target, description);

  // Coerce null/undefined to the documented default; NaN → clamp to 0.
  // Reject ±Infinity on raw input BEFORE Math.max(0, x) masks -Infinity as 0.
  // NaN is permitted — existing contract clamps it to 0 after this guard.
  if (typeof delayMs === "number" && !Number.isFinite(delayMs) && !Number.isNaN(delayMs)) {
    throw new TypeError("delayMs must be finite");
  }

  const effectiveDelay = (delayMs === null || delayMs === undefined)
    ? DEFAULT_RESET_DELAY_MS
    : Number.isNaN(delayMs) ? 0 : Math.max(0, delayMs);

  const timeoutId = setTimeout(() => {
    if (resetTimeouts.get(target) === timeoutId) {
      resetTimeouts.delete(target);
      reset();
    }
  }, effectiveDelay);

  resetTimeouts.set(target, timeoutId);
}

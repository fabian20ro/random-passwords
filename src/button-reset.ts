const resetTimeouts = new WeakMap<object, ReturnType<typeof setTimeout>>();

/** Parallel WeakMap storing optional semantic labels attached to scheduled resets. */
const resetDescriptions = new WeakMap<object, string>();

/** Parallel WeakMap storing optional cancel hooks attached to scheduled resets — fired when a pending reset is cancelled (rescheduled or explicitly cleared). */
const resetCancelHooks = new WeakMap<object, () => void>();

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
    // Fire the cancel hook before clearing it — caller may still reference
    // the description after cancellation, so delete in a defined order.
    const hook = resetCancelHooks.get(target);
    if (typeof hook === "function") {
      try { hook(); } catch { /* hook errors must not abort cancellation */ }
    }
    resetCancelHooks.delete(target);
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
 *  An optional `onCancel` callback fires when the pending schedule is cancelled (rescheduled or explicitly cleared).
 *  Throws if `target` is not an object (null, primitive, undefined). */
export function scheduleButtonReset(
  target: object,
  delayMs = DEFAULT_RESET_DELAY_MS,
  reset: () => void,
  description?: string,
  onCancel?: () => void,
): void {
  // Validate target before any other checks — fail-fast on programming errors.
  if (!(target instanceof Object)) throw new TypeError("cancelButtonReset requires an object target");

  // Validate ALL parameters before any early-exit — an invalid reset must not
  // mask a subsequent undefined/Infinity delay from triggering its guard.
  if (typeof delayMs === "number" && !Number.isFinite(delayMs) && !Number.isNaN(delayMs)) {
    throw new TypeError("delayMs must be finite");
  }

  if (typeof reset !== "function") return;

  cancelButtonReset(target);

  // Cancel hook set AFTER the clear so it does not fire on its own cancellation.
  if (typeof onCancel === "function") {
    resetCancelHooks.set(target, onCancel);
  }

  // Empty descriptions carry no semantic content — skip to keep WeakMap clean.
  if (description !== undefined && description !== "") {
    resetDescriptions.set(target, description);
  }

  const effectiveDelay = (delayMs === null || delayMs === undefined)
    ? DEFAULT_RESET_DELAY_MS
    : Number.isNaN(delayMs) ? 0 : Math.max(0, delayMs);

  const timeoutId = setTimeout(() => {
    if (resetTimeouts.get(target) === timeoutId) {
      resetTimeouts.delete(target);
      resetCancelHooks.delete(target);
      resetDescriptions.delete(target);
      reset();
    }
  }, effectiveDelay);

  resetTimeouts.set(target, timeoutId);
}

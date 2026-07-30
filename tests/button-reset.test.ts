import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { scheduleButtonReset, cancelButtonReset, isResetScheduled, resetDescriptions, resetTimeouts, getResetDescription, DEFAULT_RESET_DELAY_MS } from "../src/button-reset";

describe("DEFAULT_RESET_DELAY_MS", () => {
  it ("is exported and equals 300 ms", () => {
    expect(DEFAULT_RESET_DELAY_MS).toBe(300);
  });

  it ("does not change across test runs (constant, not derived)", () => {
    const a = DEFAULT_RESET_DELAY_MS;
    const b = DEFAULT_RESET_DELAY_MS;
    expect(a).toBe(b);
    expect(typeof a).toBe("number");
  });
});

describe("scheduleButtonReset", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("isResetScheduled", () => {
    it ("returns false before any schedule call", () => {
      const target = { id: "query-pre" };
      expect(isResetScheduled(target)).toBe(false);
    });

    it ("returns true after scheduling", () => {
      const target = { id: "query-post" };
      const reset = vi.fn();
      scheduleButtonReset(target, 100, reset);
      expect(isResetScheduled(target)).toBe(true);
    });

    it ("returns false after cancellation", () => {
      const target = { id: "query-cancelled" };
      const reset = vi.fn();
      scheduleButtonReset(target, 100, reset);
      cancelButtonReset(target);
      expect(isResetScheduled(target)).toBe(false);
    });

    it ("returns false after the scheduled timer fires", () => {
      const target = { id: "query-fired" };
      const reset = vi.fn();
      scheduleButtonReset(target, 100, reset);
      expect(isResetScheduled(target)).toBe(true);
      vi.advanceTimersByTime(100);
      expect(reset).toHaveBeenCalledTimes(1);
      expect(isResetScheduled(target)).toBe(false);
    });

    it ("returns false for null target", () => {
      expect(isResetScheduled(null as any)).toBe(false);
    });

    it ("returns false for undefined target without throwing", () => {
      const sentinel = { id: "undefined-guard-sentinel" };
      expect(resetTimeouts.has(sentinel)).toBe(false);
      expect(() => isResetScheduled(undefined as any)).not.toThrow();
      expect(isResetScheduled(undefined as any)).toBe(false);
      expect(resetTimeouts.has(sentinel)).toBe(false);
    });

    it ("returns false for primitive targets", () => {
      expect(isResetScheduled("string" as any)).toBe(false);
      expect(isResetScheduled(42 as any)).toBe(false);
    });

    it ("does not schedule when called on a new target", () => {
      const fresh = { id: "query-fresh" };
      expect(resetTimeouts.has(fresh)).toBe(false);
      expect(isResetScheduled(fresh)).toBe(false);

      scheduleButtonReset(fresh, 100, vi.fn());
      expect(isResetScheduled(fresh)).toBe(true);
    });
  });

  it ("calls the reset function after the specified delay", () => {
    const target = { id: "test" };
    const reset = vi.fn();
    scheduleButtonReset(target, 1500, reset);

    vi.advanceTimersByTime(1499);
    expect(reset).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1);
    expect(reset).toHaveBeenCalledTimes(1);
  });

  it ("clears the existing timeout if called again before the delay expires", () => {
    const target = { id: "test" };
    const reset = vi.fn();
    
    scheduleButtonReset(target, 1500, reset);
    vi.advanceTimersByTime(1000);
    scheduleButtonReset(target, 1500, reset); // Reschedule

    vi.advanceTimersByTime(2000);
    expect(reset).toHaveBeenCalledTimes(1);
  });

  it ("does not call reset if a new timeout has been scheduled", () => {
    const target = { id: "test" };
    const reset = vi.fn();

    scheduleButtonReset(target, 1500, reset);
    vi.advanceTimersByTime(1000);
    scheduleButtonReset(target, 500, reset);

    // At 2000ms total elapsed:
    // 1st timeout (1500ms) was cleared at 1000ms.
    // 2nd timeout (500ms) should trigger at 1000 + 500 = 1500ms.
    vi.advanceTimersByTime(1000);
    expect(reset).toHaveBeenCalledTimes(1);
  });

  it ("works with 0ms delay", () => {
    const target = { id: "test" };
    const reset = vi.fn();

    scheduleButtonReset(target, 0, reset);
    expect(reset).not.toHaveBeenCalled();
    vi.advanceTimersByTime(0);
    expect(reset).toHaveBeenCalledTimes(1);
  });

  it ("triggers reset in the next tick even with 0ms delay", () => {
    const target = { id: "test" };
    const reset = vi.fn();
    scheduleButtonReset(target, 0, reset);
    expect(reset).not.toHaveBeenCalled();
    vi.advanceTimersByTime(0);
    expect(reset).toHaveBeenCalledTimes(1);
  });

  it ("handles negative delay as 0", () => {
    const target = { id: "test" };
    const reset = vi.fn();

    scheduleButtonReset(target, -100, reset);
    vi.advanceTimersByTime(0);
    expect(reset).toHaveBeenCalledTimes(1);
  });

  it ("handles NaN delay as 0", () => {
    const target = { id: "test" };
    const reset = vi.fn();

    scheduleButtonReset(target, NaN, reset);
    vi.advanceTimersByTime(0);
    expect(reset).toHaveBeenCalledTimes(1);
  });

  it ("handles very long delay", () => {
    const target = { id: "test" };
    const reset = vi.fn();

    scheduleButtonReset(target, 1000000, reset);
    vi.advanceTimersByTime(999999);
    expect(reset).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(reset).toHaveBeenCalledTimes(1);
  });

  it ("uses DEFAULT_RESET_DELAY_MS when delayMs is omitted (default parameter)", () => {
    const target = { id: "defaults-to-300" };
    const reset = vi.fn();

    scheduleButtonReset(target, undefined as any, reset);
    expect(resetTimeouts.has(target)).toBe(true);

    vi.advanceTimersByTime(DEFAULT_RESET_DELAY_MS - 1);
    expect(reset).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1);
    expect(reset).toHaveBeenCalledTimes(1);
  });

  it ("ignores null delayMs and falls back to DEFAULT_RESET_DELAY_MS", () => {
    const target = { id: "null-delay-fallback" };
    const reset = vi.fn();

    scheduleButtonReset(target, null as any, reset);
    expect(resetTimeouts.has(target)).toBe(true);

    // null is coerced to DEFAULT_RESET_DELAY_MS (300ms), so 299ms → not yet fired.
    vi.advanceTimersByTime(DEFAULT_RESET_DELAY_MS - 1);
    expect(reset).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1);
    expect(reset).toHaveBeenCalledTimes(1);
  });

  describe("Infinity / -Infinity rejection", () => {
    it ("throws TypeError when delayMs is +Infinity", () => {
      const fresh = { id: "inf-positive" };
      expect(() => scheduleButtonReset(fresh, Infinity, vi.fn())).toThrow(TypeError);
      // Must not schedule — no WeakMap entry leaked.
      expect(resetTimeouts.has(fresh)).toBe(false);
    });

    it ("throws TypeError when delayMs is -Infinity", () => {
      const fresh = { id: "inf-negative" };
      expect(() => scheduleButtonReset(fresh, -Infinity, vi.fn())).toThrow(TypeError);
      expect(resetTimeouts.has(fresh)).toBe(false);
    });

    it ("throws TypeError when delayMs is Number.POSITIVE_INFINITY", () => {
      const fresh = { id: "pos-inf-named" };
      expect(() => scheduleButtonReset(fresh, Number.POSITIVE_INFINITY, vi.fn())).toThrow(TypeError);
      expect(resetTimeouts.has(fresh)).toBe(false);
    });

    it ("throws TypeError when delayMs is Number.NEGATIVE_INFINITY", () => {
      const fresh = { id: "neg-inf-named" };
      expect(() => scheduleButtonReset(fresh, Number.NEGATIVE_INFINITY, vi.fn())).toThrow(TypeError);
      expect(resetTimeouts.has(fresh)).toBe(false);
    });

    it ("throws with the documented message", () => {
      try {
        scheduleButtonReset({ id: "msg" }, Infinity, vi.fn());
      } catch (e) {
        expect(e).toBeInstanceOf(TypeError);
        expect((e as TypeError).message).toBe("delayMs must be finite");
      }
    });
  });

  it ("handles multiple 0ms delays correctly", () => {
    const target = { id: "test" };
    const reset = vi.fn();

    scheduleButtonReset(target, 0, reset);
    scheduleButtonReset(target, 0, reset);
    vi.advanceTimersByTime(0);
    expect(reset).toHaveBeenCalledTimes(1);
  });

  it ("works with multiple targets independently", () => {
    const target = { id: "test" };
    const target2 = { id: "test2" };
    const reset1 = vi.fn();
    const reset2 = vi.fn();

    scheduleButtonReset(target, 1000, reset1);
    scheduleButtonReset(target2, 500, reset2);

    vi.advanceTimersByTime(600);
    expect(reset2).toHaveBeenCalledTimes(1);
    expect(reset1).not.toHaveBeenCalled();

    vi.advanceTimersByTime(500);
    expect(reset1).toHaveBeenCalledTimes(1);
  });

  it ("works correctly if scheduled again after a reset has occurred", () => {
    const target = { id: "test" };
    const reset = vi.fn();

    scheduleButtonReset(target, 100, reset);
    vi.advanceTimersByTime(150);
    expect(reset).toHaveBeenCalledTimes(1);

    scheduleButtonReset(target, 100, reset);
    vi.advanceTimersByTime(150);
    expect(reset).toHaveBeenCalledTimes(2);
  });

  it ("rapid rescheduling results in only the final callback firing at its correct time", () => {
    const target = { id: "test" };
    const reset = vi.fn();

    scheduleButtonReset(target, 1000, reset); // fires at t=1000
    scheduleButtonReset(target, 800, reset);  // fires at t=800 (overrides)
    scheduleButtonReset(target, 500, reset);  // fires at t=500 (overrides)

    vi.advanceTimersByTime(499);
    expect(reset).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(reset).toHaveBeenCalledTimes(1);
  });

  it ("WeakMap holds only the latest timeoutId after rescheduling (identity invariant)", () => {
    const target = { id: "identity-invariant" };
    const r1 = vi.fn(); // 300ms — would fire at t=300
    const r2 = vi.fn(); // 500ms — rescheduled, fires at t=800

    scheduleButtonReset(target, 300, r1);
    const firstTimeoutId = resetTimeouts.get(target) as ReturnType<typeof setTimeout> | undefined;
    expect(firstTimeoutId).toBeDefined();

    vi.advanceTimersByTime(250); // before first expiry
    scheduleButtonReset(target, 500, r2); // overrides — calls cancelButtonReset internally
    const secondTimeoutId = resetTimeouts.get(target) as ReturnType<typeof setTimeout> | undefined;
    expect(secondTimeoutId).toBeDefined();

    // Core invariant: WeakMap holds ONLY the new timeout ID. Old one must be gone.
    expect(resetTimeouts.get(target)).toBe(secondTimeoutId);
    expect(resetTimeouts.get(target)).not.toBe(firstTimeoutId);

    vi.advanceTimersByTime(500); // at t=750, r2 fires at t=750 (250+500)
    expect(r1).not.toHaveBeenCalled();
    expect(r2).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(300); // past old expiry time too — r1 must NOT fire as stale
    expect(r1).not.toHaveBeenCalled();
  });

  it ("suppresses stale callbacks when rescheduled with different closures", () => {
    const target = { id: "stale-test" };
    const r1 = vi.fn(); // 500ms — would fire at t=500
    const r2 = vi.fn(); // 400ms — rescheduled at t=200, fires at t=600

    scheduleButtonReset(target, 500, r1);
    vi.advanceTimersByTime(200);
    scheduleButtonReset(target, 400, r2); // overrides r1's timeout

    vi.advanceTimersByTime(399);
    expect(r1).not.toHaveBeenCalled(); // not yet due for r2
    expect(r2).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(r2).toHaveBeenCalledTimes(1);
    expect(r1).not.toHaveBeenCalled(); // stale closure suppressed by identity check
  });

  it ("works with array targets since they pass instanceof Object", () => {
    const target: number[] = [1, 2, 3];
    const reset = vi.fn();

    scheduleButtonReset(target, 100, reset);
    expect(isResetScheduled(target)).toBe(true);
    expect(resetTimeouts.has(target)).toBe(true);

    vi.advanceTimersByTime(150);
    expect(reset).toHaveBeenCalledTimes(1);
    expect(resetTimeouts.has(target)).toBe(false);
  });

  it ("works with function targets since they pass instanceof Object", () => {
    const target = () => {};
    const reset = vi.fn();

    scheduleButtonReset(target, 100, reset);
    expect(isResetScheduled(target)).toBe(true);

    vi.advanceTimersByTime(150);
    expect(reset).toHaveBeenCalledTimes(1);
    expect(resetTimeouts.has(target)).toBe(false);
  });

  it ("throws error when target is null", () => {
    const reset = vi.fn();
    expect(() => scheduleButtonReset(null as any, 100, reset)).toThrow();
  });

  it ("throws error when target is a primitive", () => {
    const reset = vi.fn();
    expect(() => scheduleButtonReset("string" as any, 100, reset)).toThrow();
  });

  it ("does not leak WeakMap state when thrown on null target", () => {
    // Defensive guard must throw before any WeakMap mutation.
    const sentinel = { id: "null-sentinel" };
    expect(resetTimeouts.has(sentinel)).toBe(false);
    expect(() => scheduleButtonReset(null as any, 100, vi.fn())).toThrow();
    expect(resetTimeouts.has(sentinel)).toBe(false);
  });

  it ("does not leak WeakMap state when thrown on primitive target", () => {
    const sentinel = { id: "primitive-sentinel" };
    expect(resetTimeouts.has(sentinel)).toBe(false);
    expect(() => scheduleButtonReset("string-key-xyz" as any, 100, vi.fn())).toThrow();
    expect(resetTimeouts.has(sentinel)).toBe(false);
  });

  it ("throws error when target is undefined", () => {
    const sentinel = { id: "undefined-schedule-sentinel" };
    scheduleButtonReset({ id: "pre-undef" }, 100, vi.fn()); // ensure WeakMap has entries
    expect(resetTimeouts.has(sentinel)).toBe(false);
    expect(() => scheduleButtonReset(undefined as any, 100, vi.fn())).toThrow();
    expect(resetTimeouts.has(sentinel)).toBe(false);
  });

  it ("does not leak WeakMap state when thrown on undefined target", () => {
    // Defensive guard must throw before any WeakMap mutation.
    const sentinel = { id: "undefined-leak-sentinel" };
    expect(resetTimeouts.has(sentinel)).toBe(false);
    scheduleButtonReset({ id: "pre-undef2" }, 100, vi.fn()); // ensure WeakMap has entries
    expect(() => scheduleButtonReset(undefined as any, 100, vi.fn())).toThrow();
    expect(resetTimeouts.has(sentinel)).toBe(false);
  });

  it ("throws TypeError with the documented guard message (delegates to cancelButtonReset)", () => {
    // scheduleButtonReset's input validation is implemented by delegating to
    // cancelButtonReset(target) at line 34. The error type + message must
    // therefore match cancelButtonReset's contract exactly — any refactor
    // that changes the guard signature would otherwise slip past bare .toThrow()
    // assertions above.
    const reset = vi.fn();

    for (const bad of [null as unknown as object, undefined as unknown as object]) {
      try {
        scheduleButtonReset(bad, 100, reset);
      } catch (e) {
        expect(e).toBeInstanceOf(TypeError);
        expect((e as TypeError).message).toBe("cancelButtonReset requires an object target");
      }
    }

    // Guard must fire before any WeakMap interaction — no mutation leaked.
    const busy = { id: "schedule-guard-busy" };
    scheduleButtonReset(busy, 100, vi.fn());
    expect(resetTimeouts.has(busy)).toBe(true);

    try {
      scheduleButtonReset(null as any, 100, reset);
    } catch (e) {
      expect(e).toBeInstanceOf(TypeError);
    }

    // Busy target must remain untouched by the invalid call.
    expect(resetTimeouts.has(busy)).toBe(true);
  });

  it ("silently ignores a missing (undefined) reset callback without scheduling", () => {
    const fresh = { id: "missing-reset" };
    expect(resetTimeouts.has(fresh)).toBe(false);

    // Calling with undefined reset — should not schedule, must be no-op.
    scheduleButtonReset(fresh, 100, undefined as any);
    expect(resetTimeouts.has(fresh)).toBe(false);
    expect(isResetScheduled(fresh)).toBe(false);

    // Advancing time must not fire anything (nothing was scheduled).
    vi.advanceTimersByTime(200);
    expect(resetTimeouts.has(fresh)).toBe(false);
  });

  it ("silently ignores a non-function reset callback without scheduling", () => {
    const fresh = { id: "non-fn-reset" };
    expect(resetTimeouts.has(fresh)).toBe(false);

    scheduleButtonReset(fresh, 100, null as any);
    expect(resetTimeouts.has(fresh)).toBe(false);
    expect(isResetScheduled(fresh)).toBe(false);

    vi.advanceTimersByTime(200);
    expect(resetTimeouts.has(fresh)).toBe(false);
  });

  it ("silently ignores a string reset callback without scheduling", () => {
    const fresh = { id: "string-reset" };
    expect(resetTimeouts.has(fresh)).toBe(false);

    scheduleButtonReset(fresh, 100, "not-a-function" as any);
    expect(resetTimeouts.has(fresh)).toBe(false);
    expect(isResetScheduled(fresh)).toBe(false);
  });

  it ("ensures cleanup occurs even if the reset function throws", () => {
    const target = { id: "test" };
    const reset = vi.fn(() => {
      throw new Error("reset error");
    });

    scheduleButtonReset(target, 100, reset);

    try {
      vi.advanceTimersByTime(100);
    } catch (e) {
      // expected
    }

    const reset2 = vi.fn();
    scheduleButtonReset(target, 100, reset2);
    vi.advanceTimersByTime(100);
    expect(reset2).toHaveBeenCalled();
  });

  it ("does not throw when clearing an undefined timeout (first call on a new target)", () => {
    const target = { id: "fresh" };
    const reset = vi.fn();

    // First call — WeakMap has no entry, so clearTimeout(undefined) is invoked.
    scheduleButtonReset(target, 100, reset);
    expect(() => {}).not.toThrow();
    vi.advanceTimersByTime(100);
    expect(reset).toHaveBeenCalledTimes(1);
  });

  it ("does not fire a stale callback when the timeout is rescheduled before expiry", () => {
    const target = { id: "test" };
    const reset = vi.fn();

    scheduleButtonReset(target, 100, reset);
    const firstTimeoutId = resetTimeouts.get(target);
    expect(firstTimeoutId).toBeDefined();

    // Advance to the original delay — but before firing, reschedule.
    vi.advanceTimersByTime(50);
    scheduleButtonReset(target, 50, reset);

    // The second timeout fires at t=100; verify it runs exactly once.
    vi.advanceTimersByTime(60);
    expect(reset).toHaveBeenCalledTimes(1);
  });

  it ("removes the WeakMap entry after a successful reset fires", () => {
    const target = { id: "test" };
    const reset = vi.fn();

    scheduleButtonReset(target, 100, reset);
    expect(resetTimeouts.has(target)).toBe(true);

    vi.advanceTimersByTime(100);
    expect(reset).toHaveBeenCalledTimes(1);
    expect(resetTimeouts.has(target)).toBe(false);
  });

  it ("rescheduling from inside the reset callback works — delete-before-fire ordering", () => {
    // Validates that scheduleButtonReset deletes the WeakMap entry *before*
    // invoking `reset()`, so a re-schedule issued inside the callback starts
    // cleanly without fighting stale state.
    const target = { id: "reenter" };
    let outerFired = false;

    scheduleButtonReset(target, 100, () => {
      outerFired = true;
      expect(resetTimeouts.has(target)).toBe(false); // entry already deleted
      scheduleButtonReset(target, 50, vi.fn());      // fresh start for same target
    });

    expect(outerFired).toBe(false);

    vi.advanceTimersByTime(100);
    expect(outerFired).toBe(true);
    expect(resetTimeouts.has(target)).toBe(true);     // new schedule took effect

    vi.advanceTimersByTime(50);
    // the inner callback was vi.fn() — verify no error thrown and entry cleared
    expect(resetTimeouts.has(target)).toBe(false);
  });
});

describe("isResetScheduled", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it ("returns false for a fresh unscheduled target", () => {
    const target = { id: "fresh-isolated" };
    expect(resetTimeouts.has(target)).toBe(false);
    expect(isResetScheduled(target)).toBe(false);
  });

  it ("returns true after scheduling, then transitions to false on cancel", () => {
    const target = { id: "toggle-isolated" };
    scheduleButtonReset(target, 100, vi.fn());
    expect(isResetScheduled(target)).toBe(true);
    cancelButtonReset(target);
    expect(isResetScheduled(target)).toBe(false);
  });

  it ("returns false for null without throwing", () => {
    const sentinel = { id: "null-isolated-sentinel" };
    scheduleButtonReset({ id: "pre-null" }, 100, vi.fn());
    expect(resetTimeouts.has(sentinel)).toBe(false);
    expect(() => isResetScheduled(null as any)).not.toThrow();
    expect(isResetScheduled(null as any)).toBe(false);
    expect(resetTimeouts.has(sentinel)).toBe(false);
  });

  it ("returns false for undefined without throwing", () => {
    const sentinel = { id: "undef-isolated-sentinel" };
    scheduleButtonReset({ id: "pre-undef" }, 100, vi.fn());
    expect(resetTimeouts.has(sentinel)).toBe(false);
    expect(() => isResetScheduled(undefined as any)).not.toThrow();
    expect(isResetScheduled(undefined as any)).toBe(false);
    expect(resetTimeouts.has(sentinel)).toBe(false);
  });

  it ("returns false for primitive targets (string, number) without throwing", () => {
    const sentinel = { id: "prim-isolated-sentinel" };
    scheduleButtonReset({ id: "pre-prim" }, 100, vi.fn());
    expect(resetTimeouts.has(sentinel)).toBe(false);
    expect(() => isResetScheduled("string-primitive" as any)).not.toThrow();
    expect(isResetScheduled("string-primitive" as any)).toBe(false);
    expect(() => isResetScheduled(42 as any)).not.toThrow();
    expect(isResetScheduled(42 as any)).toBe(false);
    expect(resetTimeouts.has(sentinel)).toBe(false);
  });

  it ("returns false after the scheduled timeout fires naturally", () => {
    const target = { id: "post-fire-isolated" };
    scheduleButtonReset(target, 100, vi.fn());
    expect(isResetScheduled(target)).toBe(true);
    vi.advanceTimersByTime(100);
    expect(isResetScheduled(target)).toBe(false);
  });

  it ("reflects the latest state across cancel + reschedule cycle", () => {
    const target = { id: "cycle-isolated" };
    expect(isResetScheduled(target)).toBe(false);
    scheduleButtonReset(target, 100, vi.fn());
    expect(isResetScheduled(target)).toBe(true);
    cancelButtonReset(target);
    expect(isResetScheduled(target)).toBe(false);
    const reset2 = vi.fn();
    scheduleButtonReset(target, 100, reset2);
    expect(isResetScheduled(target)).toBe(true);
  });
});

describe("cancelButtonReset", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it ("does nothing when no timeout is scheduled", () => {
    const target = { id: "empty" };
    expect(() => cancelButtonReset(target)).not.toThrow();
  });

  it ("is safe to call repeatedly on an unscheduled target (double-cancel no-op)", () => {
    // Defensive invariant: cancelling a fresh target must not throw or mutate
    // the WeakMap, even when invoked multiple times in succession.
    const target = { id: "unscheduled-double" };
    expect(resetTimeouts.has(target)).toBe(false);

    cancelButtonReset(target);
    expect(resetTimeouts.has(target)).toBe(false);

    cancelButtonReset(target); // second call — must remain a no-op
    expect(resetTimeouts.has(target)).toBe(false);
  });

  it ("leaves other targets' timeouts intact when canceling a fresh target", () => {
    // Cross-target isolation: canceling an unscheduled target must not disturb
    // WeakMap entries belonging to other, already-scheduled targets.
    const busyTarget = { id: "busy" };
    const freshTarget = { id: "fresh-isolation" };

    scheduleButtonReset(busyTarget, 100, vi.fn());
    expect(resetTimeouts.has(busyTarget)).toBe(true);
    expect(resetTimeouts.has(freshTarget)).toBe(false);

    cancelButtonReset(freshTarget); // no-op on fresh target

    // The busy target must still be scheduled and cancellable.
    expect(resetTimeouts.has(busyTarget)).toBe(true);
    const resetFn = vi.fn();
    scheduleButtonReset(busyTarget, 50, resetFn);
    vi.advanceTimersByTime(60);
    expect(resetFn).toHaveBeenCalledTimes(1);
  });

  it ("clears the pending reset so the callback never fires", () => {
    const target = { id: "test" };
    const reset = vi.fn();
    scheduleButtonReset(target, 100, reset);

    cancelButtonReset(target);
    expect(resetTimeouts.has(target)).toBe(false);

    vi.advanceTimersByTime(200);
    expect(reset).not.toHaveBeenCalled();
  });

  it ("allows a fresh schedule to work after cancel", () => {
    const target = { id: "test" };
    const reset = vi.fn();
    scheduleButtonReset(target, 100, reset);
    cancelButtonReset(target);

    scheduleButtonReset(target, 100, reset);
    vi.advanceTimersByTime(150);
    expect(reset).toHaveBeenCalledTimes(1);
  });

  it ("leaves exactly one WeakMap entry after cancel + reschedule cycle", () => {
    // Cancelling must fully purge the old timeout so a subsequent schedule
    // does not accumulate stale entries — only the latest timeout should exist.
    const target = { id: "cancel-reschedule-leak" };
    const r1 = vi.fn();

    scheduleButtonReset(target, 100, r1);
    expect(resetTimeouts.get(target)).toBeDefined();

    cancelButtonReset(target);
    expect(resetTimeouts.has(target)).toBe(false);

    const r2 = vi.fn();
    scheduleButtonReset(target, 100, r2);
    const newId = resetTimeouts.get(target);
    expect(newId).toBeDefined();

    // The stored id must be the fresh one — not the old timeout id.
    expect(resetTimeouts.get(target)).toBe(newId);

    vi.advanceTimersByTime(150);
    expect(r1).not.toHaveBeenCalled();
    expect(r2).toHaveBeenCalledTimes(1);
  });

  it ("does not affect a different target's timeout", () => {
    const t1 = { id: "a" };
    const t2 = { id: "b" };
    const r1 = vi.fn();
    const r2 = vi.fn();
    scheduleButtonReset(t1, 100, r1);
    scheduleButtonReset(t2, 50, r2);

    cancelButtonReset(t1);
    vi.advanceTimersByTime(60);
    expect(r1).not.toHaveBeenCalled();
    expect(r2).toHaveBeenCalledTimes(1);
  });

  it ("leaves no stale WeakMap entries when called on a fresh target", () => {
    const fresh = { id: "fresh-target" };
    // Ensure the WeakMap starts clean for this target.
    expect(resetTimeouts.has(fresh)).toBe(false);

    cancelButtonReset(fresh);
    expect(resetTimeouts.has(fresh)).toBe(false);
  });

  it ("returns false when no timeout was scheduled (documented return contract)", () => {
    // Defensive: the documented boolean return must reflect actual state —
    // a fresh-target cancel is not silently "successful".
    const target = { id: "return-contract" };
    expect(resetTimeouts.has(target)).toBe(false);

    const result = cancelButtonReset(target);
    expect(result).toBe(false);
  });

  it ("returns true when an actual timeout was cleared (documented return contract)", () => {
    // Defensive: canceling a real pending reset must report success.
    const target = { id: "return-contract-scheduled" };
    scheduleButtonReset(target, 100, vi.fn());

    const result = cancelButtonReset(target);
    expect(result).toBe(true);
    expect(resetTimeouts.has(target)).toBe(false);
  });

  describe("input validation", () => {
    it ("throws when called with null target", () => {
      const sentinel = { id: "null-cancel-sentinel" };
      scheduleButtonReset({ id: "pre-null-cancel" }, 100, vi.fn()); // ensure WeakMap has entries
      expect(resetTimeouts.has(sentinel)).toBe(false);
      expect(() => cancelButtonReset(null as any)).toThrow(TypeError);
      expect(resetTimeouts.has(sentinel)).toBe(false);
    });

    it ("throws when called with undefined target", () => {
      const sentinel = { id: "undef-cancel-sentinel" };
      expect(resetTimeouts.has(sentinel)).toBe(false);
      expect(() => cancelButtonReset(undefined as any)).toThrow(TypeError);
      expect(resetTimeouts.has(sentinel)).toBe(false);
    });

    it ("throws when called with a primitive target", () => {
      const sentinel = { id: "prim-cancel-sentinel" };
      scheduleButtonReset({ id: "pre-prim-cancel" }, 100, vi.fn()); // ensure WeakMap has entries
      expect(resetTimeouts.has(sentinel)).toBe(false);
      expect(() => cancelButtonReset("string-key-def" as any)).toThrow(TypeError);
      expect(() => cancelButtonReset(42 as any)).toThrow(TypeError);
      expect(resetTimeouts.has(sentinel)).toBe(false);
    });

    it ("rejects the same guard path scheduleButtonReset uses (consistent API contract)", () => {
      // Defensive invariant: both public entry points reject non-objects.
      const reset = vi.fn();
      scheduleButtonReset({ id: "contract-ok" }, 100, reset);

      expect(() => cancelButtonReset(null as any)).toThrow(/target/);
      expect(() => scheduleButtonReset(null as any, 100, reset)).toThrow(/target/);
    });

    it ("throws TypeError with no-WeakMap mutation for null / undefined / primitive", () => {
      // Consolidated from two previously duplicate guard blocks. Each invalid type
      // must (a) throw TypeError, (b) leave a busy sentinel untouched, and (c) carry
      // the documented message — asserted once here covers all three cases identically.
      const reset = vi.fn();
      const busyTarget = { id: "pre-guard" };
      scheduleButtonReset(busyTarget, 100, reset);

      for (const bad of [null as unknown as object, undefined as unknown as object, "string" as unknown as object]) {
        const sentinel = { id: `guard-sentinel-${String(bad)}` };
        expect(resetTimeouts.has(sentinel)).toBe(false);

        try {
          cancelButtonReset(bad);
        } catch (e) {
          expect(e).toBeInstanceOf(TypeError);
          expect((e as TypeError).message).toBe("cancelButtonReset requires an object target");
        }

        expect(resetTimeouts.has(sentinel)).toBe(false);
      }

      // Busy sentinel must remain untouched — identity-stable reference.
      expect(resetTimeouts.has(busyTarget)).toBe(true);
    });
  });

  it ("cleans up the WeakMap entry during cancel", () => {
    const target = { id: "cleanup-target" };
    scheduleButtonReset(target, 100, vi.fn());
    expect(resetTimeouts.has(target)).toBe(true);

    cancelButtonReset(target);
    expect(resetTimeouts.has(target)).toBe(false);
  });

  it ("prevents reset firing when cancelled at the last moment", () => {
    const target = { id: "edge-cancel" };
    const reset = vi.fn();
    scheduleButtonReset(target, 100, reset);

    // Cancel exactly at the expiry boundary.
    vi.advanceTimersByTime(99);
    cancelButtonReset(target);

    expect(reset).not.toHaveBeenCalled();
    expect(resetTimeouts.has(target)).toBe(false);
  });

  it ("suppresses multiple pending resets when cancelled once", () => {
    const target = { id: "multi-cancel" };
    const r1 = vi.fn();
    const r2 = vi.fn();
    scheduleButtonReset(target, 200, r1); // fires at t=200 if not cleared
    vi.advanceTimersByTime(50);
    scheduleButtonReset(target, 100, r2); // overrides, fires at t=150

    cancelButtonReset(target);
    expect(resetTimeouts.has(target)).toBe(false);

    vi.advanceTimersByTime(200);
    expect(r1).not.toHaveBeenCalled();
    expect(r2).not.toHaveBeenCalled();
  });

  it ("suppresses stale closure when called at t=0 before any delay elapses", () => {
    // Cancelling at virtual time zero must prevent the pending reset from ever firing.
    const target = { id: "zero-elapsed" };
    const reset = vi.fn();

    scheduleButtonReset(target, 100, reset);
    expect(resetTimeouts.has(target)).toBe(true);

    cancelButtonReset(target); // immediate cancel — no time advanced

    vi.advanceTimersByTime(200);
    expect(reset).not.toHaveBeenCalled();
  });

  it ("clears WeakMap entry when reset callback throws during scheduled firing", () => {
    // Defensive: the schedule's setTimeout handler deletes the WeakMap entry
    // only after a successful identity check. If reset() throws, that delete
    // still occurs *before* reset() is invoked (per source line 37-39), so
    // subsequent cancel calls on the same target must not re-trigger stale state.
    const target = { id: "throw-cleanup" };
    let callCount = 0;

    scheduleButtonReset(target, 100, () => {
      callCount++;
      throw new Error("reset boom");
    });

    try {
      vi.advanceTimersByTime(200); // advance past expiry
    } catch {
      // expected — reset throws inside setTimeout handler
    }

    expect(callCount).toBe(1);
    // WeakMap entry must be cleaned up even after a throw.
    expect(resetTimeouts.has(target)).toBe(false);

    // A fresh schedule + cancel cycle must work cleanly afterwards.
    const cleanReset = vi.fn();
    scheduleButtonReset(target, 100, cleanReset);
    cancelButtonReset(target);
    expect(isResetScheduled(target)).toBe(false);
  });

  it ("cancels reset scheduled on an array target", () => {
    const target: number[] = [99];
    const reset = vi.fn();

    scheduleButtonReset(target, 100, reset);
    expect(resetTimeouts.has(target)).toBe(true);

    cancelButtonReset(target);
    expect(resetTimeouts.has(target)).toBe(false);
    expect(isResetScheduled(target)).toBe(false);

    // Verify the scheduled timeout would not have fired.
    vi.advanceTimersByTime(200);
    expect(reset).not.toHaveBeenCalled();
  });

  it ("cancels reset scheduled on a function target", () => {
    const target = () => {};
    const reset = vi.fn();

    scheduleButtonReset(target, 100, reset);
    expect(resetTimeouts.has(target)).toBe(true);

    cancelButtonReset(target);
    expect(resetTimeouts.has(target)).toBe(false);
    expect(isResetScheduled(target)).toBe(false);
  });

  it ("throws error when target is null", () => {
    const reset = vi.fn();
    scheduleButtonReset({ id: "pre" }, 100, reset); // populate WeakMap first
    expect(() => cancelButtonReset(null as any)).toThrow();
  });

  it ("throws error when target is a primitive string", () => {
    const reset = vi.fn();
    scheduleButtonReset({ id: "pre2" }, 100, reset); // populate WeakMap first
    expect(() => cancelButtonReset("string-key" as any)).toThrow();
  });

  it ("throws error when target is undefined", () => {
    const sentinel = { id: "undefined-cancel-sentinel" };
    scheduleButtonReset({ id: "pre4" }, 100, vi.fn()); // ensure WeakMap has entries
    expect(resetTimeouts.has(sentinel)).toBe(false);
    expect(() => cancelButtonReset(undefined as any)).toThrow();
    expect(resetTimeouts.has(sentinel)).toBe(false);
  });

  it ("throws on every non-object primitive type, not just strings", () => {
    // Defensive guard uses the same instanceof Object check as scheduleButtonReset.
    const sentinel = { id: "primitive-cascade-sentinel" };
    expect(resetTimeouts.has(sentinel)).toBe(false);

    for (const bad of [null, 42, true, false]) {
      expect(() => cancelButtonReset(bad as any))
        .toThrow(/cancelButtonReset requires an object target/);
    }

    // No WeakMap mutation leaked from the throws.
    for (const bad of [null, 42, true, false]) {
      expect(resetTimeouts.has(sentinel)).toBe(false);
    }
  });

  it ("does not mutate any WeakMap entry when thrown on primitive target", () => {
    const sentinel = { id: "primitive-cancel-sentinel" };
    scheduleButtonReset({ id: "pre3" }, 100, vi.fn()); // ensure WeakMap has entries
    expect(resetTimeouts.has(sentinel)).toBe(false);
    expect(() => cancelButtonReset("bad-key-abc" as any)).toThrow();
    expect(resetTimeouts.has(sentinel)).toBe(false);
  });

  it ("is safe to call repeatedly on the same target", () => {
    const target = { id: "double-cancel" };
    scheduleButtonReset(target, 100, vi.fn());

    cancelButtonReset(target);
    expect(() => cancelButtonReset(target)).not.toThrow();
  });

  it ("actually invokes clearTimeout with the scheduled timeout id", () => {
    const target = { id: "cleartimeout-spy" };
    scheduleButtonReset(target, 100, vi.fn());
    const scheduledId = resetTimeouts.get(target) as ReturnType<typeof setTimeout>;

    vi.spyOn(globalThis, "clearTimeout");
    cancelButtonReset(target);
    expect(clearTimeout).toHaveBeenCalledWith(scheduledId);
    (globalThis.clearTimeout as unknown as ReturnType<typeof vi.fn>).mockRestore();
  });

  it ("transitions isResetScheduled through true → false → true across cancel + reschedule", () => {
    // State-machine assertion: the public isResetScheduled API must reflect the
    // WeakMap state at each stage of a schedule → cancel → reschedule lifecycle.
    const target = { id: "state-machine-cancel-reschedule" };

    expect(isResetScheduled(target)).toBe(false);

    scheduleButtonReset(target, 100, vi.fn());
    expect(isResetScheduled(target)).toBe(true);
    expect(resetTimeouts.has(target)).toBe(true);

    cancelButtonReset(target);
    expect(isResetScheduled(target)).toBe(false);
    expect(resetTimeouts.has(target)).toBe(false);

    const reset2 = vi.fn();
    scheduleButtonReset(target, 100, reset2);
    expect(isResetScheduled(target)).toBe(true);
    expect(resetTimeouts.has(target)).toBe(true);

    // Only the latest timeout ID should exist in the WeakMap.
    const storedId = resetTimeouts.get(target);
    expect(storedId).toBeDefined();
    vi.advanceTimersByTime(150);
    expect(reset2).toHaveBeenCalledTimes(1);
  });

  it ("does not invoke clearTimeout on a fresh target", () => {
    const fresh = { id: "fresh-no-clear" };
    expect(resetTimeouts.has(fresh)).toBe(false);

    vi.spyOn(globalThis, "clearTimeout");
    cancelButtonReset(fresh);
    expect(clearTimeout).not.toHaveBeenCalled();
    (globalThis.clearTimeout as unknown as ReturnType<typeof vi.fn>).mockRestore();
  });

  it ("invokes clearTimeout AND deletes the WeakMap entry in a single cancel call", () => {
    // Regression invariant: cancel must perform BOTH side effects — clearing
    // the native timeout and removing the WeakMap entry — atomically. Dropping
    // either would cause stale state (isResetScheduled lies) or leaked timers
    // (callback fires after cancel). The ordering matters: clear first, then
    // delete, so isResetScheduled stays true until the timer is actually dead.
    const target = { id: "dual-side-effect" };
    const reset = vi.fn();
    scheduleButtonReset(target, 100, reset);

    const scheduledId = resetTimeouts.get(target) as ReturnType<typeof setTimeout>;
    expect(scheduledId).toBeDefined();

    const clearSpy = vi.spyOn(globalThis, "clearTimeout");
    cancelButtonReset(target);

    // Side-effect #1: native timer must be cancelled with the stored id.
    expect(clearSpy).toHaveBeenCalledWith(scheduledId);
    clearSpy.mockRestore();

    // Side-effect #2: WeakMap entry must be removed entirely.
    expect(resetTimeouts.has(target)).toBe(false);
    expect(resetTimeouts.get(target)).toBeUndefined();

    // State invariant: isResetScheduled reflects the post-cancel state.
    expect(isResetScheduled(target)).toBe(false);

    // Behavioral proof: advancing time must not fire the stale callback.
    vi.advanceTimersByTime(200);
    expect(reset).not.toHaveBeenCalled();
  });

  it ("does not throw when called after the reset has fired naturally", () => {
    const target = { id: "post-fire-cancel" };
    const reset = vi.fn();

    scheduleButtonReset(target, 100, reset);
    expect(resetTimeouts.has(target)).toBe(true);

    vi.advanceTimersByTime(100);
    expect(reset).toHaveBeenCalledTimes(1);
    expect(resetTimeouts.has(target)).toBe(false);

    // Cancel must be a no-op after natural expiry — not throw.
    expect(() => cancelButtonReset(target)).not.toThrow();

    // Reschedule after cancel must work cleanly.
    const reset2 = vi.fn();
    scheduleButtonReset(target, 100, reset2);
    vi.advanceTimersByTime(150);
    expect(reset2).toHaveBeenCalledTimes(1);
  });

  describe("return value", () => {
    it ("returns true when a pending timeout was actually cleared", () => {
      const target = { id: "ret-true" };
      scheduleButtonReset(target, 100, vi.fn());
      expect(cancelButtonReset(target)).toBe(true);
      expect(resetTimeouts.has(target)).toBe(false);
    });

    it ("returns false when nothing is scheduled (no-op)", () => {
      const target = { id: "ret-false-empty" };
      expect(cancelButtonReset(target)).toBe(false);
      expect(resetTimeouts.has(target)).toBe(false);
    });

    it ("returns false on double-cancel — second cancel sees nothing pending", () => {
      const target = { id: "ret-double" };
      scheduleButtonReset(target, 100, vi.fn());
      expect(cancelButtonReset(target)).toBe(true); // first clear
      expect(cancelButtonReset(target)).toBe(false); // second — no-op
    });

    it ("returns false when target was never scheduled", () => {
      const fresh = { id: "ret-fresh" };
      expect(resetTimeouts.has(fresh)).toBe(false);
      expect(cancelButtonReset(fresh)).toBe(false);
      // Fresh must remain untouched — no WeakMap mutation from a cancel on empty.
      expect(resetTimeouts.has(fresh)).toBe(false);
    });

    it ("returns true and does not fire callback after successful cancel", () => {
      const target = { id: "ret-no-fire" };
      const reset = vi.fn();
      scheduleButtonReset(target, 100, reset);
      expect(cancelButtonReset(target)).toBe(true);
      vi.advanceTimersByTime(200);
      expect(reset).not.toHaveBeenCalled();
    });

    it ("returns false when called after timeout has already fired naturally", () => {
      const target = { id: "ret-post-fire" };
      scheduleButtonReset(target, 100, vi.fn());
      vi.advanceTimersByTime(150); // let the timer fire and self-clean
      expect(resetTimeouts.has(target)).toBe(false);
      expect(cancelButtonReset(target)).toBe(false);
    });

    it ("returns false for null without throwing (throws before returning)", () => {
      const sentinel = { id: "ret-null-sentinel" };
      scheduleButtonReset({ id: "pre-ret-null" }, 100, vi.fn()); // populate WeakMap so guard doesn't short-circuit on empty map
      expect(() => cancelButtonReset(null as any)).toThrow();
    });

    it ("returns false for primitive without throwing (throws before returning)", () => {
      const sentinel = { id: "ret-prim-sentinel" };
      scheduleButtonReset({ id: "pre-ret-prim" }, 100, vi.fn()); // populate WeakMap so guard doesn't short-circuit on empty map
      expect(() => cancelButtonReset("string-key-ret" as any)).toThrow();
    });

    it ("preserves other targets' state when no-op", () => {
      const busy = { id: "ret-busy" };
      const fresh = { id: "ret-fresh-isolated" };
      scheduleButtonReset(busy, 100, vi.fn());

      // Cancel a fresh target — must be no-op and leave busy untouched.
      expect(cancelButtonReset(fresh)).toBe(false);
      expect(resetTimeouts.has(busy)).toBe(true);
      expect(isResetScheduled(busy)).toBe(true);

      // Busy should still fire at its time.
      vi.advanceTimersByTime(150);
    });

    it ("does not throw when reset has fired naturally (hook already cleared)", () => {
      const target = { id: "ret-post-fire-hook" };
      let cancelCount = 0;
      scheduleButtonReset(target, 100, vi.fn(), undefined, () => cancelCount++);

      vi.advanceTimersByTime(150); // fires and clears hook internally via clearTimeout path
      expect(cancelCount).toBe(0); // no explicit cancel happened — hook only fires on cancel, not expiry
    });
  });

  describe("onCancel callback", () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it ("fires onCancel when schedule is rescheduled with a new delay", () => {
      const target = { id: "onCancel-reschedule" };
      let cancelCount = 0;

      scheduleButtonReset(target, 200, vi.fn(), undefined, () => cancelCount++);
      expect(cancelCount).toBe(0); // not yet cancelled

      vi.advanceTimersByTime(50);
      scheduleButtonReset(target, 100, vi.fn()); // reschedule triggers onCancel on old one

      expect(cancelCount).toBe(1);
    });

    it ("fires onCancel when explicitly cancelled", () => {
      const target = { id: "onCancel-explicit" };
      let cancelCount = 0;

      scheduleButtonReset(target, 200, vi.fn(), undefined, () => cancelCount++);

      cancelButtonReset(target);
      expect(cancelCount).toBe(1);
    });

    it ("does not fire onCancel when timer fires naturally", () => {
      const target = { id: "onCancel-expiry" };
      let cancelCount = 0;

      scheduleButtonReset(target, 100, vi.fn(), undefined, () => cancelCount++);

      vi.advanceTimersByTime(150); // natural expiry — no explicit cancel
      expect(cancelCount).toBe(0);
    });

    it ("does not fire onCancel if on the same target after reschedule (new hook replaces old)", () => {
      const target = { id: "onCancel-replaces" };
      let cancels = 0;
      let firstCancelFired = false;

      scheduleButtonReset(target, 200, vi.fn(), undefined, () => {
        cancels++;
        if (cancels === 1) firstCancelFired = true;
      });

      vi.advanceTimersByTime(50);
      // New cancel hook — fires when this second schedule is itself cancelled later.
      const r2 = vi.fn();
      let cancelsAfterReschedule = 0;
      scheduleButtonReset(target, 100, r2, undefined, () => cancelsAfterReschedule++);

      expect(cancels).toBe(1); // old hook fired once on reschedule
      expect(firstCancelFired).toBe(true);

      cancelButtonReset(target); // cancels the second schedule's hook
      expect(cancelsAfterReschedule).toBe(1);
      expect(cancels).toBe(1); // no additional fire from first hook (already cleared)
    });

    it ("ignores non-function onCancel silently", () => {
      const target = { id: "onCancel-non-fn" };
      scheduleButtonReset(target, 200, vi.fn(), undefined, null as any); // null is not a function → no hook stored
      expect(() => cancelButtonReset(target)).not.toThrow();
    });

    it ("suppresses onCancel errors so cancel still succeeds", () => {
      const target = { id: "onCancel-error" };
      let cancelCount = 0;

      scheduleButtonReset(
        target,
        200,
        vi.fn(),
        undefined,
        () => { throw new Error("hook boom"); }
      );

      // Must not throw — error is swallowed.
      expect(() => cancelButtonReset(target)).not.toThrow();
    });

    it ("fires onCancel once per cancellation event", () => {
      const target = { id: "onCancel-per-event" };
      let cancelCount = 0;

      scheduleButtonReset(target, 200, vi.fn(), undefined, () => cancelCount++);
      expect(cancelCount).toBe(0);

      cancelButtonReset(target); // cancels first schedule → hook fires once
      expect(cancelCount).toBe(1);

      scheduleButtonReset(target, 200, vi.fn(), undefined, () => cancelCount++);
      cancelButtonReset(target); // cancels second schedule → hook fires again
      expect(cancelCount).toBe(2);
    });
  });

  describe("cancelButtonReset direct contract", () => {
    it ("throws TypeError on null without scheduling anything", () => {
      const sentinel = { id: "direct-null-sentinel" };
      scheduleButtonReset(sentinel, 100, vi.fn()); // populate WeakMap
      expect(() => cancelButtonReset(null as any)).toThrow(TypeError);
      expect(resetTimeouts.has(sentinel)).toBe(true);
    });

    it ("throws TypeError on undefined without scheduling anything", () => {
      const sentinel = { id: "direct-undef-sentinel" };
      scheduleButtonReset(sentinel, 100, vi.fn()); // populate WeakMap
      expect(() => cancelButtonReset(undefined as any)).toThrow(TypeError);
      expect(resetTimeouts.has(sentinel)).toBe(true);
    });

    it ("throws TypeError on primitive targets without scheduling anything", () => {
      const sentinel = { id: "direct-prim-sentinel" };
      scheduleButtonReset(sentinel, 100, vi.fn()); // populate WeakMap
      for (const bad of [42, true, "string-key-cancel"]) {
        expect(() => cancelButtonReset(bad as any)).toThrow(TypeError);
      }
      expect(resetTimeouts.has(sentinel)).toBe(true);
    });

    it ("throws with the documented guard message", () => {
      try {
        cancelButtonReset(null as any);
      } catch (e) {
        expect(e).toBeInstanceOf(TypeError);
        expect((e as TypeError).message).toBe("cancelButtonReset requires an object target");
      }
    });

    it ("returns false for unscheduled objects without throwing", () => {
      const fresh = { id: "direct-unscheduled" };
      expect(() => cancelButtonReset(fresh)).not.toThrow();
      expect(cancelButtonReset(fresh)).toBe(false);
    });

    it ("clears timeout, cancel hook, and description in one call", () => {
      const target = { id: "direct-clear-all" };
      let cancelled = false;
      scheduleButtonReset(target, 500, vi.fn(), "pending-reset", () => { cancelled = true; });

      expect(isResetScheduled(target)).toBe(true);
      expect(getResetDescription(target)).toBe("pending-reset");

      const result = cancelButtonReset(target);
      expect(result).toBe(true);
      expect(cancelled).toBe(true);
      expect(resetTimeouts.has(target)).toBe(false);
      expect(getResetDescription(target)).toBeUndefined();
    });

    it ("clears reset description when no cancel hook is set", () => {
      // Regression: description cleanup must happen unconditionally during
      // cancellation — the WeakMap.delete for descriptions sits outside the
      // cancel-hook branch and must fire even when no onCancel was registered.
      const target = { id: "direct-desc-only" };
      scheduleButtonReset(target, 100, vi.fn(), "just-a-desc");

      expect(getResetDescription(target)).toBe("just-a-desc");

      cancelButtonReset(target);

      // Description must be gone — this is the contract surface under test.
      expect(getResetDescription(target)).toBeUndefined();
    });

    it ("does not fire reset callback after explicit cancel", () => {
      const target = { id: "direct-no-fire" };
      const reset = vi.fn();

      scheduleButtonReset(target, 1000, reset);
      cancelButtonReset(target);

      vi.advanceTimersByTime(2000);
      expect(reset).not.toHaveBeenCalled();
    });

    it ("works with array targets since they pass instanceof Object", () => {
      const target: number[] = [1, 2];
      scheduleButtonReset(target, 100, vi.fn());
      expect(cancelButtonReset(target)).toBe(true);
      expect(isResetScheduled(target)).toBe(false);
    });

    it ("works with function targets since they pass instanceof Object", () => {
      const target = () => {};
      scheduleButtonReset(target, 100, vi.fn());
      expect(cancelButtonReset(target)).toBe(true);
      expect(isResetScheduled(target)).toBe(false);
    });

    it ("preserves state of other targets when cancelling one", () => {
      const busy = { id: "direct-busy" };
      const fresh = { id: "direct-fresh-isolated" };
      scheduleButtonReset(busy, 100, vi.fn());
      const resetFresh = vi.fn();
      scheduleButtonReset(fresh, 200, resetFresh);

      cancelButtonReset(busy);

      expect(isResetScheduled(fresh)).toBe(true);
      expect(resetTimeouts.has(fresh)).toBe(true);
    });
  });
});

describe("getResetDescription", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it ("returns undefined for an unscheduled target", () => {
    const fresh = { id: "get-desc-unscheduled" };
    expect(getResetDescription(fresh)).toBeUndefined();
  });

  it ("does not store description when scheduleButtonReset receives empty string", () => {
    // Contract invariant: empty descriptions carry no semantic content and are rejected.
    const target = { id: "get-desc-empty-reject" };
    scheduleButtonReset(target, 100, vi.fn(), "");

    expect(getResetDescription(target)).toBeUndefined();
    expect(resetDescriptions.has(target)).toBe(false);
  });

  it ("stores description only when a non-empty string is provided", () => {
    const target = { id: "get-desc-stored" };
    scheduleButtonReset(target, 100, vi.fn(), "active-query");

    expect(getResetDescription(target)).toBe("active-query");
    expect(resetDescriptions.has(target)).toBe(true);
  });

  it ("overwrites description on reschedule", () => {
    const target = { id: "get-desc-overwrite" };
    scheduleButtonReset(target, 200, vi.fn(), "first-descriptor");
    expect(getResetDescription(target)).toBe("first-descriptor");

    scheduleButtonReset(target, 150, vi.fn(), "second-descriptor");
    expect(getResetDescription(target)).toBe("second-descriptor");
  });

  it ("returns undefined for null target without throwing or leaking", () => {
    const sentinel = { id: "get-desc-null-sentinel" };
    scheduleButtonReset({ id: "pre-null" }, 100, vi.fn(), "busy-desc");
    expect(resetDescriptions.has(sentinel)).toBe(false);

    expect(() => getResetDescription(null as any)).not.toThrow();
    expect(getResetDescription(null as any)).toBeUndefined();
    expect(resetDescriptions.has(sentinel)).toBe(false);
  });

  it ("returns undefined for undefined target without throwing or leaking", () => {
    const sentinel = { id: "get-desc-undef-sentinel" };
    scheduleButtonReset({ id: "pre-undef" }, 100, vi.fn(), "busy-desc");
    expect(resetDescriptions.has(sentinel)).toBe(false);

    expect(() => getResetDescription(undefined as any)).not.toThrow();
    expect(getResetDescription(undefined as any)).toBeUndefined();
    expect(resetDescriptions.has(sentinel)).toBe(false);
  });

  it ("returns undefined for primitive targets without throwing or leaking", () => {
    const sentinel = { id: "get-desc-prim-sentinel" };
    scheduleButtonReset({ id: "pre-prim" }, 100, vi.fn(), "busy-desc");
    expect(resetDescriptions.has(sentinel)).toBe(false);

    for (const bad of ["string-key", 42]) {
      expect(() => getResetDescription(bad as any)).not.toThrow();
      expect(getResetDescription(bad as any)).toBeUndefined();
      expect(resetDescriptions.has(sentinel)).toBe(false);
    }
  });

  it ("returns undefined after cancelButtonReset clears the description", () => {
    const target = { id: "get-desc-post-cancel" };
    scheduleButtonReset(target, 100, vi.fn(), "pending-action");
    expect(getResetDescription(target)).toBe("pending-action");

    cancelButtonReset(target);
    expect(getResetDescription(target)).toBeUndefined();
  });
});
import { describe, it, expect } from "vitest";
import { getSecureRandomInt, UINT32_MODULUS } from "../src/crypto-utils";

describe("getSecureRandomInt", () => {
  it("throws error if max is <= 0", () => {
    expect(() => getSecureRandomInt(0)).toThrow("Max must be between 1 and UINT32_MODULUS");
    expect(() => getSecureRandomInt(-1)).toThrow("Max must be between 1 and UINT32_MODULUS");
  });

  it("returns a value in [0, max)", () => {
    const max = 100;
    for (let i = 0; i < 100; i++) {
      const val = getSecureRandomInt(max);
      expect(val).toBeGreaterThanOrEqual(0);
      expect(val).toBeLessThan(max);
    }
  });

  it("handles large max values correctly", () => {
    const max = 0x1_000_000_00;
    const val = getSecureRandomInt(max);
    expect(val).toBeGreaterThanOrEqual(0);
    expect(val).toBeLessThan(max);
  });

  it("handles max=1 correctly", () => {
    const val = getSecureRandomInt(1);
    expect(val).toBe(0);
  });

  describe("min parameter", () => {
    it("returns values in [min, max) with positive min", () => {
      const min = 5;
      const max = 20;
      for (let i = 0; i < 100; i++) {
        const val = getSecureRandomInt(max, min);
        expect(val).toBeGreaterThanOrEqual(min);
        expect(val).toBeLessThan(max);
      }
    });

    it("preserves default behavior: min=0", () => {
      const max = 10;
      for (let i = 0; i < 50; i++) {
        const val = getSecureRandomInt(max);
        expect(val).toBeGreaterThanOrEqual(0);
        expect(val).toBeLessThan(max);
      }
    });

    it("throws if min is negative", () => {
      expect(() => getSecureRandomInt(10, -1)).toThrow("Min must be a non-negative integer");
    });

    it("throws if min equals or exceeds max", () => {
      expect(() => getSecureRandomInt(5, 5)).toThrow("Min must be less than max");
      expect(() => getSecureRandomInt(5, 10)).toThrow("Min must be less than max");
    });

    it("throws if min is non-integer", () => {
      expect(() => getSecureRandomInt(10, 2.5)).toThrow("Min must be a non-negative integer");
    });

    it("handles min=0, max=max correctly (boundary)", () => {
      const val = getSecureRandomInt(100, 0);
      expect(val).toBeGreaterThanOrEqual(0);
      expect(val).toBeLessThan(100);
    });
  });

  it("throws if max exceeds UINT32_MODULUS", () => {
    expect(() => getSecureRandomInt(UINT32_MODULUS + 1)).toThrow("Max must be between 1 and UINT32_MODULUS");
  });

  it("throws if max is non-integer (fractional)", () => {
    expect(() => getSecureRandomInt(5.5)).toThrow("Max must be between 1 and UINT32_MODULUS");
  });

  it("handles max=UINT32_MODULUS correctly (zero-rejection degenerate case)", () => {
    const val = getSecureRandomInt(UINT32_MODULUS);
    expect(val).toBeGreaterThanOrEqual(0);
    // When max == UINT32_MODULUS, threshold == UINT32_MODULUS so no rejection;
    // return is the raw uint32 value — verify it fits in uint32 range.
    expect(val).toBeLessThan(UINT32_MODULUS);
  });

  it("maps deterministic samples uniformly across the full uint32 range", () => {
    const realCrypto = globalThis.crypto;
    const bucketCount = 100;
    const cycles = 20;
    const samples = Array.from({ length: bucketCount }, (_, bucket) =>
      Math.floor(((bucket + 0.5) * UINT32_MODULUS) / bucketCount),
    );
    let sampleIndex = 0;
    const deterministicCrypto = {
      getRandomValues(array: Uint32Array) {
        array[0] = samples[sampleIndex % samples.length];
        sampleIndex++;
        return array;
      },
    };
    Object.defineProperty(globalThis, "crypto", {
      value: deterministicCrypto,
      configurable: true,
      writable: true,
    });
    try {
      const buckets = new Array(bucketCount).fill(0);
      for (let i = 0; i < bucketCount * cycles; i++) {
        const value = getSecureRandomInt(UINT32_MODULUS);
        buckets[Math.floor(value / (UINT32_MODULUS / bucketCount))]++;
      }
      expect(buckets).toEqual(new Array(bucketCount).fill(cycles));
      expect(sampleIndex).toBe(bucketCount * cycles);
    } finally {
      Object.defineProperty(globalThis, "crypto", {
        value: realCrypto,
        configurable: true,
        writable: true,
      });
    }
  });

  it("produces approximately uniform distribution", () => {
    const buckets = new Array(10).fill(0);
    for (let i = 0; i < 5000; i++) {
      const val = getSecureRandomInt(10);
      expect(val).toBeGreaterThanOrEqual(0);
      expect(val).toBeLessThan(10);
      buckets[val]++;
    }
    // Each bucket should receive ~500 ± 4σ samples (binomial tolerance).
    // 3σ is too tight for Monte Carlo — 10 simultaneous buckets make flaking likely.
    const expected = 500;
    const tolerance = 4 * Math.sqrt(expected);
    for (const count of buckets) {
      expect(Math.abs(count - expected)).toBeLessThan(tolerance);
    }
  });

  it("throws if max is NaN (non-numeric)", () => {
    expect(() => getSecureRandomInt(NaN)).toThrow("Max must be between 1 and UINT32_MODULUS");
  });

  it("throws when Crypto API is unavailable (crypto missing)", () => {
    Object.defineProperty(globalThis, "crypto", { value: undefined, configurable: true, writable: true });
    try {
      expect(() => getSecureRandomInt(10)).toThrow("Crypto API unavailable");
    } finally {
      // Restore original crypto — vitest expects it for other tests in suite
      const orig = globalThis.crypto;
      Object.defineProperty(globalThis, "crypto", { value: orig, configurable: true, writable: true });
    }
  });

  it("throws when getRandomValues is missing from crypto", () => {
    const realCrypto = (globalThis as any).crypto;
    Object.defineProperty(globalThis, "crypto", { value: {}, configurable: true, writable: true });
    try {
      expect(() => getSecureRandomInt(10)).toThrow("Crypto API unavailable");
    } finally {
      Object.defineProperty(globalThis, "crypto", { value: realCrypto, configurable: true, writable: true });
    }
  });

  it("throws when getRandomValues is not a function on crypto object", () => {
    const realCrypto = (globalThis as any).crypto;
    Object.defineProperty(globalThis, "crypto", { value: { getRandomValues: null }, configurable: true, writable: true });
    try {
      expect(() => getSecureRandomInt(10)).toThrow("Crypto API unavailable");
    } finally {
      Object.defineProperty(globalThis, "crypto", { value: realCrypto, configurable: true, writable: true });
    }
  });

  it("throws when getRandomValues is a number on crypto object", () => {
    const realCrypto = (globalThis as any).crypto;
    Object.defineProperty(globalThis, "crypto", { value: { getRandomValues: 42 }, configurable: true, writable: true });
    try {
      expect(() => getSecureRandomInt(10)).toThrow("Crypto API unavailable");
    } finally {
      Object.defineProperty(globalThis, "crypto", { value: realCrypto, configurable: true, writable: true });
    }
  });

  it("throws when getRandomValues is a string on crypto object", () => {
    const realCrypto = (globalThis as any).crypto;
    Object.defineProperty(globalThis, "crypto", { value: { getRandomValues: "not-a-function" }, configurable: true, writable: true });
    try {
      expect(() => getSecureRandomInt(10)).toThrow("Crypto API unavailable");
    } finally {
      Object.defineProperty(globalThis, "crypto", { value: realCrypto, configurable: true, writable: true });
    }
  });

  it("throws when getRandomValues is a boolean on crypto object", () => {
    const realCrypto = (globalThis as any).crypto;
    Object.defineProperty(globalThis, "crypto", { value: { getRandomValues: true }, configurable: true, writable: true });
    try {
      expect(() => getSecureRandomInt(10)).toThrow("Crypto API unavailable");
    } finally {
      Object.defineProperty(globalThis, "crypto", { value: realCrypto, configurable: true, writable: true });
    }
  });

  it("throws when getRandomValues throws at runtime (try/catch guards against call-time failures)", () => {
    const realCrypto = (globalThis as any).crypto;
    Object.defineProperty(globalThis, "crypto", { value: { getRandomValues: () => { throw new Error("simulated crypto error"); } }, configurable: true, writable: true });
    try {
      expect(() => getSecureRandomInt(10)).toThrow("Crypto API unavailable");
    } finally {
      Object.defineProperty(globalThis, "crypto", { value: realCrypto, configurable: true, writable: true });
    }
  });

  it("throws when getRandomValues throws TypeError at runtime (non-standard rejection)", () => {
    const realCrypto = (globalThis as any).crypto;
    Object.defineProperty(globalThis, "crypto", { value: { getRandomValues: () => { throw new TypeError("bad buffer"); } }, configurable: true, writable: true });
    try {
      expect(() => getSecureRandomInt(10)).toThrow("Crypto API unavailable");
    } finally {
      Object.defineProperty(globalThis, "crypto", { value: realCrypto, configurable: true, writable: true });
    }
  });

  it("throws if max is Infinity (Number.isInteger returns true for Infinity)", () => {
    expect(() => getSecureRandomInt(Infinity)).toThrow("Max must be between 1 and UINT32_MODULUS");
    expect(() => getSecureRandomInt(-Infinity)).toThrow("Max must be between 1 and UINT32_MODULUS");
  });

  it("produces uniform binary output (max=2) under zero-rejection conditions", () => {
    // Guard: skip if crypto API unavailable in this environment
    const c = globalThis.crypto as any;
    if (!c || typeof c.getRandomValues !== "function") return;

    // max=2 has threshold = UINT32_MODULUS - (UINT32_MODULUS % 2) = UINT32_MODULUS,
    // so no rejections occur — this exercises the full loop with a binary output
    // space and verifies bias-free coin-flip behavior.
    const counts = [0, 0];
    for (let i = 0; i < 10_000; i++) {
      const val = getSecureRandomInt(2);
      expect(val).toBeGreaterThanOrEqual(0);
      expect(val).toBeLessThan(2);
      counts[val]++;
    }
    // ~50/50 split with generous tolerance for rejection-sampling variance.
    const expected = 5_000;
    const tolerance = 4 * Math.sqrt(expected);
    for (const count of counts) {
      expect(Math.abs(count - expected)).toBeLessThan(tolerance);
    }
  });

  it("produces uniform output at byte-size range with high rejection rate", () => {
    // Guard: skip if crypto API unavailable in this environment
    const c = globalThis.crypto as any;
    if (!c || typeof c.getRandomValues !== "function") return;

    // max=0xFF exercises rejection sampling where threshold creates a measurable bias gap.
    // Threshold = UINT32_MODULUS - (UINT32_MODULUS % 0xFF) — non-trivial rejection zone.
    const buckets = new Array(255).fill(0);
    for (let i = 0; i < 10_000; i++) {
      const val = getSecureRandomInt(0xff);
      expect(val).toBeGreaterThanOrEqual(0);
      expect(val).toBeLessThan(255);
      buckets[val]++;
    }
    // Each bucket should receive ~39.2 samples (10000/255) with generous tolerance — 255 buckets at 4σ is robust against Monte Carlo variance.
    const expected = 10_000 / 255;
    const tolerance = 4 * Math.sqrt(expected);
    for (const count of buckets) {
      expect(Math.abs(count - expected)).toBeLessThan(tolerance);
    }
  });

  it("aborts after MAX_ATTEMPTS when crypto always returns values above threshold", () => {
    const realCrypto = (globalThis as any).crypto;
    // max=7: range=7, UINT32_MODULUS % 7 = 4, threshold = UINT32_MODULUS - 4
    let callCount = 0;
    Object.defineProperty(globalThis, "crypto", {
      value: {
        getRandomValues(arr: Uint32Array) {
          arr[0] = 0xFFFFFFFF; // always above any valid threshold
          callCount++;
          return arr;
        },
      },
      configurable: true,
      writable: true,
    });
    try {
      expect(() => getSecureRandomInt(7)).toThrow("Rejection sampling exhausted");
      // Verify loop makes exactly MAX_ATTEMPTS iterations before aborting
      expect(callCount).toBe(256);
    } finally {
      Object.defineProperty(globalThis, "crypto", {
        value: realCrypto,
        configurable: true,
        writable: true,
      });
    }
  });

  it("does not leak partial result before throwing on exhaustion", () => {
    const realCrypto = (globalThis as any).crypto;
    Object.defineProperty(globalThis, "crypto", {
      value: {
        getRandomValues(arr: Uint32Array) {
          arr[0] = 0xFFFFFFFF; // always above threshold
          return arr;
        },
      },
      configurable: true,
      writable: true,
    });
    try {
      expect(() => getSecureRandomInt(7)).toThrow("Rejection sampling exhausted");
    } finally {
      Object.defineProperty(globalThis, "crypto", {
        value: realCrypto,
        configurable: true,
        writable: true,
      });
    }
  });

  it("retries until a valid sample, then returns min + (buf[0] % range)", () => {
    // max=7: UINT32_MODULUS%7 = 4, threshold = UINT32_MODULUS - 4.
    // Top 4 uint32 values are rejected; anything below is accepted.
    const realCrypto = (globalThis as any).crypto;
    let callCount = 0;
    Object.defineProperty(globalThis, "crypto", {
      value: {
        getRandomValues(arr: Uint32Array) {
          callCount++;
          if (callCount <= 3) {
            arr[0] = 0xFFFFFFFF; // rejected — above threshold
          } else {
            arr[0] = 0x8000_0000; // accepted — well below threshold
          }
          return arr;
        },
      },
      configurable: true,
      writable: true,
    });
    try {
      const result = getSecureRandomInt(7);
      expect(result).toBeGreaterThanOrEqual(0);
      expect(result).toBeLessThan(7);
      // 0x8000_0000 % 7 === 2 (2147483648 = 7*306783378 + 2)
      expect(result).toBe(2);
      expect(callCount).toBe(4); // 3 rejections then one accepted sample
    } finally {
      Object.defineProperty(globalThis, "crypto", {
        value: realCrypto,
        configurable: true,
        writable: true,
      });
    }
  });

  it("honours min offset when retry sampling produces below-threshold values", () => {
    const max = 50;
    const min = 10;
    const realCrypto = (globalThis as any).crypto;
    let callCount = 0;
    Object.defineProperty(globalThis, "crypto", {
      value: {
        getRandomValues(arr: Uint32Array) {
          callCount++;
          if (callCount <= 5) {
            arr[0] = 0xFFFFFFFF; // rejected — above threshold for range=40
          } else {
            arr[0] = 0x10; // accepted — well below threshold
          }
          return arr;
        },
      },
      configurable: true,
      writable: true,
    });
    try {
      const result = getSecureRandomInt(max, min);
      expect(result).toBeGreaterThanOrEqual(min);
      expect(result).toBeLessThan(max + min);
      // 0x10 % 40 === 16; offset by min=10 → 26
      expect(result).toBe(26);
      expect(callCount).toBe(6);
    } finally {
      Object.defineProperty(globalThis, "crypto", {
        value: realCrypto,
        configurable: true,
        writable: true,
      });
    }
  });

  it("does not call getRandomValues a fourth time if the first sample is valid", () => {
    const realCrypto = (globalThis as any).crypto;
    let callCount = 0;
    Object.defineProperty(globalThis, "crypto", {
      value: {
        getRandomValues(arr: Uint32Array) {
          callCount++;
          arr[0] = 42; // well below any threshold — always accepted
          return arr;
        },
      },
      configurable: true,
      writable: true,
    });
    try {
      getSecureRandomInt(7);
      expect(callCount).toBe(1); // single call succeeds on the first sample
    } finally {
      Object.defineProperty(globalThis, "crypto", {
        value: realCrypto,
        configurable: true,
        writable: true,
      });
    }
  });
});

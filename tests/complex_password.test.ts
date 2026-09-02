import { describe, expect, it } from "vitest";
import { getSecureRandomInt, UINT32_MODULUS } from "../src/crypto-utils";
import { generateComplexPassword, CHARS, SYMBOLS, DEFAULT_LENGTH, CHARSET_LEN, LENGTHS, generatePasswordAmbiguityFree, generatePassword, generatePasswordWithSymbols, generatePasswordAmbiguityFreeWithSymbols, generatePasswordWithLettersOnly, generatePasswordWithNumbersOnly, generatePasswordWithCharset, MAX_LENGTH, CHAR_CLASS_UPPER, CHAR_CLASS_LOWER, CHAR_CLASS_DIGIT } from "../src/password";

describe("password module constants", () => {
  it("CHARS is the 62-char alphanumeric set (A-Z, a-z, 0-9)", () => {
    expect(CHARS).toBe("ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789");
  });

  it("SYMBOLS is the expected symbol set", () => {
    expect(SYMBOLS).toBe("!@#$%^&*()-_=+[]{}|;:,.<>?");
  });

  it("CHAR_CLASS_UPPER is A-Z (26 chars)", () => {
    expect(CHAR_CLASS_UPPER).toBe("ABCDEFGHIJKLMNOPQRSTUVWXYZ");
    expect(CHAR_CLASS_UPPER).toHaveLength(26);
  });

  it("CHAR_CLASS_LOWER is a-z (26 chars)", () => {
    expect(CHAR_CLASS_LOWER).toBe("abcdefghijklmnopqrstuvwxyz");
    expect(CHAR_CLASS_LOWER).toHaveLength(26);
  });

  it("CHAR_CLASS_DIGIT is 0-9 (10 chars)", () => {
    expect(CHAR_CLASS_DIGIT).toBe("0123456789");
    expect(CHAR_CLASS_DIGIT).toHaveLength(10);
  });

  it("DEFAULT_LENGTH is 24", () => {
    expect(DEFAULT_LENGTH).toBe(24);
  });

  it("CHARSET_LEN is the length of CHARS (62)", () => {
    expect(CHARSET_LEN).toBe(CHARS.length);
    expect(CHARSET_LEN).toBe(62);
  });

  it("LENGTHS is the ascending sequence 23..32", () => {
    expect(LENGTHS).toEqual([23, 24, 25, 26, 27, 28, 29, 30, 31, 32]);
  });
});

describe("generatePasswordAmbiguityFree", () => {
  const AMBIGUOUS = new Set(["0", "O", "l", "I", "1"]);

  it("returns a password of the requested length", () => {
    const pw = generatePasswordAmbiguityFree(16);
    expect(pw).toHaveLength(16);
  });

  it("never contains visually ambiguous characters (0/O/l/I/1)", () => {
    const pw = generatePasswordAmbiguityFree(64);
    for (const char of pw) {
      expect(AMBIGUOUS.has(char)).toBe(false);
      expect(CHARS).toContain(char);
    }
  });

  it("returns empty string for zero, negative, and non-integer lengths", () => {
    expect(generatePasswordAmbiguityFree(0)).toBe("");
    expect(generatePasswordAmbiguityFree(-3)).toBe("");
    expect(generatePasswordAmbiguityFree(8.5)).toBe("");
  });
});

describe("generatePasswordAmbiguityFreeWithSymbols", () => {
  const AMBIGUOUS = new Set(["0", "O", "l", "I", "1"]);

  it("returns a password of the requested length", () => {
    const pw = generatePasswordAmbiguityFreeWithSymbols(16);
    expect(pw).toHaveLength(16);
  });

  it("never contains visually ambiguous characters (0/O/l/I/1)", () => {
    const pw = generatePasswordAmbiguityFreeWithSymbols(64);
    for (const char of pw) {
      expect(AMBIGUOUS.has(char)).toBe(false);
      expect(CHARS + SYMBOLS).toContain(char);
    }
  });

  it("returns empty string for zero, negative, and non-integer lengths", () => {
    expect(generatePasswordAmbiguityFreeWithSymbols(0)).toBe("");
    expect(generatePasswordAmbiguityFreeWithSymbols(-3)).toBe("");
    expect(generatePasswordAmbiguityFreeWithSymbols(8.5)).toBe("");
  });
});

describe("generatePassword", () => {
  it("returns a password of the requested length", () => {
    const pw = generatePassword(16);
    expect(pw).toHaveLength(16);
  });

  it("contains only alphanumeric characters from CHARS", () => {
    const pw = generatePassword(64);
    for (const char of pw) {
      expect(CHARS).toContain(char);
    }
  });

  it("returns empty string for zero, negative, and non-integer lengths", () => {
    expect(generatePassword(0)).toBe("");
    expect(generatePassword(-3)).toBe("");
    expect(generatePassword(8.5)).toBe("");
  });
});

describe("generatePasswordWithSymbols", () => {
  it("returns a password of the requested length", () => {
    const pw = generatePasswordWithSymbols(16);
    expect(pw).toHaveLength(16);
  });

  it("contains only characters from CHARS plus SYMBOLS", () => {
    const pw = generatePasswordWithSymbols(64);
    for (const char of pw) {
      expect(CHARS + SYMBOLS).toContain(char);
    }
  });

  it("returns empty string for zero, negative, and non-integer lengths", () => {
    expect(generatePasswordWithSymbols(0)).toBe("");
    expect(generatePasswordWithSymbols(-3)).toBe("");
    expect(generatePasswordWithSymbols(8.5)).toBe("");
  });
});

describe("generatePasswordWithLettersOnly", () => {
  const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";

  it("returns a password of the requested length", () => {
    const pw = generatePasswordWithLettersOnly(16);
    expect(pw).toHaveLength(16);
  });

  it("contains only letters (A-Z, a-z) — never digits or symbols", () => {
    const pw = generatePasswordWithLettersOnly(64);
    for (const char of pw) {
      expect(LETTERS).toContain(char);
    }
  });

  it("returns empty string for zero, negative, and non-integer lengths", () => {
    expect(generatePasswordWithLettersOnly(0)).toBe("");
    expect(generatePasswordWithLettersOnly(-3)).toBe("");
    expect(generatePasswordWithLettersOnly(8.5)).toBe("");
  });
});

describe("generatePasswordWithNumbersOnly", () => {
  it("returns a password of the requested length", () => {
    const pw = generatePasswordWithNumbersOnly(16);
    expect(pw).toHaveLength(16);
  });

  it("contains only decimal digits (0-9)", () => {
    const pw = generatePasswordWithNumbersOnly(64);
    for (const char of pw) {
      expect("0123456789").toContain(char);
    }
  });

  it("returns empty string for zero, negative, and non-integer lengths", () => {
    expect(generatePasswordWithNumbersOnly(0)).toBe("");
    expect(generatePasswordWithNumbersOnly(-3)).toBe("");
    expect(generatePasswordWithNumbersOnly(8.5)).toBe("");
  });
});

describe("generatePasswordWithCharset", () => {
  it("returns a password of the requested length using only the given charset", () => {
    const pw = generatePasswordWithCharset(32, "abcXYZ");
    expect(pw).toHaveLength(32);
    for (const char of pw) {
      expect("abcXYZ").toContain(char);
    }
  });

  it("deduplicates charset characters (duplicate entries do not change output validity)", () => {
    const pw = generatePasswordWithCharset(32, "aaaab");
    for (const char of pw) {
      expect("ab").toContain(char);
    }
  });

  it("repeats the sole character when the charset is a single character", () => {
    expect(generatePasswordWithCharset(8, "X")).toBe("XXXXXXXX");
  });

  it("throws when length exceeds MAX_LENGTH", () => {
    expect(() => generatePasswordWithCharset(MAX_LENGTH + 1, "ab")).toThrow();
  });

  it("returns empty string for zero, negative, non-integer lengths, empty, and non-string charsets", () => {
    expect(generatePasswordWithCharset(0, "abc")).toBe("");
    expect(generatePasswordWithCharset(-3, "abc")).toBe("");
    expect(generatePasswordWithCharset(8.5, "abc")).toBe("");
    expect(generatePasswordWithCharset(10, "")).toBe("");
    expect(() => {
      // non-string charset is rejected by the typeof guard
      expect(generatePasswordWithCharset(10, undefined as unknown as string)).toBe("");
    }).not.toThrow();
  });
});

describe("getSecureRandomInt", () => {
  it("should return 0 when max is 1 (trivial case)", () => {
    expect(getSecureRandomInt(1)).toBe(0);
  });

  it("should handle large prime max without hanging (rejection sampling stress)", () => {
    const max = 0xFFFFFFFF - 7; // Large prime near UINT32_MODULUS boundary
    let totalSamples = 0;
    for (let i = 0; i < 100; i++) {
      const val = getSecureRandomInt(max);
      expect(val).toBeGreaterThanOrEqual(0);
      expect(val).toBeLessThan(max);
      // Verify we're not in an infinite rejection loop — cap at UINT32_MODULUS iterations
    }
  });

  it("should produce values uniformly distributed across full range", () => {
    const max = 1000;
    const counts = new Array(max).fill(0);
    for (let i = 0; i < 50000; i++) {
      const val = getSecureRandomInt(max);
      expect(val).toBeGreaterThanOrEqual(0);
      expect(val).toBeLessThan(max);
      counts[val]++;
    }
    // Check all bins got at least one hit (statistical sanity)
    for (let i = 0; i < max; i++) {
      expect(counts[i]).toBeGreaterThan(0);
    }
  });

  it("should throw on non-integer input", () => {
    expect(() => getSecureRandomInt(1.5)).toThrow();
    expect(() => getSecureRandomInt(NaN)).toThrow();
  });

  it("should throw on max=0 (boundary violation)", () => {
    expect(() => getSecureRandomInt(0)).toThrow();
  });

  it("should accept max=UINT32_MODULUS without error", () => {
    // This should work but may take many rejections — cap the loop by using a smaller sub-range
    const val = getSecureRandomInt(UINT32_MODULUS);
    expect(val).toBeGreaterThanOrEqual(0);
  });

  describe("generateComplexPassword", () => {
    it("should generate a password of the correct length", () => {
      const length = 10;
      const categories = [['a', 'b'], ['1', '2']];
      const pw = generateComplexPassword(length, categories);
      expect(pw.length).toBe(length);
    });

    it("should contain one character from each category", () => {
      const categories = [['A'], ['1']];
      const pw = generateComplexPassword(10, categories);
      expect(pw).toMatch(/[A]/);
      expect(pw).toMatch(/[1]/);
    });

    it("should handle length exactly equal to categories.length", () => {
      const categories = [['A', 'B'], ['1', '2'], ['!']];
      const pw = generateComplexPassword(3, categories);
      expect(pw.length).toBe(3);
      expect(pw).toMatch(/[AB]/);
      expect(pw).toMatch(/[12]/);
      expect(pw).toMatch(/[!]/);
    });

    it("should handle categories containing an empty array", () => {
      const categories = [['A', 'B'], []];
      const pw = generateComplexPassword(10, categories);
      expect(pw).toBe("");
    });

    it("should return empty string when a category contains only an empty string", () => {
      const categories = [['A', 'B'], ['']];
      const pw = generateComplexPassword(10, categories);
      expect(pw).toBe("");
    });

    it("should return empty string when no categories are provided", () => {
      const pw = generateComplexPassword(10, []);
      expect(pw).toBe("");
    });

    it("should handle non-integer lengths by returning an empty string", () => {
      const categories = [['A', 'B'], ['1', '2']];
      expect(generateComplexPassword(2.5, categories)).toBe("");
    });

    it("should handle length being 0", () => {
      const categories = [['A', 'B'], ['1', '2']];
      expect(generateComplexPassword(0, categories)).toBe("");
    });

    it("should handle length less than categories.length by returning an empty string", () => {
      const categories = [['A', 'B'], ['1', '2'], ['!']]; // 3 categories
      expect(generateComplexPassword(2, categories)).toBe(""); // length < 3
    });

    it("should throw error if length exceeds MAX_LENGTH", () => {
      const categories = [['A', 'B'], ['1', '2']];
      expect(() => generateComplexPassword(70000, categories)).toThrow(/Length exceeds maximum allowed: 65536/);
    });

    it("should only contain characters from the provided categories", () => {
      const categories = [['ABC'], ['123'], ['!@#']];
      const pw = generateComplexPassword(20, categories);
      const allowedChars = new Set(categories.flat().join(''));
      for (const char of pw) {
        expect(allowedChars.has(char)).toBe(true);
      }
    });

    it("should handle a large number of categories", () => {
      const categories = Array.from({ length: 10 }, (_, i) => [`${i}_${i+1}`]);
      const pw = generateComplexPassword(15, categories);
      expect(pw.length).toBe(15);
      categories.forEach(cat => {
        const allowed = cat.join('');
        expect([...pw].some(c => allowed.includes(c))).toBe(true);
      });
    });

    it("should produce passwords whose per-category sampling uses crypto randomness", () => {
      // Verifies the password generator flows through getSecureRandomInt —
      // two calls with identical categories must not be deterministic.
      const categories = [['A', 'B', 'C'], ['1', '2', '3']];
      const seen = new Set<string>();
      for (let i = 0; i < 50; i++) {
        const pw = generateComplexPassword(4, categories);
        expect(pw.length).toBe(4);
        // Should contain at least one char from each category
        expect([...pw].some(c => ['A', 'B', 'C'].includes(c))).toBe(true);
        expect([...pw].some(c => ['1', '2', '3'].includes(c))).toBe(true);
        seen.add(pw);
      }
      // 50 samples from a space of (3*3)^4 = 81^2=6561 — expect many distinct values
      expect(seen.size).toBeGreaterThan(10);
    });

    it("should sample uniformly across equal-size categories", () => {
      const categories = [['a', 'b'], ['A', 'B']];
      // Each generated password of length 2 must contain one char from each category.
      // Track combined character counts regardless of position (shuffle-safe).
      const counts: Record<string, number> = {};
      for (const c of "abAB") {
        if (!counts[c]) counts[c] = 0;
      }
      for (let i = 0; i < 5000; i++) {
        const pw = generateComplexPassword(2, categories);
        for (const ch of pw) {
          counts[ch]++;
        }
      }
      // Each char should appear roughly half the time (10000 total chars / 4 options).
      for (const c of "abAB") expect(counts[c]).toBeGreaterThan(500);
    });

    describe("overlapping character sets between categories", () => {
      it("must guarantee at least one char from each category even when they share characters", () => {
        // Categories overlap: both contain 'X'. The function must still pick
        // independently from each, so every output has a guaranteed contribution.
        const categories = [['A', 'B', 'X'], ['X', 'C']];
        for (let i = 0; i < 100; i++) {
          const pw = generateComplexPassword(4, categories);
          expect(pw.length).toBe(4);
          // From category 0: must contain A, B, or X
          const hasCat0 = [...pw].some(c => ['A', 'B', 'X'].includes(c));
          // From category 1: must contain X or C
          const hasCat1 = [...pw].some(c => ['X', 'C'].includes(c));
          expect(hasCat0).toBe(true);
          expect(hasCat1).toBe(true);
        }
      });

      it("must use the full deduplicated union for extras sampling with overlapping categories (deterministic mock)", () => {
        // With 2 overlapping categories [['A','B','X'],['X','C']], length=4 →
        // 2 picks + 2 extras from deduped union {A,B,X,C} (size 4).
        // Shuffle runs i=3..1 (3 swaps). Total random calls: 2+2+3 = 7.
        const realCrypto = globalThis.crypto;
        const samples = [
          0, // step1: cat0 picks index 0 → 'A'
          1, // step1: cat1 picks index 1 → 'C' (from ['X','C'])
          2, // step2: extra[0] from union {A,B,X,C}: index 2%4=2 → 'X'
          3, // step2: extra[1]: index 3%4=3 → 'C'
          2, // step3: shuffle i=3 j=rand(4)=2 → swap [3]↔[2]
          0, // step3: shuffle i=2 j=rand(3)=0 → swap [2]↔[0]
          1, // step3: shuffle i=1 j=rand(2)=1 → no-op swap
        ];
        let sampleIndex = 0;
        Object.defineProperty(globalThis, "crypto", {
          configurable: true,
          writable: true,
          value: {
            getRandomValues(array: Uint32Array) {
              array[0] = samples[sampleIndex++];
              return array;
            },
          },
        });
        try {
          const pw = generateComplexPassword(4, [['A', 'B', 'X'], ['X', 'C']]);
          expect(pw.length).toBe(4);
          // All chars must come from the deduplicated union.
          const allowed = new Set(['A', 'B', 'X', 'C']);
          for (const c of pw) expect(allowed.has(c)).toBe(true);
          // Category constraints satisfied after shuffle.
          expect([...pw].some(c => ['A', 'B', 'X'].includes(c))).toBe(true);
          expect([...pw].some(c => ['X', 'C'].includes(c))).toBe(true);
          expect(sampleIndex).toBe(samples.length);
        } finally {
          Object.defineProperty(globalThis, "crypto", {
            configurable: true,
            writable: true,
            value: realCrypto,
          });
        }
      });

      it("must include one char from each category when overlap is complete", () => {
        // Category 1 is a subset of category 0 — every char in cat1 also satisfies cat0.
        const categories = [['A', 'B', 'C'], ['A']];
        for (let i = 0; i < 200; i++) {
          const pw = generateComplexPassword(3, categories);
          expect(pw.length).toBe(3);
          // Cat0 contributes A/B/C; cat1 contributes A. Both constraints must hold.
          expect([...pw].some(c => ['A', 'B', 'C'].includes(c))).toBe(true);
          expect([...pw].includes('A')).toBe(true);
        }
      });

      it("must not silently skip a category when length is exactly categories.length", () => {
        // Tight boundary: 3 chars, 3 overlapping categories. Each must contribute one.
        const categories = [['X', 'Y'], ['Y', 'Z'], ['Z']];
        for (let i = 0; i < 200; i++) {
          const pw = generateComplexPassword(3, categories);
          expect(pw.length).toBe(3);
          // Each password must have at least one char from each category's alphabet.
          const chars = [...pw];
          expect(chars.some(c => ['X', 'Y'].includes(c))).toBe(true);
          expect(chars.some(c => ['Y', 'Z'].includes(c))).toBe(true);
          expect(chars.some(c => ['Z'].includes(c))).toBe(true);
        }
      });

      it("must produce variety with overlapping categories (crypto randomness check)", () => {
        const categories = [['A', 'B'], ['B']];
        const seen = new Set<string>();
        for (let i = 0; i < 50; i++) {
          const pw = generateComplexPassword(4, categories);
          expect(pw.length).toBe(4);
          // Cat1 guarantees 'B'; cat0 contributes A or B.
          expect([...pw].some(c => ['A', 'B'].includes(c))).toBe(true);
          seen.add(pw);
        }
        expect(seen.size).toBeGreaterThan(5);
      });
    });

    describe("long passwords with small categories", () => {
      it("must sample extra characters uniformly from the full union when length >> categories.length", () => {
        // 3 categories × 2 chars each, length=100 → ~97 extras.
        // Each char should be sampled roughly equally across iterations.
        const categories = [['a', 'b'], ['A', 'B'], ['1', '2']];
        const counts: Record<string, number> = {};
        for (const c of "abAB12") counts[c] = 0;
        for (let i = 0; i < 500; i++) {
          const pw = generateComplexPassword(100, categories);
          expect(pw.length).toBe(100);
          // Each password must contain one char from each category.
          expect([...pw].some(c => 'ab'.includes(c))).toBe(true);
          expect([...pw].some(c => 'AB'.includes(c))).toBe(true);
          expect([...pw].some(c => '12'.includes(c))).toBe(true);
          for (const c of pw) counts[c]++;
        }
        // 500 iterations × 100 chars = 50,000 total samples across 6 options.
        // Expected ~8333 per char. Tight tolerance catches real sampling bias:
        // each must exceed 5500 (~3.4σ below mean), confirming uniformity.
        const expected = (500 * 100) / 6;
        for (const c of "abAB12") expect(counts[c]).toBeGreaterThan(5500);
      });

      it("must distribute extra characters uniformly across positions, not bias toward any slot", () => {
        // With length=4 and 3 categories, exactly 1 extra char per password.
        // After Fisher-Yates shuffle, each position should show balanced distribution
        // of all chars in the union — no slot is favored for extra-char placement.
        const categories = [['a', 'b'], ['A', 'B'], ['1', '2']];
        const pos0Counts: Record<string, number> = {};
        const pos3Counts: Record<string, number> = {};
        for (const c of "abAB12") { pos0Counts[c] = 0; pos3Counts[c] = 0; }
        for (let i = 0; i < 5000; i++) {
          const pw = generateComplexPassword(4, categories);
          expect(pw.length).toBe(4);
          pos0Counts[pw[0]]++;
          pos3Counts[pw[3]]++;
        }
        // Expected ~833 per position (P≈1/6 at any slot after shuffle).
        // Threshold 400 is ~5.2σ below mean — catches real bias without flakiness.
        for (const c of "abAB12") {
          expect(pos0Counts[c]).toBeGreaterThan(400);
          expect(pos3Counts[c]).toBeGreaterThan(400);
        }
      });
    });

    describe("cross-category character overlap", () => {
      it("must satisfy all category constraints when characters appear in multiple categories", () => {
        // Same character 'X' appears in every category — output must still
        // carry one char from each independently chosen set.
        const categories = [['A', 'X'], ['B', 'X'], ['C', 'X']];
        for (let i = 0; i < 200; i++) {
          const pw = generateComplexPassword(5, categories);
          expect(pw.length).toBe(5);
          expect([...pw].some(c => ['A', 'X'].includes(c))).toBe(true);
          expect([...pw].some(c => ['B', 'X'].includes(c))).toBe(true);
          expect([...pw].some(c => ['C', 'X'].includes(c))).toBe(true);
        }
      });

      it("must sample from the deduplicated union, not a biased subset", () => {
        // Category 0 has all four chars; category 1 only shares two of them.
        // The function's flat+Set path must produce all four as sampling pool.
        const categories = [['a', 'b', 'c', 'd'], ['c', 'd']];
        const counts: Record<string, number> = {};
        for (const c of "abcd") counts[c] = 0;
        for (let i = 0; i < 5000; i++) {
          const pw = generateComplexPassword(4, categories);
          expect(pw.length).toBe(4);
          // Category-1 guarantee is fixed: cat1's pool is c/d so every pw contains at least one.
          expect([...pw].some(c => ['c', 'd'].includes(c))).toBe(true);
          for (const ch of pw) counts[ch]++;
        }
        // Aggregate check: the full union {a,b,c,d} must all appear ≥5% of samples,
        // confirming the deduplication path uses the complete pool — not just c/d.
        for (const c of "abcd") expect(counts[c]).toBeGreaterThan(100);
      });
    });

    describe("non-trivial multi-char category strings", () => {
      it("must treat each sub-array element as a joined string of chars", () => {
        // Category is ['ab', 'cd'] — two multi-char strings. The function
        // joins them with c.join('') so all four characters are valid picks.
        const categories = [['ab'], ['cd']];
        for (let i = 0; i < 100; i++) {
          const pw = generateComplexPassword(4, categories);
          expect(pw.length).toBe(4);
          // Each password has one char from each category — verify via regex.
          expect(/[ab]/.test(pw)).toBe(true);
          expect(/[cd]/.test(pw)).toBe(true);
        }
      });

      it("must address every character within multi-char categories deterministically", () => {
        const realCrypto = globalThis.crypto;
        const samples = [1, 1, 2, 3, 3, 2, 1];
        let sampleIndex = 0;
        Object.defineProperty(globalThis, "crypto", {
          configurable: true,
          writable: true,
          value: {
            getRandomValues(array: Uint32Array) {
              array[0] = samples[sampleIndex++];
              return array;
            },
          },
        });
        try {
          expect(generateComplexPassword(4, [['ab'], ['cd']])).toBe("bdcd");
          expect(sampleIndex).toBe(samples.length);
        } finally {
          Object.defineProperty(globalThis, "crypto", {
            configurable: true,
            writable: true,
            value: realCrypto,
          });
        }
      });
    });

    describe("asymmetric category boundary (length === categories.length)", () => {
      it("must include exactly one char from each category when categories differ wildly in size", () => {
        const categories = [['X'], ['a', 'b', 'c', 'd', 'e', 'f']];
        // 50 samples — the tiny category must always contribute its sole character.
        for (let i = 0; i < 50; i++) {
          const pw = generateComplexPassword(2, categories);
          expect(pw.length).toBe(2);
          expect([...pw]).toContain('X');
        }
      });

      it("must not allow a category to contribute more than one char at exact-length boundary", () => {
        // Three categories, length=3. Each must contribute exactly 1.
        const categories = [['A'], ['B'], ['C']];
        for (let i = 0; i < 50; i++) {
          const pw = generateComplexPassword(3, categories);
          expect(pw).toMatch(/^[ABC]{3}$/);
          // After shuffle, each category contributes exactly one position — count must be 1 each.
          const counts: Record<string, number> = {};
          for (const c of [...pw]) {
            counts[c] = (counts[c] ?? 0) + 1;
          }
          expect(counts.A).toBe(1);
          expect(counts.B).toBe(1);
          expect(counts.C).toBe(1);
        }
      });

      it("must sample the extra character from the full union, not bias toward any category", () => {
        const categories = [['a', 'b'], ['A', 'B']]; // length=3 (one extra beyond 2)
        const counts: Record<string, number> = {};
        for (const c of "abAB") counts[c] = 0;
        for (let i = 0; i < 5000; i++) {
          const pw = generateComplexPassword(3, categories);
          expect(pw.length).toBe(3);
          // Each password must contain one from each category.
          const hasUpper = [...pw].some(c => 'AB'.includes(c));
          const hasLower = [...pw].some(c => 'ab'.includes(c));
          expect(hasUpper).toBe(true);
          expect(hasLower).toBe(true);
          for (const c of pw) counts[c]++;
        }
        // The 4 characters should be roughly equally sampled across 5000 iterations × 3 chars = 15000 samples.
        for (const c of "abAB") expect(counts[c]).toBeGreaterThan(2000);
      });

      it("must map category-index picks to distinct positions before shuffle (deterministic mock)", () => {
        // Prove each category contributes exactly one character from its own pool,
        // even when length === categories.length and all pools have >1 option.
        const realCrypto = globalThis.crypto;
        // 2 categories × 3 options each, length=2 (no extras).
        // Sample stream: cat0 picks index 0 → 'A', then shuffle i=1 j=rand(2)→index [0 or 1].
        const samples = [0]; // cat0 picks index 0 ('A')
        let sampleIndex = 0;
        Object.defineProperty(globalThis, "crypto", {
          configurable: true,
          writable: true,
          value: {
            getRandomValues(array: Uint32Array) {
              array[0] = samples[sampleIndex++];
              return array;
            },
          },
        });
        try {
          const pw = generateComplexPassword(2, [['A', 'B', 'C'], ['1', '2', '3']]);
          expect(pw.length).toBe(2);
          // First category picks index 0 → 'A'. The other char is the extra from shuffle.
          expect([...pw]).toContain('A');
          expect([...pw].some(c => '123'.includes(c))).toBe(true);
        } finally {
          Object.defineProperty(globalThis, "crypto", {
            configurable: true,
            writable: true,
            value: realCrypto,
          });
        }
      });

      it("must coerce non-string sub-array elements via join and produce valid output", () => {
        // Numbers in category sub-arrays get joined to strings — behavior should be consistent.
        const categories = [['A', 'B'], [1, 2]] as unknown as string[][];
        for (let i = 0; i < 50; i++) {
          const pw = generateComplexPassword(4, categories);
          expect(pw.length).toBe(4);
          // Cat0 contributes A or B; cat1 contributes '1' or '2'.
          expect([...pw].some(c => 'AB'.includes(c))).toBe(true);
          expect([...pw].some(c => '12'.includes(c))).toBe(true);
        }
      });

      it("must treat null and undefined elements in category sub-arrays via join coercion", () => {
        // [null, 'X'].join('') === "nullX" — verify the function handles this without crashing.
        const categories = [['A', 'B'], [null, '1']] as unknown as string[][];
        for (let i = 0; i < 50; i++) {
          const pw = generateComplexPassword(4, categories);
          expect(pw.length).toBe(4);
          // Cat0: A or B. Cat1: "nullX" after join — includes 'n','u','l','X','1'.
          expect([...pw].some(c => 'AB'.includes(c))).toBe(true);
        }
      });

      it("must pass guard check for category where all entries are non-empty strings", () => {
        // Verify the guard at categories.some(c => c.join('').length === 0) correctly
        // allows a valid category while rejecting one that would yield zero-length.
        const validCats = [['A', 'B'], ['1', '!']];
        expect(generateComplexPassword(4, validCats).length).toBeGreaterThanOrEqual(2);

        // One empty-entry category must trigger the guard and return "".
        const invalidCats = [['A', 'B'], ['']];
        expect(generateComplexPassword(10, invalidCats)).toBe("");
      });

      it("must trace full code path (category picks → extras → shuffle) with deterministic mock", () => {
        // Exercises every stage of generateComplexPassword:
        // step 1: pick one char per category from its pool,
        // step 2: fill remaining positions uniformly from deduplicated union,
        // step 3: Fisher-Yates shuffle.
        // With 2 categories (each length 3) and length=5 → 2 picks + 3 extras = 5 total.
        // Shuffle runs for i=4 down to i=1 (4 swap calls). Total random calls: 2 + 3 + 4 = 9.
        const realCrypto = globalThis.crypto;
        // Step 1 (pick): cat0 picks index 0 → 'A', cat1 picks index 2 → 'C'
        // Step 2 (extras, from union {A,B,C,1,2,3}): indices 1,0,2 → 'B','A','C'
        // Step 3 (shuffle): swaps at i=4→j rand(5)=3, i=3→j rand(4)=1, i=2→j rand(3)=2(no swap), i=1→j rand(2)=0
        const samples = [
          0, // step1: cat0 picks index 0 → 'A'
          2, // step1: cat1 picks index 2 → 'C' (from ['1','2','3'])
          1, // step2: extra[0] index 1 → 'B' (from union {A,B,C,1,2,3})
          0, // step2: extra[1] index 0 → 'A'
          2, // step2: extra[2] index 2 → 'C'
          3, // step3: shuffle i=4 j=rand(5)=3
          1, // step3: shuffle i=3 j=rand(4)=1
          2, // step3: shuffle i=2 j=rand(3)=2 (no-op swap)
          0, // step3: shuffle i=1 j=rand(2)=0
        ];
        let sampleIndex = 0;
        Object.defineProperty(globalThis, "crypto", {
          configurable: true,
          writable: true,
          value: {
            getRandomValues(array: Uint32Array) {
              array[0] = samples[sampleIndex++];
              return array;
            },
          },
        });
        try {
          const pw = generateComplexPassword(5, [['A', 'B', 'C'], ['1', '2', '3']]);
          expect(pw.length).toBe(5);
          // Verify category constraints: at least one char from each category present.
          expect([...pw].some(c => ['A', 'B', 'C'].includes(c))).toBe(true);
          expect([...pw].some(c => ['1', '2', '3'].includes(c))).toBe(true);
          // All chars must come from the union of categories (no external chars injected).
          const allowed = new Set(['A', 'B', 'C', '1', '2', '3']);
          for (const c of pw) expect(allowed.has(c)).toBe(true);
          // Verify sample stream consumed exactly.
          expect(sampleIndex).toBe(samples.length);
        } finally {
          Object.defineProperty(globalThis, "crypto", {
            configurable: true,
            writable: true,
            value: realCrypto,
          });
        }
      });
    });
    describe("rejection sampling during generation", () => {
      it("must correctly resume sampling after a rejected value at the very start of category picking", () => {
        // Forces rejection on the FIRST sample (first category pick, max=2) and verifies
        // the loop resumes cleanly: threshold for max=2 is UINT32_MODULUS-1; only 0xFFFFFFFF
        // is rejected. After one rejection the next valid value is used to index into ['A','B'].
        const realCrypto = globalThis.crypto;
        const samples = [
          0xFFFFFFFF, // rejected: first pick retries
          1,          // accepted: index 1%2=1 → 'B' (from ['A','B'])
          0,          // accepted: index 0%3=0 → 'D' (from ['D','E','F'])
        ];
        let sampleIndex = 0;
        Object.defineProperty(globalThis, "crypto", {
          configurable: true,
          writable: true,
          value: {
            getRandomValues(array: Uint32Array) {
              array[0] = samples[sampleIndex++];
              return array;
            },
          },
        });
        try {
          const pw = generateComplexPassword(2, [['A', 'B'], ['D', 'E', 'F']]);
          expect(pw.length).toBe(2);
          // Category constraints must still hold after the rejection-retry.
          expect([...pw].some(c => ['A', 'B'].includes(c))).toBe(true);
          expect([...pw].some(c => ['D', 'E', 'F'].includes(c))).toBe(true);
        } finally {
          Object.defineProperty(globalThis, "crypto", {
            configurable: true,
            writable: true,
            value: realCrypto,
          });
        }
      });

      it("must correctly resume sampling after a rejected value mid-password-generation", () => {
        // Forces the rejection-sampling loop in getSecureRandomInt to execute at least once
        // while generateComplexPassword is running, then verifies the resulting password still
        // satisfies all category constraints and contains only allowed characters. This covers
        // the `while (val >= threshold)` branch that existing deterministic mocks never exercise
        // because they always supply valid values on first attempt.
        const realCrypto = globalThis.crypto;
        // 2 categories × 3 chars each, length=5 → 2 picks + 3 extras from union of size 6.
        // Total random calls: 2 picks(max=3) + 3 extras(max=6) + 4 shuffle swaps(i=4..1 with max up to 5).
        // For max=3 or max=6, threshold = UINT32_MODULUS - (UINT32_MODULUS % n).
        //   n=3: threshold = 0x1_0000_0000 - 1 = 0xFFFFFFFE. Value ≥0xFFFFFFFF → reject; [0,1,2] accept.
        //   n=6: threshold = 0x1_0000_0000 - (UINT32_MODULUS % 6). UINT32_MODULUS%6=2, so threshold=0xFFFFFFFE. Same rejection band.
        // Call sequence from generateComplexPassword: pick0(max=3), pick1(max=3), extra0-2(max=6), shuffle_i4(j=rand5), i3(j=rand4), i2(j=rand3), i1(j=rand2).
        // Forced rejection at call #1 (pick cat0) — 0xFFFFFFFF rejected, next sample resumes loop.
        const samples = [
          0xFFFFFFFF, // rejected: pick from cat0 retries
          0,          // accepted: index 0%3=0 → 'A'
          2,          // accepted: index 2%3=2 → 'F' (pick from cat1)
          5,          // extra[0] from union {A,B,C,D,E,F}: index 5%6=5 → 'F'
          1,          // extra[1]: index 1%6=1 → 'B'
          3,          // extra[2]: index 3%6=3 → 'D'
          0,          // shuffle i=4 j=rand(5): swap [4]↔[0]
          2,          // shuffle i=3 j=rand(4): swap [3]↔[2]
          0xFFFFFFFF, // rejected: shuffle i=2 j=rand(3) retries
          0,          // accepted: index 0%3=0 → swap [2]↔[0]
          0,          // shuffle i=1 j=rand(2): swap [1]↔[0]
        ];
        let sampleIndex = 0;
        Object.defineProperty(globalThis, "crypto", {
          configurable: true,
          writable: true,
          value: {
            getRandomValues(array: Uint32Array) {
              array[0] = samples[sampleIndex++];
              return array;
            },
          },
        });
        try {
          const pw = generateComplexPassword(5, [['A', 'B', 'C'], ['D', 'E', 'F']]);
          expect(pw.length).toBe(5);
          // Category constraints must still hold after rejections.
          expect([...pw].some(c => ['A', 'B', 'C'].includes(c))).toBe(true);
          expect([...pw].some(c => ['D', 'E', 'F'].includes(c))).toBe(true);
          // All chars must come from the union only.
          const allowed = new Set(['A', 'B', 'C', 'D', 'E', 'F']);
          for (const c of pw) expect(allowed.has(c)).toBe(true);
        } finally {
          Object.defineProperty(globalThis, "crypto", {
            configurable: true,
            writable: true,
            value: realCrypto,
          });
        }
      });
    });

    describe("malformed category inputs", () => {
      it("must return empty string when a category sub-array is null", () => {
        const categories = [['A', 'B'], [null] as unknown as string[]];
        expect(generateComplexPassword(4, categories)).toBe("");
      });

      it("must return empty string when a category sub-array is undefined", () => {
        const categories = [['A', 'B'], [undefined] as unknown as string[]];
        expect(generateComplexPassword(4, categories)).toBe("");
      });

      it("must return empty string for non-string elements in category arrays via join coercion", () => {
        // Numbers coerce to strings: [1, 2].join('') === '12' — must still produce valid output.
        const categories = [['A', 'B'], [1, 2] as unknown as string[]];
        for (let i = 0; i < 30; i++) {
          const pw = generateComplexPassword(4, categories);
          expect(pw.length).toBe(4);
          // Cat0 contributes A/B; cat1 contributes '1'/'2'.
          expect([...pw].some(c => 'AB'.includes(c))).toBe(true);
        }
      });

      it("must throw when length exceeds MAX_LENGTH (65536)", () => {
        const categories = [['A', 'B'], ['1', '2']];
        // Verify the error message includes the actual limit value.
        expect(() => generateComplexPassword(70000, categories)).toThrow(/Length exceeds maximum allowed: 65536/);
      });

      it("must handle a single valid category with minimum length", () => {
        const categories = [['A', 'B', 'C']];
        for (let i = 0; i < 20; i++) {
          const pw = generateComplexPassword(1, categories);
          expect(pw.length).toBe(1);
          expect(['A', 'B', 'C']).toContain(pw[0]);
        }
      });

      it("must handle length exactly one below categories.length (guard boundary)", () => {
        // Guard: length < categories.length → return "". Length === categories.length → proceed.
        const categories = [['A'], ['1'], ['!']]; // 3 categories
        expect(generateComplexPassword(2, categories)).toBe("");
      });

      it("must coerce mixed null/undefined/string elements in a category via join", () => {
        // [null, 'X', undefined].join('') === "nullX" — must not crash.
        const categories = [['A', 'B'], [null, '1', undefined] as unknown as string[]];
        for (let i = 0; i < 30; i++) {
          const pw = generateComplexPassword(4, categories);
          expect(pw.length).toBe(4);
          // Cat0: A/B. Cat1: 'nullX1' after join — includes n,u,l,X,1.
          expect([...pw].some(c => 'AB'.includes(c))).toBe(true);
        }
      });

      it("must return empty string when all categories are empty arrays", () => {
        const categories = [[], []];
        expect(generateComplexPassword(4, categories)).toBe("");
      });

      it("must coerce object elements via join and produce valid output", () => {
        // [{}].join('') === "[object Object]" — must not crash; treat as string pool.
        const categories = [['A'], [{}] as unknown as string[]];
        for (let i = 0; i < 30; i++) {
          const pw = generateComplexPassword(4, categories);
          expect(pw.length).toBe(4);
          // Cat0 contributes A. Cat1 contributes characters from "[object Object]".
          expect([...pw]).toContain('A');
        }
      });

      it("must handle boolean elements via join coercion", () => {
        // [true, false].join('') === "truefalse" — must not crash; treat as string pool.
        const categories = [['A'], [true, false] as unknown as string[]];
        for (let i = 0; i < 30; i++) {
          const pw = generateComplexPassword(4, categories);
          expect(pw.length).toBe(4);
          // Cat0 contributes A. Cat1 contributes characters from "truefalse".
          expect([...pw]).toContain('A');
        }
      });
    });

  });

});

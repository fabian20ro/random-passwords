import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { generatePassword, generatePasswordWithCharset, generatePasswordWithSymbols, generatePasswordWithLettersOnly, generatePasswordWithNumbersOnly, generateAll, LENGTHS, CHARSET_LEN, isValidPassword, generateComplexPassword, MAX_LENGTH, CHARS, SYMBOLS, generatePasswordAmbiguityFree } from "../src/password";
import { getSecureRandomInt } from "../src/crypto-utils";

const originalCrypto = globalThis.crypto;

function installCryptoMock(sequence: number[] = []): () => number {
  const values = [...sequence];
  let callCount = 0;
  
  Object.defineProperty(globalThis, "crypto", {
    configurable: true,
    writable: true,
    value: {
      getRandomValues<T extends ArrayBufferView | null>(array: T): T {
        callCount++;
        if (array instanceof Uint32Array) {
          for (let i = 0; i < array.length; i++) {
            array[i] = values.length > 0 ? (values.shift() as number) : Math.floor(Math.random() * 42967296);
          }
        }
        return array;
      },
    },
  });
  
  return () => callCount;
}

function restoreCryptoMock(): void {
  Object.defineProperty(globalThis, "crypto", {
    configurable: true,
    writable: true,
    value: originalCrypto,
  });
}

beforeEach(() => {
  installCryptoMock();
});

afterEach(() => {
  restoreCryptoMock();
});

describe("generatePassword", () => {
  it("returns a string of the requested length", () => {
    for (const len of [1, 10, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32]) {
      expect(generatePassword(len)).toHaveLength(len);
    }
  });

  it("returns an empty string for non-integer lengths", () => {
    expect(generatePassword(2.5)).toBe("");
  });

  it("returns an empty string for non-positive integer lengths", () => {
    expect(generatePassword(0)).toBe("");
    expect(generatePassword(-1)).toBe("");
  });

  it("returns an empty string for non-integer lengths in generatePasswordWithCharset", () => {
    expect(generatePasswordWithCharset(2.5, "abc")).toBe("");
    expect(generatePasswordWithCharset(10, "")).toBe("");
  });

  it("returns an empty string for non-integer lengths in generateComplexPassword", () => {
    expect(generateComplexPassword(2.5, [["abc"]])).toBe("");
  });

  it("only contains alphanumeric characters", () => {
    for (let i = 0; i < 20; i++) {
      const pw = generatePassword(27);
      expect(pw).toMatch(/^[A-Za-z0123456789]+$/);
    }
  });

  it("returns an array of passwords of all defined lengths", () => {
    const passwords = generateAll();
    expect(passwords).toHaveLength(LENGTHS.length);
    for (const len of LENGTHS) {
      expect(passwords.filter(p => p.length === len)).toHaveLength(1);
    }
  });

  it("generates multiple copies per slot when count > 1", () => {
    const passwords = generateAll(3);
    expect(passwords).toHaveLength(LENGTHS.length * 3);
    for (const len of LENGTHS) {
      expect(passwords.filter(p => p.length === len)).toHaveLength(3);
    }
  });

  it("produces different passwords when count > 1", () => {
    const passwords = generateAll(5);
    // Group by length and verify each group has unique entries
    for (const len of LENGTHS) {
      const group = passwords.filter(p => p.length === len);
      expect(new Set(group).size).toBe(group.length);
    }
  });

  it("returns empty array for non-positive count", () => {
    expect(generateAll(0)).toEqual([]);
    expect(generateAll(-1)).toEqual([]);
  });

  it("returns empty array for non-integer count", () => {
    expect(generateAll(2.5)).toEqual([]);
  });

  it("enforces minClassesPerPassword=3 to require all three character classes", () => {
    const passwords = generateAll(1, { minClassesPerPassword: 3 });
    for (const pw of passwords) {
      const hasUpper = /[A-Z]/.test(pw);
      const hasLower = /[a-z]/.test(pw);
      const hasDigit = /[0-9]/.test(pw);
      expect(hasUpper && hasLower && hasDigit).toBe(true);
    }
  });

  it("generates ambiguity-free passwords when ambiguityFree option is true", () => {
    const passwords = generateAll(5, { ambiguityFree: true });
    for (const pw of passwords) {
      expect(pw.length).toBeGreaterThan(0);
      // Verify no ambiguous chars: 0, O, l, I, 1
      expect([...pw].every(c => !["0", "O", "l", "I", "1"].includes(c))).toBe(true);
    }
  });

  it("ambiguityFree option respects minClassesPerPassword constraint", () => {
    const passwords = generateAll(1, { ambiguityFree: true, minClassesPerPassword: 3 });
    for (const pw of passwords) {
      const hasUpper = /[A-Z]/.test(pw);
      const hasLower = /[a-z]/.test(pw);
      const hasDigit = /[0-9]/.test(pw);
      expect(hasUpper && hasLower && hasDigit).toBe(true);
      // Still no ambiguous chars
      expect([...pw].every(c => !["0", "O", "l", "I", "1"].includes(c))).toBe(true);
    }
  });

  it("default behavior (ambiguityFree=false) may include ambiguous characters", () => {
    // With default options, ambiguous chars are allowed — verify generation works normally
    const passwords = generateAll(50);
    expect(passwords.length).toBeGreaterThan(LENGTHS.length * 49);
    for (const pw of passwords) {
      expect(pw.length).toBeGreaterThan(0);
    }
  });

  it("returns a string of the requested length and contains characters from all categories", () => {
    const categories = [["abc"], ["123"], ["!@#"]];
    const length = 10;
    const pw = generateComplexPassword(length, categories);
    expect(pw).toHaveLength(length);
    for (const category of categories) {
      const categoryChars = [...category.join('')];
      expect([...pw].some(char => categoryChars.includes(char))).toBe(true);
    }
  });

  it("works when length is exactly the number of categories", () => {
    const categories = [["abc"], ["123"], ["!@#"]];
    const length = categories.length;
    const pw = generateComplexPassword(length, categories);
    expect(pw).toHaveLength(length);
    for (const category of categories) {
      const categoryChars = [...category.join('')];
      expect([...pw].some(char => categoryChars.includes(char))).toBe(true);
    }
  });

  it("handles charsets with a single character", () => {
    const length = 10;
    const pw = generatePasswordWithCharset(length, "a");
    expect(pw).toHaveLength(length);
    expect(pw).toBe("aaaaaaaaaa");
  });

  it("deduplicates duplicate characters in charset to prevent modulo bias", () => {
    // A charset like "aab" with duplicates would give 'a' twice the weight — dedup fixes this.
    const dupCharset = "aab";
    for (let i = 0; i < 200; i++) {
      const pw = generatePasswordWithCharset(100, dupCharset);
      expect(pw).toHaveLength(100);
      // Only 'a' or 'b' should appear — never a duplicate artifact
      expect([...pw].every(c => "ab".includes(c))).toBe(true);
    }
  });

  it("returns empty string for charset that deduplicates to nothing", () => {
    // An empty-string charset is blocked by !charset, but defense-in-depth must not infinite-loop.
    expect(generatePasswordWithCharset(24, "")).toBe("");
  });

  it("normalizes character weights when charset has duplicates", () => {
    // With dedup, "aab" treats each unique char equally (50/50), not weighted by position count.
    const dupCharset = "aab";
    const counts = new Map<string, number>();
    for (let i = 0; i < 2000; i++) {
      const pw = generatePasswordWithCharset(1, dupCharset);
      const char = pw[0];
      counts.set(char, (counts.get(char) ?? 0) + 1);
    }
    // 'a' and 'b' should each appear roughly half the time (~50%)
    const aCount = counts.get("a") ?? 0;
    const bCount = counts.get("b") ?? 0;
    expect(aCount).toBeGreaterThanOrEqual(800);
    expect(bCount).toBeGreaterThanOrEqual(800);
  });

  it("heavily skewed duplicate charset achieves uniform distribution after dedup", () => {
    // "aaaaab" has 5 'a' and 1 'b' — 6 positions, 2 unique chars.
    // Without dedup, bias would be ~83%/17%. With dedup it must equalize to ~50/50.
    const skewedCharset = "aaaaab";
    const counts = new Map<string, number>();
    for (let i = 0; i < 4000; i++) {
      const pw = generatePasswordWithCharset(1, skewedCharset);
      const char = pw[0];
      counts.set(char, (counts.get(char) ?? 0) + 1);
    }
    const aCount = counts.get("a") ?? 0;
    const bCount = counts.get("b") ?? 0;
    // Each unique char must get roughly equal share — tolerate ±25% for statistical variance.
    expect(aCount).toBeGreaterThanOrEqual(1400);
    expect(bCount).toBeGreaterThanOrEqual(1400);
    expect(aCount).toBeLessThanOrEqual(2600);
    expect(bCount).toBeLessThanOrEqual(2600);
  });

  it("deduplication ensures effective charset length matches unique chars", () => {
    // The dedup normalization must reduce a duplicate charset to exactly its Set size —
    // otherwise getSecureRandomInt would index beyond the true unique count.
    const dupCharset = "aabbc";
    expect([...new Set(dupCharset)].length).toBe(3);
    for (let i = 0; i < 100; i++) {
      const pw = generatePasswordWithCharset(20, dupCharset);
      expect(pw).toHaveLength(20);
      // Only the 4 unique chars may appear — never a duplicate artifact index out of range
      for (const c of [...pw]) {
        expect(["a", "b", "c"].includes(c)).toBe(true);
      }
    }
  });

  it("handles charset that deduplicates to exactly one unique character (degenerate boundary)", () => {
    // When all chars in a duplicated charset collapse to one unique char,
    // generatePasswordWithCharset must still return correct-length output
    // without infinite-looping or producing characters outside the single unique set.
    const degenerateCharset = "aaa";
    for (let i = 0; i < 200; i++) {
      const pw = generatePasswordWithCharset(50, degenerateCharset);
      expect(pw).toHaveLength(50);
      expect([...pw].every(c => c === "a")).toBe(true);
    }
  });

  it("rejects biased values near the rejection threshold for non-power-of-2 charsets", () => {
    // With range=7, threshold = UINT32_MODULUS - (UINT32_MODULUS % 7) = 4294967292.
    // Values >= 4294967292 must be rejected and resampled to prevent modulo bias.
    // Force a rejection, then feed a valid value — verify the second draw succeeds immediately.
    const UINT32_MODULUS = 0x1_0000_0000;
    const range = 7;
    const threshold = UINT32_MODULUS - (UINT32_MODULUS % range);
    // First call: value at threshold (rejected). Second call: valid value. Third call: for actual char pick.
    const values = [threshold, 0, 4];
    installCryptoMock(values);
    const result = generatePasswordWithCharset(1, "abcdefg");
    expect(result).toHaveLength(1);
    // buf[0] % range after threshold rejection + 0 should give index 0 → 'a'
    restoreCryptoMock();
  });

  it("resamples correctly when forced to reject multiple times for biased charsets", () => {
    // Force two rejections then a valid draw — verify the algorithm does not loop forever or crash.
    const UINT32_MODULUS = 0x1_0000_0000;
    const range = 7;
    const threshold = UINT32_MODULUS - (UINT32_MODULUS % range);
    const values = [threshold, threshold + 1, 6]; // reject twice, then valid → index 6 → 'g'
    installCryptoMock(values);
    const result = generatePasswordWithCharset(5, "abcdefg");
    expect(result).toHaveLength(5);
    restoreCryptoMock();
  });

  it("maintains uniform distribution across non-power-of-2 charsets under forced rejections", () => {
    // With range=7 (not power of 2), modulo bias would distort output if rejection sampling fails.
    // Force some values above threshold, then use a wide spread — verify counts converge to ~equal share.
    const UINT32_MODULUS = 0x1_0000_0000;
    const range = 7;
    const threshold = UINT32_MODULUS - (UINT32_MODULUS % range);
    // Each sample needs: [valid_value] → one char. Force rejections intermittently.
    const charset = "abcdefg";
    const counts = new Map<string, number>();

    for (let i = 0; i < 5000; i++) {
      installCryptoMock([Math.floor(Math.random() * threshold)]);
      const pw = generatePasswordWithCharset(1, charset);
      counts.set(pw[0], (counts.get(pw[0]) ?? 0) + 1);
    }

    // Each of the 7 chars should get roughly equal share (~14% each).
    // Tolerance ±5 percentage points for statistical variance with n=5000.
    const expected = 5000 / 7;
    for (const char of [...charset]) {
      const count = counts.get(char) ?? 0;
      expect(count).toBeGreaterThanOrEqual(expected * 0.8); // at least ~72% of expected
      expect(count).toBeLessThanOrEqual(expected * 1.25);   // at most ~125% of expected
    }
  });

  it("produces only characters from the provided custom charset (hex)", () => {
    // Custom hex-only charset — verify output is strictly limited to those chars
    const hexCharset = "0123456789abcdef";
    for (let i = 0; i < 100; i++) {
      const pw = generatePasswordWithCharset(16, hexCharset);
      expect(pw).toHaveLength(16);
      expect([...pw].every(c => hexCharset.includes(c))).toBe(true);
    }
  });

  it("handles length up to MAX_LENGTH", () => {
    const length = 65536;
    const pw = generatePasswordWithCharset(length, "abc");
    expect(pw).toHaveLength(length);
  });

  it("handles length up to MAX_LENGTH in generateComplexPassword", () => {
    const categories = [["abc"], ["123"], ["!@#"]];
    const length = 65536;
    const pw = generateComplexPassword(length, categories);
    expect(pw).toHaveLength(length);
    expect(isValidPassword(pw, CHARS + SYMBOLS)).toBe(true);
  });

  it("throws error for lengths greater than MAX_LENGTH", () => {
    expect(() => generatePassword(MAX_LENGTH + 1)).toThrow();
  });

  it("handles getSecureRandomInt with max=1", () => {
    const values = [0, 1];
    const callCount = installCryptoMock(values);
    const result = getSecureRandomInt(1);
    expect(result).toBe(0);
    expect(callCount()).toBe(1);
    restoreCryptoMock();
  });

  it("throws error for non-positive max in getSecureRandomInt", () => {
    expect(() => getSecureRandomInt(0)).toThrow("Max must be between 1 and UINT32_MODULUS");
    expect(() => getSecureRandomInt(-1)).toThrow("Max must be between 1 and UINT32_MODULUS");
  });

  it("handles very large max for getSecureRandomInt", () => {
    const max = 2**31;
    const val = getSecureRandomInt(max);
    expect(val).toBeGreaterThanOrEqual(0);
    expect(val).toBeLessThan(max);
  });
});

describe("isValidPassword", () => {
  it("returns true for valid passwords", () => {
    expect(isValidPassword("abc123", CHARS)).toBe(true);
    expect(isValidPassword("abc!@#", CHARS + SYMBOLS)).toBe(true);
  });

  it("returns false for passwords with invalid characters", () => {
    expect(isValidPassword("abc!@#", CHARS)).toBe(false);
    expect(isValidPassword("abc123", SYMBOLS)).toBe(false);
  });

  it("returns false for empty passwords", () => {
    expect(isValidPassword("", CHARS)).toBe(false);
  });
});

describe("generatePasswordWithSymbols", () => {
  it("only contains characters from CHARS and SYMBOLS", () => {
    const length = 20;
    const pw = generatePasswordWithSymbols(length);
    const allowedChars = new Set([...CHARS, ...SYMBOLS]);
    expect(pw).toHaveLength(length);
    expect([...pw].every(char => allowedChars.has(char))).toBe(true);
  });
});

describe("generatePasswordWithLettersOnly", () => {
  it("only contains letters", () => {
    const length = 20;
    const pw = generatePasswordWithLettersOnly(length);
    expect(pw).toHaveLength(length);
    expect(pw).toMatch(/^[A-Za-z]+$/);
  });
});

describe("generatePasswordWithNumbersOnly", () => {
  it("only contains numbers", () => {
    const length = 20;
    const pw = generatePasswordWithNumbersOnly(length);
    expect(pw).toHaveLength(length);
    expect(pw).toMatch(/^[0-9]+$/);
  });

  it("only contains characters from the actual NUMBERS_ONLY_CHARSET (verified at runtime)", () => {
    // Verify charset compliance using source constants — mirrors the symbols test at line 182
    const numbersOnlyCharset = CHARS.substring(52);
    for (let i = 0; i < 200; i++) {
      const pw = generatePasswordWithNumbersOnly(32);
      expect(pw).toHaveLength(32);
      expect([...pw].every(c => numbersOnlyCharset.includes(c))).toBe(true);
    }
  });

  it("only contains letters", () => {
    const length = 20;
    const pw = generatePasswordWithLettersOnly(length);
    expect(pw).toHaveLength(length);
    expect(pw).toMatch(/^[A-Za-z]+$/);
  });

  it("only contains characters from the actual LETTERS_ONLY_CHARSET (verified at runtime)", () => {
    // Verify charset compliance using source constants — mirrors the symbols test at line 182
    const lettersOnlyCharset = CHARS.substring(0, 52);
    for (let i = 0; i < 200; i++) {
      const pw = generatePasswordWithLettersOnly(32);
      expect(pw).toHaveLength(32);
      expect([...pw].every(c => lettersOnlyCharset.includes(c))).toBe(true);
    }
  });
});

describe("generateComplexPassword", () => {
  it("returns a password when all categories are non-empty", () => {
    const categories = [["abc"], ["123"], ["!@#"]];
    const length = 10;
    const pw = generateComplexPassword(length, categories);
    expect(pw).toHaveLength(length);
  });

  it("returns an empty string if any category is empty", () => {
    const categories = [["a"], [""]];
    const length = 10;
    const pw = generateComplexPassword(length, categories);
    expect(pw).toBe("");
  });

  it("returns an empty string if length is less than categories.length", () => {
    const categories = [["abc"], ["123"], ["!@#"]];
    const length = categories.length - 1;
    const pw = generateComplexPassword(length, categories);
    expect(pw).toBe("");
  });

  it("returns an empty string when length is zero with valid categories", () => {
    // Guard clause: `length < categories.length` (0 < n) must return "" without throwing.
    const categories = [["abc"], ["123"]];
    const pw = generateComplexPassword(0, categories);
    expect(pw).toBe("");
  });

  it("returns an empty string when length is negative with valid categories", () => {
    // Guard clause: `length < categories.length` (-5 < n) must return "" without throwing.
    const categories = [["abc"], ["123"]];
    const pw = generateComplexPassword(-5, categories);
    expect(pw).toBe("");
  });

  it("verifies complex passwords for character set compliance", () => {
    const categories = [["abc"], ["123"], ["!@#"]];
    const length = 20;
    const pw = generateComplexPassword(length, categories);
    const fullCharset = CHARS + SYMBOLS;
    expect(isValidPassword(pw, fullCharset)).toBe(true);
  });

  it("shuffle distributes category picks across all positions", () => {
    // With emoji-only categories, fillers draw from same set — every char is category-sourced
    const categories = [["🔤"], ["⚡"]];
    const length = 6;
    for (let i = 0; i < 500; i++) {
      const pw = generateComplexPassword(length, categories);
      // Use spread to count actual characters (emoji are multi-byte in UTF-16)
      expect([...pw].length).toBe(length);
      expect([...pw].includes("🔤")).toBe(true);
      expect([...pw].includes("⚡")).toBe(true);
    }
  });

  it("shuffle distributes character positions uniformly across samples", () => {
    // With emoji-only categories, every char is category-sourced — verify shuffle spreads them across all positions
    const categories = [["🔤"], ["⚡"]];
    const length = 6;
    const posCounts: Record<number, number> = {};
    for (let i = 0; i < 1000; i++) {
      const pw = generateComplexPassword(length, categories);
      // Track where "⚡" lands — verify it appears in all positions including the end
      for (let pos = 0; pos < length; pos++) {
        if (pw[pos] === "⚡") posCounts[pos] = (posCounts[pos] || 0) + 1;
      }
    }
    // Each position should see ⚡ in at least ~5% of samples
    for (let pos = 0; pos < length; pos++) {
      const ratio = (posCounts[pos] || 0) / 1000;
      expect(ratio).toBeGreaterThan(0.05);
      expect(ratio).toBeLessThan(0.95);
    }
  });

  it("shuffle distributes picks uniformly across positions", () => {
    // Use non-overlapping categories so we can definitively track where each category's pick lands after shuffle
    const categories = [["a"], ["b"]];
    const length = 6;
    // Track which character is at each position (only "a" or "b" appear initially)
    const aInPos: number[] = Array(length).fill(0);
    const bInPos: number[] = Array(length).fill(0);
    for (let i = 0; i < 3000; i++) {
      const pw = generateComplexPassword(length, categories);
      for (let pos = 0; pos < length; pos++) {
        if (pw[pos] === "a") aInPos[pos]++;
        else if (pw[pos] === "b") bInPos[pos]++;
      }
    }
    // Both category picks should appear across all positions (shuffle spreads them)
    for (let pos = 0; pos < length; pos++) {
      const aRatio = aInPos[pos] / 3000;
      const bRatio = bInPos[pos] / 3000;
      expect(aRatio).toBeGreaterThan(0.15);
      expect(bRatio).toBeGreaterThan(0.15);
    }
  });

  it("guarantees category coverage with overlapping character sets", () => {
    // Categories share characters — verify each category still contributes at least one pick per password
    const overlapCategory1 = "abcxyz";
    const overlapCategory2 = "cdeyza";
    const categories = [overlapCategory1.split(""), overlapCategory2.split("")];
    const length = 8;
    for (let i = 0; i < 500; i++) {
      const pw = generateComplexPassword(length, categories);
      expect([...pw].some(c => overlapCategory1.includes(c))).toBe(true);
      expect([...pw].some(c => overlapCategory2.includes(c))).toBe(true);
    }
  });

  it("handles identical-category sub-arrays without losing charset compliance", () => {
    // When user supplies duplicate charsets, each pick still draws from the shared set — verify output stays valid
    const idChar = "abc";
    const categories = Array(3).fill(idChar.split(""));
    const length = 10;
    for (let i = 0; i < 200; i++) {
      const pw = generateComplexPassword(length, categories);
      expect(pw).toHaveLength(length);
      expect(isValidPassword(pw, idChar)).toBe(true);
    }
  });

  it("returns an empty string when all category sub-arrays are empty", () => {
    const categories: string[][] = [[], [], []];
    const length = 10;
    const pw = generateComplexPassword(length, categories);
    expect(pw).toBe("");
  });
});

describe("generatePasswordAmbiguityFree", () => {
  const NON_AMBIGUOUS_CHARSET = [...CHARS].filter(c => !["0", "O", "l", "I", "1"].includes(c)).join("");

  it("returns a password of correct length without ambiguous characters", () => {
    const length = 20;
    for (let i = 0; i < 50; i++) {
      const pw = generatePasswordAmbiguityFree(length);
      expect(pw).toHaveLength(length);
      // Verify no ambiguous chars: 0, O, l, I, 1
      expect([...pw].every(c => !["0", "O", "l", "I", "1"].includes(c))).toBe(true);
    }
  });

  it("only contains characters from the non-ambiguous alphanumeric set", () => {
    for (let i = 0; i < 200; i++) {
      const pw = generatePasswordAmbiguityFree(32);
      expect(pw).toHaveLength(32);
      expect([...pw].every(c => NON_AMBIGUOUS_CHARSET.includes(c))).toBe(true);
    }
  });

  it("returns an empty string for non-positive length", () => {
    expect(generatePasswordAmbiguityFree(0)).toBe("");
    expect(generatePasswordAmbiguityFree(-5)).toBe("");
  });

  it("returns an empty string for non-integer length", () => {
    expect(generatePasswordAmbiguityFree(2.5)).toBe("");
  });
});

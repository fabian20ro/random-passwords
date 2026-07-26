import { describe, it, expect } from "vitest";
import { generateUsername, generateUsernames, USERNAME_ADJECTIVES, USERNAME_NOUNS, randomFourDigitNumber } from "../src/username";

describe("username generation", () => {
  describe("randomFourDigitNumber()", () => {
    it("returns a four-digit number in range 1000–9999", () => {
      for (let i = 0; i < 200; i++) {
        const val = randomFourDigitNumber();
        expect(typeof val).toBe("number");
        expect(val).toBeGreaterThanOrEqual(1000);
        expect(val).toBeLessThanOrEqual(9999);
      }
    });

    it("distributes uniformly across the full 1000–9999 range", () => {
      const SAMPLES = 5000;
      const BUCKETS = 10;
      const bucketSize = Math.floor(9000 / BUCKETS); // 900
      const buckets = Array(BUCKETS).fill(0);

      for (let i = 0; i < SAMPLES; i++) {
        const num = randomFourDigitNumber();
        const bucket = Math.floor((num - 1000) / bucketSize);
        buckets[bucket]++;
      }

      const expected = SAMPLES / BUCKETS;
      const observedMax = Math.max(...buckets);
      const observedMin = Math.min(...buckets);

      expect(observedMax).toBeLessThanOrEqual(expected * 2.5);
      expect(observedMin).toBeGreaterThanOrEqual(expected * 0.5);
    });
  });

  describe("generateUsername()", () => {
    it("returns three underscore-separated parts: Adjective_Noun_4digits", () => {
      for (let i = 0; i < 50; i++) {
        const username = generateUsername();
        const parts = username.split("_");
        expect(parts).toHaveLength(3);
        expect(parts[0]).toMatch(/^[A-Z][a-z]*$/);
        expect(parts[1]).toMatch(/^[A-Z][a-z]*$/);
        expect(parts[2]).toMatch(/^[0-9]{4}$/);
      }
    });

    it("returns a string in the Capitalized_Title format", () => {
      for (let i = 0; i < 50; i++) {
        const username = generateUsername();
        expect(username).toMatch(/^[A-Z][a-z]+_[A-Z][a-z]+_[0-9]{4}$/);
      }
    });

    it("returns a string with no lowercase letters in the first letter of words", () => {
      for (let i = 0; i < 50; i++) {
        const username = generateUsername();
        expect(username).toMatch(/^[A-Z][a-z]+_[A-Z][a-z]+_[0-9]{4}$/);
      }
    });
  });

  describe("edge cases", () => {
    it("returns an empty array for count 0", () => {
      expect(generateUsernames(0)).toEqual([]);
    });

    it("throws for negative counts", () => {
      expect(() => generateUsernames(-1)).toThrow(RangeError);
      expect(() => generateUsernames(-10)).toThrow(RangeError);
    });

    it("throws for excessive count (> 1024)", () => {
      expect(() => generateUsernames(1025)).toThrow(RangeError);
      expect(() => generateUsernames(10000)).toThrow(RangeError);
    });

    it("returns exactly MAX_USERNAME_COUNT unique well-formed usernames at the upper bound", () => {
      // Verifies the API contract holds at its declared maximum input.
      const COUNT = 1024;
      const result = generateUsernames(COUNT);
      expect(result).toHaveLength(COUNT);

      const uniqueSet = new Set(result);
      expect(uniqueSet.size).toBe(COUNT);

      for (const u of result) {
        expect(u).toMatch(/^[A-Z][a-z]+_[A-Z][a-z]+_[0-9]{4}$/);
        const [adj, noun] = u.split("_");
        expect(USERNAME_ADJECTIVES).toContain(adj.toLowerCase());
        expect(USERNAME_NOUNS).toContain(noun.toLowerCase());
      }
    });

    it("throws for non-integer counts", () => {
      expect(() => generateUsernames(2.5)).toThrow(RangeError);
    });

    it("throws for NaN count", () => {
      expect(() => generateUsernames(NaN)).toThrow(RangeError);
    });

    it("returns an array of length 1 when count is 1", () => {
      const usernames = generateUsernames(1);
      expect(usernames).toHaveLength(1);
      expect(usernames[0]).toMatch(/^[A-Z][a-z]+_[A-Z][a-z]+_[0-9]{4}$/);
    });

    it("produces no duplicates within a batch", () => {
      const usernames = generateUsernames(20);
      const uniqueCount = new Set(usernames).size;
      expect(uniqueCount).toBe(usernames.length);
    });

    it("produces all-unique results in a large batch (stress dedup)", () => {
      // Verifies the Set-based dedup contract holds at scale.
      const COUNT = 500;
      for (let run = 0; run < 3; run++) {
        const usernames = generateUsernames(COUNT);
        expect(usernames).toHaveLength(COUNT);

        const uniqueSet = new Set(usernames);
        expect(uniqueSet.size).toBe(COUNT);

        // Every item matches the contract format and uses defined vocabulary.
        for (const u of usernames) {
          expect(u).toMatch(/^[A-Z][a-z]+_[A-Z][a-z]+_[0-9]{4}$/);
          const [adj, noun] = u.split("_");
          expect(USERNAME_ADJECTIVES).toContain(adj.toLowerCase());
          expect(USERNAME_NOUNS).toContain(noun.toLowerCase());
        }
      }
    });

    it("returns fewer items than requested when maxAttempts is exhausted", () => {
      // Verifies observable contract: generator returns whatever unique
      // usernames were found within the attempt budget, without throwing.
      const lowMaxAttempts = 10;
      const result = generateUsernames(100, lowMaxAttempts);
      expect(result.length).toBeLessThanOrEqual(100);
      expect(result.length).toBeGreaterThan(0);

      // Even truncated results must be unique and well-formed.
      const uniqueSet = new Set(result);
      expect(uniqueSet.size).toBe(result.length);
      for (const u of result) {
        expect(u).toMatch(/^[A-Z][a-z]+_[A-Z][a-z]+_[0-9]{4}$/);
      }
    });

    it("throws when maxAttempts is zero — exhaustion guard fires immediately", () => {
      // The while-loop condition (attempts < effectiveMax) short-circuits when
      // effectiveMax ≤ 0, so no username is generated and the exhaustion guard
      // throws. Verifies this is an observable Error, not a silent empty array.
      expect(() => generateUsernames(5, 0)).toThrow(Error);
    });

    it("throws when maxAttempts is negative — clamped effectiveMax cannot enter loop", () => {
      // Math.min(-100, ceiling) → -100; the loop guard (attempts < -100) is
      // immediately false. The exhaustion Error must still fire.
      expect(() => generateUsernames(5, -100)).toThrow(Error);
    });

    it("never returns malformed usernames under repeated generation", () => {
      // Regression test: ensures capitalize + join contract survives
      // high-volume generation without format drift.
      const SAMPLES = 1000;
      for (let i = 0; i < SAMPLES; i++) {
        const username = generateUsername();
        expect(username).toMatch(/^[A-Z][a-z]+_[A-Z][a-z]+_[0-9]{4}$/);
      }
    });
  });

  it("matches the pattern [A-Z][a-z]+_[A-Z][a-z]+_[0-9]+", () => {
    for (let i = 0; i < 50; i++) {
      const username = generateUsername();
      expect(username).toMatch(/^[A-Z][a-z]+_[A-Z][a-z]+_[0-9]{4}$/);
    }
  });

  it("generates the requested number of usernames", () => {
    const usernames = generateUsernames(5);
    expect(usernames).toHaveLength(5);
    usernames.forEach(username => {
      expect(username).toMatch(/^[A-Z][a-z]+_[A-Z][a-z]+_[0-9]{4}$/);
    });
  });

  it("generates different usernames on successive calls", () => {
    const usernames = new Set(Array.from({ length: 50 }, () => generateUsername()));
    expect(usernames.size).toBeGreaterThan(1);
  });

  it("generates four-digit numbers in the range 1000–9999", () => {
    for (let i = 0; i < 50; i++) {
      const username = generateUsername();
      const numPart = username.split("_")[2];
      expect(numPart).toMatch(/^[0-9]{4}$/);
      const num = Number(numPart);
      expect(num).toBeGreaterThanOrEqual(1000);
      expect(num).toBeLessThanOrEqual(9999);
    }
  });

  it("only emits adjectives and nouns from their defined lists", () => {
    // Source-defined vocabulary — must stay in sync with generator output.
    for (let i = 0; i < 100; i++) {
      const username = generateUsername();
      const [adj, noun] = username.split("_");
      expect(USERNAME_ADJECTIVES).toContain(adj.toLowerCase());
      expect(USERNAME_NOUNS).toContain(noun.toLowerCase());
    }
  });

  it("distributes adjective and noun selection roughly uniformly", () => {
    // Verifies the RNG selects each vocabulary item with approximately equal probability.
    // Catches subtle bias that format-only tests miss.
    const SAMPLES = 5000;
    const adjCounts = new Map<string, number>();
    const nounCounts = new Map<string, number>();

    for (let i = 0; i < SAMPLES; i++) {
      const [adj, noun] = generateUsername().split("_");
      adjCounts.set(adj, (adjCounts.get(adj) ?? 0) + 1);
      nounCounts.set(noun, (nounCounts.get(noun) ?? 0) + 1);
    }

    // Every item must appear at least once in N samples.
    expect([...adjCounts.values()].every(c => c >= 1)).toBe(true);
    expect([...nounCounts.values()].every(c => c >= 1)).toBe(true);

    // Max count should not exceed 4× the min count (catches gross bias).
    const adjMin = Math.min(...adjCounts.values());
    const adjMax = Math.max(...adjCounts.values());
    const nounMin = Math.min(...nounCounts.values());
    const nounMax = Math.max(...nounCounts.values());

    expect(adjMax / adjMin).toBeLessThanOrEqual(4);
    expect(nounMax / nounMin).toBeLessThanOrEqual(4);
  });

  it("distributes the numeric suffix roughly uniformly across 1000–9999", () => {
    // Verifies randomFourDigitNumber() produces values without positional bias.
    // Complements the adjective/noun uniformity test above.
    const SAMPLES = 5000;
    const BUCKETS = 10;
    const bucketSize = Math.floor(9000 / BUCKETS); // 900
    const buckets = Array(BUCKETS).fill(0);

    for (let i = 0; i < SAMPLES; i++) {
      const numPart = generateUsername().split("_")[2];
      const bucket = Math.floor((Number(numPart) - 1000) / bucketSize);
      buckets[bucket]++;
    }

    // Each of the 10 buckets should contain roughly SAMPLES/BUCKETS values.
    // Allow up to 3× deviation from expected to account for statistical variance.
    const expected = SAMPLES / BUCKETS;
    const observedMax = Math.max(...buckets);
    const observedMin = Math.min(...buckets);

    expect(observedMax).toBeLessThanOrEqual(expected * 2.5);
    expect(observedMin).toBeGreaterThanOrEqual(expected * 0.5);
  });
});
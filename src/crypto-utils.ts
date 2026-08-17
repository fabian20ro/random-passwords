export const UINT32_MODULUS = 0x1_0000_0000;

/** Maximum rejection-sampling iterations before aborting. */
const MAX_ATTEMPTS = 256;

/**
 * Generates a random integer in the range [min, max) using rejection sampling
 * to avoid modulo bias.
 * 
 * @param max The upper bound (exclusive). Must be between 1 and UINT32_MODULUS.
 * @param min The lower bound (inclusive). Defaults to 0. Must be >= 0.
 * @returns A random integer in [min, max).
 */
export function getSecureRandomInt(max: number, min: number = 0): number {
  if (!Number.isInteger(max) || max <= 0 || max > UINT32_MODULUS) {
    throw new Error("Max must be between 1 and UINT32_MODULUS");
  }

  if (min < 0 || !Number.isInteger(min)) {
    throw new Error("Min must be a non-negative integer");
  }

  if (min >= max) {
    throw new Error("Min must be less than max");
  }

  const crypto = globalThis.crypto?.getRandomValues;
  if (typeof crypto !== "function") {
    throw new Error("Crypto API unavailable — cannot generate secure random values");
  }

  const range = max - min;
  // Rejection-sampling threshold: reject samples in the top (UINT32_MODULUS % range) uint32 values to avoid modulo bias.
  const threshold = UINT32_MODULUS - (UINT32_MODULUS % range);

  const getRandomValues = crypto.bind(globalThis.crypto!);
  for (let attempts = 0; attempts < MAX_ATTEMPTS; attempts++) {
    const buf = new Uint32Array(1);
    getRandomValues(buf);
    if (buf[0] < threshold) return min + (buf[0] % range);
  }

  throw new Error("Rejection sampling exhausted after " + MAX_ATTEMPTS + " attempts");
}

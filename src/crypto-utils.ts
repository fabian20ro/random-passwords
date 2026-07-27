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

  if (!Number.isInteger(min) || min < 0) {
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
  const threshold = UINT32_MODULUS - (UINT32_MODULUS % range);

  let buf: Uint32Array<ArrayBuffer>;
  const getRandomValues = crypto.bind(globalThis.crypto!);
  let attempts = 0;
  do {
    buf = new Uint32Array(1);
    getRandomValues(buf);
  } while (++attempts < MAX_ATTEMPTS && buf[0] >= threshold);

  if (buf[0] >= threshold) {
    throw new Error("Rejection sampling exhausted after " + MAX_ATTEMPTS + " attempts");
  }

  return min + (buf[0] % range);
}

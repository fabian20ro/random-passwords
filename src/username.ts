import { getSecureRandomInt } from "./crypto-utils";

export const USERNAME_ADJECTIVES: readonly string[] = [
  "agile", "brave", "calm", "clever", "curious",
  "eager", "fierce", "gentle", "happy", "jolly",
  "kind", "lively", "mighty", "nimble", "playful",
  "proud", "quick", "sly", "swift", "wild",
  "ancient", "awesome", "bright", "bouncy", "chill",
  "mystic", "radiant", "silent", "vibrant", "zen", "astral", "cosmic", "lunar", "solar", "stellar",
  "legendary", "epic", "zenith",
];

export const USERNAME_NOUNS: readonly string[] = [
  "antelope", "badger", "beaver", "buffalo", "cougar",
  "dolphin", "eagle", "falcon", "fox", "jaguar",
  "lemur", "lynx", "otter", "panther", "rabbit",
  "raven", "tiger", "walrus", "wolf", "zebra",
  "arctic", "atlas", "blaze", "breeze", "chaos",
  "nebula", "quasar", "pulsar", "comet", "meteor", "galaxy", "asteroid", "supernova", "planet", "star",
  "dragon", "phoenix", "kraken",
] as const;

/**
 * Capitalizes the first character of a string.
 * Returns the input unchanged for empty or falsy strings.
 */
function capitalize(s: string): string {
  if (!s) return s;
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function generateUsername(includeNumber: boolean = true, lowercase: boolean = false): string {
  const adjRaw = USERNAME_ADJECTIVES[getSecureRandomInt(USERNAME_ADJECTIVES.length)];
  const nounRaw = USERNAME_NOUNS[getSecureRandomInt(USERNAME_NOUNS.length)];
  const number = randomFourDigitNumber();
  const adj = lowercase ? adjRaw : capitalize(adjRaw);
  const noun = lowercase ? nounRaw : capitalize(nounRaw);
  return includeNumber ? `${adj}_${noun}_${number}` : `${adj}_${noun}`;
}

export { capitalize };

export function randomFourDigitNumber(): number {
  const range = 9000;
  return getSecureRandomInt(range) + 1000;
}

const MAX_USERNAME_COUNT = 1024;

/**
 * Validates and clamps maxAttempts to the allowed range.
 * Throws RangeError for invalid values, returns bounded integer otherwise.
 */
function validateAndClampMaxAttempts(maxAttempts: number | undefined): number {
  if (maxAttempts === undefined) return Infinity;

  if (!Number.isInteger(maxAttempts) || maxAttempts <= 0) {
    throw new RangeError(`Invalid maxAttempts: ${maxAttempts}. Must be a positive integer.`);
  }

  return Math.min(maxAttempts, MAX_USERNAME_COUNT * 64);
}

export function generateUsernames(count: number, maxAttempts?: number, includeNumber?: boolean): string[] {
  // Validate inputs upfront — non-positive or non-integer maxAttempts is a programmer error.
  if (!Number.isInteger(count) || count < 0 || count > MAX_USERNAME_COUNT) {
    throw new RangeError(`Invalid username count: ${count}. Must be between 0 and ${MAX_USERNAME_COUNT}.`);
  }
  const effectiveMax = validateAndClampMaxAttempts(maxAttempts);
  // Zero-count fast path — avoid unnecessary allocation of Set/Array.
  if (count === 0) return [];
  const seen = new Set<string>();
  const result: string[] = [];
  let attempts = 0;
  while (result.length < count && attempts < effectiveMax) {
    const username = generateUsername(includeNumber);
    if (!seen.has(username)) {
      seen.add(username);
      result.push(username);
    }
    attempts++;
  }
  // Observable failure: exhaustion with zero results is a real bug, not an empty array.
  if (result.length === 0) {
    throw new Error(`Exhausted ${effectiveMax} attempts without generating any unique username.`);
  }
  return result;
}

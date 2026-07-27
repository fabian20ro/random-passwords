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

export function generateUsername(includeNumber: boolean = true): string {
  const parts = [capitalize(USERNAME_ADJECTIVES[getSecureRandomInt(USERNAME_ADJECTIVES.length)]), capitalize(USERNAME_NOUNS[getSecureRandomInt(USERNAME_NOUNS.length)])];
  if (includeNumber) {
    parts.push(randomFourDigitNumber().toString());
  }
  return parts.join("_");
}

export { capitalize };

export function randomFourDigitNumber(): number {
  const range = 9000;
  return getSecureRandomInt(range) + 1000;
}

const MAX_USERNAME_COUNT = 1024;

export function generateUsernames(count: number, maxAttempts = MAX_USERNAME_COUNT * 16): string[] {
  if (!Number.isInteger(count) || count < 0 || count > MAX_USERNAME_COUNT) {
    throw new RangeError(`Invalid username count: ${count}. Must be between 0 and ${MAX_USERNAME_COUNT}.`);
  }
  if (!Number.isInteger(maxAttempts) || maxAttempts <= 0) {
    throw new RangeError(`Invalid maxAttempts: ${maxAttempts}. Must be a positive integer.`);
  }
  // Zero-count fast path — avoid unnecessary allocation of Set/Array.
  if (count === 0) return [];
  // Clamp maxAttempts to a sane ceiling so pathological input can't spawn
  // a loop that exhausts memory before producing any results.
  const effectiveMax = Math.min(maxAttempts, MAX_USERNAME_COUNT * 64);
  const seen = new Set<string>();
  const result: string[] = [];
  let attempts = 0;
  while (result.length < count && attempts < effectiveMax) {
    const username = generateUsername();
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

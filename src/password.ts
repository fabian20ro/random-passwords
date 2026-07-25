// Licensed under the MIT License.
import { getSecureRandomInt } from "./crypto-utils";

export const CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
export const SYMBOLS = "!@#$%^&*()-_=+[]{}|;:,.<>?";
export const DEFAULT_LENGTH = 24;
export const CHARSET_LEN = CHARS.length;

export const LENGTHS = [23, 24, 25, 26, 27, 28, 29, 30, 31, 32] as const;

export const MAX_LENGTH = 65536;

const AMBIGUOUS_CHARS = new Set(["0", "O", "l", "I", "1"]);

/**
 * Filters out visually ambiguous characters from a charset to prevent
 * transcription errors when copying passwords manually.
 * Excludes: 0/O, l/I/l, 1
 */
function filterAmbiguousCharset(charset: string): string {
  return [...charset].filter(c => !AMBIGUOUS_CHARS.has(c)).join('');
}

/** Pre-computed ambiguity-free alphanumeric charset — constant at module load. */
const AMBIGUITY_FREE_CHARSET = filterAmbiguousCharset(CHARS);

/**
 * Generates a cryptographically secure random password with no visually ambiguous characters.
 * Useful for manual copy-paste use cases where chars like '0'/'O', 'l'/'I', '1' are hard to distinguish.
 *
 * @param length The desired length of the password.
 * @returns The generated password string, or empty string if charset is exhausted.
 */
export function generatePasswordAmbiguityFree(length: number): string {
  if (AMBIGUITY_FREE_CHARSET.length === 0) return "";
  return generatePasswordWithCharset(length, AMBIGUITY_FREE_CHARSET);
}

/**
 * Generates a cryptographically secure random password.
 * Uses rejection sampling to prevent modulo bias when mapping the 32-bit
 * random value to the character set.
 * 
 * @param length The desired length of the password.
 * @returns The generated password string.
 */
export function generatePassword(length: number = 24): string {
  return generatePasswordWithCharset(length, CHARS);
}

const ALL_CHARSET = CHARS + SYMBOLS;
const LETTERS_ONLY_CHARSET = CHARS.substring(0, 52);
const NUMBERS_ONLY_CHARSET = CHARS.substring(52);

/**
 * Generates a cryptographically secure random password including symbols.
 * 
 * @param length The desired length of the password.
 * @returns The generated password string.
 */
export function generatePasswordWithSymbols(length: number): string {
  return generatePasswordWithCharset(length, ALL_CHARSET);
}

/**
 * Generates a cryptographically secure random password using only letters.
 * 
 * @param length The desired length of the password.
 * @returns The generated password string.
 */
export function generatePasswordWithLettersOnly(length: number): string {
  return generatePasswordWithCharset(length, LETTERS_ONLY_CHARSET);
}

/**
 * Generates a cryptographically unique random password using only numbers.
 * 
 * @param length: The desired length of the password.
 * @returns The generated password string.
 */
export function generatePasswordWithNumbersOnly(length: number): string {
  return generatePasswordWithCharset(length, NUMBERS_ONLY_CHARSET);
}

/**
 * Generates a cryptographically secure random password using a specific charset.
 * Uses rejection sampling to prevent modulo bias when mapping the 32-bit
 * random value to the character set.
 * 
 * @param length: The desired length of the password.
 * @param charset: The character set to use.
 * @returns The generated password string.
 */
export function generatePasswordWithCharset(length: number, charset: string): string {
  if (!Number.isInteger(length) || length <= 0 || !charset) return "";
  if (length > MAX_LENGTH) throw new Error(`Length exceeds maximum allowed: ${MAX_LENGTH}`);
  const chars = Array.from(new Set(charset));
  if (chars.length === 0) return "";
  const charsetLen = chars.length;
  const passwordArray = new Array(length);
  for (let i = 0; i < length; i++) {
    passwordArray[i] = chars[getSecureRandomInt(charsetLen)];
  }
  return passwordArray.join('');
}

/** Character classes used to classify password characters. */
export const CHAR_CLASS_UPPER = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
export const CHAR_CLASS_LOWER = "abcdefghijklmnopqrstuvwxyz";
export const CHAR_CLASS_DIGIT = "0123456789";

const MAX_DIVERSITY_RETRIES = 20;

/** Precomputed class Sets — allocated once at module load, reused per call. */
const CLASS_SETS = [new Set(CHAR_CLASS_UPPER), new Set(CHAR_CLASS_LOWER), new Set(CHAR_CLASS_DIGIT)];

function countDistinctClasses(pw: string): number {
  const seen = [false, false, false];
  for (let i = 0; i < pw.length; i++) {
    if (!seen[0] && CLASS_SETS[0].has(pw[i])) seen[0] = true;
    else if (!seen[1] && CLASS_SETS[1].has(pw[i])) seen[1] = true;
    else if (!seen[2] && CLASS_SETS[2].has(pw[i])) seen[2] = true;
  }
  return (seen[0] ? 1 : 0) + (seen[1] ? 1 : 0) + (seen[2] ? 1 : 0);
}

/** Options for `generateAll`. */
export interface GenerateAllOptions {
  /** Minimum number of distinct character classes (upper, lower, digit) each password must contain. Defaults to 2. */
  minClassesPerPassword?: number;
  /** Maximum retry attempts when a generated password fails the class-diversity check. Default: 20. */
  maxRetries?: number;
  /** When true, use characters excluding visually ambiguous ones (0/O/l/I/1). Defaults to false. */
  ambiguityFree?: boolean;
}

/**
 * Injects missing character classes into a password by replacing random positions
 * with characters from the required classes, guaranteeing diversity at fallback time.
 * Tracks "index:classIndex" slots to prevent cross-class overwrite of already-injected positions.
 */
function injectMissingClasses(length: number, minClasses: number): string {
  const chars = Array.from(generatePassword(length));
  const neededSets = CLASS_SETS.slice(0, minClasses).filter(set => {
    let hasChar = false;
    for (const c of chars) if (set.has(c)) { hasChar = true; break; }
    return !hasChar;
  });
  const usedSlots = new Set<string>();
  for (let i = 0; i < neededSets.length && i < length; i++) {
    const set = neededSets[i];
    let replacementIdx: number;
    do {
      replacementIdx = getSecureRandomInt(length);
    } while (usedSlots.has(`${replacementIdx}:${i}`));
    usedSlots.add(`${replacementIdx}:${i}`);
    chars[replacementIdx] = [...set][getSecureRandomInt(set.size)];
  }
  return chars.join('');
}

/**
 * Generates a password for each defined length in LENGTHS.
 * Optionally produces multiple copies per slot for copy-paste convenience,
 * and enforces character-class diversity per password.
 *
 * @param count How many passwords to generate per length slot (default: 1).
 * @param options Optional diversity constraints applied to each generated password.
 */
export function generateAll(count: number = 1, options?: GenerateAllOptions): string[] {
  if (!Number.isInteger(count) || count <= 0) return [];

  const minClasses = Math.min(3, Math.max(0, options?.minClassesPerPassword ?? 2));
  const maxRetries = options?.maxRetries ?? MAX_DIVERSITY_RETRIES;

  function generateDiverse(length: number): string {
    const generator = options?.ambiguityFree ? generatePasswordAmbiguityFree : generatePassword;
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      const pw = generator(length);
      if (countDistinctClasses(pw) >= minClasses) return pw;
    }
    // Fallback: guarantee diversity by injecting missing-class characters.
    return injectMissingClasses(length, minClasses);
  }

  const result: string[] = [];
  for (const len of LENGTHS) {
    for (let i = 0; i < count; i++) {
      result.push(generateDiverse(len));
    }
  }
  return result;
}

/**
 * Checks if a password only contains characters from the provided charset.
 * 
 * @param pw: The password to validate.
 * @param charset: The allowed character set.
 * @returns True if all characters in pw are in charset, false otherwise.
 */
export function isValidPassword(pw: string, charset: string): boolean {
  if (pw.length === 0) return false;
  const charSet = new Set(charset);
  for (const char of pw) {
    if (!charSet.has(char)) return false;
  }
  return true;
}

/**
 * Generates a cryptographically secure random password that contains at least 
 * one character from each provided category.
 * 
 * @param length: The desired length of the password.
 * @param categories: An array of character sets (e.g., ['ABC', '123']).
 * @returns The generated password string.
 */
export function generateComplexPassword(length: number, categories: string[][]): string {
  if (!Number.isInteger(length) || length < categories.length || categories.length === 0 || categories.some(c => c.join('').length === 0)) return "";
  if (length > MAX_LENGTH) throw new Error(`Length exceeds maximum allowed: ${MAX_LENGTH}`);

  const charSets = categories.map(c => [...c.join('')]);
  const allChars = [...new Set(charSets.flat())];
  if (allChars.length === 0) return "";

  // 1. Pick one from each category
  const passwordChars: string[] = [];
  for (const category of charSets) {
    passwordChars.push(category[getSecureRandomInt(category.length)]);
  }

  // 2. Fill the rest
  const remainingLength = length - categories.length;
  const extraChars = Array.from({ length: remainingLength }, () => {
    const idx = getSecureRandomInt(allChars.length);
    return allChars[idx];
  });

  // 3. Shuffle the password
  const finalChars = [...passwordChars, ...extraChars];
  for (let i = finalChars.length - 1; i > 0; i--) {
    const j = getSecureRandomInt(i + 1);
    [finalChars[i], finalChars[j]] = [finalChars[j], finalChars[i]];
  }

  return finalChars.join('');
}
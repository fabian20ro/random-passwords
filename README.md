# Random Passwords

[![Deploy to GitHub Pages](https://github.com/fabian20ro/random-passwords/actions/workflows/deploy.yml/badge.svg)](https://github.com/fabian20ro/random-passwords/actions/workflows/deploy.yml)

**[Live Site](https://fabian20ro.github.io/random-passwords/)**

Simple password generator that creates 10 cryptographically secure alphanumeric passwords (23–32 characters).

Uses the [Web Crypto API](https://developer.mozilla.org/en-US/docs/Web/API/Crypto/getRandomValues) (`crypto.getRandomValues()`) — the browser's built-in CSPRNG, equivalent to Java's `SecureRandom`.
Password characters are sampled with rejection sampling to avoid modulo bias.

## Usage

### Basic usage (alphanumeric)
```typescript
import { generatePassword } from './src/password';
const pw = generatePassword(24); 
// "aB3dE..." (24 chars long)
```

### With symbols
```typescript
import { generatePasswordWithSymbols } from './src/password';
const pw = generatePasswordWithSymbols(32);
// "p@ssw0rd!_..." (32 chars long, including symbols)
```

### With letters only
```typescript
import { generatePasswordWithLettersOnly } from './src/password';
const pw = generatePasswordWithLettersOnly(24);
// "aB3dE..." (24 chars long, letters only)
```

### Complex passwords (custom character sets)
```typescript
import { generateComplexPassword } from './src/password';
const pw = generateComplexPassword(16, [
  ['a', 'B', '1'],
  ['!', '$', '9']
]);
// Mixed letters, numbers, and symbols
```

### Usernames
```typescript
import { generateUsername } from './src/username';
const name = generateUsername();
// "adjective_noun_1234"
```

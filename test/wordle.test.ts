import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import { matchGuess } from '../src/wordle';

// Recitation Part 1: follow along with your TA, filling in the todos below.
// Problem set Task 1: keep adding properties until `npm run mutants:wordle`
// kills every mutant. Read the spec in src/wordle/matchGuess.ts.
//
// Label every property with its pattern, on the line above its `it(`:
//   // Pattern: invariant. The result always has exactly five colors.
// (invariant, algebraic, metamorphic, differential, or conditional)

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

// Step 1: a generator for five-letter uppercase words.
const wordFrom = (letters: string) =>
  fc.array(fc.constantFrom(...letters), { minLength: 5, maxLength: 5 }).map(cs => cs.join(''));

// A small alphabet makes repeated letters (and shared letters between secret
// and guess) common, which exposes counting bugs. The full alphabet makes
// letters that are absent from the secret common, which a small alphabet
// would hide. Mix both so every property sees both kinds of input.
const word = fc.oneof(wordFrom(ALPHABET), wordFrom('ABC'), wordFrom('AB'));

// Small helper oracle: how many times does `letter` appear in `w`?
const count = (w: string, letter: string) => [...w].filter(c => c === letter).length;

// Targeted generator: a secret and a guess that is a rearrangement of it.
const secretAndAnagram = wordFrom(ALPHABET).chain(secret =>
  fc
    .shuffledSubarray([...secret], { minLength: 5, maxLength: 5 })
    .map(cs => [secret, cs.join('')] as const),
);

describe('matchGuess', () => {
  // Pattern: invariant. The result always has exactly five colors.
  it('returns exactly five colors', () => {
    fc.assert(
      fc.property(word, word, (secret, guess) => {
        expect(matchGuess(secret, guess)).toHaveLength(5);
      }),
    );
  });

  // Pattern: invariant. The result only uses the colors G, Y, B.
  it('only uses the colors G, Y, B', () => {
    fc.assert(
      fc.property(word, word, (secret, guess) => {
        for (const c of matchGuess(secret, guess)) expect(['G', 'Y', 'B']).toContain(c);
      }),
    );
  });

  // Pattern: invariant. A position is green exactly when the guess and secret letters match there.
  it('greens are exactly the positions where the letters match', () => {
    fc.assert(
      fc.property(word, word, (secret, guess) => {
        const result = matchGuess(secret, guess);
        for (let i = 0; i < 5; i++) {
          expect(result[i] === 'G').toBe(guess[i] === secret[i]);
        }
      }),
    );
  });

  // Pattern: invariant. No letter is credited (G or Y) more times than the secret contains it.
  it('never credits a letter more times than the secret contains it', () => {
    fc.assert(
      fc.property(word, word, (secret, guess) => {
        const result = matchGuess(secret, guess);
        for (const letter of new Set(guess)) {
          const credited = [...guess].filter((c, i) => c === letter && result[i] !== 'B').length;
          expect(credited).toBeLessThanOrEqual(count(secret, letter));
        }
      }),
    );
  });

  // Pattern: invariant. Each letter is credited (G or Y) exactly min(times in guess, times in secret) times.
  it('credits each letter exactly as often as both words share it', () => {
    fc.assert(
      fc.property(word, word, (secret, guess) => {
        const result = matchGuess(secret, guess);
        for (const letter of new Set(guess)) {
          const credited = [...guess].filter((c, i) => c === letter && result[i] !== 'B').length;
          expect(credited).toBe(Math.min(count(guess, letter), count(secret, letter)));
        }
      }),
    );
  });

  // Pattern: conditional. If the guess is the secret, every color is green.
  it('guessing the secret gives all greens', () => {
    fc.assert(
      fc.property(word, w => {
        expect(matchGuess(w, w)).toEqual(['G', 'G', 'G', 'G', 'G']);
      }),
    );
  });

  // Pattern: conditional. If the guess is a rearrangement of the secret, no position is black.
  it('a rearrangement of the secret has no blacks', () => {
    fc.assert(
      fc.property(secretAndAnagram, ([secret, guess]) => {
        expect(matchGuess(secret, guess)).not.toContain('B');
      }),
    );
  });

  // Pattern: metamorphic. Swapping secret and guess doesn't move the greens or change how many letters are credited.
  it('swapping secret and guess does not move greens or change letter credits', () => {
    fc.assert(
      fc.property(word, word, (secret, guess) => {
        const forward = matchGuess(secret, guess);
        const backward = matchGuess(guess, secret);
        expect(backward.map(c => c === 'G')).toEqual(forward.map(c => c === 'G'));
        expect(count(backward.join(''), 'B')).toBe(count(forward.join(''), 'B'));
      }),
    );
  });
});
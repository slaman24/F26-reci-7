import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import { mergeIntervals, type Interval } from '../src/intervals';

// Recitation Part 2 (groups) and problem set Task 2.
// Read the spec in src/intervals/mergeIntervals.ts, then check your progress
// with `npm run mutants:intervals`.
//
// Label every property with its pattern, on the line above its `it(`:
//   // Pattern: invariant. The output is sorted.
// (invariant, algebraic, metamorphic, differential, or conditional)

// Generate a start and a non-negative length so start <= end always holds.
// Small ranges make overlapping and touching intervals common.
const interval: fc.Arbitrary<Interval> = fc
  .tuple(fc.integer({ min: -20, max: 20 }), fc.nat({ max: 10 }))
  .map(([start, len]) => [start, start + len]);
const intervalList = fc.array(interval);

// Targeted generator: intervals that neither overlap nor touch, in shuffled
// order. Each interval starts at least 1 after the previous one ends, so
// gaps like [1, 2] and [3, 4] (which must stay separate) come up often.
const disjointList: fc.Arbitrary<Interval[]> = fc
  .tuple(
    fc.integer({ min: -20, max: 20 }),
    fc.array(fc.tuple(fc.integer({ min: 1, max: 3 }), fc.nat({ max: 5 }))),
  )
  .map(([first, gapsAndLengths]) => {
    const result: Interval[] = [];
    let next = first;
    for (const [gap, len] of gapsAndLengths) {
      result.push([next, next + len]);
      next = next + len + gap;
    }
    return result;
  })
  .chain(xs => fc.shuffledSubarray(xs, { minLength: xs.length, maxLength: xs.length }));

// Helper oracle: is point p covered by some interval in the list?
const covers = (xs: readonly Interval[], p: number) => xs.some(([s, e]) => s <= p && p <= e);

// Points to check: every integer and every half-integer in the generator's
// range. Half-integers catch gaps like 2 < x < 3 between [1, 2] and [3, 4].
const points: number[] = [];
for (let p = -22; p <= 32; p += 0.5) points.push(p);

describe('mergeIntervals', () => {
  // Pattern: invariant. Every input interval lies inside some output interval.
  it('every input interval lies inside some output interval', () => {
    fc.assert(
      fc.property(intervalList, xs => {
        const out = mergeIntervals(xs);
        const uncovered = xs.filter(([s, e]) => !out.some(([a, b]) => a <= s && e <= b));
        expect(uncovered).toEqual([]);
      }),
    );
  });

  // Pattern: invariant. The output is sorted.
  it('the output is sorted', () => {
    fc.assert(
      fc.property(intervalList, xs => {
        const out = mergeIntervals(xs);
        for (let i = 0; i < out.length - 1; i++) {
          expect(out[i][0]).toBeLessThanOrEqual(out[i + 1][0]);
        }
      }),
    );
  });

  // Pattern: invariant. The output has no overlapping or touching intervals.
  it('the output has no overlapping or touching intervals', () => {
    fc.assert(
      fc.property(intervalList, xs => {
        const out = mergeIntervals(xs);
        for (let i = 0; i < out.length - 1; i++) {
          expect(out[i][1]).toBeLessThan(out[i + 1][0]);
        }
      }),
    );
  });

  // Pattern: invariant. The input array and its intervals are not modified.
  it('does not modify the input', () => {
    fc.assert(
      fc.property(intervalList, xs => {
        const copy = structuredClone(xs);
        mergeIntervals(xs);
        expect(xs).toEqual(copy);
      }),
    );
  });

  // Pattern: differential. A point is covered by the output exactly when it is covered by the input.
  it('covers exactly the same points as the input', () => {
    fc.assert(
      fc.property(intervalList, xs => {
        const out = mergeIntervals(xs);
        for (const p of points) {
          expect(covers(out, p), `point ${p}`).toBe(covers(xs, p));
        }
      }),
    );
  });

  // Pattern: algebraic. Merging is idempotent: merging the output again gives the same output.
  it('merging the output again gives the same output', () => {
    fc.assert(
      fc.property(intervalList, xs => {
        const out = mergeIntervals(xs);
        expect(mergeIntervals(out)).toEqual(out);
      }),
    );
  });

  // Pattern: metamorphic. Shuffling the input does not change the output.
  it('shuffling the input does not change the output', () => {
    fc.assert(
      fc.property(
        intervalList.chain(xs =>
          fc
            .shuffledSubarray(xs, { minLength: xs.length, maxLength: xs.length })
            .map(shuffled => [xs, shuffled] as const),
        ),
        ([xs, shuffled]) => {
          expect(mergeIntervals(shuffled)).toEqual(mergeIntervals(xs));
        },
      ),
    );
  });

  // Pattern: metamorphic. Adding an interval that the output already covers does not change the output.
  it('adding an already-covered interval does not change the output', () => {
    fc.assert(
      fc.property(intervalList, fc.nat(), fc.nat(), fc.nat(), (xs, i, a, b) => {
        const out = mergeIntervals(xs);
        if (out.length === 0) return;
        // Build a sub-interval [lo, hi] of one output interval, valid by construction.
        const [s, e] = out[i % out.length];
        const lo = s + (a % (e - s + 1));
        const hi = lo + (b % (e - lo + 1));
        expect(mergeIntervals([...xs, [lo, hi]])).toEqual(out);
      }),
    );
  });

  // Pattern: conditional. If no two input intervals overlap or touch, the output is the input sorted by start.
  it('already-disjoint input comes back sorted and otherwise unchanged', () => {
    fc.assert(
      fc.property(disjointList, xs => {
        const sorted = [...xs].sort((a, b) => a[0] - b[0]);
        expect(mergeIntervals(xs)).toEqual(sorted);
      }),
    );
  });
});
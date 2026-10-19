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

  // Add your properties here. Aim for at least one of each pattern:
  // invariant, algebraic, metamorphic, differential, conditional.

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

  // Pattern: metamorphic. Merging the output with itself gives the same output.
  it('merging the output with itself gives the same output', () => {
    fc.assert(
      fc.property(intervalList, xs => {
        const out = mergeIntervals(xs);
        const out2 = mergeIntervals(out);
        expect(out2).toEqual(out);
      }),
    );
  });

  // Pattern: differential. Merging the output with a new interval that is already covered by the output gives the same output.
  it('merging the output with a covered interval gives the same output', () => {
    fc.assert(
      fc.property(intervalList, xs => {
        const out = mergeIntervals(xs);
        if (out.length === 0) return;
        const [s, e] = out[fc.integer({ min: 0, max: out.length - 1 })];
        const newInterval: Interval = [s + 1, e - 1];
        const out2 = mergeIntervals([...out, newInterval]);
        expect(out2).toEqual(out);
      }),
    );
  });
});
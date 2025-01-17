/*
mini.test.mjs - <short description TODO>
Copyright (C) 2022 Strudel contributors - see <https://github.com/tidalcycles/strudel/blob/main/packages/mini/test/mini.test.mjs>
This program is free software: you can redistribute it and/or modify it under the terms of the GNU Affero General Public License as published by the Free Software Foundation, either version 3 of the License, or (at your option) any later version. This program is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU Affero General Public License for more details. You should have received a copy of the GNU Affero General Public License along with this program.  If not, see <https://www.gnu.org/licenses/>.
*/

import { strict as assert } from 'assert';
import { mini } from '../mini.mjs';

describe('mini', () => {
  const minV = (v) => mini(v)._firstCycleValues;
  const minS = (v) => mini(v)._showFirstCycle;
  it('supports single elements', () => {
    assert.deepStrictEqual(minV('a'), ['a']);
  });
  it('supports rest', () => {
    assert.deepStrictEqual(minV('~'), []);
  });
  it('supports cat', () => {
    assert.deepStrictEqual(minS('a b'), ['a: 0 - 1/2', 'b: 1/2 - 1']);
    assert.deepStrictEqual(minS('a b c'), ['a: 0 - 1/3', 'b: 1/3 - 2/3', 'c: 2/3 - 1']);
  });
  it('supports slowcat', () => {
    assert.deepStrictEqual(minV('<a b>'), ['a']);
  });
  it('supports division', () => {
    assert.deepStrictEqual(minS('a/2'), ['a: 0 - 2']);
    assert.deepStrictEqual(minS('[c3 d3]/2'), ['c3: 0 - 1']);
  });
  it('supports multiplication', () => {
    assert.deepStrictEqual(minS('c3*2'), ['c3: 0 - 1/2', 'c3: 1/2 - 1']);
    assert.deepStrictEqual(minV('[c3 d3]*2'), ['c3', 'd3', 'c3', 'd3']);
  });
  it('supports brackets', () => {
    assert.deepStrictEqual(minS('c3 [d3 e3]'), ['c3: 0 - 1/2', 'd3: 1/2 - 3/4', 'e3: 3/4 - 1']);
    assert.deepStrictEqual(minS('c3 [d3 [e3 f3]]'), ['c3: 0 - 1/2', 'd3: 1/2 - 3/4', 'e3: 3/4 - 7/8', 'f3: 7/8 - 1']);
  });
  it('supports commas', () => {
    assert.deepStrictEqual(minS('c3,e3,g3'), ['c3: 0 - 1', 'e3: 0 - 1', 'g3: 0 - 1']);
    assert.deepStrictEqual(minS('[c3,e3,g3] f3'), ['c3: 0 - 1/2', 'e3: 0 - 1/2', 'g3: 0 - 1/2', 'f3: 1/2 - 1']);
  });
  it('supports elongation', () => {
    assert.deepStrictEqual(minS('a@3 b'), ['a: 0 - 3/4', 'b: 3/4 - 1']);
    assert.deepStrictEqual(minS('a@2 b@3'), ['a: 0 - 2/5', 'b: 2/5 - 1']);
  });
  it('supports replication', () => {
    assert.deepStrictEqual(minS('a!3 b'), ['a: 0 - 1/4', 'a: 1/4 - 1/2', 'a: 1/2 - 3/4', 'b: 3/4 - 1']);
  });
  it('supports euclidean rhythms', () => {
    assert.deepStrictEqual(minS('a(3, 8)'), ['a: 0 - 1/8', 'a: 3/8 - 1/2', 'a: 3/4 - 7/8']);
  });
  it('supports the ? operator', () => {
    assert.deepStrictEqual(
      mini('a?').queryArc(0, 20).map(hap => hap.whole.begin),
      mini('a').degradeBy(0.5).queryArc(0, 20).map(hap => hap.whole.begin));
  });
  // testing things that involve pseudo-randomness, so there's a probability we could fail by chance.
  // these next few tests work with the current PRNG, and are intended to succeed with p > 0.99 even if the PRNG changes
  //   (as long as the PRNG has a relatively-uniform distribution of values)
  it('supports degradeBy with default of 50%', () => {
    const haps = mini('a?').queryArc(0, 1000);
    assert(459 <= haps.length && haps.length <= 541, 'Number of elements did not fall in 99% confidence interval for binomial with p=0.5');
  });
  it('supports degradeBy with an argument', () => {
    const haps = mini('a?0.8').queryArc(0, 1000);
    assert(haps.length > 0, 'Should have had at least one element when degradeBy was set at 0.8');
    assert(haps.length < 230, 'Had too many cycles remaining after degradeBy 0.8');
  });
  it('supports the random choice operator ("|") with nesting', () => {
    const numCycles = 900;
    const haps = mini('a | [b | c] | [d | e | f]').queryArc(0, numCycles);
    // Should have about 1/3 a, 1/6 each of b | c, and 1/9 each of d | e | f.
    // Evaluating this distribution with a chi-squared test.
    // Note: this just evaluates the overall distribution, not things like correlation/runs of values
    const observed = haps.reduce((acc, hap) => {
      acc[hap.value] = (acc[hap.value] || 0) + 1;
      return acc;
    }, {});
    const expected = {
      a: numCycles / 3, b: numCycles / 6, c: numCycles / 6,
      d: numCycles / 9, e: numCycles / 9, f: numCycles / 9
    };
    let chisq = -numCycles;
    for (let k in expected) {
      chisq += observed[k] * observed[k] / expected[k];
    }
    // 15.086 is the chisq for 5 degrees of freedom at 99%, so for 99% of uniformly-distributed
    //  PRNG, this test should succeed
    assert(chisq <= 15.086,
      chisq + ' was expected to be less than 15.086 under chi-squared test');
  });
});

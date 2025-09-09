import { allSubsets, cartesianProduct, generateParameterCombinations } from '../../utils/testCombinatorics';

describe('allSubsets', () => {
  it('returns [[]] for empty array', () => {
    expect(allSubsets([])).toEqual([[]]);
  });

  it('returns all subsets for a 2-element array', () => {
    expect(allSubsets(['a', 'b'])).toEqual([
      [], ['a'], ['b'], ['a', 'b']
    ]);
  });

  it('returns all subsets for a 3-element array', () => {
    expect(allSubsets([1, 2, 3])).toEqual([
      [], [1], [2], [1,2], [3], [1,3], [2,3], [1,2,3]
    ]);
  });
});

describe('cartesianProduct', () => {
  it('returns [[]] for empty input', () => {
    expect(cartesianProduct([])).toEqual([[]]);
  });

  it('returns correct product for single array', () => {
    expect(cartesianProduct([[1,2]])).toEqual([[1],[2]]);
  });

  it('returns correct product for two arrays of strings', () => {
    expect(cartesianProduct([
      ['1','2'], ['a','b']
    ])).toEqual([
      ['1','a'], ['1','b'], ['2','a'], ['2','b']
    ]);
  });

  it('returns correct product for three arrays of strings', () => {
    expect(cartesianProduct([
      ['1','2'], ['a'], ['x','y']
    ])).toEqual([
      ['1','a','x'], ['1','a','y'], ['2','a','x'], ['2','a','y']
    ]);
  });
});

describe('generateParameterCombinations', () => {
  it('handles all single-choice params', () => {
    const params = {
      color: { values: ['red','green'], multi: false },
      size: { values: ['S','M'], multi: false }
    };
    expect(generateParameterCombinations(params)).toEqual([
      [['red'],['S']], [['red'],['M']], [['green'],['S']], [['green'],['M']]
    ]);
  });

  it('handles all multi-choice params', () => {
    const params = {
      color: { values: ['red','green'], multi: true },
      size: { values: ['S','M'], multi: true }
    };
    const combos = generateParameterCombinations(params);
    // Should be all pairs of subsets
    expect(combos).toContainEqual([[],[]]);
    expect(combos).toContainEqual([['red'],['M']]);
    expect(combos).toContainEqual([['red','green'],['S','M']]);
    expect(combos.length).toBe(16); // 4*4
  });

  it('handles mixed single/multi-choice params', () => {
    const params = {
      color: { values: ['red','green'], multi: true },
      size: { values: ['S','M'], multi: false }
    };
    const combos = generateParameterCombinations(params);
    expect(combos).toContainEqual([[],['S']]);
    expect(combos).toContainEqual([['red','green'],['M']]);
    expect(combos.length).toBe(8); // 4*2
  });

  it('handles empty param set', () => {
    expect(generateParameterCombinations({})).toEqual([[]]);
  });
});

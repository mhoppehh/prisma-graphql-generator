
/**
 * Generate all possible subsets (the power set) of an array.
 * @param array The input array
 * @returns An array of all subsets
 */
export function allSubsets<T>(array: T[]): T[][] {
  return array.reduce(
    (subsets, value) => subsets.concat(subsets.map(set => [...set, value])),
    [[]] as T[][]
  );
}

/**
 * Compute the cartesian product of an array of arrays.
 * @param arrays An array of arrays
 * @returns The cartesian product as an array of arrays
 */
export function cartesianProduct<T>(arrays: T[][]): T[][] {
  return arrays.reduce<T[][]>(
    (acc, curr) =>
      acc.flatMap(a => curr.map(b => [...a, b])),
    [[]]
  );
}

/**
 * Given a parameter config object, generate all combinations for Jest test.each
 * @param params An object where each key is a param name, and value is { values: T[], multi: boolean }
 * @returns Array of arrays, each representing one combination of parameter selections
 */
export function generateParameterCombinations<T extends Record<string, { values: any[]; multi: boolean }>>(
  params: T
): any[][] {
  const paramNames = Object.keys(params);
  const choices = paramNames.map(name => {
    const { values, multi } = params[name];
    return multi ? allSubsets(values) : values.map(v => [v]);
  });
  return cartesianProduct(choices);
}

import { generateParameterCombinations } from '../../utils/testCombinatorics'

describe('Cartesian Product Test Verification', () => {
  it('should generate correct cartesian product combinations for generator parameters', () => {
    const testParameters = {
      models: {
        values: ['A', 'B'],
        multi: false
      },
      queries: {
        values: ['q1', 'q2'],
        multi: true
      },
      mutations: {
        values: ['m1'],
        multi: true
      }
    }

    const combinations = generateParameterCombinations(testParameters)
    
    // Expected combinations:
    // Models: 2 choices (A, B)
    // Queries: 4 subsets ([], [q1], [q2], [q1,q2])
    // Mutations: 2 subsets ([], [m1])
    // Total: 2 * 4 * 2 = 16 combinations
    expect(combinations).toHaveLength(16)
    
    // Check specific combinations
    expect(combinations[0]).toEqual([['A'], [], []])
    expect(combinations[1]).toEqual([['A'], [], ['m1']])
    expect(combinations[2]).toEqual([['A'], ['q1'], []])
    expect(combinations[3]).toEqual([['A'], ['q1'], ['m1']])
    expect(combinations[4]).toEqual([['A'], ['q2'], []])
    expect(combinations[5]).toEqual([['A'], ['q2'], ['m1']])
    expect(combinations[6]).toEqual([['A'], ['q1', 'q2'], []])
    expect(combinations[7]).toEqual([['A'], ['q1', 'q2'], ['m1']])
    
    // Model B combinations start at index 8
    expect(combinations[8]).toEqual([['B'], [], []])
    expect(combinations[15]).toEqual([['B'], ['q1', 'q2'], ['m1']])
  })

  it('should handle generator-specific parameter combinations', () => {
    // Real-world generator parameters
    const generatorParameters = {
      models: {
        values: ['Employee', 'Category', 'Customer'],
        multi: false
      },
      queries: {
        values: ['findUnique', 'findMany'],
        multi: true
      },
      mutations: {
        values: ['create', 'update'],
        multi: true
      },
      modulePaths: {
        values: ['./src/modules', './api/graphql'],
        multi: false
      }
    }

    const combinations = generateParameterCombinations(generatorParameters)
    
    // Expected:
    // Models: 3 choices
    // Queries: 4 subsets ([], [findUnique], [findMany], [findUnique,findMany])
    // Mutations: 4 subsets ([], [create], [update], [create,update])
    // Module paths: 2 choices
    // Total: 3 * 4 * 4 * 2 = 96 combinations
    expect(combinations).toHaveLength(96)

    // Verify some specific combinations
    const firstCombination = combinations[0]
    expect(firstCombination).toHaveLength(4) // 4 parameters
    expect(firstCombination[0]).toEqual(['Employee']) // Single model
    expect(firstCombination[3]).toEqual(['./src/modules']) // Single module path

    // Check that we have combinations with different numbers of operations
    const combinationsWithNoOps = combinations.filter(combo => 
      combo[1].length === 0 && combo[2].length === 0 // No queries, no mutations
    )
    const combinationsWithBothOps = combinations.filter(combo => 
      combo[1].length > 0 && combo[2].length > 0 // Has both queries and mutations
    )
    
    expect(combinationsWithNoOps.length).toBeGreaterThan(0)
    expect(combinationsWithBothOps.length).toBeGreaterThan(0)
  })

  it('should demonstrate filtering for valid test cases', () => {
    const testParameters = {
      models: {
        values: ['A', 'B'],
        multi: false
      },
      queries: {
        values: ['q1'],
        multi: true
      },
      mutations: {
        values: ['m1'],
        multi: true
      }
    }

    const allCombinations = generateParameterCombinations(testParameters)
    
    // Filter out combinations with no operations (both queries and mutations empty)
    const validCombinations = allCombinations.filter(combo => {
      const queries = combo[1]
      const mutations = combo[2]
      return queries.length > 0 || mutations.length > 0
    })

    // Expected:
    // All: 2 * 2 * 2 = 8 combinations
    // Invalid (no ops): 2 * 1 * 1 = 2 combinations ([], [])
    // Valid: 8 - 2 = 6 combinations
    expect(allCombinations).toHaveLength(8)
    expect(validCombinations).toHaveLength(6)

    // Verify all valid combinations have at least one operation
    validCombinations.forEach(combo => {
      const queries = combo[1]
      const mutations = combo[2]
      expect(queries.length + mutations.length).toBeGreaterThan(0)
    })
  })

  it('should work with realistic Prisma model combinations', () => {
    // Based on the actual schema models
    const prismaParameters = {
      models: {
        values: [
          'Employee', 'Category', 'Customer', 'Order', 'Product', 
          'Supplier', 'Region', 'Territory', 'EmployeeTerritory'
        ],
        multi: false
      },
      operations: {
        values: [
          { type: 'query', op: 'findMany' },
          { type: 'query', op: 'findUnique' },
          { type: 'mutation', op: 'create' },
          { type: 'mutation', op: 'update' }
        ],
        multi: true
      }
    }

    const combinations = generateParameterCombinations(prismaParameters)
    
    // Expected:
    // Models: 9 choices
    // Operations: 2^4 = 16 subsets
    // Total: 9 * 16 = 144 combinations
    expect(combinations).toHaveLength(144)

    // Verify structure
    combinations.forEach(combo => {
      expect(combo).toHaveLength(2) // model + operations
      expect(combo[0]).toHaveLength(1) // Single model
      expect(Array.isArray(combo[1])).toBe(true) // Operations array (can be empty)
    })
  })
})

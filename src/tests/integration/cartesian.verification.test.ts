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
    
    expect(combinations).toHaveLength(16)
    
    expect(combinations[0]).toEqual([['A'], [], []])
    expect(combinations[1]).toEqual([['A'], [], ['m1']])
    expect(combinations[2]).toEqual([['A'], ['q1'], []])
    expect(combinations[3]).toEqual([['A'], ['q1'], ['m1']])
    expect(combinations[4]).toEqual([['A'], ['q2'], []])
    expect(combinations[5]).toEqual([['A'], ['q2'], ['m1']])
    expect(combinations[6]).toEqual([['A'], ['q1', 'q2'], []])
    expect(combinations[7]).toEqual([['A'], ['q1', 'q2'], ['m1']])
    
    expect(combinations[8]).toEqual([['B'], [], []])
    expect(combinations[15]).toEqual([['B'], ['q1', 'q2'], ['m1']])
  })

  it('should handle generator-specific parameter combinations', () => {
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
    
    expect(combinations).toHaveLength(96)

    const firstCombination = combinations[0]
    expect(firstCombination).toHaveLength(4)
    expect(firstCombination[0]).toEqual(['Employee'])
    expect(firstCombination[3]).toEqual(['./src/modules'])

    const combinationsWithNoOps = combinations.filter(combo => 
      combo[1].length === 0 && combo[2].length === 0
    )
    const combinationsWithBothOps = combinations.filter(combo => 
      combo[1].length > 0 && combo[2].length > 0
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
    
    const validCombinations = allCombinations.filter(combo => {
      const queries = combo[1]
      const mutations = combo[2]
      return queries.length > 0 || mutations.length > 0
    })

    expect(allCombinations).toHaveLength(8)
    expect(validCombinations).toHaveLength(6)

    validCombinations.forEach(combo => {
      const queries = combo[1]
      const mutations = combo[2]
      expect(queries.length + mutations.length).toBeGreaterThan(0)
    })
  })

  it('should work with realistic Prisma model combinations', () => {
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
    
    expect(combinations).toHaveLength(144)

    combinations.forEach(combo => {
      expect(combo).toHaveLength(2)
      expect(combo[0]).toHaveLength(1)
      expect(Array.isArray(combo[1])).toBe(true)
    })
  })
})

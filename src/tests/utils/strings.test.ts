import {
  pluralize,
  singularize,
  pascalCase,
  IRREGULAR_PLURALS,
  COMMON_PLURALS,
} from '../../utils/strings'

describe('pluralize', () => {
  it('handles custom plurals', () => {
    expect(pluralize('foo', { foo: 'foozes' })).toBe('foozes')
    expect(pluralize('Foo', { foo: 'foozes' })).toBe('Foozes')
    expect(pluralize('FOO', { foo: 'foozes' })).toBe('FOOZES')
  })
  it('returns known plural as-is', () => {
    for (const word of COMMON_PLURALS) {
      expect(pluralize(word)).toBe(word)
    }
  })
  it('handles irregular plurals', () => {
    for (const [sing, plur] of Object.entries(IRREGULAR_PLURALS)) {
      expect(pluralize(sing)).toBe(plur)
      expect(pluralize(sing.toUpperCase())).toBe(plur.toUpperCase())
    }
  })
  it('handles standard rules', () => {
    expect(pluralize('city')).toBe('cities')
    expect(pluralize('leaf')).toBe('leaves')
    expect(pluralize('knife')).toBe('knives')
    expect(pluralize('hero')).toBe('heroes')
    expect(pluralize('bus')).toBe('buses')
    expect(pluralize('box')).toBe('boxes')
    expect(pluralize('buzz')).toBe('buzzes')
    expect(pluralize('church')).toBe('churches')
    expect(pluralize('dish')).toBe('dishes')
    expect(pluralize('cat')).toBe('cats')
  })
  it('handles words already ending with complex plural suffixes', () => {
    expect(pluralize('babies')).toBe('babies')
    expect(pluralize('wives')).toBe('wives')
    expect(pluralize('classes')).toBe('classes')
    expect(pluralize('fixes')).toBe('fixes')
    expect(pluralize('mazes')).toBe('mazes')
    expect(pluralize('beaches')).toBe('beaches')
    expect(pluralize('wishes')).toBe('wishes')
  })
  it('handles words ending with consonant+o', () => {
    expect(pluralize('potato')).toBe('potatoes')
    expect(pluralize('tomato')).toBe('tomatoes')
  })
  it('handles words ending with vowel+o', () => {
    expect(pluralize('radio')).toBe('radios')
    expect(pluralize('video')).toBe('videos')
  })
  it('handles single letter words', () => {
    expect(pluralize('a')).toBe('as')
    expect(pluralize('I')).toBe('Is')
  })
  it('preserves case for irregular plurals', () => {
    expect(pluralize('Child')).toBe('Children')
    expect(pluralize('CHILD')).toBe('CHILDREN')
  })
})

describe('singularize', () => {
  it('handles irregular plurals', () => {
    expect(singularize('children')).toBe('child')
    expect(singularize('PEOPLE')).toBe('PERSON')
  })
  it('handles employees special case', () => {
    expect(singularize('employees')).toBe('employee')
    expect(singularize('EMPLOYEES')).toBe('EMPLOYEE')
    expect(singularize('Employees')).toBe('Employee')
  })
  it('handles standard rules', () => {
    expect(singularize('cities')).toBe('city')
    expect(singularize('leaves')).toBe('leaf')
    expect(singularize('knives')).toBe('knife')
    expect(singularize('wolves')).toBe('wolf')
    expect(singularize('heroes')).toBe('hero')
    expect(singularize('buses')).toBe('bus')
    expect(singularize('boxes')).toBe('box')
    expect(singularize('buzzes')).toBe('buzz')
    expect(singularize('churches')).toBe('church')
    expect(singularize('dishes')).toBe('dish')
    expect(singularize('cats')).toBe('cat')
  })
  it('handles edge cases for -ves endings', () => {
    expect(singularize('calves')).toBe('calf')
    expect(singularize('halves')).toBe('half')
    expect(singularize('shelves')).toBe('shelf')
    expect(singularize('wives')).toBe('wife')
    expect(singularize('thieves')).toBe('thief')
  })
  it('handles -es endings from -o words', () => {
    expect(singularize('potatoes')).toBe('potato')
    expect(singularize('tomatoes')).toBe('tomato')
    expect(singularize('hopes')).toBe('hop')
  })
  it('handles short words', () => {
    expect(singularize('as')).toBe('a')
    expect(singularize('is')).toBe('i')
  })
  it('returns input if not recognized as plural', () => {
    expect(singularize('foo')).toBe('foo')
    expect(singularize('bar')).toBe('bar')
  })
  it('preserves case for irregular plurals', () => {
    expect(singularize('Children')).toBe('Child')
    expect(singularize('CHILDREN')).toBe('CHILD')
  })
})

describe('pascalCase', () => {
  it('capitalizes first letter', () => {
    expect(pascalCase('foo')).toBe('Foo')
    expect(pascalCase('barBaz')).toBe('BarBaz')
    expect(pascalCase('')).toBe('')
    expect(pascalCase('a')).toBe('A')
    expect(pascalCase('ABC')).toBe('ABC')
  })
})

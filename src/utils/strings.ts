// --- Utility Functions ---

// Common English plural words that don't follow standard rules
export const IRREGULAR_PLURALS: Record<string, string> = {
  child: 'children',
  person: 'people',
  man: 'men',
  woman: 'women',
  tooth: 'teeth',
  foot: 'feet',
  mouse: 'mice',
  goose: 'geese',
  ox: 'oxen',
  sheep: 'sheep',
  deer: 'deer',
  fish: 'fish',
  aircraft: 'aircraft',
  series: 'series',
  species: 'species',
}

// Words that are commonly already plural in database contexts
export const COMMON_PLURALS = new Set([
  'employees',
  'users',
  'branches',
  'companies',
  'customers',
  'orders',
  'products',
  'categories',
  'addresses',
  'contacts',
  'documents',
  'files',
  'images',
  'videos',
  'messages',
  'notifications',
  'payments',
  'transactions',
  'invoices',
  'reports',
  'settings',
  'permissions',
  'roles',
  'groups',
  'teams',
  'departments',
  'locations',
  'countries',
  'states',
  'cities',
  'suppliers',
  'vendors',
  'clients',
  'projects',
  'tasks',
  'issues',
  'tickets',
  'events',
  'logs',
  'records',
  'entries',
  'items',
  'assets',
  'resources',
  'services',
  'features',
  'modules',
  'components',
  'elements',
])

export const pluralize = (
  str: string,
  customPlurals?: Record<string, string>,
): string => {
  const lower = str.toLowerCase()

  // Check custom overrides first
  if (customPlurals && customPlurals[lower]) {
    const custom = customPlurals[lower]
    // Preserve original casing
    return str === str.toLowerCase()
      ? custom
      : str === str.toUpperCase()
        ? custom.toUpperCase()
        : custom.charAt(0).toUpperCase() + custom.slice(1)
  }

  // Check if it's already a known plural
  if (COMMON_PLURALS.has(lower)) {
    return str
  }

  // Check irregular plurals
  if (IRREGULAR_PLURALS[lower]) {
    // Preserve original casing
    const irregular = IRREGULAR_PLURALS[lower]
    return str === str.toLowerCase()
      ? irregular
      : str === str.toUpperCase()
        ? irregular.toUpperCase()
        : irregular.charAt(0).toUpperCase() + irregular.slice(1)
  }

  // Check if already ends with common plural suffixes
  if (str.endsWith('s') && str.length > 1) {
    // Could be plural already, but let's check some patterns
    if (
      str.endsWith('ies') ||
      str.endsWith('ves') ||
      str.endsWith('ses') ||
      str.endsWith('xes') ||
      str.endsWith('zes') ||
      str.endsWith('ches') ||
      str.endsWith('shes')
    ) {
      return str // Likely already plural
    }
    // For simple 's' endings that need 'es' (like bus, class, glass)
    // Don't return early - fall through to the 'es' rules below
  }

  // Apply standard pluralization rules
  if (
    str.endsWith('y') &&
    str.length > 1 &&
    !'aeiou'.includes(str[str.length - 2])
  ) {
    return str.slice(0, -1) + 'ies'
  }
  if (str.endsWith('f')) {
    return str.slice(0, -1) + 'ves'
  }
  if (str.endsWith('fe')) {
    return str.slice(0, -2) + 'ves'
  }
  if (
    str.endsWith('o') &&
    str.length > 1 &&
    !'aeiou'.includes(str[str.length - 2])
  ) {
    return str + 'es'
  }
  if (
    str.endsWith('s') ||
    str.endsWith('sh') ||
    str.endsWith('ch') ||
    str.endsWith('x') ||
    str.endsWith('z')
  ) {
    return str + 'es'
  }

  return str + 's'
}

// Convert plural words back to singular form
export const singularize = (str: string): string => {
  const lower = str.toLowerCase()

  // Handle common irregular plurals in reverse
  const reverseIrregulars: Record<string, string> = {
    children: 'child',
    people: 'person',
    men: 'man',
    women: 'woman',
    teeth: 'tooth',
    feet: 'foot',
    mice: 'mouse',
    geese: 'goose',
    oxen: 'ox',
    sheep: 'sheep',
    deer: 'deer',
    fish: 'fish',
    aircraft: 'aircraft',
    series: 'series',
    species: 'species',
  }

  if (reverseIrregulars[lower]) {
    // Preserve original casing
    const singular = reverseIrregulars[lower]
    return str === str.toLowerCase()
      ? singular
      : str === str.toUpperCase()
        ? singular.toUpperCase()
        : singular.charAt(0).toUpperCase() + singular.slice(1)
  }

  // Special case for "employees" -> "employee"
  if (lower === 'employees') {
    return str === str.toLowerCase()
      ? 'employee'
      : str === str.toUpperCase()
        ? 'EMPLOYEE'
        : 'Employee'
  }

  // Handle standard plural patterns
  if (str.endsWith('ies') && str.length > 3) {
    return str.slice(0, -3) + 'y'
  }
  if (str.endsWith('ves') && str.length > 3) {
    // Check if it was 'f' or 'fe' originally
    const stem = str.slice(0, -3)
    // Common patterns: knives -> knife, wolves -> wolf, leaves -> leaf
    if (stem === 'kni' || stem === 'wi') {
      return stem + 'fe'
    }
    if (stem === 'wol' || stem === 'hal' || stem === 'cal' || stem === 'sel' || stem === 'lea' || stem === 'shel') {
      return stem + 'f'
    }
    // Default case: assume it was 'f'
    return stem + 'f'
  }
  if (str.endsWith('ses') && str.length > 3) {
    return str.slice(0, -2)
  }
  if (str.endsWith('xes') && str.length > 3) {
    return str.slice(0, -2)
  }
  if (str.endsWith('zes') && str.length > 3) {
    return str.slice(0, -2)
  }
  if (str.endsWith('ches') && str.length > 4) {
    return str.slice(0, -2)
  }
  if (str.endsWith('shes') && str.length > 4) {
    return str.slice(0, -2)
  }
  if (str.endsWith('es') && str.length > 2) {
    // Could be 'o' + 'es' or just 's' + 'es'
    const withoutEs = str.slice(0, -2)
    if (withoutEs.endsWith('o')) {
      return withoutEs
    }
    // Otherwise might be buses -> bus, so remove just 'es'
    return withoutEs
  }
  if (str.endsWith('s') && str.length > 1) {
    return str.slice(0, -1)
  }

  return str
}

export const pascalCase = (str: string): string => {
  if (str.length === 0) return str
  return str.charAt(0).toUpperCase() + str.slice(1)
}

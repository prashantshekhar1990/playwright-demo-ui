// Centralized test data, so credentials and IDs used by several specs live in one place
// instead of being retyped as magic strings.
export const credentials = {
  admin: { username: 'admin', password: 'admin123' },
  user: { username: 'user', password: 'user123' },
  locked: { username: 'locked', password: 'anything' },
  basicAuth: { username: 'basicuser', password: 'basicpass123' },
} as const;

export const shopProductIds = {
  bananas: 1,
  spinach: 4, // permanently out of stock, used to test the disabled/rejected path
  milk: 5,
  bread: 6,
} as const;

// A small, deliberately varied data set for data-driven tests (09-dropdowns / 15-complex style
// searchable lists already use these countries via the /api/countries endpoint).
export const countrySearchCases = [
  { query: 'ind', expected: ['India', 'Indonesia'] },
  { query: 'united', expected: ['United Kingdom', 'United States'] },
  { query: 'braz', expected: ['Brazil'] },
] as const;

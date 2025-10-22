// Test the timestamp normalization logic
function toDateSafeServer(value) {
  if (!value) return null;
  if (value instanceof Date) return isNaN(value.getTime()) ? null : value;
  if (typeof value === 'string' || typeof value === 'number') {
    const d = new Date(value);
    return isNaN(d.getTime()) ? null : d;
  }
  const v = value;
  if (v && typeof v.toDate === 'function') {
    try { const d = v.toDate(); return d instanceof Date && !isNaN(d.getTime()) ? d : null; } catch { return null; }
  }
  if (v && typeof v.seconds === 'number') {
    const millis = v.seconds * 1000 + (v.nanoseconds || 0) / 1e6;
    const d = new Date(millis);
    return isNaN(d.getTime()) ? null : d;
  }
  return null;
}

// Test various timestamp formats
const testCases = [
  '2024-01-15T10:30:00Z',
  1705315800000,
  new Date(),
  { seconds: 1705315800, nanoseconds: 0 },
  { toDate: () => new Date('2024-01-15T10:30:00Z') },
  'invalid-date',
  null,
  undefined
];

console.log('Testing timestamp normalization:');
testCases.forEach((testCase, i) => {
  const result = toDateSafeServer(testCase);
  console.log(`Test ${i + 1}: ${JSON.stringify(testCase)} -> ${result}`);
});
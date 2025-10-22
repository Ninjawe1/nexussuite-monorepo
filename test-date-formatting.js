// Test script to verify date formatting across the application
console.log('Testing date formatting utilities...');

// Test the date utilities directly
const { toDateSafe, formatDateSafe } = require('./client/src/lib/date.ts');

// Test various date inputs
const testDates = [
  new Date('2024-01-15'),
  '2024-02-20',
  '2024-03-25T10:30:00Z',
  { seconds: 1640995200 }, // Firebase timestamp format
  null,
  undefined,
  'invalid-date'
];

console.log('\n=== Testing toDateSafe ===');
testDates.forEach(date => {
  const result = toDateSafe(date);
  console.log(`Input: ${JSON.stringify(date)} -> Output: ${result}`);
});

console.log('\n=== Testing formatDateSafe ===');
testDates.forEach(date => {
  const result = formatDateSafe(date, 'MMM d, yyyy');
  console.log(`Input: ${JSON.stringify(date)} -> Formatted: ${result}`);
});

console.log('\n=== Testing different format patterns ===');
const sampleDate = new Date('2024-01-15T14:30:00Z');
const formats = [
  'MMM d, yyyy',
  'yyyy-MM-dd',
  'dd/MM/yyyy',
  'MMMM do, yyyy',
  'PPP'
];

formats.forEach(format => {
  const result = formatDateSafe(sampleDate, format);
  console.log(`Format: ${format} -> Result: ${result}`);
});
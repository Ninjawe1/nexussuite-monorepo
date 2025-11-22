// Test script to verify date formatting and create sample data
import { formatDateSafe, toDateSafe } from './client/src/lib/date.js';

console.log('=== Testing Date Functions ===');

// Test formatDateSafe with various inputs and formats
console.log('\n--- formatDateSafe Tests ---');
const testDate = new Date('2024-01-15T14:30:00Z');
console.log('Test date:', testDate.toISOString());

console.log('formatDateSafe(testDate, "MMM dd, HH:mm"):', formatDateSafe(testDate, 'MMM dd, HH:mm'));
console.log('formatDateSafe(testDate, "MMM dd, yyyy"):', formatDateSafe(testDate, 'MMM dd, yyyy'));
console.log('formatDateSafe("2024-01-15", "MMM dd, yyyy"):', formatDateSafe('2024-01-15', 'MMM dd, yyyy'));
console.log('formatDateSafe(null, "MMM dd, yyyy"):', formatDateSafe(null, 'MMM dd, yyyy'));
console.log('formatDateSafe(undefined, "MMM dd, yyyy"):', formatDateSafe(undefined, 'MMM dd, yyyy'));

// Test toDateSafe with various inputs
console.log('\n--- toDateSafe Tests ---');
console.log('toDateSafe(testDate):', toDateSafe(testDate));
console.log('toDateSafe("2024-01-15"):', toDateSafe('2024-01-15'));
console.log('toDateSafe("2024-01-15T14:30:00Z"):', toDateSafe('2024-01-15T14:30:00Z'));
console.log('toDateSafe(null):', toDateSafe(null));
console.log('toDateSafe(undefined):', toDateSafe(undefined));
console.log('toDateSafe(""):', toDateSafe(''));
console.log('toDateSafe(0):', toDateSafe(0));

// Test edge cases
console.log('\n--- Edge Cases ---');
console.log('formatDateSafe("invalid-date", "MMM dd, yyyy"):', formatDateSafe('invalid-date', 'MMM dd, yyyy'));
console.log('toDateSafe("invalid-date"):', toDateSafe('invalid-date'));

console.log('\n=== Date Functions Test Complete ===');
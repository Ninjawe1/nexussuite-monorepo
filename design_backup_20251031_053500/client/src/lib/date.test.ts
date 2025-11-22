import { describe, it, expect } from 'vitest';
import { toDateSafe, formatDateSafe } from './date';

describe('toDateSafe', () => {
  it('returns null for null/undefined/empty', () => {
    expect(toDateSafe(null)).toBeNull();
    expect(toDateSafe(undefined)).toBeNull();
    expect(toDateSafe('')).toBeNull();
    expect(toDateSafe(0)).toBeNull(); // current implementation treats 0 as falsy
  });

  it('returns null for invalid Date', () => {
    const d = new Date('invalid');
    expect(toDateSafe(d)).toBeNull();
  });

  it('handles Date instance', () => {
    const d = new Date('2024-05-12T10:20:30Z');
    const res = toDateSafe(d);
    expect(res).toBeInstanceOf(Date);
    expect(res!.getTime()).toBe(d.getTime());
  });

  it('parses string date (YYYY-MM-DD)', () => {
    const res = toDateSafe('2025-10-21');
    expect(res).toBeInstanceOf(Date);
    // Check components in UTC to avoid TZ differences
    expect(res!.getUTCFullYear()).toBe(2025);
    expect(res!.getUTCMonth()).toBe(9); // October is 9
    expect(res!.getUTCDate()).toBe(21);
  });

  it('parses ISO string date-time', () => {
    const iso = '2024-12-31T23:59:59.000Z';
    const res = toDateSafe(iso);
    expect(res).toBeInstanceOf(Date);
    expect(res!.toISOString()).toBe(iso);
  });

  it('parses number (milliseconds timestamp)', () => {
    const ts = Date.UTC(2023, 0, 1);
    const res = toDateSafe(ts);
    expect(res).toBeInstanceOf(Date);
    expect(res!.getTime()).toBe(ts);
  });

  it('supports objects with toDate() method', () => {
    const obj = { toDate: () => new Date('2024-01-01T00:00:00Z') } as any;
    const res = toDateSafe(obj);
    expect(res).toBeInstanceOf(Date);
    expect(res!.toISOString()).toBe('2024-01-01T00:00:00.000Z');

    const bad = { toDate: () => { throw new Error('bad'); } } as any;
    expect(toDateSafe(bad)).toBeNull();
  });

  it('supports Firestore-like timestamp object {seconds, nanoseconds}', () => {
    const seconds = 1700000000; // roughly Nov 2023
    const nanos = 500_000_000; // +0.5s
    const res = toDateSafe({ seconds, nanoseconds: nanos });
    expect(res).toBeInstanceOf(Date);
    expect(res!.getTime()).toBe(seconds * 1000 + nanos / 1e6);

    const res2 = toDateSafe({ seconds });
    expect(res2).toBeInstanceOf(Date);
    expect(res2!.getTime()).toBe(seconds * 1000);
  });
});

describe('formatDateSafe', () => {
  it('previews original input for invalid string by default', () => {
    expect(formatDateSafe('not-a-date', 'yyyy-MM-dd')).toBe('not-a-date');
    expect(formatDateSafe(null, 'yyyy-MM-dd')).toBe('');
  });

  it('uses provided fallback for invalid input', () => {
    expect(formatDateSafe('not-a-date', 'yyyy-MM-dd', '—')).toBe('—');
    expect(formatDateSafe(null, 'yyyy-MM-dd', '—')).toBe('—');
  });

  it('formats valid Date', () => {
    const d = new Date('2024-05-12T10:20:30Z');
    expect(formatDateSafe(d, 'MMM dd, yyyy')).toMatch(/May 12, 2024/);
  });

  it('formats string input', () => {
    expect(formatDateSafe('2025-10-21', 'yyyy-MM-dd')).toBe('2025-10-21');
  });

  it('formats Firestore-like timestamp object', () => {
    const seconds = 1730000000; // arbitrary
    const formatted = formatDateSafe({ seconds }, 'yyyy-MM-dd');
    // Basic check: should not be "Invalid date" and match pattern
    expect(formatted).not.toBe('Invalid date');
    expect(/\d{4}-\d{2}-\d{2}/.test(formatted)).toBe(true);
  });
});
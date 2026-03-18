import { test, describe } from 'node:test';
import assert from 'node:assert';
import { formatDateInputValue, parseLocalDate } from './date.ts';

describe('formatDateInputValue', () => {
  test('formats valid date correctly', () => {
    const date = new Date(2024, 0, 1); // Jan 1, 2024
    assert.strictEqual(formatDateInputValue(date), '2024-01-01');
  });

  test('formats date with double digit month and day correctly', () => {
    const date = new Date(2024, 11, 25); // Dec 25, 2024
    assert.strictEqual(formatDateInputValue(date), '2024-12-25');
  });

  test('returns empty string for null', () => {
    assert.strictEqual(formatDateInputValue(null), '');
  });

  test('returns empty string for undefined', () => {
    assert.strictEqual(formatDateInputValue(undefined), '');
  });

  test('returns empty string for no argument', () => {
    assert.strictEqual(formatDateInputValue(), '');
  });

  test('handles leap year correctly', () => {
    const date = new Date(2024, 1, 29); // Feb 29, 2024
    assert.strictEqual(formatDateInputValue(date), '2024-02-29');
  });

  test('handles invalid date', () => {
    const date = new Date(NaN);
    // current implementation returns "NaN-NaN-NaN" which is probably not ideal, but let's see what it does
    const result = formatDateInputValue(date);
    assert.ok(result.includes('NaN'), 'Should return a string containing NaN for invalid date');
  });
});

describe('parseLocalDate', () => {
  test('parses date string correctly', () => {
    const result = parseLocalDate('2024-01-01');
    assert.strictEqual(result.getFullYear(), 2024);
    assert.strictEqual(result.getMonth(), 0);
    assert.strictEqual(result.getDate(), 1);
  });

  test('parses Date object correctly', () => {
    const date = new Date(2024, 5, 15, 10, 30); // June 15, 2024
    const result = parseLocalDate(date);
    assert.strictEqual(result.getFullYear(), 2024);
    assert.strictEqual(result.getMonth(), 5);
    assert.strictEqual(result.getDate(), 15);
    // Should be start of day
    assert.strictEqual(result.getHours(), 0);
  });

  test('returns Invalid Date for null', () => {
    const result = parseLocalDate(null);
    assert.ok(Number.isNaN(result.getTime()));
  });

  test('returns Invalid Date for undefined', () => {
    const result = parseLocalDate(undefined);
    assert.ok(Number.isNaN(result.getTime()));
  });

  test('returns Invalid Date for empty string', () => {
    const result = parseLocalDate('');
    assert.ok(Number.isNaN(result.getTime()));
  });

  test('returns Invalid Date for invalid string format', () => {
    const result = parseLocalDate('not-a-date');
    assert.ok(Number.isNaN(result.getTime()));
  });

  test('parses leap year string correctly', () => {
    const result = parseLocalDate('2024-02-29');
    assert.strictEqual(result.getFullYear(), 2024);
    assert.strictEqual(result.getMonth(), 1);
    assert.strictEqual(result.getDate(), 29);
  });
});

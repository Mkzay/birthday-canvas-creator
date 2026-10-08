import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  formatKeepsakeDate,
  generateWishesCsv,
  getPdfThemePalette,
  sanitizePdfText,
} from './keepsakeExport';

describe('keepsakeExport utilities', () => {
  describe('formatKeepsakeDate', () => {
    it('formats a valid date string into an editorial date format', () => {
      const result = formatKeepsakeDate('2026-05-12');
      assert.match(result, /May 12, 2026/);
    });

    it('handles empty or invalid dates gracefully', () => {
      assert.equal(formatKeepsakeDate(''), 'Special Occasion');
      assert.equal(formatKeepsakeDate(null), 'Special Occasion');
      assert.equal(formatKeepsakeDate('invalid-date'), 'Special Occasion');
    });
  });

  describe('sanitizePdfText', () => {
    it('replaces unsupported characters while preserving standard Latin characters and punctuation', () => {
      const raw = 'Happy Birthday! Wishing you joy & laughter in 2026.';
      const clean = sanitizePdfText(raw);
      assert.equal(clean, 'Happy Birthday! Wishing you joy & laughter in 2026.');
    });

    it('transliterates or replaces em dashes with hyphens or colons', () => {
      const withEmDash = 'Memories \u2014 cherished forever \u2013 always';
      const clean = sanitizePdfText(withEmDash);
      assert.ok(!clean.includes('\u2014'));
    });

    it('strips high-codepoint emojis safely without crashing', () => {
      const withEmoji = 'Cheers! \u{1F382}\u{2728}\u{1F389} Have the best day!';
      const clean = sanitizePdfText(withEmoji);
      assert.equal(clean, 'Cheers!  Have the best day!');
    });
  });

  describe('getPdfThemePalette', () => {
    it('returns rich theme colors for built-in themes', () => {
      const palette = getPdfThemePalette('elegant');
      assert.ok(palette.primary);
      assert.ok(palette.accent);
      assert.ok(palette.background);
      assert.ok(palette.cardBackground);
    });

    it('returns fallback palette for unknown themes', () => {
      const palette = getPdfThemePalette('nonexistent_theme');
      assert.ok(palette.primary);
      assert.ok(palette.accent);
    });
  });

  describe('generateWishesCsv', () => {
    it('generates a valid CSV with headers and escaped fields', () => {
      const page = {
        recipient_name: 'Ayomikun',
        birthday_date: '2026-05-12',
      };
      const messages = [
        {
          sender_name: 'Jessica "Jess" Doe',
          message: 'Happy birthday!\nHope you have a blast, cheers!',
          created_at: '2026-05-10T12:00:00Z',
          photos: [{ url: 'https://example.com/p1.jpg', caption: 'Party photo' }],
          audio_url: 'https://example.com/audio.mp3',
        },
      ];

      const csv = generateWishesCsv(page, messages);
      assert.ok(csv.startsWith('\uFEFF')); // UTF-8 BOM for Excel
      assert.ok(csv.includes('Sender Name,Date,Message,Photos Count,Voice Note'));
      assert.ok(csv.includes('"Jessica ""Jess"" Doe"'));
      assert.ok(csv.includes('1')); // Photos Count
      assert.ok(csv.includes('Yes')); // Voice Note
    });
  });
});

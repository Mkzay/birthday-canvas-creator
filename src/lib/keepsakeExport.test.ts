import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  formatKeepsakeDate,
  getKeepsakeCanvasDimensions,
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
      assert.equal(palette.isDark, false);
      assert.equal(palette.fontFamily, 'serif');
    });

    it('identifies dark themes like midnight and cosmic', () => {
      const midnight = getPdfThemePalette('midnight');
      assert.equal(midnight.isDark, true);
      assert.equal(midnight.fontFamily, 'serif');

      const cosmic = getPdfThemePalette('cosmic');
      assert.equal(cosmic.isDark, true);
      assert.equal(cosmic.fontFamily, 'sans');
    });

    it('returns fallback palette for unknown themes', () => {
      const palette = getPdfThemePalette('nonexistent_theme');
      assert.ok(palette.primary);
      assert.ok(palette.accent);
    });
  });

  describe('getKeepsakeCanvasDimensions', () => {
    it('returns A4 dimensions for portrait PDF export', () => {
      const dims = getKeepsakeCanvasDimensions('pdf');
      assert.equal(dims.width, 595);
      assert.equal(dims.height, 842);
      assert.equal(dims.aspectRatio, 'A4');
    });

    it('returns 16:9 widescreen dimensions for presentation slides export', () => {
      const dims = getKeepsakeCanvasDimensions('slides');
      assert.equal(dims.width, 960);
      assert.equal(dims.height, 540);
      assert.equal(dims.aspectRatio, '16:9');
    });
  });
});

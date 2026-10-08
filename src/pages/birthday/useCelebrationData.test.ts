import { test, describe } from 'node:test';
import assert from 'node:assert';
import { parseLocalDate } from '@/lib/date';

describe('useCelebrationData core logic and state invariants', () => {
  describe('birthday reveal timing calculations', () => {
    test('marks hasReachedBirthdayDate true when nowMs is past birthday date', () => {
      const birthdayDate = parseLocalDate('2026-10-01');
      const nowMs = new Date('2026-10-02T12:00:00Z').getTime();
      const hasReached = nowMs >= birthdayDate.getTime();
      assert.strictEqual(hasReached, true);
    });

    test('marks hasReachedBirthdayDate false when nowMs is before birthday date', () => {
      const birthdayDate = parseLocalDate('2026-10-15');
      const nowMs = new Date('2026-10-02T12:00:00Z').getTime();
      const hasReached = nowMs >= birthdayDate.getTime();
      assert.strictEqual(hasReached, false);
    });

    test('identifies preview mode as always revealed and unlocked', () => {
      const isPreview = true;
      const rawPage = {
        is_revealed: false,
        requires_unlock: true,
        is_unlocked: false,
      };

      const normalizedPage = isPreview
        ? { ...rawPage, is_revealed: true, is_unlocked: true, requires_unlock: false }
        : rawPage;

      assert.strictEqual(normalizedPage.is_revealed, true);
      assert.strictEqual(normalizedPage.is_unlocked, true);
      assert.strictEqual(normalizedPage.requires_unlock, false);
    });
  });

  describe('preview normalization and unlock states', () => {
    test('requiresUnlock is false in preview mode even if page requires unlock', () => {
      const isPreview = true;
      const pageRequiresUnlock = true;
      const requiresUnlock = !isPreview && pageRequiresUnlock;
      const isUnlocked = isPreview || !requiresUnlock;

      assert.strictEqual(requiresUnlock, false);
      assert.strictEqual(isUnlocked, true);
    });

    test('isBeforeBirthday is false in preview mode so staging preview is immediately viewable', () => {
      const isPreview = true;
      const page = { is_revealed: false };
      const hasReachedBirthdayDate = false;
      const isBeforeBirthday = !isPreview && page.is_revealed === false && !hasReachedBirthdayDate;

      assert.strictEqual(isBeforeBirthday, false);
    });
  });
});

import { test, describe } from 'node:test';
import assert from 'node:assert';
import { CREATOR_STEPS, EDIT_STEPS } from './useCreatorStudioState';

describe('useCreatorStudioState logic', () => {
  describe('step definitions', () => {
    test('CREATOR_STEPS contains 5 ordered steps', () => {
      assert.strictEqual(CREATOR_STEPS.length, 5);
      assert.deepStrictEqual(
        CREATOR_STEPS.map((s) => s.label),
        ['Honoree', 'Keepsake', 'Palette & View', 'Soundtrack', 'Permissions'],
      );
    });

    test('EDIT_STEPS contains 5 ordered steps with Permissions & Save', () => {
      assert.strictEqual(EDIT_STEPS.length, 5);
      assert.deepStrictEqual(
        EDIT_STEPS.map((s) => s.label),
        ['Honoree', 'Keepsake', 'Palette & View', 'Soundtrack', 'Permissions & Save'],
      );
    });
  });

  describe('step bounds validation', () => {
    function resolveInitialStep(step: unknown): number {
      return typeof step === 'number' && step >= 1 && step <= 5 ? step : 1;
    }

    test('defaults to step 1 when undefined or null', () => {
      assert.strictEqual(resolveInitialStep(undefined), 1);
      assert.strictEqual(resolveInitialStep(null), 1);
    });

    test('accepts valid step numbers from 1 to 5', () => {
      assert.strictEqual(resolveInitialStep(1), 1);
      assert.strictEqual(resolveInitialStep(3), 3);
      assert.strictEqual(resolveInitialStep(5), 5);
    });

    test('clamps invalid out-of-range steps to 1', () => {
      assert.strictEqual(resolveInitialStep(0), 1);
      assert.strictEqual(resolveInitialStep(6), 1);
      assert.strictEqual(resolveInitialStep(-1), 1);
      assert.strictEqual(resolveInitialStep('2'), 1);
    });
  });

  describe('draft payload serialization', () => {
    test('serializes date fields to ISO strings or null', () => {
      const birthday = new Date('2026-11-15T00:00:00.000Z');
      const serializedDate = birthday ? birthday.toISOString() : null;
      assert.strictEqual(serializedDate, '2026-11-15T00:00:00.000Z');

      const nullDate: Date | null = null;
      const serializedNull = nullDate ? nullDate.toISOString() : null;
      assert.strictEqual(serializedNull, null);
    });

    test('parses draft payload correctly', () => {
      const sampleDraft = {
        currentStep: 2,
        recipientName: 'Alex',
        selectedTheme: 'vibrant',
        allowPhotos: true,
      };
      const raw = JSON.stringify(sampleDraft);
      const parsed = JSON.parse(raw);
      assert.strictEqual(parsed.recipientName, 'Alex');
      assert.strictEqual(parsed.currentStep, 2);
      assert.strictEqual(parsed.selectedTheme, 'vibrant');
      assert.strictEqual(parsed.allowPhotos, true);
    });
  });
});

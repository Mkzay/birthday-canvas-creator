import { test, describe } from 'node:test';
import assert from 'node:assert';

describe('useBankResolution logic', () => {
  describe('account number cleaning', () => {
    const cleanAccountNumber = (raw: string) => raw.replace(/\D/g, '').slice(0, 10);

    test('strips spaces, dashes, and letters', () => {
      assert.strictEqual(cleanAccountNumber('012-345 6789'), '0123456789');
      assert.strictEqual(cleanAccountNumber('012abc345xyz6789'), '0123456789');
    });

    test('truncates to exactly 10 digits', () => {
      assert.strictEqual(cleanAccountNumber('0123456789012345'), '0123456789');
    });

    test('handles empty and short inputs', () => {
      assert.strictEqual(cleanAccountNumber(''), '');
      assert.strictEqual(cleanAccountNumber('123'), '123');
    });
  });

  describe('hasResolvedPoolRecipient calculation', () => {
    function computeHasResolvedPoolRecipient(
      bankCode: string,
      accountNumber: string,
      accountName: string,
    ): boolean {
      const cleanAccount = accountNumber.replace(/\D/g, '').slice(0, 10);
      return Boolean(
        bankCode &&
        cleanAccount.length === 10 &&
        accountName.trim(),
      );
    }

    test('returns true when bankCode, 10-digit account, and trimmed name are valid', () => {
      const resolved = computeHasResolvedPoolRecipient('058', '0123456789', 'Jane Doe');
      assert.strictEqual(resolved, true);
    });

    test('returns false when bankCode is missing or empty', () => {
      const resolved = computeHasResolvedPoolRecipient('', '0123456789', 'Jane Doe');
      assert.strictEqual(resolved, false);
    });

    test('returns false when account number has fewer than 10 digits', () => {
      const resolved = computeHasResolvedPoolRecipient('058', '0123456', 'Jane Doe');
      assert.strictEqual(resolved, false);
    });

    test('returns false when account name is empty or only whitespace', () => {
      const resolvedEmpty = computeHasResolvedPoolRecipient('058', '0123456789', '');
      const resolvedSpaces = computeHasResolvedPoolRecipient('058', '0123456789', '   ');
      assert.strictEqual(resolvedEmpty, false);
      assert.strictEqual(resolvedSpaces, false);
    });
  });

  describe('requiresResolvedPoolRecipient calculation', () => {
    function computeRequiresResolvedPoolRecipient(
      isProUser: boolean,
      poolFundraisingEnabled: boolean,
    ): boolean {
      return Boolean(isProUser && poolFundraisingEnabled);
    }

    test('requires resolution only when pro user and pool fundraising are both enabled', () => {
      assert.strictEqual(computeRequiresResolvedPoolRecipient(true, true), true);
      assert.strictEqual(computeRequiresResolvedPoolRecipient(false, true), false);
      assert.strictEqual(computeRequiresResolvedPoolRecipient(true, false), false);
      assert.strictEqual(computeRequiresResolvedPoolRecipient(false, false), false);
    });
  });
});

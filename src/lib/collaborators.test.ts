import { test, describe } from 'node:test';
import assert from 'node:assert';
import {
  hashInviteToken,
  isInviteValid,
  canUserEditCanvas,
  canUserDeleteCanvas,
  canUserModifyPayoutBankDetails,
} from './collaborators';

describe('multi-organizer co-editing logic and permissions', () => {
  describe('hashInviteToken', () => {
    test('hashes invite token deterministically using SHA-256', () => {
      const token = 'test-token-12345';
      const hash1 = hashInviteToken(token);
      const hash2 = hashInviteToken(token);

      assert.strictEqual(hash1, hash2);
      assert.strictEqual(hash1.length, 64);
      assert.notStrictEqual(hash1, token);
    });

    test('generates different hashes for different tokens', () => {
      const hash1 = hashInviteToken('token-a');
      const hash2 = hashInviteToken('token-b');
      assert.notStrictEqual(hash1, hash2);
    });
  });

  describe('isInviteValid', () => {
    test('returns true for active, non-expired, unrevoked invite', () => {
      const futureDate = new Date(Date.now() + 86400000).toISOString();
      const invite = {
        expires_at: futureDate,
        revoked_at: null,
      };

      assert.strictEqual(isInviteValid(invite), true);
    });

    test('returns false when invite is expired', () => {
      const pastDate = new Date(Date.now() - 86400000).toISOString();
      const invite = {
        expires_at: pastDate,
        revoked_at: null,
      };

      assert.strictEqual(isInviteValid(invite), false);
    });

    test('returns false when invite has been revoked', () => {
      const futureDate = new Date(Date.now() + 86400000).toISOString();
      const invite = {
        expires_at: futureDate,
        revoked_at: new Date().toISOString(),
      };

      assert.strictEqual(isInviteValid(invite), false);
    });
  });

  describe('permission boundaries', () => {
    test('allows editing for owner and co-organizer', () => {
      assert.strictEqual(canUserEditCanvas('owner'), true);
      assert.strictEqual(canUserEditCanvas('co_organizer'), true);
      assert.strictEqual(canUserEditCanvas(null), false);
    });

    test('allows canvas deletion strictly for primary owner', () => {
      assert.strictEqual(canUserDeleteCanvas('owner'), true);
      assert.strictEqual(canUserDeleteCanvas('co_organizer'), false);
      assert.strictEqual(canUserDeleteCanvas(null), false);
    });

    test('allows payout bank modifications strictly for primary owner', () => {
      assert.strictEqual(canUserModifyPayoutBankDetails('owner'), true);
      assert.strictEqual(canUserModifyPayoutBankDetails('co_organizer'), false);
      assert.strictEqual(canUserModifyPayoutBankDetails(null), false);
    });
  });
});

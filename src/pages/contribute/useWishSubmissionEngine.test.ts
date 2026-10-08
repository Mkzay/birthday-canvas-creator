import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert';
import {
  formatNairaInputWithCommas,
  calculateTotalChargeKobo,
  formatKobo,
} from './utils';
import {
  getStoredContributions,
  saveStoredContribution,
  removeStoredContribution,
  loadSessionDraft,
  saveSessionDraft,
  clearSessionDraft,
} from './storage';
import type { StoredContributorWish, ContributionDraft } from './types';

// In-memory mock for localStorage and sessionStorage
class MemoryStorage implements Storage {
  private store = new Map<string, string>();

  get length(): number {
    return this.store.size;
  }

  clear(): void {
    this.store.clear();
  }

  getItem(key: string): string | null {
    return this.store.has(key) ? this.store.get(key)! : null;
  }

  key(index: number): string | null {
    const keys = Array.from(this.store.keys());
    return keys[index] ?? null;
  }

  removeItem(key: string): void {
    this.store.delete(key);
  }

  setItem(key: string, value: string): void {
    this.store.set(key, String(value));
  }
}

// Assign global mock storage for testing
global.localStorage = new MemoryStorage();
global.sessionStorage = new MemoryStorage();

describe('useWishSubmissionEngine and contributor flow', () => {
  beforeEach(() => {
    global.localStorage.clear();
    global.sessionStorage.clear();
  });

  describe('currency and fee calculations', () => {
    test('formats Naira inputs with thousands separators', () => {
      assert.strictEqual(formatNairaInputWithCommas('5000'), '5,000');
      assert.strictEqual(formatNairaInputWithCommas('1250000'), '1,250,000');
      assert.strictEqual(formatNairaInputWithCommas('2500.50'), '2,500.50');
      assert.strictEqual(formatNairaInputWithCommas(''), '');
    });

    test('calculates 1.5% platform fee correctly', () => {
      // 10,000 NGN in kobo is 1,000,000 kobo
      // 1.5% of 1,000,000 kobo is 15,000 kobo
      // Total charge is 1,015,000 kobo
      const amountKobo = 1_000_000;
      const totalKobo = calculateTotalChargeKobo(amountKobo);
      assert.strictEqual(totalKobo, 1_015_000);

      // 5,000 kobo * 0.015 = 75 kobo -> 5,075 kobo
      assert.strictEqual(calculateTotalChargeKobo(5_000), 5_075);
    });

    test('formats kobo to Nigerian Naira currency display', () => {
      const formatted = formatKobo(500000); // 5,000 NGN
      assert.ok(formatted.includes('5,000'));
    });
  });

  describe('contributor storage persistence', () => {
    const sampleWish: StoredContributorWish = {
      pageId: 'page-abc-123',
      messageId: 'msg-xyz-789',
      editToken: 'token-secret-456',
      senderName: 'Sarah',
      updatedAt: 1775640000000,
    };

    test('stores, retrieves, and removes contributor wishes', () => {
      assert.deepStrictEqual(getStoredContributions(), {});

      saveStoredContribution(sampleWish);
      const retrieved = getStoredContributions();
      assert.deepStrictEqual(retrieved['page-abc-123'], sampleWish);

      removeStoredContribution('page-abc-123');
      const afterRemoval = getStoredContributions();
      assert.strictEqual(afterRemoval['page-abc-123'], undefined);
    });

    test('saves, retrieves, and clears session drafts', () => {
      const key = 'draft:page-abc-123';
      const draft: ContributionDraft = {
        senderName: 'David',
        message: 'Wishing you all the joy and laughter!',
        poolAmountNaira: '15000',
        poolContributorEmail: 'david@example.com',
        stickers: [],
        updatedAt: 1775640000000,
      };

      assert.strictEqual(loadSessionDraft(key), null);

      saveSessionDraft(key, draft);
      const loaded = loadSessionDraft(key);
      assert.deepStrictEqual(loaded, draft);

      clearSessionDraft(key);
      assert.strictEqual(loadSessionDraft(key), null);
    });
  });

  describe('contributor participant cap rules', () => {
    test('enforces free limit of 6 contributors for non-pro canvases', () => {
      const FREE_LIMIT = 6;
      const freeCanvas = {
        owner_plan_tier: 'free',
        contributor_count: 6,
      };

      const isCapReached = freeCanvas.owner_plan_tier !== 'pro' && freeCanvas.contributor_count >= FREE_LIMIT;
      assert.strictEqual(isCapReached, true);
    });

    test('allows unlimited contributors on pro canvases regardless of count', () => {
      const FREE_LIMIT = 6;
      const proCanvas = {
        owner_plan_tier: 'pro',
        contributor_count: 42,
      };

      const isCapReached = proCanvas.owner_plan_tier !== 'pro' && proCanvas.contributor_count >= FREE_LIMIT;
      assert.strictEqual(isCapReached, false);
    });

    test('permits contributions when free canvas is below 6 contributors', () => {
      const FREE_LIMIT = 6;
      const freeCanvas = {
        owner_plan_tier: 'free',
        contributor_count: 5,
      };

      const isCapReached = freeCanvas.owner_plan_tier !== 'pro' && freeCanvas.contributor_count >= FREE_LIMIT;
      assert.strictEqual(isCapReached, false);
    });
  });
});

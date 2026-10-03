import type { StoredContributorWish, ContributionDraft } from './types';

const CONTRIBUTIONS_STORAGE_KEY = 'wishcanvas_contributions';

export function getStoredContributions(): Record<string, StoredContributorWish> {
  try {
    const raw = localStorage.getItem(CONTRIBUTIONS_STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function saveStoredContribution(entry: StoredContributorWish): void {
  try {
    const all = getStoredContributions();
    all[entry.pageId] = entry;
    localStorage.setItem(CONTRIBUTIONS_STORAGE_KEY, JSON.stringify(all));
  } catch {
    // Ignore storage quota errors
  }
}

export function removeStoredContribution(pageId: string): void {
  try {
    const all = getStoredContributions();
    delete all[pageId];
    localStorage.setItem(CONTRIBUTIONS_STORAGE_KEY, JSON.stringify(all));
  } catch {
    // Ignore
  }
}

export function loadSessionDraft(key: string): Partial<ContributionDraft> | null {
  try {
    const stored = sessionStorage.getItem(key);
    return stored ? (JSON.parse(stored) as Partial<ContributionDraft>) : null;
  } catch {
    return null;
  }
}

export function saveSessionDraft(key: string, draft: ContributionDraft): void {
  try {
    sessionStorage.setItem(key, JSON.stringify(draft));
  } catch {
    // Ignore quota errors
  }
}

export function clearSessionDraft(key: string): void {
  try {
    sessionStorage.removeItem(key);
  } catch {
    // Ignore
  }
}

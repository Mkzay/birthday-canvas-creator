export type CollaboratorRole = 'owner' | 'co_organizer';

export interface PageCollaborator {
  id: string;
  page_id: string;
  user_id: string;
  role: CollaboratorRole;
  created_at: string;
  display_name?: string | null;
  email?: string | null;
  avatar_url?: string | null;
}

export interface CollaboratorInvite {
  id: string;
  page_id: string;
  expires_at: string;
  revoked_at: string | null;
  created_at: string;
  invite_url?: string;
}

export interface CollaboratorInvitePreview {
  recipient_name: string;
  birthday_date: string;
  theme: string;
  cover_photo_url: string | null;
  owner_name: string;
  is_expired: boolean;
  is_revoked: boolean;
}

/**
 * Pure SHA-256 implementation that runs synchronously in any JavaScript runtime
 * (Node test runner, browser client, edge, server).
 */
export function hashInviteToken(token: string): string {
  function rightRotate(value: number, amount: number): number {
    return (value >>> amount) | (value << (32 - amount));
  }

  const mathPow = Math.pow;
  const maxWord = mathPow(2, 32);
  let result = '';

  const words: number[] = [];
  const asciiBitLength = token.length * 8;

  let hash = [
    0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a,
    0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19,
  ];

  const k = [
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
    0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
    0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
    0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
  ];

  let i = 0;
  for (; i < token.length; i++) {
    const code = token.charCodeAt(i);
    words[i >> 2] |= (code & 0xff) << (24 - (i % 4) * 8);
  }

  words[i >> 2] |= 0x80 << (24 - (i % 4) * 8);
  words[(((token.length + 8) >> 6) << 4) + 15] = asciiBitLength;

  for (let j = 0; j < words.length; j += 16) {
    const w = words.slice(j, j + 16);
    const oldHash = hash.slice(0);

    for (let round = 0; round < 64; round++) {
      const w15 = w[round - 15];
      const w2 = w[round - 2];

      const s0 = round >= 16 ? rightRotate(w15, 7) ^ rightRotate(w15, 18) ^ (w15 >>> 3) : 0;
      const s1 = round >= 16 ? rightRotate(w2, 17) ^ rightRotate(w2, 19) ^ (w2 >>> 10) : 0;

      if (round >= 16) {
        w[round] = ((w[round - 16] + s0) | 0) + ((w[round - 7] + s1) | 0);
      }

      const ch = (hash[4] & hash[5]) ^ (~hash[4] & hash[6]);
      const maj = (hash[0] & hash[1]) ^ (hash[0] & hash[2]) ^ (hash[1] & hash[2]);
      const sigma0 = rightRotate(hash[0], 2) ^ rightRotate(hash[0], 13) ^ rightRotate(hash[0], 22);
      const sigma1 = rightRotate(hash[4], 6) ^ rightRotate(hash[4], 11) ^ rightRotate(hash[4], 25);

      const temp1 = (hash[7] + sigma1 + ch + k[round] + (w[round] | 0)) | 0;
      const temp2 = (sigma0 + maj) | 0;

      hash = [(temp1 + temp2) | 0, hash[0], hash[1], hash[2], (hash[3] + temp1) | 0, hash[4], hash[5], hash[6]];
    }

    for (let index = 0; index < 8; index++) {
      hash[index] = (hash[index] + oldHash[index]) | 0;
    }
  }

  for (let index = 0; index < 8; index++) {
    for (let byte = 3; byte >= 0; byte--) {
      const hexVal = (hash[index] >> (byte * 8)) & 255;
      result += (hexVal < 16 ? '0' : '') + hexVal.toString(16);
    }
  }

  return result;
}

/**
 * Checks whether an invitation is currently active and valid.
 */
export function isInviteValid(invite: {
  expires_at: string;
  revoked_at: string | null;
}): boolean {
  if (invite.revoked_at !== null) {
    return false;
  }
  const expiryTime = new Date(invite.expires_at).getTime();
  return Number.isFinite(expiryTime) && expiryTime > Date.now();
}

/**
 * Checks whether the user role permits editing celebration details, themes, and music.
 */
export function canUserEditCanvas(role: CollaboratorRole | null | undefined): boolean {
  return role === 'owner' || role === 'co_organizer';
}

/**
 * Checks whether the user role permits deleting the celebration canvas entirely.
 */
export function canUserDeleteCanvas(role: CollaboratorRole | null | undefined): boolean {
  return role === 'owner';
}

/**
 * Checks whether the user role permits altering gift pool bank resolution details.
 */
export function canUserModifyPayoutBankDetails(role: CollaboratorRole | null | undefined): boolean {
  return role === 'owner';
}

import { useEffect, useRef, useState } from 'react';
import { apiFetch } from '@/lib/api';
import type { BankOption } from './types';

export interface UseBankResolutionOptions {
  initialBankCode?: string;
  initialAccountNumber?: string;
  initialAccountName?: string;
  isProUser: boolean;
  poolFundraisingEnabled: boolean;
}

export interface UseBankResolutionReturn {
  bankOptions: BankOption[];
  loadingBankOptions: boolean;
  recipientBankCode: string;
  setRecipientBankCode: (code: string) => void;
  recipientAccountNumber: string;
  setRecipientAccountNumber: (number: string) => void;
  recipientAccountName: string;
  setRecipientAccountName: (name: string) => void;
  resolvingRecipientAccount: boolean;
  recipientResolveError: string | null;
  setRecipientResolveError: (error: string | null) => void;
  hasResolvedPoolRecipient: boolean;
  requiresResolvedPoolRecipient: boolean;
}

export function useBankResolution({
  initialBankCode = '',
  initialAccountNumber = '',
  initialAccountName = '',
  isProUser,
  poolFundraisingEnabled,
}: UseBankResolutionOptions): UseBankResolutionReturn {
  const [bankOptions, setBankOptions] = useState<BankOption[]>([]);
  const [loadingBankOptions, setLoadingBankOptions] = useState(false);
  const [recipientBankCode, setRecipientBankCode] = useState(initialBankCode);
  const [recipientAccountNumber, setRecipientAccountNumber] = useState(initialAccountNumber);
  const [recipientAccountName, setRecipientAccountName] = useState(initialAccountName);
  const [resolvingRecipientAccount, setResolvingRecipientAccount] = useState(false);
  const [recipientResolveError, setRecipientResolveError] = useState<string | null>(null);
  const lastResolvedRecipientRef = useRef<string | null>(null);

  // Fetch available banks from standard endpoint, falling back to legacy path if needed
  useEffect(() => {
    let cancelled = false;
    setLoadingBankOptions(true);

    apiFetch<BankOption[] | { banks: BankOption[] }>('/payments/banks')
      .then((data) => {
        if (cancelled) return;
        const list = Array.isArray(data) ? data : Array.isArray(data?.banks) ? data.banks : [];
        setBankOptions(list);
      })
      .catch((primaryError) => {
        // Fallback to provider route if standard route fails
        apiFetch<BankOption[] | { banks: BankOption[] }>('/payments/paystack/banks')
          .then((data) => {
            if (cancelled) return;
            const list = Array.isArray(data) ? data : Array.isArray(data?.banks) ? data.banks : [];
            setBankOptions(list);
          })
          .catch(() => {
            console.error('Failed to load banking institution options:', primaryError);
          });
      })
      .finally(() => {
        if (!cancelled) {
          setLoadingBankOptions(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  // Debounced account resolution when bank code or account number changes
  useEffect(() => {
    if (!isProUser || !poolFundraisingEnabled) {
      setRecipientResolveError(null);
      setResolvingRecipientAccount(false);
      return;
    }

    const cleanAccount = recipientAccountNumber.replace(/\D/g, '').slice(0, 10);
    if (!recipientBankCode || cleanAccount.length !== 10) {
      setRecipientAccountName('');
      setRecipientResolveError(null);
      lastResolvedRecipientRef.current = null;
      return;
    }

    const key = `${recipientBankCode}:${cleanAccount}`;
    if (lastResolvedRecipientRef.current === key) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setResolvingRecipientAccount(true);
      setRecipientResolveError(null);

      apiFetch<{ accountName: string; accountNumber: string; bankCode?: string }>('/payments/resolve-account', {
        method: 'POST',
        body: JSON.stringify({
          accountNumber: cleanAccount,
          bankCode: recipientBankCode,
        }),
      })
        .then((data) => {
          setRecipientAccountName((data.accountName || '').trim());
          lastResolvedRecipientRef.current = key;
          setRecipientResolveError(null);
        })
        .catch(() => {
          // Fallback to provider route if standard route fails
          apiFetch<{ accountName: string; accountNumber: string; bankCode?: string }>('/payments/paystack/resolve-account', {
            method: 'POST',
            body: JSON.stringify({
              accountNumber: cleanAccount,
              bankCode: recipientBankCode,
            }),
          })
            .then((data) => {
              setRecipientAccountName((data.accountName || '').trim());
              lastResolvedRecipientRef.current = key;
              setRecipientResolveError(null);
            })
            .catch(() => {
              setRecipientAccountName('');
              lastResolvedRecipientRef.current = null;
              setRecipientResolveError('Could not resolve account name. Check the bank and account number.');
            });
        })
        .finally(() => {
          setResolvingRecipientAccount(false);
        });
    }, 450);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [isProUser, poolFundraisingEnabled, recipientAccountNumber, recipientBankCode]);

  const hasResolvedPoolRecipient = Boolean(
    recipientBankCode &&
    recipientAccountNumber.replace(/\D/g, '').length === 10 &&
    recipientAccountName.trim(),
  );

  const requiresResolvedPoolRecipient = isProUser && poolFundraisingEnabled;

  return {
    bankOptions,
    loadingBankOptions,
    recipientBankCode,
    setRecipientBankCode,
    recipientAccountNumber,
    setRecipientAccountNumber,
    recipientAccountName,
    setRecipientAccountName,
    resolvingRecipientAccount,
    recipientResolveError,
    setRecipientResolveError,
    hasResolvedPoolRecipient,
    requiresResolvedPoolRecipient,
  };
}

// Backwards-compatible aliases
export const usePaystackBankResolution = useBankResolution;
export type UsePaystackBankResolutionOptions = UseBankResolutionOptions;
export type UsePaystackBankResolutionReturn = UseBankResolutionReturn;

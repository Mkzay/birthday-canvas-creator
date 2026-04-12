import { Check, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import type { PaystackBankOption } from '../types';

export type CreateThemeProFooterProps = {
  isProUser: boolean;
  publicCodeInput: string;
  onPublicCodeInputChange: (value: string) => void;
  publicCodeError: string | null;
  revealAtInput: string;
  onRevealAtInputChange: (value: string) => void;
  revealPinInput: string;
  onRevealPinInputChange: (value: string) => void;
  poolFundraisingEnabled: boolean;
  onPoolFundraisingToggle: (checked: boolean) => void;
  poolGoalNairaInput: string;
  onPoolGoalNairaInputChange: (value: string) => void;
  poolDescriptionInput: string;
  onPoolDescriptionInputChange: (value: string) => void;
  recipientBankCode: string;
  onRecipientBankCodeChange: (code: string) => void;
  recipientAccountNumber: string;
  onRecipientAccountNumberChange: (value: string) => void;
  recipientAccountName: string;
  loadingBankOptions: boolean;
  bankOptions: PaystackBankOption[];
  resolvingRecipientAccount: boolean;
  recipientResolveError: string | null;
};

export function CreateThemeProFooter({
  isProUser,
  publicCodeInput,
  onPublicCodeInputChange,
  publicCodeError,
  revealAtInput,
  onRevealAtInputChange,
  revealPinInput,
  onRevealPinInputChange,
  poolFundraisingEnabled,
  onPoolFundraisingToggle,
  poolGoalNairaInput,
  onPoolGoalNairaInputChange,
  poolDescriptionInput,
  onPoolDescriptionInputChange,
  recipientBankCode,
  onRecipientBankCodeChange,
  recipientAccountNumber,
  onRecipientAccountNumberChange,
  recipientAccountName,
  loadingBankOptions,
  bankOptions,
  resolvingRecipientAccount,
  recipientResolveError,
}: CreateThemeProFooterProps) {
  const navigate = useNavigate();

  return (
    <div className="panel-inset mt-4 p-4 sm:p-6">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-lg font-bold text-foreground">Pro controls</h3>
        <span
          className={cn(
            'rounded-full px-2.5 py-1 text-[11px] font-semibold',
            isProUser ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700',
          )}
        >
          {isProUser ? 'Pro active' : 'Pro required'}
        </span>
      </div>
      {isProUser ? (
        <div className="mt-4 space-y-4">
          <div>
            <Label htmlFor="publicCode" className="text-foreground">
              Custom public link (optional)
            </Label>
            <Input
              id="publicCode"
              value={publicCodeInput}
              onChange={(event) => onPublicCodeInputChange(event.target.value)}
              className="mt-2"
              placeholder="e.g. ada-birthday-2026"
            />
            {publicCodeError && <p className="mt-2 text-xs font-medium text-destructive">{publicCodeError}</p>}
            <p className="mt-2 text-xs text-muted-foreground">Leave empty to auto-generate a random link.</p>
          </div>
          <div>
            <Label htmlFor="revealAt" className="text-foreground">
              Scheduled reveal date and time (optional)
            </Label>
            <Input
              id="revealAt"
              type="datetime-local"
              value={revealAtInput}
              onChange={(event) => onRevealAtInputChange(event.target.value)}
              className="mt-2"
            />
            <p className="mt-2 text-xs text-muted-foreground">
              Leave empty to reveal automatically on the birthday date. Set a future date/time for timed unlock.
            </p>
          </div>
          <div>
            <Label htmlFor="revealPin" className="text-foreground">
              Secret reveal PIN (optional)
            </Label>
            <Input
              id="revealPin"
              value={revealPinInput}
              onChange={(event) => onRevealPinInputChange(event.target.value)}
              className="mt-2"
              inputMode="numeric"
              placeholder="4 to 12 digit PIN"
            />
            <p className="mt-2 text-xs text-muted-foreground">
              Anyone opening the birthday link will need this PIN before they can view wishes.
            </p>
          </div>

          <div className="rounded-xl border border-border/70 bg-background/70 p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-foreground">Pool money gifts</p>
                <p className="text-xs text-muted-foreground">Enable Paystack contributions for this page.</p>
              </div>
              <Switch checked={poolFundraisingEnabled} onCheckedChange={onPoolFundraisingToggle} />
            </div>

            {poolFundraisingEnabled && (
              <div className="mt-4 space-y-3">
                <div>
                  <Label htmlFor="poolGoal" className="text-foreground">
                    Goal amount (NGN, optional)
                  </Label>
                  <Input
                    id="poolGoal"
                    type="number"
                    min="0"
                    step="0.01"
                    value={poolGoalNairaInput}
                    onChange={(event) => onPoolGoalNairaInputChange(event.target.value)}
                    className="mt-2"
                    placeholder="e.g. 50000"
                  />
                </div>
                <div>
                  <Label htmlFor="poolDescription" className="text-foreground">
                    Pool description (optional)
                  </Label>
                  <Textarea
                    id="poolDescription"
                    value={poolDescriptionInput}
                    onChange={(event) => onPoolDescriptionInputChange(event.target.value)}
                    className="mt-2 min-h-[80px]"
                    placeholder="What contributors are helping with"
                  />
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <Label htmlFor="recipientBankCode" className="text-foreground">
                      Recipient bank
                    </Label>
                    <select
                      id="recipientBankCode"
                      value={recipientBankCode}
                      onChange={(event) => onRecipientBankCodeChange(event.target.value)}
                      className="mt-2 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                      disabled={loadingBankOptions}
                    >
                      <option value="">{loadingBankOptions ? 'Loading banks...' : 'Select bank'}</option>
                      {bankOptions.map((bank) => (
                        <option key={bank.code} value={bank.code}>
                          {bank.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <Label htmlFor="recipientAccountNumber" className="text-foreground">
                      Recipient account number
                    </Label>
                    <Input
                      id="recipientAccountNumber"
                      value={recipientAccountNumber}
                      onChange={(event) => onRecipientAccountNumberChange(event.target.value)}
                      className="mt-2"
                      placeholder="10-20 digits"
                      inputMode="numeric"
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="recipientAccountName" className="text-foreground">
                    Recipient account name (auto-resolved)
                  </Label>
                  <Input
                    id="recipientAccountName"
                    value={recipientAccountName}
                    className="mt-2"
                    placeholder={resolvingRecipientAccount ? 'Resolving account name...' : 'Account name will appear automatically'}
                    readOnly
                  />
                  <div className="mt-2 flex items-center gap-2">
                    {resolvingRecipientAccount ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-[11px] font-medium text-muted-foreground">
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        Resolving account
                      </span>
                    ) : recipientAccountName.trim() && !recipientResolveError ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 text-[11px] font-semibold text-emerald-700">
                        <Check className="h-3.5 w-3.5" />
                        Account resolved
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-[11px] font-medium text-muted-foreground">
                        Enter bank and account number to resolve
                      </span>
                    )}
                  </div>
                  {recipientResolveError && (
                    <p className="mt-2 text-xs font-medium text-destructive">{recipientResolveError}</p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="mt-4 rounded-xl border border-border/70 bg-muted/30 p-4">
          <p className="text-sm text-muted-foreground">
            Custom links, scheduled reveal, and secret PIN unlock are available on Pro.
          </p>
          <Button type="button" variant="outline" className="mt-3" onClick={() => navigate('/billing')}>
            Upgrade to Pro
          </Button>
        </div>
      )}
    </div>
  );
}

import type { T } from '@/lib/admin/i18n';
import type { BankAccount } from '@/lib/admin/people';

/** A bank account's two addresses for a transfer abroad (0092), one quiet line each, under its number. */
export function BankAddresses({ account, t }: { account: Pick<BankAccount, 'holderAddress' | 'bankAddress'>; t: T }) {
  const line = (text: string) =>
    text
      .split(/\r?\n/)
      .map((part) => part.trim())
      .filter(Boolean)
      .join(', ');
  return (
    <>
      {account.holderAddress ? (
        <span className="mt-0.5 block text-xs text-[var(--casa-muted)]">
          {t('Kontoinhaber', 'Holder')}: {line(account.holderAddress)}
        </span>
      ) : null}
      {account.bankAddress ? (
        <span className="mt-0.5 block text-xs text-[var(--casa-muted)]">
          {t('Bank', 'Bank')}: {line(account.bankAddress)}
        </span>
      ) : null}
    </>
  );
}

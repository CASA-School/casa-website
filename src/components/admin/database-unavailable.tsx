import { getI18n } from '@/lib/admin/i18n.server';

import { Icon } from './icons';
import { IconChip } from './ui';

/**
 * What the workspace shows when `DATABASE_URL` is unset.
 *
 * The public site answers this case by serving in-repo fixtures, which is a
 * supported runtime mode for a marketing page. The workspace cannot: fixture
 * queues would show zero enquiries and zero registrations, which is
 * indistinguishable from a quiet morning and would let staff conclude nothing
 * had come in. Saying so plainly is the only honest option.
 */
export async function DatabaseUnavailable() {
  const { t } = await getI18n();
  return (
    <div className="flex min-h-dvh items-center justify-center bg-ws-canvas px-6 py-16">
      <div className="w-full max-w-md rounded-3xl border border-ws-line bg-white p-6 shadow-[0_1px_2px_rgba(15,23,42,0.05)]">
        <div className="flex items-center gap-3">
          <IconChip icon={Icon.attention} tint="sun" size="md" />
          <h1 className="text-xl leading-tight font-extrabold tracking-[-0.01em] text-[var(--casa-ink)]">
            {t('Der Arbeitsbereich hat keine Datenbank', 'The workspace has no database')}
          </h1>
        </div>
        <p className="mt-3 text-sm leading-relaxed text-[var(--casa-text-subtle)]">
          {t(
            'Jede Ansicht hier liest und schreibt echte Datensätze, deshalb erscheint nichts, bis sie verbunden ist.',
            'Every screen here reads and writes real records, so nothing shows until it is connected.'
          )}
        </p>
        <div className="mt-5 rounded-xl border border-ws-line bg-[#f8fafc] px-4 py-3">
          <p className="text-xs font-bold text-[var(--casa-muted)]">{t('Lokal starten', 'To start it locally')}</p>
          <pre className="mt-2 overflow-x-auto text-xs leading-relaxed text-[var(--casa-ink)]">
            <code>{'npm run db:up\nnpm run db:migrate\nnpm run admin:seed'}</code>
          </pre>
        </div>
        <p className="mt-4 text-xs text-[var(--casa-text-subtle)]">
          {t('Alles Weitere in ', 'Full setup in ')}<code className="font-mono">docs/ADMIN_WORKSPACE.md</code>.
        </p>
      </div>
    </div>
  );
}

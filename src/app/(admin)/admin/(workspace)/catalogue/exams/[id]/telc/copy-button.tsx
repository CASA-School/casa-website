'use client';

import { useState } from 'react';

import { useWsLang } from '@/components/admin/lang';
import { Button } from '@/components/admin/ui';

/** Copies the list as tab-separated lines, header first: it pastes into telc's form or a spreadsheet as columns. */
export function CopyButton({ rows }: { rows: readonly (readonly string[])[] }) {
  const { t } = useWsLang();
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(rows.map((r) => r.join('\t')).join('\n'));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };
  return (
    <Button type="button" onClick={copy}>
      {copied ? t('Kopiert', 'Copied') : t('Liste kopieren', 'Copy the list')}
    </Button>
  );
}

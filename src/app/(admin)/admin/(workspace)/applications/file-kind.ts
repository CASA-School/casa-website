import { pick, type Bilingual, type WsLang } from '@/lib/admin/i18n';

/**
 * A CV's kind in a word — "PDF", "Word" — rather than its media type: a
 * colleague deciding whether a file opens wants the former, and
 * `application/vnd.openxmlformats-officedocument…` is plumbing.
 */
const IMAGE: Bilingual = { de: 'Bild', en: 'Image' };

const BY_EXTENSION: Record<string, string | Bilingual> = {
  pdf: 'PDF',
  doc: 'Word',
  docx: 'Word',
  odt: 'OpenDocument',
  rtf: 'RTF',
  txt: 'Text',
  jpg: IMAGE,
  jpeg: IMAGE,
  png: IMAGE,
};

const BY_TYPE: Record<string, string> = {
  'application/pdf': 'PDF',
  'application/msword': 'Word',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'Word',
  'application/vnd.oasis.opendocument.text': 'OpenDocument',
};

export function fileKind(fileName: string | null | undefined, mimeType: string | null | undefined, lang: WsLang): string | null {
  const extension = fileName?.split('.').pop()?.toLowerCase();
  const kind = extension && extension !== fileName?.toLowerCase() ? BY_EXTENSION[extension] : undefined;
  if (kind) {
    return typeof kind === 'string' ? kind : pick(lang, kind);
  }
  return (mimeType && BY_TYPE[mimeType]) || null;
}

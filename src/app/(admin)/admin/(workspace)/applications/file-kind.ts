/**
 * A CV's kind in a word — "PDF", "Word" — rather than its media type: a
 * colleague deciding whether a file opens wants the former, and
 * `application/vnd.openxmlformats-officedocument…` is plumbing.
 */
const BY_EXTENSION: Record<string, string> = {
  pdf: 'PDF',
  doc: 'Word',
  docx: 'Word',
  odt: 'OpenDocument',
  rtf: 'RTF',
  txt: 'Text',
  jpg: 'Image',
  jpeg: 'Image',
  png: 'Image',
};

const BY_TYPE: Record<string, string> = {
  'application/pdf': 'PDF',
  'application/msword': 'Word',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'Word',
  'application/vnd.oasis.opendocument.text': 'OpenDocument',
};

export function fileKind(fileName: string | null | undefined, mimeType?: string | null): string | null {
  const extension = fileName?.split('.').pop()?.toLowerCase();
  if (extension && extension !== fileName?.toLowerCase() && BY_EXTENSION[extension]) {
    return BY_EXTENSION[extension];
  }
  return (mimeType && BY_TYPE[mimeType]) || null;
}

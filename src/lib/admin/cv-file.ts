/**
 * What a CV may be, decided by its bytes and its name — never by the MIME type
 * the browser declared, which is whatever the uploader's machine (or script)
 * says it is.
 *
 * Used on both sides: the public apply route refuses anything whose extension
 * and leading bytes do not agree, and the workspace's download route names the
 * file after what its bytes are, so a `Lebenslauf.pdf.exe` can never reach a
 * colleague's desktop under a name the operating system would run.
 *
 * No db import: the public route imports this.
 */

type CvKind = 'pdf' | 'doc' | 'docx';

const CV_KINDS: Record<CvKind, { mimeType: string; signature: readonly number[] }> = {
  // `%PDF-`
  pdf: { mimeType: 'application/pdf', signature: [0x25, 0x50, 0x44, 0x46, 0x2d] },
  // OLE2 compound file, the container of a Word 97–2003 document
  doc: {
    mimeType: 'application/msword',
    signature: [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1],
  },
  // ZIP local file header, the container of an Office Open XML document
  docx: {
    mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    signature: [0x50, 0x4b, 0x03, 0x04],
  },
};

const ACCEPTED_MIME_TYPES = new Set(Object.values(CV_KINDS).map((kind) => kind.mimeType));

const isKind = (value: string): value is CvKind => Object.hasOwn(CV_KINDS, value);

/** The kind the file's leading bytes identify, or null. */
function cvKindFromBytes(bytes: Uint8Array): CvKind | null {
  for (const [kind, { signature }] of Object.entries(CV_KINDS)) {
    if (signature.every((byte, index) => bytes[index] === byte)) {
      return kind as CvKind;
    }
  }

  return null;
}

/** The kind the file's last extension names, or null. */
function cvKindFromName(name: string): CvKind | null {
  const match = /\.([a-z0-9]+)$/i.exec(name.trim());
  const extension = match?.[1].toLowerCase() ?? '';
  return isKind(extension) ? extension : null;
}

/**
 * Accepts an upload only when its declared type is one of the three, its
 * extension is `.pdf`, `.doc` or `.docx`, and its leading bytes are that kind.
 * An empty declared type is refused: the site's own form never sends one.
 */
export function acceptedCvKind(file: {
  name: string;
  type: string;
  bytes: Uint8Array;
}): CvKind | null {
  if (!ACCEPTED_MIME_TYPES.has(file.type)) {
    return null;
  }

  const kind = cvKindFromName(file.name);
  return kind && cvKindFromBytes(file.bytes) === kind ? kind : null;
}

export const cvMimeType = (kind: CvKind): string => CV_KINDS[kind].mimeType;

/**
 * The name a stored CV is downloaded under: the uploaded name without its last
 * extension, reduced to letters, digits, spaces, dots, dashes and underscores,
 * then the extension its bytes justify — `.bin` when they match none, which is
 * what a file stored before the upload check would get.
 */
export function cvDownloadName(storedName: string, bytes: Uint8Array): string {
  const base =
    storedName
      .replace(/\.[^.]*$/, '')
      .replace(/[^\p{L}\p{N} ._-]+/gu, '_')
      .replace(/^[\s._-]+|[\s.]+$/g, '')
      .slice(0, 80) || 'CV';

  return `${base}.${cvKindFromBytes(bytes) ?? 'bin'}`;
}

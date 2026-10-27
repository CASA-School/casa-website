/**
 * A SchoolMan letter in the workspace's letter shape (`src/lib/admin/letters`, schema 1): its frozen text
 * as paragraphs, nothing composed. Shared by the learners' and the offers' imports, so a letter that
 * belongs to both comes across the same either way. `signer` is the colleague whose signature SchoolMan
 * printed on it (`Letter._ID_Signature`, 0094), by their name in the register.
 */
const dayDe = (stamp) => (stamp ? new Date(`${stamp.slice(0, 10)}T12:00:00Z`).toLocaleDateString('de-DE', { day: 'numeric', month: 'long', year: 'numeric' }) : '');

export function letterDocument(letter, kind, signer = null) {
  const cap = (v) => String(v ?? '').slice(0, 5000);
  const paragraphs = String(letter.text ?? '').replace(/\r/g, '\n').split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
  const parts = [];
  for (const p of paragraphs) for (let i = 0; i < p.length; i += 5000) parts.push(p.slice(i, i + 5000));
  const body = parts.length > 100 ? [...parts.slice(0, 99), parts.slice(99).join('\n\n').slice(0, 5000)] : parts;
  return {
    schema: 1,
    kind,
    language: letter.lang === 'en' ? 'en' : 'de',
    returnAddress: '',
    recipient: String(letter.header ?? '').split(/\r?\n|\r/).map((x) => x.trim()).filter(Boolean).slice(0, 20).map(cap),
    placeDate: letter.sent ? `Bremen, ${dayDe(letter.sent)}` : '',
    subject: { lead: '', title: cap(letter.subject ?? letter.script ?? ''), tail: null },
    salutation: '',
    body: body.map((text) => ({ type: 'text', slot: null, text, strong: false })),
    signOff: '',
    signature: signer ? [cap(signer)] : [],
    footer: [],
  };
}

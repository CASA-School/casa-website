import { listCourseTypes } from '@/lib/admin/catalogue';

/**
 * A course as staff call it.
 *
 * A registration stores the course under the name the learner saw on the
 * public form — „Intensivkurse", "Evening courses" — in the language they
 * registered in, while the workspace names every course by its catalogue name
 * ("Intensive German"). These are the site's public names (the repository's
 * display-name table, which it does not export) mapped to the catalogue slug;
 * a label that matches nothing is shown as written.
 */
const PUBLIC_NAMES: Record<string, string> = {
  intensivkurse: 'intensive-german',
  'intensive courses': 'intensive-german',
  'intensiv deutsch': 'intensive-german',
  abendkurse: 'evening-german',
  'evening courses': 'evening-german',
  'unterricht für gruppen': 'german-for-groups',
  'classes for groups': 'german-for-groups',
  'deutsch für pflege und medizin': 'medical-german',
  'german for nursing and medicine': 'medical-german',
  firmenunterricht: 'in-company',
  'in-company teaching': 'in-company',
  spezialkurse: 'special-courses',
  'special courses': 'special-courses',
  bildungszeit: 'bildungszeit',
};

const key = (value: string) => value.trim().toLowerCase();

/** Resolves a stored course label, or a course type id, to the catalogue's name. */
export async function courseNameResolver(): Promise<(label: string | null, typeId?: string | null) => string | null> {
  const types = await listCourseTypes().catch(() => []);
  const byId = new Map(types.map((type) => [type.id, type.name]));
  const bySlug = new Map(types.map((type) => [type.slug, type.name]));
  const byName = new Map(types.map((type) => [key(type.name), type.name]));

  return (label, typeId) => {
    if (typeId && byId.has(typeId)) return byId.get(typeId)!;
    if (!label) return null;
    const slug = PUBLIC_NAMES[key(label)];
    return byName.get(key(label)) ?? (slug ? bySlug.get(slug) : undefined) ?? label;
  };
}

type JsonLdScriptProps = {
  id: string;
  data: Record<string, unknown> | Array<Record<string, unknown>>;
};

/**
 * JSON for the inside of a `<script>` element.
 *
 * `JSON.stringify` leaves `<` alone, so a value containing `</script>` would
 * end the element early and whatever follows would run as markup — a course or
 * news title from a future import is enough. U+2028 and U+2029 are valid in
 * JSON but not in older JavaScript string literals. All three are escaped as
 * `\uXXXX`, which every JSON parser reads back as the same character.
 */
export function serializeJsonLd(data: unknown): string {
  return JSON.stringify(data)
    .replace(/</g, '\\u003c')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');
}

export function JsonLdScript({ id, data }: JsonLdScriptProps) {
  return (
    <script
      id={id}
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: serializeJsonLd(data) }}
    />
  );
}

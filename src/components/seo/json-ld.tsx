type JsonLdScriptProps = {
  id: string;
  data: Record<string, unknown> | Array<Record<string, unknown>>;
};

export function JsonLdScript({ id, data }: JsonLdScriptProps) {
  return (
    <script
      id={id}
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}

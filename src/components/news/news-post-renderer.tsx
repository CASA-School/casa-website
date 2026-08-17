import type { ReactNode } from 'react';
import { CalendarDays } from 'lucide-react';

type RichMark = {
  type?: string;
  attrs?: Record<string, unknown>;
};

type RichNode = {
  type?: string;
  text?: string;
  marks?: RichMark[];
  attrs?: Record<string, unknown>;
  content?: RichNode[];
};

type RichDoc = {
  type?: string;
  content?: RichNode[];
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isRichDoc(value: unknown): value is RichDoc {
  return isRecord(value) && value.type === 'doc' && Array.isArray(value.content);
}

function applyMarks(text: string, marks: RichMark[] | undefined, key: string) {
  let node: ReactNode = text;

  for (const mark of marks ?? []) {
    const markType = mark.type;
    if (markType === 'bold') {
      node = <strong key={`${key}-bold`}>{node}</strong>;
      continue;
    }
    if (markType === 'italic') {
      node = <em key={`${key}-italic`}>{node}</em>;
      continue;
    }
    if (markType === 'code') {
      node = <code key={`${key}-code`} className="rounded-sm bg-[var(--casa-surface-subtle)] px-1 py-0.5 text-[0.95em]">{node}</code>;
      continue;
    }
    if (markType === 'link') {
      const href = typeof mark.attrs?.href === 'string' ? mark.attrs.href : '#';
      node = (
        <a
          key={`${key}-link`}
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="font-semibold text-[var(--casa-accent-text)] underline decoration-[color:var(--casa-blue)]/40 underline-offset-4 hover:text-[var(--casa-accent-text-hover)]"
        >
          {node}
        </a>
      );
    }
  }

  return node;
}

function renderInlineContent(nodes: RichNode[] | undefined, keyPrefix: string) {
  if (!nodes || nodes.length === 0) {
    return null;
  }

  return nodes.map((node, index) => {
    const nodeKey = `${keyPrefix}-${index}`;

    if (node.type === 'text') {
      return <span key={nodeKey}>{applyMarks(node.text ?? '', node.marks, nodeKey)}</span>;
    }

    if (node.type === 'hardBreak') {
      return <br key={nodeKey} />;
    }

    return <span key={nodeKey}>{renderNode(node, nodeKey)}</span>;
  });
}

function renderNode(node: RichNode, key: string): ReactNode {
  switch (node.type) {
    case 'paragraph':
      return <p key={key}>{renderInlineContent(node.content, key)}</p>;
    case 'heading': {
      const levelValue = typeof node.attrs?.level === 'number' ? node.attrs.level : 2;
      const level = levelValue <= 2 ? 2 : levelValue === 3 ? 3 : 4;
      if (level === 2) {
        return <h2 key={key} className="mt-7 text-2xl font-bold text-[var(--casa-ink)]">{renderInlineContent(node.content, key)}</h2>;
      }
      if (level === 3) {
        return <h3 key={key} className="mt-6 text-xl font-bold text-[var(--casa-ink)]">{renderInlineContent(node.content, key)}</h3>;
      }
      return <h4 key={key} className="mt-5 text-lg font-bold text-[var(--casa-ink)]">{renderInlineContent(node.content, key)}</h4>;
    }
    case 'bulletList':
      return (
        <ul key={key} className="list-disc space-y-2 pl-6">
          {(node.content ?? []).map((child, index) => renderNode(child, `${key}-li-${index}`))}
        </ul>
      );
    case 'orderedList':
      return (
        <ol key={key} className="list-decimal space-y-2 pl-6">
          {(node.content ?? []).map((child, index) => renderNode(child, `${key}-li-${index}`))}
        </ol>
      );
    case 'listItem':
      return <li key={key}>{renderInlineContent(node.content, key)}</li>;
    case 'blockquote':
      return (
        <blockquote key={key} className="rounded-r-xl border-l-4 border-[var(--casa-sky-soft)] bg-[var(--casa-surface-wash)] px-4 py-3 text-[var(--casa-ink)]">
          {renderInlineContent(node.content, key)}
        </blockquote>
      );
    case 'horizontalRule':
      return <hr key={key} className="my-6 border-[color:var(--casa-sand)]" />;
    case 'image': {
      const src = typeof node.attrs?.src === 'string' ? node.attrs.src : '';
      const alt = typeof node.attrs?.alt === 'string' ? node.attrs.alt : '';
      if (!src) {
        return null;
      }

      return (
        <figure key={key} className="my-6 overflow-hidden rounded-xl border border-[color:var(--casa-sand)] bg-[var(--casa-surface-wash)]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={src} alt={alt} className="h-auto w-full object-cover" loading="lazy" />
          {alt ? <figcaption className="px-3 py-2 text-xs text-[var(--casa-muted)]">{alt}</figcaption> : null}
        </figure>
      );
    }
    case 'text':
      return <span key={key}>{applyMarks(node.text ?? '', node.marks, key)}</span>;
    default:
      return node.content ? <>{renderInlineContent(node.content, key)}</> : null;
  }
}

function renderRichBody(contentJson: unknown) {
  if (!isRichDoc(contentJson)) {
    return null;
  }

  return contentJson.content?.map((node, index) => renderNode(node, `doc-${index}`)) ?? null;
}

export function formatNewsDate(value: string, locale: 'en' | 'de') {
  return new Intl.DateTimeFormat(locale === 'de' ? 'de-DE' : 'en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date(value));
}

export function estimateNewsReadingTime(text: string) {
  const words = text.trim().split(/\s+/).length;
  return Math.max(1, Math.round(words / 220));
}

export function splitNewsBodyIntoParagraphs(body: string) {
  return body
    .split(/\n{2,}/)
    .map((segment) => segment.trim())
    .filter(Boolean);
}

type NewsPostLeadProps = {
  locale: 'en' | 'de';
  category: string;
  title: string;
  summary: string;
  body: string;
  publishedAt: string;
  author: string;
};

export function NewsPostLead({
  locale,
  category,
  title,
  summary,
  body,
  publishedAt,
  author,
}: NewsPostLeadProps) {
  return (
    <div className="max-w-3xl">
      <p className="mb-3 inline-flex rounded-full border border-[color:var(--casa-sand)] bg-[var(--casa-surface-wash)] px-3 py-1 text-xs font-semibold uppercase tracking-eyebrow text-[var(--casa-muted)]">
        {category}
      </p>
      <h2 className="text-4xl font-bold sm:text-5xl">{title}</h2>
      {summary ? <p className="mt-5 text-lg leading-relaxed text-[var(--casa-muted)]">{summary}</p> : null}
      <div className="mt-5 flex flex-wrap items-center gap-4 text-sm text-[var(--casa-muted)]">
        <span className="inline-flex items-center gap-1.5">
          <CalendarDays className="h-4 w-4" />
          {formatNewsDate(publishedAt, locale)}
        </span>
        <span>{estimateNewsReadingTime(body)} min read</span>
        <span>{author}</span>
      </div>
    </div>
  );
}

type NewsPostBodyProps = {
  body: string;
  contentJson?: unknown;
};

export function NewsPostBody({ body, contentJson }: NewsPostBodyProps) {
  const richBody = renderRichBody(contentJson);
  const paragraphs = splitNewsBodyIntoParagraphs(body);

  return (
    <article className="rounded-3xl border border-[color:var(--casa-sand)]/80 bg-white p-7 shadow-[var(--shadow-soft)] sm:p-8">
      <div className="space-y-5 text-base leading-relaxed text-[var(--casa-ink)]">
        {richBody ?? paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
      </div>
    </article>
  );
}

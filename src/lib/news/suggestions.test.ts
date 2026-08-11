import { describe, expect, test } from 'vitest';

import {
  buildNewsSuggestions,
  calculateReadingMinutes,
  ensureUniqueLocalizedSlug,
} from '@/lib/news/suggestions';

describe('news suggestion engine', () => {
  test('creates locale suffix slug and resolves uniqueness', () => {
    const suggestions = buildNewsSuggestions(
      {
        title: 'Study in Germany Checklist',
        summary: 'Plan your application journey.',
        body: 'A practical checklist for international students.',
        locale: 'en',
      },
      {
        existingSlugs: ['study-in-germany-checklist-en', 'another-slug-en'],
      },
    );

    expect(suggestions.slug).toBe('study-in-germany-checklist-en-2');
  });

  test('calculates reading time using 200 words per minute', () => {
    const words = new Array(201).fill('word').join(' ');
    expect(calculateReadingMinutes(words)).toBe(2);
  });

  test('truncates seo title and description to expected limits', () => {
    const suggestions = buildNewsSuggestions({
      title: 'A'.repeat(100),
      summary: 'B'.repeat(200),
      body: 'C'.repeat(400),
      locale: 'en',
    });

    expect(suggestions.seoTitle.length).toBeLessThanOrEqual(60);
    expect(suggestions.seoDescription.length).toBeLessThanOrEqual(160);
  });

  test('suggests category and bounded tags from deterministic keyword heuristics', () => {
    const suggestions = buildNewsSuggestions({
      title: 'telc exam registration roadmap',
      summary: 'How to prepare for the exam deadline.',
      body: 'This guide covers exam prep, telc tips, and deadline strategy.',
      locale: 'en',
    });

    expect(suggestions.category).toBe('Exams');
    expect(suggestions.tags.length).toBeGreaterThanOrEqual(5);
    expect(suggestions.tags.length).toBeLessThanOrEqual(8);
    expect(suggestions.tags).toContain('exam preparation');
  });

  test('ensures fallback uniqueness if many duplicates exist', () => {
    const existing = Array.from({ length: 12 }, (_, index) =>
      index === 0 ? 'post-en' : `post-en-${index + 1}`,
    );
    const slug = ensureUniqueLocalizedSlug('post-en', existing);

    expect(slug).toBe('post-en-13');
  });
});

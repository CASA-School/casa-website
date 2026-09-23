import type { ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/i18n/navigation', () => ({
  Link: ({ href, children, ...rest }: { href: string; children: ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));
vi.mock('@/components/forms/career-application-form', () => ({
  CareerApplicationForm: () => <form data-testid="career-application-form" />,
}));

import { ApplySection } from './apply-section';

const POSITION = {
  id: '79b868c5-c66b-4288-9be6-000000000043',
  slug: 'daf-lehrkraft-bremen',
  title: 'DaF-Lehrkraft',
  applyEmail: 'bewerbungen@casa-bremen.de',
};

const render = (props: Partial<Parameters<typeof ApplySection>[0]> = {}) =>
  renderToStaticMarkup(
    <ApplySection locale="de" position={POSITION} acceptsUploads={false} {...props} />
  );

describe('career application section', () => {
  it('offers the application address, not a form that cannot store a CV, without a database', () => {
    const markup = render();

    expect(markup).not.toContain('career-application-form');
    expect(markup).toContain(
      'href="mailto:bewerbungen@casa-bremen.de?subject=Bewerbung%3A%20DaF-Lehrkraft"'
    );
  });

  it('falls back to the contact form when the role names no address', () => {
    const markup = render({ position: { ...POSITION, applyEmail: null }, locale: 'en' });

    expect(markup).not.toContain('mailto:');
    expect(markup).toContain('href="/contact?topic=careers"');
    expect(markup).toContain('Go to the contact form');
  });

  it('shows the upload form once CVs can be stored', () => {
    const markup = render({ acceptsUploads: true });

    expect(markup).toContain('career-application-form');
    expect(markup).not.toContain('mailto:');
  });
});

import { notFound } from 'next/navigation';

import { internalSurfacesEnabled } from '@/lib/internal-surfaces';

export default function DesignAlternativesLayout({ children }: { children: React.ReactNode }) {
  if (!internalSurfacesEnabled()) {
    notFound();
  }

  return children;
}

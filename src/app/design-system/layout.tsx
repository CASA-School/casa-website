import { notFound } from 'next/navigation';

import { internalSurfacesEnabled } from '@/lib/internal-surfaces';

export default function DesignSystemLayout({ children }: { children: React.ReactNode }) {
  if (!internalSurfacesEnabled()) {
    notFound();
  }

  return children;
}

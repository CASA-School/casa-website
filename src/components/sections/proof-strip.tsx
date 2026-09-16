import type { ProofMetric } from '@/lib/content/types';

export type ProofStripItem = {
  value: string;
  label: string;
  description?: string;
  isDraft?: boolean;
};

export function toProofStripItems(metrics: ProofMetric[], showDraftClaims = false, limit = 6): ProofStripItem[] {
  return metrics
    .filter((metric) => showDraftClaims || metric.verificationStatus === 'verified')
    .slice(0, limit)
    .map((metric) => ({
      value: metric.value,
      label: metric.label,
      description: metric.asOf,
      isDraft: metric.verificationStatus === 'draft',
    }));
}

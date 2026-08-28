import { Container } from '@/components/ui/container';

/**
 * A short centred hairline between two bands of the SAME surface.
 *
 * Only between light bands, and deliberately not full-width. A rule that runs
 * edge to edge reads as a structural break — the kind of thing that separates
 * a header from a body — which is far more weight than "these are two different
 * thoughts" deserves. 6rem of hairline centred in the frame marks the seam
 * without claiming to divide the page.
 *
 * There is none around an ink-deep band: a light-to-dark boundary is roughly a
 * 90-point step in lightness and needs no help. Drawing a line where the eye can
 * already see the change is what makes a page look fussy — and that rule is the
 * reason this component moved out of src/app/page.tsx. It was private to the
 * homepage, so /accommodation reached for the only other thing available and drew
 * `border-t border-[color:var(--casa-sand)]/40` across the full 1360px frame SIX
 * times, including once against the ink-deep field, where the ground already
 * changes by 90 points of lightness, and once against white, where it changes by
 * 11. Five of the six marked a boundary the eye could already see.
 */
export function BandSeam() {
  return (
    <div aria-hidden className="py-1">
      <Container>
        <span className="mx-auto block h-px w-24 bg-[color:var(--casa-sand)]" />
      </Container>
    </div>
  );
}

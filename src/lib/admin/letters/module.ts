import type { WorkspaceModule } from '../access';
import type { LetterKind } from './types';

/**
 * The right a letter is seen and sent with: an offer's with `offers`, a website registration's with
 * `registrations`, every other — a booking's, the waiting list's, a learner's — with `bookings`.
 */
export const letterModule = (kind: LetterKind): WorkspaceModule =>
  kind === 'offer' ? 'offers' : kind.startsWith('registration_') ? 'registrations' : 'bookings';

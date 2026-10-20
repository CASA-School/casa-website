/**
 * The test on the first day of an intensive course (Einstufungstest Tag 1): the shapes of its
 * content and of what the phone page and the API say to each other. No answer is ever in here;
 * the keys live in keys.server.ts and never reach a browser (entry-test containment test).
 */

/** Named after the course that writes it: „a2" is the test of the A2 class (it checks A1). */
export type EntryTestId = 'a2' | 'b1' | 'b1plus';
export type EntryTestVersion = 'A' | 'B';
export type Choice = 'A' | 'B' | 'C' | 'D';
export type Verdict = 'richtig' | 'falsch';
/** One answer per slot: a letter for a multiple-choice task, richtig/falsch per reading statement, '' when blank. */
export type Answer = Choice | Verdict | '';

/** A gap in a prompt line is four or more underscores; an option for two gaps reads „sind / besucht". */
export type McTask = { type: 'mc'; n: number; prompt: string[]; options: Record<Choice, string> };
export type ReadingTask = { type: 'reading'; n: number; title: string; intro?: string; text: string[]; statements: string[] };
export type Task = McTask | ReadingTask;
export type TestContent = Record<EntryTestVersion, Task[]>;

/** Pause, unlock, submit: the status of one learner's attempt. */
export type AttemptStatus = 'running' | 'paused' | 'submitted' | 'expired';

/** A task as the phone gets it: options in this attempt's own order. */
export type ClientTask =
  | { type: 'mc'; n: number; prompt: string[]; options: { id: Choice; text: string }[]; slot: number }
  | { type: 'reading'; n: number; title: string; intro?: string; text: string[]; statements: string[]; slot: number };

/** Every reply about an attempt carries its status and the clock. */
export type StatusReply = {
  status: AttemptStatus;
  /** Epoch ms; the server's deadline (the phone counts down to it). */
  deadline: number;
  /** Epoch ms on the server, for the phone's clock offset. */
  now: number;
  /** Set when an unlock failed: a wrong code, or three wrong codes in a row (wait `waitSeconds`). */
  problem?: 'wrong' | 'wait';
  waitSeconds?: number;
};

export type AttemptState = StatusReply & {
  token: string;
  name: string;
  title: string;
  version: EntryTestVersion;
  tasks: ClientTask[];
  /** One per slot, in slot order. */
  answers: Answer[];
};

/** A test that is open right now, as the start screen lists it (never its code). */
export type OpenSitting = { id: string; title: string; course: string; session: 'morning' | 'afternoon'; minutes: number; tasks: number };

/**
 * POST /api/entry-test, one body per action. Replies use the API envelope ({ data, error }).
 *  - info   → { sittings: OpenSitting[] }
 *  - start  → AttemptState; errors: name, email, closed (nothing open), sitting (choose one), done (already submitted)
 *  - save, leave, unlock, status, submit → StatusReply; error token when the attempt is unknown
 * `leave` also arrives by navigator.sendBeacon (text/plain body), so the route reads the raw text.
 */
export type EntryTestRequest =
  | { action: 'info' }
  | { action: 'start'; name: string; email: string; sittingId?: string }
  | { action: 'save'; token: string; answers: Answer[] }
  | { action: 'leave'; token: string; reason: 'hidden' | 'pagehide'; answers?: Answer[] }
  | { action: 'unlock'; token: string; code: string }
  | { action: 'status'; token: string }
  | { action: 'submit'; token: string; answers: Answer[] };

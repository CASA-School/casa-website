import type {
  Answer,
  AttemptState,
  AttemptStatus,
  ClientTask,
  EntryTestRequest,
  OpenSitting,
  StatusReply,
} from '@/lib/entry-test/types';

/**
 * The day-one placement test on the learner's phone (Einstufungstest Tag 1), as a plain object.
 *
 * A port of the Google Apps Script page the test ran on before (exam.src.html), which the
 * director tested on a real phone: the same rules, the same timings, the same German. It is kept
 * outside React on purpose — timers, listeners and one request in flight are mutable state with a
 * life of their own — and React only draws its snapshot (`useSyncExternalStore`).
 *
 * The answers live in memory only. Nothing is written to the browser (privacy policy §5): a reload
 * starts again with the same e-mail address, and the server resumes the attempt as paused, so the
 * teacher's code continues it.
 */

const ENDPOINT = '/api/entry-test';
/** Hidden this long counts as leaving the page; a notification pulled down by accident does not. */
const LEAVE_MS = 2_000;
const INFO_POLL_MS = 15_000;
const LOCK_POLL_MS = 8_000;
const RETRY_MS = 3_000;
const LEAVE_RETRIES = 5;
const NO_CONNECTION = 'Keine Verbindung. Bitte noch einmal versuchen.';

export type SaveState = 'ok' | 'busy' | 'off';

export type EntryTestSnapshot = {
  view: 'start' | 'exam' | 'done';
  /** Tests open right now; one is chosen by itself, several are a choice. */
  sittings: OpenSitting[];
  /** The first `info` has answered (or failed), so „not open yet" is a fact and not a guess. */
  infoLoaded: boolean;
  sittingId: string;
  starting: boolean;
  startError: string;
  info: { title: string; text: string } | null;

  tasks: ClientTask[];
  answers: Answer[];
  page: number;
  /** Bumped whenever a page is drawn afresh (not when an answer changes), so the view scrolls to the top. */
  drawn: number;
  /** Milliseconds left on the server's clock. */
  left: number;
  save: SaveState;
  sheet: boolean;
  confirm: boolean;
  confirmText: string;
  submitting: boolean;

  locked: boolean;
  code: string;
  unlocking: boolean;
  lockError: string;

  timeUp: boolean;
};

export const INITIAL_SNAPSHOT: EntryTestSnapshot = {
  view: 'start',
  sittings: [],
  infoLoaded: false,
  sittingId: '',
  starting: false,
  startError: '',
  info: null,
  tasks: [],
  answers: [],
  page: 0,
  drawn: 0,
  left: 0,
  save: 'ok',
  sheet: false,
  confirm: false,
  confirmText: '',
  submitting: false,
  locked: false,
  code: '',
  unlocking: false,
  lockError: '',
  timeUp: false,
};

type Envelope<T> = { data: T | null; error: { code: string; message: string } | null };
type Result<T> = { ok: true; data: T } | { ok: false; code: string };

/** No answer that can be read: the network, a gateway's error page, a route that is not there. */
class Offline extends Error {}

async function call<T>(body: EntryTestRequest, keepalive = false): Promise<Result<T>> {
  let response: Response;
  try {
    response = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
      cache: 'no-store',
      keepalive,
    });
  } catch {
    throw new Offline();
  }
  let envelope: Envelope<T>;
  try {
    envelope = (await response.json()) as Envelope<T>;
  } catch {
    throw new Offline();
  }
  if (envelope?.error) return { ok: false, code: envelope.error.code };
  if (envelope?.data == null) throw new Offline();
  return { ok: true, data: envelope.data };
}

/** The page is going away: only a beacon still leaves. False when the browser would not queue it. */
function beacon(body: EntryTestRequest): boolean {
  try {
    return typeof navigator.sendBeacon === 'function' && navigator.sendBeacon(ENDPOINT, JSON.stringify(body));
  } catch {
    return false;
  }
}

const isDone = (status: AttemptStatus) => status === 'submitted' || status === 'expired';

/** The answer slots of one page: one for a multiple-choice task, one per statement of a reading task. */
export function slotsOf(task: ClientTask): number[] {
  return task.type === 'mc' ? [task.slot] : task.statements.map((_, i) => task.slot + i);
}

export const answeredCount = (answers: Answer[]) => answers.filter(Boolean).length;

/** mm:ss, never below zero. */
export function formatClock(ms: number): string {
  const seconds = Math.max(0, Math.ceil(ms / 1000));
  return `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
}

export class EntryTestController {
  private snapshot: EntryTestSnapshot = INITIAL_SNAPSHOT;
  private listeners = new Set<() => void>();

  private token: string | null = null;
  private answers: Answer[] = [];
  private readingSlots = new Set<number>();
  private deadline = 0;
  private offset = 0;
  private locked = false;
  private finished = false;
  private armed = false;
  private inFlight = false;
  private dirty = false;
  private submitting = false;
  private submitRetryAt = 0;
  private hiddenAt = 0;
  private lastPoll = 0;
  private mounted = false;
  private wake: WakeLockSentinel | null = null;

  private infoTimer: ReturnType<typeof setInterval> | undefined;
  private tickTimer: ReturnType<typeof setInterval> | undefined;
  private pollTimer: ReturnType<typeof setInterval> | undefined;
  private hideTimer: ReturnType<typeof setTimeout> | undefined;

  // ---------------------------------------------------------------- store

  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  getSnapshot = () => this.snapshot;

  private set(patch: Partial<EntryTestSnapshot>) {
    this.snapshot = { ...this.snapshot, ...patch };
    this.listeners.forEach((listener) => listener());
  }

  // ---------------------------------------------------------------- life cycle

  mount = () => {
    if (this.mounted) return;
    this.mounted = true;
    if (!this.token) {
      this.loadInfo();
      this.infoTimer = setInterval(() => {
        if (!this.token) this.loadInfo();
        else clearInterval(this.infoTimer);
      }, INFO_POLL_MS);
    }
    if (this.armed && !this.finished) {
      this.listen();
      this.tickTimer = setInterval(this.tick, 1000);
      if (this.locked) this.pollTimer = setInterval(this.poll, LOCK_POLL_MS);
      this.keepAwake();
    }
  };

  unmount = () => {
    this.mounted = false;
    clearInterval(this.infoTimer);
    clearInterval(this.tickTimer);
    clearInterval(this.pollTimer);
    clearTimeout(this.hideTimer);
    this.unlisten();
    this.releaseWake();
  };

  private now() {
    return Date.now() + this.offset;
  }

  private sync(reply: Partial<StatusReply> | null | undefined) {
    if (reply?.now) this.offset = reply.now - Date.now();
    if (reply?.deadline) this.deadline = reply.deadline;
    if (this.token) this.set({ left: this.deadline - this.now() });
  }

  /** Keeps the screen on where the browser allows it, so the screen going dark does not count as leaving. */
  private keepAwake() {
    try {
      if ('wakeLock' in navigator && !this.finished) {
        navigator.wakeLock
          .request('screen')
          .then((wake) => {
            this.wake = wake;
          })
          .catch(() => {});
      }
    } catch {
      // No wake lock here; the learner keeps the screen on.
    }
  }

  private releaseWake() {
    try {
      void this.wake?.release().catch(() => {});
    } catch {
      // Already released.
    }
    this.wake = null;
  }

  // ---------------------------------------------------------------- start

  private chosenSitting(): OpenSitting | undefined {
    const { sittings, sittingId } = this.snapshot;
    return sittings.length === 1 ? sittings[0] : sittings.find((sitting) => sitting.id === sittingId);
  }

  private loadInfo() {
    call<{ sittings: OpenSitting[] }>({ action: 'info' })
      .then((reply) => {
        if (!reply.ok) {
          this.set({ infoLoaded: true });
          return;
        }
        const sittings = reply.data.sittings ?? [];
        const keep = this.snapshot.sittingId;
        const sittingId = sittings.length === 1 ? sittings[0].id : sittings.some((sitting) => sitting.id === keep) ? keep : '';
        this.set({ sittings, sittingId, infoLoaded: true });
      })
      .catch(() => this.set({ infoLoaded: true }));
  }

  chooseSitting = (sittingId: string) => this.set({ sittingId });

  start = (rawName: string, rawEmail: string) => {
    if (this.snapshot.starting || this.token) return;
    const name = rawName.trim();
    const email = rawEmail.trim();
    if (name.length < 3) return this.set({ startError: 'Bitte Vor- und Nachnamen eingeben.' });
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return this.set({ startError: 'Bitte eine gültige E-Mail-Adresse eingeben.' });
    if (this.snapshot.sittings.length > 1 && !this.chosenSitting()) return this.set({ startError: 'Bitte Ihre Gruppe wählen.' });

    this.set({ startError: '', starting: true });
    const sitting = this.chosenSitting();
    call<AttemptState>({ action: 'start', name, email, ...(sitting ? { sittingId: sitting.id } : {}) })
      .then((reply) => {
        this.set({ starting: false });
        if (reply.ok) return this.begin(reply.data);
        switch (reply.code) {
          case 'closed':
            return this.showInfo('Der Test ist noch nicht geöffnet', 'Bitte warten Sie auf Ihre Lehrkraft.');
          case 'done':
            return this.showInfo('Schon abgegeben', 'Mit dieser E-Mail-Adresse wurde der Test schon abgegeben.');
          case 'sitting':
            this.set({ startError: 'Bitte Ihre Gruppe wählen.' });
            return this.loadInfo();
          case 'name':
            return this.set({ startError: 'Bitte Vor- und Nachnamen eingeben.' });
          case 'email':
            return this.set({ startError: 'Bitte eine gültige E-Mail-Adresse eingeben.' });
          default:
            return this.set({ startError: NO_CONNECTION });
        }
      })
      .catch(() => this.set({ starting: false, startError: NO_CONNECTION }));
  };

  private showInfo(title: string, text: string) {
    this.set({ info: { title, text } });
  }

  retryInfo = () => {
    this.set({ info: null });
    this.loadInfo();
  };

  private begin(state: AttemptState) {
    this.token = state.token;
    clearInterval(this.infoTimer);
    this.answers = state.answers.slice();
    this.readingSlots = new Set(state.tasks.filter((task) => task.type === 'reading').flatMap(slotsOf));
    this.sync(state);
    const first = state.tasks.findIndex((task) => slotsOf(task).some((slot) => !this.answers[slot]));
    this.set({
      view: 'exam',
      tasks: state.tasks,
      answers: this.answers,
      page: first < 0 ? 0 : first,
      drawn: this.snapshot.drawn + 1,
      left: this.deadline - this.now(),
    });
    this.armed = true;
    if (this.mounted) {
      this.tickTimer = setInterval(this.tick, 1000);
      this.listen();
      this.keepAwake();
    }
    this.handleStatus(state);
  }

  // ---------------------------------------------------------------- pages

  answer = (slot: number, value: Answer) => {
    if (this.locked || this.finished) return;
    const answers = this.answers.slice();
    // A reading answer can be taken back by tapping it again; a multiple-choice answer only changed.
    answers[slot] = answers[slot] === value && this.readingSlots.has(slot) ? '' : value;
    this.answers = answers;
    this.set({ answers });
    this.save();
  };

  previous = () => {
    const { page, drawn } = this.snapshot;
    if (page > 0) this.set({ page: page - 1, drawn: drawn + 1 });
  };

  next = () => {
    const { page, drawn, tasks } = this.snapshot;
    if (page < tasks.length - 1) this.set({ page: page + 1, drawn: drawn + 1 });
    else this.openSheet();
  };

  openSheet = () => this.set({ sheet: true });
  closeSheet = () => this.set({ sheet: false });
  goTo = (page: number) => this.set({ page, sheet: false, drawn: this.snapshot.drawn + 1 });

  askSubmit = () => {
    const empty = this.answers.length - answeredCount(this.answers);
    this.set({
      sheet: false,
      confirm: true,
      confirmText: empty ? `${empty} Antworten sind leer. Danach können Sie nichts mehr ändern.` : 'Danach können Sie nichts mehr ändern.',
    });
  };

  cancelSubmit = () => this.set({ confirm: false });
  confirmSubmit = () => this.submit(false);

  // ---------------------------------------------------------------- saving

  private save() {
    this.dirty = true;
    this.flush();
  }

  /** One request in flight; whatever changed meanwhile goes in the next one. */
  private flush = () => {
    if (this.inFlight || !this.dirty || this.locked || this.finished || !this.token) return;
    this.inFlight = true;
    this.dirty = false;
    this.set({ save: 'busy' });
    call<StatusReply>({ action: 'save', token: this.token, answers: this.answers.slice() })
      .then((reply) => {
        if (!reply.ok) throw new Offline();
        this.inFlight = false;
        this.sync(reply.data);
        this.set({ save: 'ok' });
        this.handleStatus(reply.data);
        if (this.dirty) this.flush();
      })
      .catch(() => {
        this.inFlight = false;
        this.dirty = true;
        this.set({ save: 'off' });
        setTimeout(this.flush, RETRY_MS);
      });
  };

  private handleStatus(reply: StatusReply | null | undefined) {
    if (!reply?.status) return;
    if (isDone(reply.status)) return this.finish(reply.status);
    if (reply.status === 'paused') this.lockNow(null);
  }

  // ---------------------------------------------------------------- time

  private tick = () => {
    if (this.finished) return;
    const left = this.deadline - this.now();
    this.set({ left });
    if (left <= 0 && !this.locked && Date.now() >= this.submitRetryAt) this.submit(true);
    if (left <= 0 && this.locked && Date.now() - this.lastPoll > LOCK_POLL_MS) this.poll();
  };

  // ---------------------------------------------------------------- leaving the page

  /*
   * Only real leaving counts: the page is hidden (another app or tab, the home screen, the screen
   * off) or closed. Losing focus alone is NOT leaving — on phones it happens by itself (the
   * keyboard, a banner, a notification), and listening to blur paused tests that nobody had left;
   * that bug was fixed once in the old page. Hidden for less than LEAVE_MS is ignored.
   */
  private onVisibility = () => {
    if (document.visibilityState === 'hidden') {
      this.hiddenAt = Date.now();
      clearTimeout(this.hideTimer);
      this.hideTimer = setTimeout(() => {
        if (document.visibilityState === 'hidden') this.lockNow('hidden');
      }, LEAVE_MS);
    } else {
      clearTimeout(this.hideTimer);
      if (this.hiddenAt && Date.now() - this.hiddenAt >= LEAVE_MS) this.lockNow('hidden');
      this.hiddenAt = 0;
      this.keepAwake();
    }
  };

  private onPageHide = (event: PageTransitionEvent) => {
    if (!event.persisted) this.lockNow('pagehide');
  };

  private block = (event: Event) => event.preventDefault();

  private listen() {
    document.addEventListener('visibilitychange', this.onVisibility);
    window.addEventListener('pagehide', this.onPageHide);
    document.addEventListener('contextmenu', this.block);
    document.addEventListener('copy', this.block);
  }

  private unlisten() {
    document.removeEventListener('visibilitychange', this.onVisibility);
    window.removeEventListener('pagehide', this.onPageHide);
    document.removeEventListener('contextmenu', this.block);
    document.removeEventListener('copy', this.block);
  }

  private lockNow(reason: 'hidden' | 'pagehide' | null) {
    if (!this.armed || this.finished) return;
    if (!this.locked) {
      this.locked = true;
      this.set({ locked: true, sheet: false, confirm: false, code: '', lockError: '', unlocking: false });
      clearInterval(this.pollTimer);
      this.pollTimer = setInterval(this.poll, LOCK_POLL_MS);
    }
    if (reason) this.report(reason, 0);
  }

  private report(reason: 'hidden' | 'pagehide', attempt: number) {
    if (!this.token) return;
    const body: EntryTestRequest = { action: 'leave', token: this.token, reason, answers: this.answers.slice() };
    if (reason === 'pagehide' && beacon(body)) return;
    call<StatusReply>(body, true)
      .then((reply) => {
        if (!reply.ok) return;
        this.sync(reply.data);
        if (isDone(reply.data.status)) this.finish(reply.data.status);
      })
      .catch(() => {
        if (attempt < LEAVE_RETRIES) setTimeout(() => this.report(reason, attempt + 1), 2000 * (attempt + 1));
      });
  }

  /** While paused: the office can release the attempt from the dashboard. */
  private poll = () => {
    if (!this.token) return;
    this.lastPoll = Date.now();
    call<StatusReply>({ action: 'status', token: this.token })
      .then((reply) => {
        if (!reply.ok) return;
        this.sync(reply.data);
        if (isDone(reply.data.status)) this.finish(reply.data.status);
        else if (reply.data.status === 'running' && this.locked) this.unlock();
      })
      .catch(() => {});
  };

  setCode = (code: string) => this.set({ code: code.slice(0, 6) });

  tryUnlock = () => {
    const code = this.snapshot.code.trim();
    if (!code || !this.token || this.snapshot.unlocking) return;
    this.set({ unlocking: true, lockError: '' });
    call<StatusReply>({ action: 'unlock', token: this.token, code })
      .then((reply) => {
        this.set({ unlocking: false });
        if (!reply.ok) return this.set({ lockError: NO_CONNECTION });
        const status = reply.data;
        this.sync(status);
        if (status.problem === 'wrong') return this.set({ lockError: 'Falscher Code.', code: '' });
        if (status.problem === 'wait') return this.set({ lockError: `Bitte ${status.waitSeconds ?? 30} Sekunden warten.` });
        if (isDone(status.status)) return this.finish(status.status);
        if (status.status === 'running') this.unlock();
      })
      .catch(() => this.set({ unlocking: false, lockError: NO_CONNECTION }));
  };

  private unlock() {
    this.locked = false;
    clearInterval(this.pollTimer);
    this.set({ locked: false, code: '', lockError: '', drawn: this.snapshot.drawn + 1 });
    if (this.dirty) this.flush();
  }

  // ---------------------------------------------------------------- submit

  private submit(auto: boolean) {
    if (this.submitting || this.finished || !this.token) return;
    this.submitting = true;
    this.set({ submitting: true });
    call<StatusReply>({ action: 'submit', token: this.token, answers: this.answers.slice() })
      .then((reply) => {
        if (!reply.ok) throw new Offline();
        this.submitting = false;
        this.set({ submitting: false });
        this.sync(reply.data);
        if (isDone(reply.data.status)) return this.finish(reply.data.status);
        if (reply.data.status === 'paused') {
          this.set({ confirm: false });
          this.lockNow(null);
        }
      })
      .catch(() => {
        this.submitting = false;
        this.set({ submitting: false });
        if (auto) {
          this.submitRetryAt = Date.now() + RETRY_MS;
          setTimeout(() => this.submit(true), RETRY_MS);
        } else {
          this.set({ confirmText: 'Keine Verbindung. Bitte noch einmal „Abgeben“ tippen.' });
        }
      });
  }

  private finish(status: AttemptStatus) {
    if (this.finished) return;
    this.finished = true;
    this.locked = false;
    clearInterval(this.pollTimer);
    clearInterval(this.tickTimer);
    clearTimeout(this.hideTimer);
    this.releaseWake();
    this.set({ view: 'done', locked: false, sheet: false, confirm: false, info: null, timeUp: status === 'expired' });
  }
}

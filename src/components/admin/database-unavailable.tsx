/**
 * What the workspace shows when `DATABASE_URL` is unset.
 *
 * The public site answers this case by serving in-repo fixtures, which is a
 * supported runtime mode for a marketing page. The workspace cannot: fixture
 * queues would show zero enquiries and zero registrations, which is
 * indistinguishable from a quiet morning and would let staff conclude nothing
 * had come in. Saying so plainly is the only honest option.
 */
export function DatabaseUnavailable() {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-ws-canvas px-6 py-16">
      <div className="w-full max-w-md rounded-xl border border-ws-line bg-white p-7 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_12px_28px_-20px_rgba(15,23,42,0.18)]">
        <p className="text-[0.65rem] font-bold tracking-eyebrow uppercase text-[var(--casa-warning-text)]">
          Not connected
        </p>
        <h1 className="mt-2 font-[family-name:var(--font-display)] text-2xl leading-tight">
          The workspace has no database
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-[var(--casa-text-subtle)]">
          Every screen here reads and writes real records, so it will not run
          against fixtures — an empty queue would look the same as a quiet
          morning. Nothing has been lost; the workspace simply cannot show you
          anything until it is connected.
        </p>
        <div className="mt-5 rounded-lg border border-ws-line bg-ws-sunk px-4 py-3">
          <p className="text-xs font-semibold">To start it locally</p>
          <pre className="mt-2 overflow-x-auto text-xs leading-relaxed text-[var(--casa-muted)]">
            <code>{'npm run db:up\nnpm run db:migrate\nnpm run admin:seed'}</code>
          </pre>
        </div>
        <p className="mt-4 text-xs text-[var(--casa-text-subtle)]">
          Full setup in <code className="font-mono">docs/ADMIN_WORKSPACE.md</code>.
        </p>
      </div>
    </div>
  );
}

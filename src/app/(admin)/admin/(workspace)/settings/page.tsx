import { redirect } from 'next/navigation';

import { Badge, Card, DetailList, PageHeader } from '@/components/admin/ui';
import { roleLabel } from '@/components/admin/shell';
import { getStaffUser } from '@/lib/admin/auth';
import { LISTENING_AUDIO_AVAILABLE, POLICY_VERSION, RELEASE_MODE } from '@/config/placement/policy';

/**
 * Settings.
 *
 * There is deliberately almost nothing to change here yet, and the screen says
 * so rather than offering toggles that write to nowhere. What it does instead
 * is state, in one place, the facts about this deployment that change how staff
 * should read every other screen — which integrations are live, what the
 * placement engine is currently doing, and what is still on paper.
 *
 * Environment presence is reported as connected / not connected, never as a
 * value. A settings page that echoes a webhook URL puts a credential on a
 * screen in a shared office.
 */
export default async function SettingsPage() {
  const user = await getStaffUser();

  if (!user) {
    redirect('/admin/sign-in');
  }

  const integrations = [
    {
      label: 'Contact form fan-out',
      variable: 'CONTACT_WEBHOOK_URL',
      configured: hasEnv('CONTACT_WEBHOOK_URL'),
      note: 'Enquiries are stored in the workspace either way.',
    },
    {
      label: 'Group and company briefs',
      variable: 'GROUP_INQUIRY_WEBHOOK_URL',
      configured: hasEnv('GROUP_INQUIRY_WEBHOOK_URL'),
      note: 'Falls back to the contact webhook when unset.',
    },
    {
      label: 'Course registrations',
      variable: 'COURSE_REGISTRATION_WEBHOOK_URL',
      configured: hasEnv('COURSE_REGISTRATION_WEBHOOK_URL'),
      note: 'Registrations are stored in the workspace either way.',
    },
    {
      label: 'Exam registrations',
      variable: 'EXAM_REGISTRATION_WEBHOOK_URL',
      configured: hasEnv('EXAM_REGISTRATION_WEBHOOK_URL'),
      note: 'Registrations are stored in the workspace either way.',
    },
    {
      label: 'Career applications',
      variable: 'CAREERS_APPLICATION_WEBHOOK_URL',
      configured: hasEnv('CAREERS_APPLICATION_WEBHOOK_URL'),
      note: 'The CV itself is only ever stored in the database.',
    },
    {
      label: 'Placement result hand-off',
      variable: 'PLACEMENT_RESULT_WEBHOOK_URL',
      configured: hasEnv('PLACEMENT_RESULT_WEBHOOK_URL'),
      note: 'Predates the workspace. Placement review now happens here.',
    },
  ];

  return (
    <>
      <PageHeader
        eyebrow="Administration"
        title="Settings"
        description="What this deployment is connected to, and what the placement engine is currently doing."
      />

      <div className="space-y-5">
        <Card title="Your account">
          <DetailList
            items={[
              { label: 'Name', value: user.name },
              { label: 'Email', value: user.email },
              { label: 'Role', value: <Badge tone="neutral">{roleLabel(user.role)}</Badge> },
            ]}
          />
          <p className="mt-4 border-t border-ws-line-soft pt-3 text-xs leading-relaxed text-[var(--casa-text-subtle)]">
            To change your own password, ask an owner or administrator to set a
            new one from the Team screen. There is no self-service reset —
            it would need outbound email the workspace does not have.
          </p>
        </Card>

        <Card
          title="Integrations"
          description="Webhooks the public site fires alongside storing a record here. All of them are optional."
        >
          <ul className="divide-y divide-ws-line-soft">
            {integrations.map((integration) => (
              <li
                key={integration.variable}
                className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 py-2.5"
              >
                <span className="min-w-0">
                  <span className="block text-sm font-semibold">{integration.label}</span>
                  <span className="block text-xs text-[var(--casa-text-subtle)]">
                    <code className="font-mono">{integration.variable}</code> ·{' '}
                    {integration.note}
                  </span>
                </span>
                <Badge tone={integration.configured ? 'positive' : 'quiet'}>
                  {integration.configured ? 'Connected' : 'Not connected'}
                </Badge>
              </li>
            ))}
          </ul>
        </Card>

        <Card
          title="Placement engine"
          description="Read this before you interpret anything on the Placement screen."
        >
          <DetailList
            items={[
              {
                label: 'Release mode',
                value: (
                  <span className="flex items-center gap-2">
                    <Badge tone={RELEASE_MODE === 'live' ? 'positive' : 'warning'}>
                      {RELEASE_MODE}
                    </Badge>
                    {RELEASE_MODE === 'shadow'
                      ? 'every result is a recommendation for staff'
                      : 'bands below the ceiling may be presented as confirmed'}
                  </span>
                ),
              },
              { label: 'Cut score version', value: `Policy version ${POLICY_VERSION}` },
              {
                label: 'Listening',
                value: LISTENING_AUDIO_AVAILABLE ? (
                  'Measured'
                ) : (
                  <span className="flex items-center gap-2">
                    <Badge tone="warning">Not measured</Badge>
                    no audio recorded yet
                  </span>
                ),
              },
              {
                label: 'Item bank',
                value: (
                  <span className="flex items-center gap-2">
                    <Badge tone="warning">Pilot, unreviewed</Badge>
                    awaiting two qualified DaF reviewers
                  </span>
                ),
              },
            ]}
          />
        </Card>

        <Card
          title="Not built yet"
          description="Named here rather than shown as a broken button."
        >
          <ul className="space-y-2.5 text-sm leading-relaxed text-[var(--casa-muted)]">
            <li>
              <span className="font-semibold text-[var(--casa-ink)]">
                The FileMaker bridge.
              </span>{' '}
              Every queue table carries an <code className="font-mono text-xs">external_ref</code>{' '}
              column for it, and nothing writes to one yet. Until the bridge
              exists, the workspace and FileMaker are two separate records of the
              same person.
            </li>
            <li>
              <span className="font-semibold text-[var(--casa-ink)]">Sending email.</span>{' '}
              Every &ldquo;Reply&rdquo; button opens your own mail client. A
              compose box here would need outbound infrastructure and a
              from-address a visitor can reply to.
            </li>
            <li>
              <span className="font-semibold text-[var(--casa-ink)]">
                Editing the catalogue.
              </span>{' '}
              Prices and hours are governed by{' '}
              <code className="font-mono text-xs">
                docs/COURSE_FACTS_SOURCE_OF_TRUTH.md
              </code>
              , so the Courses screen reads and does not write.
            </li>
            <li>
              <span className="font-semibold text-[var(--casa-ink)]">
                A retention policy.
              </span>{' '}
              Nothing here is deleted on a schedule. Enquiries, registrations,
              placement attempts and CVs are all personal data and a period has
              to be decided by a named owner at CASA.
            </li>
          </ul>
        </Card>
      </div>
    </>
  );
}

/** Presence only. The value never leaves the server. */
function hasEnv(name: string): boolean {
  const value = process.env[name];
  return typeof value === 'string' && value.trim().length > 0;
}

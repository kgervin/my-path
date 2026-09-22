import { useMeta } from '../../api/queries'
import { PageHeading } from '../../components/PageHeading'
import { ROUTE_LABELS, STATUS_LABELS } from '../../lib/format'

const STEPS = [
  'Upload a CSV of student records. My Path checks the columns before it runs.',
  'Rules flag students with a barrier and count the days until their drop date.',
  'Each flagged student gets a one-sentence explanation and a draft message.',
  'You approve, edit, route or dismiss each one. Nothing is ever sent automatically.',
]

const SHORTCUTS = [
  ['j', 'Next student'],
  ['k', 'Previous student'],
  ['Esc', 'Close a dialog'],
]

export function HelpPage() {
  const { data: meta } = useMeta()
  return (
    <>
      <PageHeading title="Help">
        <p>How My Path works, what each barrier means and how to move faster.</p>
      </PageHeading>

      <section className="card stack" aria-labelledby="how-heading">
        <h2 id="how-heading">How it works</h2>
        <ol className="steps">
          {STEPS.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>
      </section>

      <section className="card stack" aria-labelledby="barriers-heading">
        <h2 id="barriers-heading">Barriers</h2>
        <dl className="glossary">
          {meta?.barriers.map((b) => (
            <div key={b.id}>
              <dt>{b.label}</dt>
              <dd>
                {b.description} Goes to:{' '}
                {b.routes_to
                  .map((r) => ROUTE_LABELS[r as keyof typeof ROUTE_LABELS] ?? r)
                  .join(', ')}
                .
              </dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="card stack" aria-labelledby="status-heading">
        <h2 id="status-heading">Statuses</h2>
        <dl className="glossary">
          {Object.entries(STATUS_LABELS).map(([key, label]) => (
            <div key={key}>
              <dt>{label}</dt>
              <dd>{STATUS_HELP[key as keyof typeof STATUS_LABELS]}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="card stack" aria-labelledby="keys-heading">
        <h2 id="keys-heading">Keyboard shortcuts</h2>
        <dl className="glossary glossary--inline">
          {SHORTCUTS.map(([key, action]) => (
            <div key={key}>
              <dt>
                <kbd>{key}</kbd>
              </dt>
              <dd>{action}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="card stack" aria-labelledby="privacy-heading">
        <h2 id="privacy-heading">Privacy and safety</h2>
        <ul>
          <li>My Path uses synthetic data only. Do not upload real student records.</li>
          <li>Rules decide who is flagged. The AI only explains and drafts.</li>
          <li>Messages never mention risk scores or use shaming words.</li>
          <li>Every decision is logged with your name and the before and after text.</li>
        </ul>
      </section>
    </>
  )
}

const STATUS_HELP: Record<keyof typeof STATUS_LABELS, string> = {
  new: 'Waiting for a coach to decide.',
  approved: 'The draft was approved as written.',
  edited: 'The draft was approved after a coach changed it.',
  dismissed: 'No outreach needed. A reason is recorded.',
  routed: 'Sent to the bursar or aid office to act on.',
}

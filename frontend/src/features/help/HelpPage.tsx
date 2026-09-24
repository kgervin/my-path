import { useMeta } from '../../api/queries'
import { BarrierChip } from '../../components/Badges'
import { PageHeading } from '../../components/PageHeading'
import { ROUTE_LABELS, STATUS_LABELS } from '../../lib/format'

const SECTIONS = [
  { href: '#how', label: 'How it works' },
  { href: '#barriers', label: 'Barriers' },
  { href: '#statuses', label: 'Statuses' },
  { href: '#keys', label: 'Keyboard shortcuts' },
  { href: '#privacy', label: 'Privacy and safety' },
]

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

const PRIVACY = [
  'My Path uses synthetic data only. Do not upload real student records.',
  'Rules decide who is flagged. The AI only explains and drafts.',
  'Messages never mention risk scores or use shaming words.',
  'Every decision is logged with your name and the before and after text.',
]

const STATUS_HELP: Record<keyof typeof STATUS_LABELS, string> = {
  new: 'Waiting for a coach to decide.',
  approved: 'The draft was approved as written.',
  edited: 'The draft was approved after a coach changed it.',
  dismissed: 'No outreach needed. A reason is recorded.',
  routed: 'Sent to the bursar or aid office to act on.',
}

export function HelpPage() {
  return (
    <div className="help">
      <PageHeading title="Help" kicker="Documentation">
        <p className="lede">How My Path works, what each barrier means and how to move faster.</p>
      </PageHeading>

      <nav aria-label="Help sections">
        <ul className="help__links">
          {SECTIONS.map(({ href, label }) => (
            <li key={href}>
              <a href={href}>{label}</a>
            </li>
          ))}
        </ul>
      </nav>

      <section id="how" className="help__section" aria-labelledby="how-heading">
        <h2 id="how-heading">How it works</h2>
        <ol className="features features--list">
          {STEPS.map((step, i) => (
            <li key={step} className="feature">
              <span className="feature__step" aria-hidden="true">
                {String(i + 1).padStart(2, '0')}
              </span>
              <p>{step}</p>
            </li>
          ))}
        </ol>
      </section>

      <Barriers />

      <section id="statuses" className="help__section" aria-labelledby="status-heading">
        <h2 id="status-heading">Statuses</h2>
        <dl className="rule-grid">
          {Object.entries(STATUS_LABELS).map(([key, label]) => (
            <div key={key} className="rule">
              <dt className="rule__name">{label}</dt>
              <dd>{STATUS_HELP[key as keyof typeof STATUS_LABELS]}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section id="keys" className="help__section" aria-labelledby="keys-heading">
        <h2 id="keys-heading">Keyboard shortcuts</h2>
        <dl className="card list-card">
          {SHORTCUTS.map(([key, action]) => (
            <div key={key} className="list-card__row">
              <dt>
                <kbd>{key}</kbd>
              </dt>
              <dd>{action}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section id="privacy" className="help__contact" aria-labelledby="privacy-heading">
        <div>
          <h2 id="privacy-heading">Privacy and safety</h2>
          <ul>
            {PRIVACY.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      </section>
    </div>
  )
}

function Barriers() {
  const { data: meta } = useMeta()
  return (
    <section id="barriers" className="help__section" aria-labelledby="barriers-heading">
      <h2 id="barriers-heading">Barriers</h2>
      <ul className="rule-grid">
        {meta?.barriers.map((b) => (
          <li key={b.id} className="rule">
            <BarrierChip barrier={b.id} />
            <p>{b.description}</p>
            <p className="muted">
              Goes to:{' '}
              {b.routes_to.map((r) => ROUTE_LABELS[r as keyof typeof ROUTE_LABELS] ?? r).join(', ')}
            </p>
          </li>
        ))}
      </ul>
    </section>
  )
}

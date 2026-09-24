import { useMeta } from '../../api/queries'
import { BarrierChip } from '../../components/Badges'
import { Icon } from '../../components/Icon'
import { PageHeading } from '../../components/PageHeading'
import { ROUTE_LABELS } from '../../lib/format'

const SECTIONS = [
  { href: '#getting-started', label: 'Getting started' },
  { href: '#barriers', label: 'Barrier rules' },
  { href: '#csv', label: 'CSV reference' },
  { href: '#faq', label: 'FAQ' },
]

const STEPS = [
  {
    title: 'Prepare your CSV',
    body: 'Export a roster with every required column. Save it as a UTF-8 CSV with a header row.',
  },
  {
    title: 'Upload and check',
    body: 'Drop the file on the upload card or browse for it. My Path checks the columns before anything is sent, and lists every row error at once.',
  },
  {
    title: 'Review the queue',
    body: 'Flagged students are sorted by days to drop. Open one to see each barrier, the fields that triggered it and a drafted message.',
  },
  {
    title: 'Approve, edit, route or dismiss',
    body: 'Read the draft, edit it if needed, then decide. Nothing is ever sent to a student automatically.',
  },
  {
    title: 'Check the summary',
    body: 'The summary shows totals by status and a breakdown by barrier type.',
  },
]

const CSV_COLUMNS = [
  ['student_id', 'text', 'S0132', 'Unique ID for the student.'],
  ['first_name', 'text', 'Jordan', 'Used in the drafted message.'],
  ['program', 'text', 'BS Nursing', 'Shown in the queue and filters.'],
  ['term_start', 'date', '2026-08-20', 'Used to tell when add/drop closed.'],
  ['drop_date', 'date', '2026-10-01', 'Last day to drop. Sets the days-left count.'],
  ['balance_usd', 'number', '172.50', 'Unpaid balance. Use 0 if none.'],
  ['hold_codes', 'list', 'REG;BUR', 'Active holds, separated by ; or |. Blank if none.'],
  ['last_payment_status', 'text', 'paid / failed', '"failed" triggers the failed payment rule.'],
  ['aid_items_missing', 'list', 'FAFSA-V', 'Outstanding aid items. Blank if none.'],
  ['last_lms_login', 'date or blank', '2026-09-10', 'Blank means never logged in.'],
  ['next_term_credits', 'whole number', '0', 'Credits registered for next term.'],
  ['first_gen', 'true / false', 'true', 'Context for the coach only. Never a flag.'],
  ['preferred_language', 'en / es', 'es', 'Language of the drafted message.'],
] as const

const FAQS = [
  {
    q: 'What file does My Path accept?',
    a: 'A CSV file with a header row and every column in the CSV reference. Extra columns are ignored. Dates use the form 2026-10-01.',
  },
  {
    q: 'How many students can I upload at once?',
    a: 'Any number that fits the upload size limit. The sample file has 200 students and runs in seconds. Every row is checked before anyone is flagged.',
  },
  {
    q: 'Can I edit the drafted message?',
    a: 'Yes. Edit the draft on the student page before you approve. Edited drafts are marked "Approved with edits", and the original text is kept in the decision log.',
  },
  {
    q: 'What happens when I approve?',
    a: 'Your decision is logged with your name and the student leaves the pending queue. Nothing is sent to the student by My Path.',
  },
  {
    q: 'What is the difference between Approve and Route?',
    a: 'Approve means you will reach out yourself with the draft. Route hands the case to the office that has to act, such as the Bursar or Financial Aid.',
  },
  {
    q: 'Can I undo a decision?',
    a: 'Yes. Use Undo in the confirmation message, or open the student and choose Reopen. Both are logged.',
  },
  {
    q: 'How is urgency decided?',
    a: 'By days to the drop date. Under 7 days is urgent (red), 7 to 14 days is a warning (amber), and anything later is standard.',
  },
  {
    q: 'Are there keyboard shortcuts?',
    a: 'In the queue, press j for the next student and k for the previous one. Esc closes a dialog.',
  },
  {
    q: 'Does the AI decide who is flagged?',
    a: 'No. Six transparent rules decide. The AI only writes the explanation and the draft, and messages never mention risk scores or use shaming words.',
  },
  {
    q: 'Can I upload real student records?',
    a: 'Not yet. This version is for synthetic data only. Uploaded records are stored on the My Path server for the session’s review.',
  },
]

export function HelpPage() {
  return (
    <div className="help">
      <PageHeading title="Help & reference" documentTitle="Help" kicker="Documentation">
        <p className="lede">
          Everything you need to upload records, understand barrier detection and work the coach
          queue.
        </p>
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

      <section id="getting-started" className="help__section" aria-labelledby="gs-heading">
        <h2 id="gs-heading">Getting started</h2>
        <ol className="features features--list">
          {STEPS.map(({ title, body }, i) => (
            <li key={title} className="feature">
              <span className="feature__step" aria-hidden="true">
                {String(i + 1).padStart(2, '0')}
              </span>
              <div>
                <p className="feature__title">{title}</p>
                <p>{body}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <BarrierRules />

      <section id="csv" className="help__section" aria-labelledby="csv-heading">
        <h2 id="csv-heading">CSV column reference</h2>
        <p className="muted">All columns are required. Headers must match exactly.</p>
        {/* A scrollable region must be keyboard reachable on small screens (WCAG 2.1.1). */}
        {/* oxlint-disable-next-line jsx-a11y/no-noninteractive-tabindex */}
        <div className="card table-wrap" role="region" aria-labelledby="csv-caption" tabIndex={0}>
          <table className="table">
            <caption id="csv-caption" className="visually-hidden">Required CSV columns</caption>
            <thead>
              <tr>
                <th scope="col">Column</th>
                <th scope="col">Type</th>
                <th scope="col">Example</th>
                <th scope="col">Notes</th>
              </tr>
            </thead>
            <tbody>
              {CSV_COLUMNS.map(([name, type, example, notes]) => (
                <tr key={name}>
                  <th scope="row">
                    <code>{name}</code>
                  </th>
                  <td className="help__type">{type}</td>
                  <td>
                    <code>{example}</code>
                  </td>
                  <td className="muted">{notes}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section id="faq" className="help__section" aria-labelledby="faq-heading">
        <h2 id="faq-heading">Frequently asked questions</h2>
        <div className="card faq">
          {FAQS.map(({ q, a }) => (
            <details key={q} className="faq__item">
              <summary>
                <span>{q}</span>
                <Icon name="chevron" size={16} />
              </summary>
              <p>{a}</p>
            </details>
          ))}
        </div>
      </section>

      <aside className="help__contact" aria-labelledby="contact-heading">
        <span className="help__contact-icon" aria-hidden="true">
          <Icon name="help" size={18} />
        </span>
        <div>
          <h2 id="contact-heading">Need help or found a bug?</h2>
          <p>
            <a href="https://github.com/kgervin/my-path/issues">Open an issue on GitHub</a>. Say
            what you were doing, the step you were on and any error message you saw.
          </p>
        </div>
      </aside>
    </div>
  )
}

function BarrierRules() {
  const { data: meta } = useMeta()
  return (
    <section id="barriers" className="help__section" aria-labelledby="barriers-heading">
      <h2 id="barriers-heading">Barrier detection rules</h2>
      <p className="muted">
        Six transparent rules run on every student record. The AI never decides who is flagged.
      </p>
      <ul className="rule-grid">
        {meta?.barriers.map((b) => (
          <li key={b.id} className="rule">
            <BarrierChip barrier={b.id} />
            <dl>
              <div>
                <dt>Trigger condition</dt>
                <dd>{b.description}</dd>
              </div>
              <div>
                <dt>Suggested action</dt>
                <dd>{b.suggested_fix}</dd>
              </div>
              <div>
                <dt>Goes to</dt>
                <dd>
                  {b.routes_to
                    .map((r) => ROUTE_LABELS[r as keyof typeof ROUTE_LABELS] ?? r)
                    .join(', ')}
                </dd>
              </div>
            </dl>
          </li>
        ))}
      </ul>
    </section>
  )
}

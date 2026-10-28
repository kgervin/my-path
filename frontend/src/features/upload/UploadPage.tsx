import { useId, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router'

import { useMeta, useUpload } from '../../api/queries'
import type { ColumnInfo } from '../../api/types'
import { Icon } from '../../components/Icon'
import { PageHeading } from '../../components/PageHeading'
import { ErrorState } from '../../components/StateViews'
import { checkCsv, type HeaderCheck } from '../../lib/csv'
import { FilePicker } from './FilePicker'

interface Selection {
  file: File
  check: HeaderCheck
}

const HOW_IT_WORKS = [
  {
    title: 'Upload',
    body: 'Drop your student CSV. My Path checks every column before a single record is processed.',
  },
  {
    title: 'Detect',
    body: 'Six transparent rules flag holds, small balances, failed payments, missing aid forms and more.',
  },
  {
    title: 'Act',
    body: 'Review the drafted outreach, edit freely, then approve, route or dismiss. One clear decision per student.',
  },
] as const

/** Local calendar date as YYYY-MM-DD (toISOString would give the UTC date). */
function today(): string {
  return new Date().toLocaleDateString('en-CA')
}

export function UploadPage() {
  const navigate = useNavigate()
  const { data: meta } = useMeta()
  const upload = useUpload()
  const [selection, setSelection] = useState<Selection | null>(null)
  const hintId = useId()

  const onSelect = async (file: File) => {
    upload.reset()
    setSelection({ file, check: await checkCsv(file, meta?.required_columns ?? []) })
  }

  const run = (file: File) =>
    upload.mutate(
      { file, asOf: today() },
      { onSuccess: (created) => void navigate(`/runs/${created.id}`) },
    )

  const ready =
    selection !== null && selection.check.missing.length === 0 && selection.check.rowCount > 0

  const onSubmit = (event: FormEvent) => {
    event.preventDefault()
    if (selection && ready) run(selection.file)
  }

  return (
    <>
      <section className="hero" aria-labelledby="upload-heading">
        <PageHeading
          title="Surface students before they slip."
          documentTitle="Upload student records"
          id="upload-heading"
        >
          <p>
            My Path detects fixable barriers, drafts outreach, and puts decisions in your hands, in
            minutes, not hours.
          </p>
        </PageHeading>
        <div className="hero__actions">
          <a className="button button--hero" href="#upload">
            <Icon name="upload" size={18} /> Upload CSV
          </a>
        </div>
      </section>

      <section aria-labelledby="how-heading" className="stack">
        <h2 id="how-heading" className="kicker">
          How it works
        </h2>
        <ol className="features">
          {HOW_IT_WORKS.map((step, index) => (
            <li key={step.title} className="feature">
              <span className="feature__step" aria-hidden="true">
                {String(index + 1).padStart(2, '0')}
              </span>
              <div>
                <p className="feature__title">{step.title}</p>
                <p>{step.body}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section id="upload" className="card stack upload-card" aria-labelledby="upload-card-heading">
        <div>
          <h2 id="upload-card-heading">Upload student records</h2>
          <p id={hintId} className="hint">
            CSV file with the required columns. We validate it before processing.
          </p>
        </div>
        <form className="stack" onSubmit={onSubmit} aria-describedby={hintId}>
          <FilePicker onSelect={(file) => void onSelect(file)} describedBy={hintId} />
          {selection ? <ColumnCheck selection={selection} /> : null}
          {upload.isError ? <ErrorState error={upload.error} /> : null}
          <div className="upload-card__actions">
            <button
              type="submit"
              className="button button--primary button--large"
              disabled={!ready || upload.isPending}
            >
              <Icon name="play" size={16} />
              {upload.isPending ? 'Running My Path…' : 'Run My Path'}
            </button>
          </div>
        </form>
        {meta ? (
          <ColumnGuide columns={meta.columns} missing={selection?.check.missing ?? []} />
        ) : null}
      </section>
    </>
  )
}

function pluralize(count: number, one: string, many: string): string {
  return count === 1 ? one : many
}

/** Each column's format and an example; opens by itself when the chosen file is missing some. */
function ColumnGuide({ columns, missing }: { columns: ColumnInfo[]; missing: string[] }) {
  return (
    <details className="disclosure" open={missing.length > 0 || undefined}>
      <summary>Required CSV columns</summary>
      <dl className="column-guide">
        {columns.map((column) => (
          <div
            key={column.name}
            className={missing.includes(column.name) ? 'is-missing' : undefined}
          >
            <dt>
              <code>{column.name}</code>
              {missing.includes(column.name) ? (
                <span className="column-guide__flag">Missing</span>
              ) : null}
            </dt>
            <dd>
              {column.format} · e.g. <code>{column.example}</code>
            </dd>
          </div>
        ))}
      </dl>
    </details>
  )
}

function ColumnCheck({ selection }: { selection: Selection }) {
  const { file, check } = selection
  const missing = check.missing.length
  const ok = missing === 0 && check.rowCount > 0
  let message = 'All required columns found. Ready to run.'
  if (missing > 0) {
    message = `Missing ${pluralize(missing, 'column', 'columns')}: ${check.missing.join(', ')}. Add ${pluralize(missing, 'it', 'them')} using the formats under Required CSV columns, then choose the file again.`
  } else if (check.rowCount === 0) {
    message = 'The file has no student rows.'
  }
  return (
    <div className={ok ? 'check check--ok' : 'check check--error'} role={ok ? 'status' : 'alert'}>
      <p>
        <Icon name={ok ? 'check' : 'alert'} />
        {/* One text node group, so the flex gap can't split "name: N students". */}
        <span>
          <strong>{file.name}</strong>: {check.rowCount}{' '}
          {pluralize(check.rowCount, 'student', 'students')}.
        </span>
      </p>
      <p>{message}</p>
    </div>
  )
}

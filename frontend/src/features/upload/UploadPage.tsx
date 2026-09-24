import { useId, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router'

import { api } from '../../api/client'
import { useMeta, useUpload } from '../../api/queries'
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

async function sampleFile(): Promise<File> {
  const response = await fetch(api.sampleCsvUrl)
  if (!response.ok) throw new Error('Sample data is unavailable right now.')
  return new File([await response.text()], 'sample-200-students.csv', { type: 'text/csv' })
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

  const runSample = async () => run(await sampleFile())

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
          <button
            type="button"
            className="button button--hero"
            disabled={upload.isPending}
            onClick={() => void runSample()}
          >
            <Icon name="play" size={18} />
            {upload.isPending ? 'Running My Path…' : 'Try sample data — 200 students'}
          </button>
          <a className="button button--hero-ghost" href="#upload">
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
            <button
              type="button"
              className="button button--link"
              disabled={upload.isPending}
              onClick={() => void runSample()}
            >
              Use sample data instead
            </button>
          </div>
        </form>
        {meta ? (
          <details className="disclosure">
            <summary>Required CSV columns</summary>
            <ul className="columns-list">
              {meta.required_columns.map((column) => (
                <li key={column}>
                  <code>{column}</code>
                </li>
              ))}
            </ul>
          </details>
        ) : null}
      </section>
    </>
  )
}

function pluralize(count: number, one: string, many: string): string {
  return count === 1 ? one : many
}

function ColumnCheck({ selection }: { selection: Selection }) {
  const { file, check } = selection
  const missing = check.missing.length
  const ok = missing === 0 && check.rowCount > 0
  let message = 'All required columns found. Ready to run.'
  if (missing > 0) {
    message = `Missing ${pluralize(missing, 'column', 'columns')}: ${check.missing.join(', ')}. Add ${pluralize(missing, 'it', 'them')} and choose the file again.`
  } else if (check.rowCount === 0) {
    message = 'The file has no student rows.'
  }
  return (
    <div className={ok ? 'check check--ok' : 'check check--error'} role={ok ? 'status' : 'alert'}>
      <p>
        <Icon name={ok ? 'check' : 'alert'} /> <strong>{file.name}</strong>: {check.rowCount}{' '}
        {pluralize(check.rowCount, 'student', 'students')}.
      </p>
      <p>{message}</p>
    </div>
  )
}

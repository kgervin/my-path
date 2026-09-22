import { useId, useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router'

import { api } from '../../api/client'
import { useLatestRun, useMeta, useUpload } from '../../api/queries'
import { Icon } from '../../components/Icon'
import { PageHeading } from '../../components/PageHeading'
import { ErrorState } from '../../components/StateViews'
import { checkCsv, type HeaderCheck } from '../../lib/csv'
import { formatDateTime } from '../../lib/format'
import { FilePicker } from './FilePicker'

interface Selection {
  file: File
  check: HeaderCheck
}

/** Local calendar date as YYYY-MM-DD (toISOString would give the UTC date). */
function today(): string {
  return new Date().toLocaleDateString('en-CA')
}

export function UploadPage() {
  const navigate = useNavigate()
  const { data: meta } = useMeta()
  const { data: latest } = useLatestRun()
  const upload = useUpload()
  const [selection, setSelection] = useState<Selection | null>(null)
  const [asOf, setAsOf] = useState(today)
  const hintId = useId()
  const asOfId = useId()

  const onSelect = async (file: File) => {
    upload.reset()
    setSelection({ file, check: await checkCsv(file, meta?.required_columns ?? []) })
  }

  const ready =
    selection !== null && selection.check.missing.length === 0 && selection.check.rowCount > 0

  const onSubmit = (event: FormEvent) => {
    event.preventDefault()
    if (!selection || !ready) return
    upload.mutate(
      { file: selection.file, asOf },
      { onSuccess: (run) => void navigate(`/runs/${run.id}`) },
    )
  }

  return (
    <>
      <PageHeading title="Upload student records">
        <p>
          My Path checks each student for six small, fixable barriers, explains what it found and
          drafts a message for you to review. Nothing is sent automatically.
        </p>
      </PageHeading>

      {latest ? (
        <aside className="callout" aria-label="Latest run">
          <p>
            Latest run: <strong>{latest.filename}</strong>, uploaded{' '}
            {formatDateTime(latest.created_at)} · {latest.flagged_count} flagged.
          </p>
          <Link className="button button--secondary" to={`/runs/${latest.id}`}>
            Continue reviewing <Icon name="next" size={16} />
          </Link>
        </aside>
      ) : null}

      <form className="card stack" onSubmit={onSubmit} aria-describedby={hintId}>
        <p id={hintId} className="hint">
          Use a UTF-8 CSV with one row per student.{' '}
          <a href={api.sampleCsvUrl} download>
            Download a sample CSV
          </a>{' '}
          with 200 synthetic students.
        </p>

        <FilePicker onSelect={(file) => void onSelect(file)} describedBy={hintId} />

        {selection ? <ColumnCheck selection={selection} /> : null}

        <details className="disclosure">
          <summary>Options</summary>
          <div className="field">
            <label htmlFor={asOfId}>Check barriers as of</label>
            <input
              id={asOfId}
              type="date"
              value={asOf}
              onChange={(e) => setAsOf(e.target.value)}
              required
            />
            <p className="hint">Days to drop are counted from this date. Usually today.</p>
          </div>
        </details>

        {upload.isError ? <ErrorState error={upload.error} /> : null}

        <button
          type="submit"
          className="button button--primary button--large"
          disabled={!ready || upload.isPending}
        >
          {upload.isPending ? 'Running My Path…' : 'Run My Path'}
        </button>
      </form>

      {meta ? (
        <details className="disclosure">
          <summary>Which columns does the file need?</summary>
          <ul className="columns-list">
            {meta.required_columns.map((column) => (
              <li key={column}>
                <code>{column}</code>
              </li>
            ))}
          </ul>
        </details>
      ) : null}
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

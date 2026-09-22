import { ApiError } from '../../api/client'
import { CoachNameField } from '../../app/CoachNameField'
import { ErrorState } from '../../components/StateViews'

interface Props {
  error: Error | null
  needsCoach: boolean
  onReload: () => void
}

/** Recoverable errors with a next step (heuristic 9), and the name prompt before deciding. */
export function DecisionFeedback({ error, needsCoach, onReload }: Props) {
  const conflict = error instanceof ApiError && error.isConflict
  return (
    <>
      {error ? (
        <ErrorState error={error}>
          {conflict ? (
            <button type="button" className="button button--secondary" onClick={onReload}>
              Load the latest version
            </button>
          ) : null}
        </ErrorState>
      ) : null}
      {needsCoach ? (
        <div className="callout">
          <p>Add your name before you decide. It is saved in the action log.</p>
          <CoachNameField />
        </div>
      ) : null}
    </>
  )
}

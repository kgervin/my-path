import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'

import { useFlag, useFlags, useMeta } from '../../api/queries'
import type { FlagDetail, Language, Tone } from '../../api/types'
import { Icon } from '../../components/Icon'
import { ErrorState, Loading } from '../../components/StateViews'
import { usePageTitle } from '../../hooks/usePageTitle'
import { countWords } from '../../lib/text'
import { useQueueFilters } from '../queue/useQueueFilters'
import { ActionHistory } from './ActionHistory'
import { DecisionBar } from './DecisionBar'
import { DecisionFeedback } from './DecisionFeedback'
import { DraftEditor } from './DraftEditor'
import { ReviewDialogs, type OpenDialog } from './ReviewDialogs'
import { useDecision } from './useDecision'
import { DetectedBarriers, StudentHeader } from './WhyFlagged'

const DEFAULT_MAX_WORDS = 120

export function FlagDetailPage() {
  const { flagId = '' } = useParams()
  const flag = useFlag(flagId)
  if (flag.isPending) return <Loading label="Loading student…" />
  if (flag.isError) return <ErrorState error={flag.error} onRetry={() => void flag.refetch()} />
  return <FlagReview key={flag.data.id} flag={flag.data} onReload={() => void flag.refetch()} />
}

/** Local draft text that resets whenever the server copy changes (new version). */
function useDraftText(flag: FlagDetail) {
  const [draft, setDraft] = useState(flag.draft_message ?? '')
  const [syncedVersion, setSyncedVersion] = useState(flag.version)
  if (syncedVersion !== flag.version) {
    setSyncedVersion(flag.version)
    setDraft(flag.draft_message ?? '')
  }
  return [draft, setDraft] as const
}

function FlagReview({ flag, onReload }: { flag: FlagDetail; onReload: () => void }) {
  const navigate = useNavigate()
  const { search, filters } = useQueueFilters()
  const { data: meta } = useMeta()
  const { data: queue } = useFlags(flag.run_id, filters)
  const decision = useDecision(flag)
  const [draft, setDraft] = useDraftText(flag)
  const [dialog, setDialog] = useState<OpenDialog>(null)
  const headingRef = useRef<HTMLHeadingElement>(null)

  usePageTitle(`${flag.first_name} (${flag.student_id})`)
  useEffect(() => headingRef.current?.focus(), [])

  const queueUrl = `/runs/${flag.run_id}${search ? `?${search}` : ''}`
  const edited = draft.trim() !== (flag.original_draft ?? '').trim()
  const withinLimit = countWords(draft) < (meta?.max_words ?? DEFAULT_MAX_WORDS)
  const canApprove = draft.trim() !== '' && withinLimit && decision.hasCoach
  const closeDialog = () => setDialog(null)

  const goToNext = () => {
    const next = queue?.find((f) => f.status === 'new' && f.id !== flag.id)
    void navigate(
      next ? `/runs/${flag.run_id}/students/${next.id}${search ? `?${search}` : ''}` : queueUrl,
    )
  }
  const redraft = (language: Language, tone: Tone) =>
    decision.act(
      { action: 'redraft', language, tone },
      `New draft ready for ${flag.first_name}.`,
      closeDialog,
    )

  return (
    <article className="detail stack" aria-labelledby="student-heading">
      <Link to={queueUrl} className="button button--link back-link">
        <Icon name="back" size={16} /> Back to queue
      </Link>
      <StudentHeader flag={flag} headingRef={headingRef} />
      <DetectedBarriers flag={flag} />
      <DraftEditor
        flag={flag}
        value={draft}
        onChange={setDraft}
        disabled={flag.status !== 'new' || decision.pending}
        onRedraft={(language, tone) =>
          edited ? setDialog({ language, tone }) : redraft(language, tone)
        }
      />
      <DecisionFeedback
        error={decision.error}
        needsCoach={!decision.hasCoach && flag.status === 'new'}
        onReload={onReload}
      />
      <DecisionBar
        flag={flag}
        edited={edited}
        canApprove={canApprove}
        pending={decision.pending}
        onApprove={(andNext) =>
          decision.act(
            { action: 'approve', message: draft },
            `Approved the message for ${flag.first_name}. Nothing was sent.`,
            andNext ? goToNext : undefined,
          )
        }
        onRoute={() => setDialog('route')}
        onDismiss={() => setDialog('dismiss')}
        onReopen={() =>
          decision.act({ action: 'reopen' }, `${flag.first_name} is back in the queue.`)
        }
      />
      <p className="hint shortcut-hint">
        Tip: press <kbd>j</kbd> and <kbd>k</kbd> to move between students.
      </p>
      <ActionHistory actions={flag.actions} />
      <ReviewDialogs
        flag={flag}
        open={dialog}
        busy={decision.pending}
        onClose={closeDialog}
        onRedraft={redraft}
        onDismiss={(reason) =>
          decision.act({ action: 'dismiss', reason }, `Dismissed ${flag.first_name}.`, closeDialog)
        }
        onRoute={(route_to) =>
          decision.act({ action: 'route', route_to }, `Routed ${flag.first_name}.`, closeDialog)
        }
      />
    </article>
  )
}

import type { FlagDetail, Language, RouteTarget, Tone } from '../../api/types'
import { Dialog } from '../../components/Dialog'
import { DismissDialog, RouteDialog } from './DecisionDialogs'

export type OpenDialog = 'dismiss' | 'route' | { language: Language; tone: Tone } | null

interface Props {
  flag: FlagDetail
  open: OpenDialog
  busy: boolean
  onClose: () => void
  onDismiss: (reason: string) => void
  onRoute: (target: RouteTarget) => void
  onRedraft: (language: Language, tone: Tone) => void
}

export function ReviewDialogs({ flag, open, busy, onClose, onDismiss, onRoute, onRedraft }: Props) {
  const redraft = typeof open === 'object' ? open : null
  return (
    <>
      <DismissDialog
        open={open === 'dismiss'}
        name={flag.first_name}
        busy={busy}
        onClose={onClose}
        onConfirm={onDismiss}
      />
      <RouteDialog
        open={open === 'route'}
        name={flag.first_name}
        suggested={flag.route_to}
        busy={busy}
        onClose={onClose}
        onConfirm={onRoute}
      />
      <Dialog
        open={redraft !== null}
        title="Replace your edits?"
        description="A new draft will replace the changes you made to this message."
        confirmLabel="Replace edits"
        busy={busy}
        onClose={onClose}
        onConfirm={() => redraft && onRedraft(redraft.language, redraft.tone)}
      />
    </>
  )
}

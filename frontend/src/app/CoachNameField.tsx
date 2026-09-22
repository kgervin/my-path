import { useId, useState } from 'react'

import { useCoachName } from '../hooks/useCoachName'

/** Name used in the action log. Remembered on this device (recognition over recall). */
export function CoachNameField() {
  const { coachName, setCoachName } = useCoachName()
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(coachName)
  const inputId = useId()

  // Show the form while no name is saved, wherever it gets saved from.
  if (coachName && !editing) {
    return (
      <p className="coach-name">
        <span>Coach: {coachName}</span>
        <button
          type="button"
          className="button button--link"
          onClick={() => {
            setDraft(coachName)
            setEditing(true)
          }}
        >
          Change<span className="visually-hidden"> coach name</span>
        </button>
      </p>
    )
  }

  return (
    <form
      className="coach-name coach-name--form"
      onSubmit={(event) => {
        event.preventDefault()
        if (!draft.trim()) return
        setCoachName(draft)
        setEditing(false)
      }}
    >
      <label htmlFor={inputId}>Your name</label>
      <input
        id={inputId}
        name="coach"
        autoComplete="name"
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        required
      />
      <button type="submit" className="button button--secondary button--small">
        Save
      </button>
    </form>
  )
}

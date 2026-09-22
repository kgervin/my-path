import { useId } from 'react'

import { useMeta } from '../../api/queries'
import type { FlagDetail, Language, Tone } from '../../api/types'
import { countWords, gradeLevel } from '../../lib/text'

const MAX_GRADE = 8
const DEFAULT_MAX_WORDS = 120

interface Props {
  flag: FlagDetail
  value: string
  onChange: (value: string) => void
  onRedraft: (language: Language, tone: Tone) => void
  disabled: boolean
}

export function DraftEditor({ flag, value, onChange, onRedraft, disabled }: Props) {
  const id = useId()
  const language = flag.draft_language ?? flag.preferred_language
  const edited = value !== (flag.original_draft ?? '')

  return (
    <section className="card stack" aria-labelledby={`${id}-heading`}>
      <div className="section-head">
        <h3 id={`${id}-heading`}>Message draft</h3>
        <span className="hint">
          {flag.draft_source === 'ai'
            ? 'Drafted by AI, checked by rules'
            : 'Drafted from a template'}
        </span>
      </div>
      <LanguageToggle
        language={language}
        preferred={flag.preferred_language}
        disabled={disabled}
        onRedraft={onRedraft}
      />
      <div className="field">
        <label htmlFor={`${id}-message`}>Message to {flag.first_name}</label>
        <textarea
          id={`${id}-message`}
          rows={9}
          value={value}
          disabled={disabled}
          aria-describedby={`${id}-meter`}
          onChange={(event) => onChange(event.target.value)}
        />
        <DraftMeter id={`${id}-meter`} text={value} language={language} />
      </div>
      {edited && !disabled ? (
        <button
          type="button"
          className="button button--link"
          onClick={() => onChange(flag.original_draft ?? '')}
        >
          Restore original draft
        </button>
      ) : null}
    </section>
  )
}

interface ToggleProps {
  language: Language
  preferred: Language
  disabled: boolean
  onRedraft: (language: Language, tone: Tone) => void
}

const LANGUAGE_NAMES: Record<Language, [string, string]> = {
  en: ['English', 'English'],
  es: ['Español', 'Spanish'],
}

function LanguageToggle({ language, preferred, disabled, onRedraft }: ToggleProps) {
  return (
    <>
      <fieldset className="segmented" disabled={disabled}>
        <legend>Language and length</legend>
        {(['en', 'es'] as const).map((lang) => (
          <button
            key={lang}
            type="button"
            className="segmented__option"
            aria-pressed={language === lang}
            onClick={() => onRedraft(lang, 'warm')}
          >
            {LANGUAGE_NAMES[lang][0]}
          </button>
        ))}
        <button
          type="button"
          className="segmented__option"
          onClick={() => onRedraft(language, 'brief')}
        >
          Shorter
        </button>
      </fieldset>
      {preferred !== language ? (
        <p className="hint">This student prefers {LANGUAGE_NAMES[preferred][1]}.</p>
      ) : null}
    </>
  )
}

/** Live word count and reading level so coaches see limits before approving (heuristics 1, 5). */
function DraftMeter({ id, text, language }: { id: string; text: string; language: Language }) {
  const { data: meta } = useMeta()
  const maxWords = meta?.max_words ?? DEFAULT_MAX_WORDS
  const words = countWords(text)
  const grade = gradeLevel(text)
  const tooLong = words >= maxWords
  return (
    <p id={id} className={tooLong ? 'meter meter--error' : 'meter'}>
      <span>
        {words} / {maxWords} words
      </span>
      {language === 'en' ? (
        <span>
          Reading level: grade {Math.max(0, Math.round(grade))}
          {grade > MAX_GRADE ? ' (aim for 8 or lower)' : ''}
        </span>
      ) : null}
      {tooLong ? (
        <span role="alert">Shorten the message to under {maxWords} words to approve it.</span>
      ) : null}
    </p>
  )
}

import { useId, useState, type DragEvent } from 'react'

import { Icon } from '../../components/Icon'

interface Props {
  onSelect: (file: File) => void
  describedBy?: string
}

/** Drag-and-drop zone backed by a real file input, so keyboard and screen reader users can use it. */
export function FilePicker({ onSelect, describedBy }: Props) {
  const inputId = useId()
  const [dragging, setDragging] = useState(false)

  const onDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    setDragging(false)
    const file = event.dataTransfer.files[0]
    if (file) onSelect(file)
  }

  return (
    <div
      className={dragging ? 'dropzone dropzone--active' : 'dropzone'}
      onDragOver={(event) => {
        event.preventDefault()
        setDragging(true)
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={onDrop}
    >
      <Icon name="upload" size={32} />
      <label htmlFor={inputId} className="dropzone__label">
        <span className="dropzone__cta">Choose a CSV file</span>
        <span className="dropzone__hint">or drag and drop it here</span>
      </label>
      <input
        id={inputId}
        type="file"
        accept=".csv,text/csv"
        className="dropzone__input"
        aria-describedby={describedBy}
        onChange={(event) => {
          const file = event.target.files?.[0]
          if (file) onSelect(file)
        }}
      />
    </div>
  )
}

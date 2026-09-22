// Decorative icons always pair with visible text; they are hidden from assistive tech.
const PATHS = {
  alert:
    'M12 9v4m0 4h.01M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z',
  check: 'M20 6 9 17l-5-5',
  clock: 'M12 7v5l3 3m6-3a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z',
  send: 'M22 2 11 13M22 2l-7 20-4-9-9-4 20-7Z',
  x: 'M18 6 6 18M6 6l12 12',
  undo: 'M9 14 4 9l5-5M4 9h11a5 5 0 0 1 0 10h-1',
  upload: 'M12 16V4m0 0-4 4m4-4 4 4M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3',
  info: 'M12 16v-4m0-4h.01M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z',
  back: 'M15 18l-6-6 6-6',
  next: 'M9 18l6-6-6-6',
} as const

export type IconName = keyof typeof PATHS

export function Icon({ name, size = 18 }: { name: IconName; size?: number }) {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="icon"
    >
      <path d={PATHS[name]} />
    </svg>
  )
}

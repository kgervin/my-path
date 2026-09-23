/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Absolute API base URL when the UI is hosted apart from the API. Defaults to /api/v1. */
  readonly VITE_API_BASE_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

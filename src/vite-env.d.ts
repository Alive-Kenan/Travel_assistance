/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_KIMI_API_KEY?: string
  readonly VITE_VIDEO_ANALYZE_API_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

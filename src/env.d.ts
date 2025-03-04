/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SILICONFLOW_API_KEY: string
  readonly VITE_SILICONFLOW_BASE_URL: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
} 
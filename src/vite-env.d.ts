/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_EDIT_MODE_PASSWORD?: string;
  readonly VITE_GITHUB_TOKEN?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_EDIT_MODE_PASSWORD?: string;
  readonly VITE_GITHUB_TOKEN?: string;
  readonly VITE_GEMINI_TRANSLATION_MODEL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

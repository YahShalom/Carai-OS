/// <reference types="vite/client" />

declare interface ImportMetaEnv {
  readonly VITE_CARAI_AUTH_TOKEN: string | undefined;
  readonly [key: string]: string | undefined;
}

declare interface ImportMeta {
  readonly env: ImportMetaEnv;
}

/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_ANON_KEY: string;
  readonly VITE_API_GRAPHQL_URL: string;
  readonly VITE_API_REST_URL: string;
  readonly VITE_APP_VERSION: string;
  readonly VITE_BUILD_TIME: string;
  readonly VITE_ENABLE_ANALYTICS: string;
  readonly VITE_ENABLE_ADVANCED_SEARCH: string;
  readonly VITE_ENABLE_CSP: string;
  readonly VITE_ENABLE_RATE_LIMITING: string;
  readonly VITE_ENABLE_COMPRESSION: string;
  readonly VITE_ENABLE_CACHE: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
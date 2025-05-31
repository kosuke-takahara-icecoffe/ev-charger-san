// <reference types="vite/client" />  <- This line is removed

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_ANON_KEY: string;
  // You can add other environment variables here if your application uses them
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

import { createClient } from '@supabase/supabase-js';
import type { Database } from './types_db'; // types_db.ts は後ほどSupabase CLIで生成される型ファイル（今回は手動で定義）

let supabaseUrl: string | undefined = undefined;
let supabaseAnonKey: string | undefined = undefined;
let envLoadError = false;

if (typeof import.meta !== 'undefined' && typeof import.meta.env !== 'undefined') {
  supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
} else {
  envLoadError = true;
  console.error(
    '`import.meta.env` が未定義です。このアプリケーションは、Vite のような環境で実行され、' +
    '`import.meta.env` に VITE_SUPABASE_URL と VITE_SUPABASE_ANON_KEY が設定されていることを想定しています。'
  );
}

if (!envLoadError && (!supabaseUrl || !supabaseAnonKey)) {
  console.error(
    'Supabase URL (VITE_SUPABASE_URL) または Anon Key (VITE_SUPABASE_ANON_KEY) が `import.meta.env` に設定されていません。' +
    '.envファイルまたは環境変数を確認してください。'
  );
  // Mark as error so supabase client becomes null, even if import.meta.env was defined.
  envLoadError = true; 
}

// Supabaseクライアントを初期化
// Database型を指定することで、テーブル名やカラム名の型補完が効くようになります。
export const supabase = supabaseUrl && supabaseAnonKey && !envLoadError
  ? createClient<Database>(supabaseUrl, supabaseAnonKey)
  : null;

// この時点では `supabase` が null になる可能性があります。
// 呼び出し側で null チェックを行うか、
// ここで初期化失敗時にエラーをthrowしてアプリケーションを停止させる等のハンドリングが必要です。
// 今回は呼び出し側で null チェックを行う前提とします。

// 参考: Supabaseが自動生成する型ファイルがない場合の簡易的なDatabase型定義
// 本来は `npx supabase gen types typescript --project-id <your-project-id> > types_db.ts` 等で生成します。
// ここでは手動で最小限の型を定義します。
export interface Database {
  public: {
    Tables: {
      high_scores: {
        Row: { // テーブルの行を表す型
          id: string;
          created_at: string;
          name: string;
          score: number;
        };
        Insert: { // データを挿入する際の型（idやcreated_atは自動生成されるためオプショナル）
          id?: string;
          created_at?: string;
          name: string;
          score: number;
        };
        Update: { // データを更新する際の型（今回は使用しない想定）
          id?: string;
          created_at?: string;
          name?: string;
          score?: number;
        };
      };
    };
    Views: { // ビューの型（今回は使用しない）
      [key: string]: never;
    };
    Functions: { // 関数の型（今回は使用しない）
      [key: string]: never;
    };
  };
}

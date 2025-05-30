import { createClient } from '@supabase/supabase-js';
import type { Database } from './types_db'; // types_db.ts は後ほどSupabase CLIで生成される型ファイル（今回は手動で定義）

// SupabaseプロジェクトのURLとAnonキーを環境変数から取得
// これらの変数はビルド環境または実行環境で設定されている必要があります。
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error(
    'Supabase URLまたはAnon Keyが設定されていません。' +
    '.envファイルまたは環境変数を確認してください。'
  );
  // アプリケーションの動作を完全に停止させるか、機能制限モードで動作させるかは要件によります。
  // ここではエラーをログに出力し、クライアントは未初期化のまま（機能しない状態）とします。
}

// Supabaseクライアントを初期化
// Database型を指定することで、テーブル名やカラム名の型補完が効くようになります。
export const supabase = supabaseUrl && supabaseAnonKey 
  ? createClient<Database>(supabaseUrl, supabaseAnonKey) 
  : null;

// この時点では `supabase` が null になる可能性があります。
// 呼び出し側で null チェックを行うか、
// ここで初期化失敗時にエラーをthrowしてアプリケーションを停止させる等のハンドリングが必要です。
// 今回は呼び出し側で null チェックを行う前提とします。
// if (!supabase && supabaseUrl && supabaseAnonKey) { // supabaseUrlとKeyがあるのに初期化失敗した場合
//   throw new Error('Supabase clientの初期化に失敗しました。');
// }

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

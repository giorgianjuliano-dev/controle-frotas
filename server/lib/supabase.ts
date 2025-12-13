import { createClient, SupabaseClient } from '@supabase/supabase-js';
import * as fs from "fs";

const debugLogPath = 'c:\\Users\\mathe\\OneDrive\\Desktop\\CLONE ADELITON\\controle-frotas\\.cursor\\debug.log';

let supabaseClient: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient {
  if (supabaseClient) {
    return supabaseClient;
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  // #region agent log
  try { fs.appendFileSync(debugLogPath, JSON.stringify({location:'supabase.ts:12',message:'[H-B] Checking Supabase env vars',data:{hasUrl:!!supabaseUrl,hasKey:!!supabaseServiceKey,urlPrefix:supabaseUrl?.slice(0,30)},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'B'})+'\n'); } catch(e){}
  // #endregion

  if (!supabaseUrl || !supabaseServiceKey) {
    // #region agent log
    try { fs.appendFileSync(debugLogPath, JSON.stringify({location:'supabase.ts:19',message:'[H-B] Supabase env vars MISSING',data:{hasUrl:!!supabaseUrl,hasKey:!!supabaseServiceKey},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'B'})+'\n'); } catch(e){}
    // #endregion
    throw new Error(
      'Variáveis de ambiente SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY são obrigatórias para usar o Supabase. ' +
      'Configure-as no arquivo .env ou defina STORAGE_TYPE=memory para usar armazenamento em memória.'
    );
  }

  supabaseClient = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  // #region agent log
  try { fs.appendFileSync(debugLogPath, JSON.stringify({location:'supabase.ts:35',message:'[H-C] Supabase client created successfully',data:{url:supabaseUrl?.slice(0,30)},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'C'})+'\n'); } catch(e){}
  // #endregion

  return supabaseClient;
}

export function isSupabaseConfigured(): boolean {
  return !!(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

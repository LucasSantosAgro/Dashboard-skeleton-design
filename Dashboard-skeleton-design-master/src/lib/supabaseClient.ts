import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Adicionamos este log para verificar no Console (F12) se as chaves estão chegando na Vercel
console.log("Supabase Debug - URL:", supabaseUrl ? "Encontrada" : "AUSENTE");
console.log("Supabase Debug - Key:", supabaseAnonKey ? "Encontrada" : "AUSENTE");

if (!supabaseUrl || !supabaseAnonKey) {
  console.error("ERRO: Variáveis do Supabase não encontradas no ambiente Vercel!");
}

export const supabase = createClient(supabaseUrl || '', supabaseAnonKey || '');
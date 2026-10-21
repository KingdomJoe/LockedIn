import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  throw new Error('Supabase URL and anon key must be set in environment variables.');
}

export const supabase = createClient(url, anonKey, {
  auth: { persistSession: false },
});

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl) {
  console.warn("Supabase URL is missing from environment variables.");
}
if (!supabaseAnonKey) {
  console.warn("Supabase Anon Key is missing from environment variables.");
}

// We use fallback placeholders so the app doesn't crash on load, 
// allowing the UI to show the helpful setup guide we added in LoginPage.
export const supabase = createClient(
  supabaseUrl || 'https://MISSING_CONFIG.supabase.co', 
  supabaseAnonKey || 'MISSING_KEY'
);

export const isSupabaseConfigured = () => {
  return !!supabaseUrl && 
         !!supabaseAnonKey && 
         !supabaseUrl.includes('MISSING_CONFIG') &&
         supabaseUrl !== '';
};
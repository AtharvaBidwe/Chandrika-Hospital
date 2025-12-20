
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || '';

export const isSupabaseConfigured = () => {
  return (
    supabaseUrl !== '' && 
    supabaseAnonKey !== '' && 
    !supabaseUrl.includes('MISSING_CONFIG') &&
    !supabaseUrl.includes('placeholder')
  );
};

// Only initialize if we have valid-looking keys to prevent console errors
export const supabase = createClient(
  isSupabaseConfigured() ? supabaseUrl : 'https://demo-bypass.supabase.co',
  isSupabaseConfigured() ? supabaseAnonKey : 'demo-key'
);

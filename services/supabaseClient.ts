
import { createClient } from '@supabase/supabase-js';

// Connection details provided for AtharvaBidwe's Project
const supabaseUrl = 'https://cphhtyhluyzoegzdqthz.supabase.co';
const supabaseAnonKey = 'sb_publishable_Wa-nCkuJ4YcYyqu8AaLB3w_dsRSQM_x';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

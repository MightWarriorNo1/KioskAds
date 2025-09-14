import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

if (!supabaseUrl || !supabaseAnonKey) {
	// Fail fast to surface missing configuration during development
	throw new Error('Missing Supabase environment variables: VITE_SUPABASE_URL and/or VITE_SUPABASE_ANON_KEY');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
	// Persist session across tabs and reloads
	autoRefreshToken: true,
	persistSession: true,
	detectSessionInUrl: true,
});

export type SupabaseClientType = typeof supabase;



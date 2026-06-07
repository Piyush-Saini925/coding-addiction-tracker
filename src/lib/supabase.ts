import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const hasSupabaseConfig = Boolean(supabaseUrl && supabaseAnonKey);

export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-key',
  {
    auth: {
      autoRefreshToken: true,
      detectSessionInUrl: false,
      flowType: 'implicit',
      persistSession: true,
    },
  },
);

export const getSiteUrl = () => {
  const configuredUrl = import.meta.env.VITE_SITE_URL as string | undefined;
  const currentUrl = typeof window !== 'undefined' ? window.location.origin : undefined;
  return (configuredUrl || currentUrl || 'http://127.0.0.1:5173').replace(/\/$/, '');
};

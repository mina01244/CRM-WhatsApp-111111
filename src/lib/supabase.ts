/// <reference types="vite/client" />
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const cleanSupabaseUrl = supabaseUrl.replace(/\/rest\/v1\/?$/, '').replace(/\/$/, '');
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const hasSupabaseKeys = Boolean(cleanSupabaseUrl && supabaseAnonKey);

export const supabase = createClient(
  cleanSupabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder'
);

export const logActivity = async (actionType: string, details: any = {}) => {
  if (!hasSupabaseKeys) return;
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    
    await supabase.from('user_activity_logs').insert({
      user_id: session.user.id,
      action_type: actionType,
      details: details
    });
  } catch (error) {
    console.error('Error logging activity:', error);
  }
};

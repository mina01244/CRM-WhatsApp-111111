import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://dfwlfgzfpdqpuhmaalwf.supabase.co/rest/v1/";
const SUPABASE_PUBLIC_KEY = "sb_publishable_uqXxncWLFUu6Zn-HiKQ3VA_yGYYXLyO";

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLIC_KEY);

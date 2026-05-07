import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const serviceKey = process.env.NEXT_PUBLIC_SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Client for browser use
export const supabase = createClient(url, anonKey);

// Admin client — uses service key exposed as NEXT_PUBLIC for dashboard use
export const supabaseAdmin = createClient(url, serviceKey);

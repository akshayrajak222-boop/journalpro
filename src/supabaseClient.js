import { createClient } from "@supabase/supabase-js";

// ============================================================================
// SUPABASE CONFIGURATION
// ============================================================================
// Replace the values below with your actual Supabase URL and Anon/Public Key.
// You can find these in your Supabase Project Settings under API.
// ============================================================================

// 1. Paste your Supabase API URL here:
const SUPABASE_URL = "https://nezbikvhycsqnhyrbmua.supabase.co/rest/v1/";

// 2. Paste your Supabase Anon/Public Key here:
const SUPABASE_PUBLIC_KEY = "sb_publishable_PxfX9C9h_vsYgthi2YZ4TQ_kP8SD0nE";

// Initialize and export the Supabase client
export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLIC_KEY);

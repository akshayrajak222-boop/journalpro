import { createClient } from "@supabase/supabase-js";

// ============================================================================
// SUPABASE CONFIGURATION
// ============================================================================
// Replace the values below with your actual Supabase URL and Anon/Public Key.
// You can find these in your Supabase Project Settings under API.
// ============================================================================

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || "https://your-project.supabase.co";

// 2. Your Supabase Anon/Public Key:
const SUPABASE_PUBLIC_KEY = import.meta.env.VITE_SUPABASE_KEY || "your-anon-key";

const getTabScopedStorageKey = () => {
  if (typeof window === 'undefined') {
    return 'fxjournal-auth-ssr';
  }

  const tabIdKey = 'fxjournal_tab_id';
  let tabId = window.sessionStorage.getItem(tabIdKey);

  if (!tabId) {
    tabId = `${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
    window.sessionStorage.setItem(tabIdKey, tabId);
  }

  return `fxjournal-auth-${tabId}`;
};

// Initialize and export the Supabase client with tab-scoped session storage.
// Each tab gets its own auth storage key, which prevents cross-tab login/logout mirroring.
export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLIC_KEY, {
  auth: {
    storage: typeof window !== 'undefined' ? window.sessionStorage : undefined,
    storageKey: getTabScopedStorageKey(),
    persistSession: true,
    autoRefreshToken: true,
  }
});

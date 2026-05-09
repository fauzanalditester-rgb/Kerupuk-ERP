
/// <reference types="vite/client" />
import { createClient } from '@supabase/supabase-js';

// Use our own domain as the base URL. The SDK will append /auth/v1 or /rest/v1
// which will be caught and proxied by our server.
const supabaseUrl = typeof window !== 'undefined' ? window.location.origin : '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// Safeguard against missing environment variables
export const supabase = (supabaseUrl && supabaseAnonKey) 
  ? createClient(supabaseUrl, supabaseAnonKey, {
      realtime: {
        params: {
          eventsPerSecond: 10
        }
      }
    })
  : {
      from: () => ({
        select: () => Promise.resolve({ data: [], error: null }),
        upsert: () => Promise.resolve({ error: null }),
        delete: () => ({ neq: () => Promise.resolve({ error: null }) }),
      })
    } as any;

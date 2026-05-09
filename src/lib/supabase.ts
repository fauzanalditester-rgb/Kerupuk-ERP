/// <reference types="vite/client" />
import { createClient } from '@supabase/supabase-js';

// Create a full URL using the current origin to satisfy Supabase SDK validation
// while still proxying through our server to bypass Mixed Content issues.
const currentOrigin = typeof window !== 'undefined' ? window.location.origin : '';
const supabaseUrl = currentOrigin + '/supabase-api';
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

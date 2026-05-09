/// <reference types="vite/client" />
import { createClient } from '@supabase/supabase-js';

// Use relative path for proxying through our own server to bypass Mixed Content issues
const supabaseUrl = '/supabase-api';
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

import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/supabase'

// Environment variables validation
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// Environment validated successfully

if (!supabaseUrl) {
  throw new Error('Missing environment variable: VITE_SUPABASE_URL')
}

if (!supabaseAnonKey) {
  throw new Error('Missing environment variable: VITE_SUPABASE_ANON_KEY')
}

// Create typed Supabase client
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  }
})

// Export types for convenience
export type { Database } from '@/types/supabase'
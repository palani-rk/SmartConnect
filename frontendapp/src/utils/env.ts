// Environment configuration utilities

export const env = {
  // Supabase
  SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL,
  SUPABASE_ANON_KEY: import.meta.env.VITE_SUPABASE_ANON_KEY,
  
  // App
  APP_NAME: import.meta.env.VITE_APP_NAME || 'SmartConnect',
  APP_VERSION: import.meta.env.VITE_APP_VERSION || '1.0.0',
  
  // Development
  DEV_MODE: import.meta.env.VITE_DEV_MODE === 'true',
  IS_PRODUCTION: import.meta.env.PROD,
  IS_DEVELOPMENT: import.meta.env.DEV,
} as const

// Validation function
export const validateEnvironment = () => {
  const required = [
    'SUPABASE_URL',
    'SUPABASE_ANON_KEY'
  ] as const

  const missing = required.filter(key => !env[key])
  
  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(', ')}\n` +
      'Please check your .env.local file.'
    )
  }
  
  return true
}
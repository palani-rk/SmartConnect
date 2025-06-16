import { supabase } from './supabase'
import { validateEnvironment } from '@/utils/env'

// Test Supabase connection
export const testSupabaseConnection = async () => {
  try {
    // Validate environment first
    validateEnvironment()
    
    // Test basic connection by fetching organizations count
    const { error, count } = await supabase
      .from('organizations')
      .select('*', { count: 'exact', head: true })
    
    if (error) {
      console.error('Supabase connection test failed:', error)
      return { success: false, error: error.message }
    }
    
    console.log('✅ Supabase connection successful!')
    console.log(`📊 Found ${count} organizations in database`)
    
    return { success: true, count }
  } catch (error) {
    console.error('Environment or connection error:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }
  }
}
import { describe, it, expect } from 'vitest'
import { createClient } from '@supabase/supabase-js'
import 'dotenv/config'

describe('Supabase Connection Test', () => {
  it('should connect to Supabase and verify basic functionality', async () => {
    // Use environment variables for configuration
    const supabaseUrl = process.env.SUPABASE_URL || 'https://axmikjtbiddtmdepaqhr.supabase.co'
    const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF4bWlranRiaWRkdG1kZXBhcWhyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MTkyMDI5MDEsImV4cCI6MjAzNDc3ODkwMX0.l4wNVhK0WrX3wNr6vdHZbdOWFnz4aNhNQYOdj5ZojTU'
    
    console.log('Testing connection to:', supabaseUrl)
    console.log('Using anon key:', supabaseAnonKey.substring(0, 20) + '...')
    
    const supabase = createClient(supabaseUrl, supabaseAnonKey)
    
    // Test basic connection
    const { data, error } = await supabase
      .from('organizations')
      .select('count')
      .limit(1)
    
    console.log('Query result:', { data, error })
    
    if (error) {
      console.error('Connection error:', error)
    }
    
    expect(error).toBeNull()
    expect(data).toBeDefined()
  }, 15000)

  it('should authenticate a test user', async () => {
    const supabase = createClient(
      process.env.SUPABASE_URL || 'https://axmikjtbiddtmdepaqhr.supabase.co',
      process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF4bWlranRiaWRkdG1kZXBhcWhyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MTkyMDI5MDEsImV4cCI6MjAzNDc3ODkwMX0.l4wNVhK0WrX3wNr6vdHZbdOWFnz4aNhNQYOdj5ZojTU'
    )
    
    console.log('Attempting to authenticate test user...')
    
    const { data, error } = await supabase.auth.signInWithPassword({
      email: 'purajan.rk@gmail.com',
      password: 'Citrix123#'
    })
    
    console.log('Auth result:', { 
      user: data.user?.id, 
      error: error?.message,
      metadata: data.user?.user_metadata 
    })
    
    expect(error).toBeNull()
    expect(data.user).toBeDefined()
    expect(data.user?.user_metadata?.role).toBe('admin')
    expect(data.user?.user_metadata?.organization_id).toBe('d5b7b961-9005-4443-8680-4b16f7181a51')
    
    // Clean up
    await supabase.auth.signOut()
  }, 15000)
})
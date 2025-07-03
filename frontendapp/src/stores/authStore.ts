import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '@/services/supabase'
import type { User, UserRole } from '@/types/auth'

// Helper function to check if error is related to expired session
const isSessionExpiredError = (error: any): boolean => {
  if (!error?.message) return false
  const message = error.message.toLowerCase()
  return message.includes('session_not_found') ||
         message.includes('expired') ||
         message.includes('jwt') ||
         message.includes('invalid_session') ||
         message.includes('token_expired')
}

interface AuthState {
  // State
  user: User | null
  session: Session | null
  isLoading: boolean
  isAuthenticated: boolean
  initialized: boolean
  
  // Actions
  initialize: () => Promise<void>
  signIn: (email: string, password: string) => Promise<{ success: boolean; error?: string }>
  signOut: () => Promise<void>
  clearExpiredSession: () => void
  setUser: (user: User | null) => void
  setSession: (session: Session | null) => void
  
  // Utilities
  getUserRole: () => UserRole | null
  hasRole: (role: UserRole) => boolean
  canAccess: (requiredRoles: UserRole[]) => boolean
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      // Initial state
      user: null,
      session: null,
      isLoading: true,
      isAuthenticated: false,
      initialized: false,

      // Initialize auth state from Supabase
      initialize: async () => {
        const { initialized } = get()
        if (initialized) return // Prevent multiple initializations
        
        try {
          set({ isLoading: true })
          
          // Get current session
          const { data: { session }, error: sessionError } = await supabase.auth.getSession()
          
          if (sessionError) {
            console.error('Error getting session:', sessionError)
            
            // If session is expired or not found, clear the auth state
            if (isSessionExpiredError(sessionError)) {
              console.warn('Session expired during initialization, clearing state')
              set({ 
                user: null, 
                session: null, 
                isAuthenticated: false, 
                isLoading: false,
                initialized: true
              })
            } else {
              set({ isLoading: false, initialized: true })
            }
            return
          }

          if (session?.user) {
            // Fetch user profile from database
            const { data: userProfile, error: profileError } = await supabase
              .from('users')
              .select('*')
              .eq('id', session.user.id)
              .single()

            if (profileError) {
              console.error('Error fetching user profile:', profileError)
              // If it's a role constraint error, sign out the user
              if (profileError.code === '22023' && profileError.message?.includes('role')) {
                console.warn('Invalid user role detected, signing out user')
                await supabase.auth.signOut()
                set({ 
                  user: null, 
                  session: null, 
                  isAuthenticated: false, 
                  isLoading: false,
                  initialized: true
                })
                return
              }
              set({ session, isLoading: false, initialized: true })
              return
            }

            set({ 
              user: userProfile, 
              session, 
              isAuthenticated: true, 
              isLoading: false,
              initialized: true
            })
          } else {
            set({ 
              user: null, 
              session: null, 
              isAuthenticated: false, 
              isLoading: false,
              initialized: true
            })
          }

          // Listen for auth changes
          supabase.auth.onAuthStateChange(async (event, session) => {
            console.log('Auth state change:', event, session?.user?.id)
            
            if (event === 'SIGNED_IN' && session?.user) {
              // Fetch user profile
              const { data: userProfile, error: profileError } = await supabase
                .from('users')
                .select('*')
                .eq('id', session.user.id)
                .single()

              if (profileError) {
                console.error('Error in auth state change:', profileError)
                if (profileError.code === '22023' && profileError.message?.includes('role')) {
                  await supabase.auth.signOut()
                  return
                }
              }

              set({ 
                user: userProfile, 
                session, 
                isAuthenticated: true,
                isLoading: false
              })
            } else if (event === 'SIGNED_OUT' || event === 'TOKEN_REFRESHED' && !session) {
              // Handle sign out or expired token
              set({ 
                user: null, 
                session: null, 
                isAuthenticated: false,
                isLoading: false
              })
            }
          })
        } catch (error) {
          console.error('Auth initialization error:', error)
          set({ 
            isLoading: false, 
            initialized: true, 
            isAuthenticated: false,
            user: null,
            session: null
          })
        }
      },

      // Sign in
      signIn: async (email: string, password: string) => {
        try {
          set({ isLoading: true })
          
          const { error } = await supabase.auth.signInWithPassword({
            email,
            password
          })

          if (error) {
            set({ isLoading: false })
            return { success: false, error: error.message }
          }

          // User profile will be fetched in the auth state change listener
          return { success: true }
        } catch (error) {
          set({ isLoading: false })
          return { 
            success: false, 
            error: error instanceof Error ? error.message : 'Sign in failed' 
          }
        }
      },

      // Sign out
      signOut: async () => {
        try {
          set({ isLoading: true })
          
          // Attempt to sign out from Supabase
          const { error } = await supabase.auth.signOut()
          
          if (error) {
            // If session is expired or not found, just clear local state
            if (isSessionExpiredError(error)) {
              console.warn('Session expired during sign out, clearing local state:', error.message)
              set({ 
                user: null, 
                session: null, 
                isAuthenticated: false, 
                isLoading: false 
              })
              return
            }
            throw error
          }
          
          // State will be cleared in the auth state change listener
        } catch (error) {
          console.error('Sign out error:', error)
          
          // Even if sign out fails, clear local state to prevent stuck loading
          set({ 
            user: null, 
            session: null, 
            isAuthenticated: false, 
            isLoading: false 
          })
        }
      },

      // Clear expired session without calling Supabase
      clearExpiredSession: () => {
        console.warn('Clearing expired session')
        set({ 
          user: null, 
          session: null, 
          isAuthenticated: false, 
          isLoading: false 
        })
      },

      // Set user
      setUser: (user: User | null) => {
        set({ user, isAuthenticated: !!user })
      },

      // Set session
      setSession: (session: Session | null) => {
        set({ session })
      },

      // Get user role
      getUserRole: (): UserRole | null => {
        const { user } = get()
        return user?.role as UserRole || null
      },

      // Check if user has specific role
      hasRole: (role: UserRole): boolean => {
        const userRole = get().getUserRole()
        return userRole === role
      },

      // Check if user can access based on required roles
      canAccess: (requiredRoles: UserRole[]): boolean => {
        const { isAuthenticated } = get()
        if (!isAuthenticated) return false
        
        const userRole = get().getUserRole()
        if (!userRole) return false
        
        return requiredRoles.includes(userRole)
      }
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        // Only persist user and session, not loading or initialization states
        user: state.user,
        session: state.session,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
)
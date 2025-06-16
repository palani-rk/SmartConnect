import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '@/services/supabase'
import type { User, UserRole } from '@/types/auth'

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
            set({ isLoading: false })
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
              set({ session, isLoading: false })
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
            
            if (event === 'SIGNED_IN' && session?.user) {
              // Fetch user profile
              const { data: userProfile } = await supabase
                .from('users')
                .select('*')
                .eq('id', session.user.id)
                .single()

              set({ 
                user: userProfile, 
                session, 
                isAuthenticated: true,
                isLoading: false
              })
            } else if (event === 'SIGNED_OUT') {
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
          await supabase.auth.signOut()
          // State will be cleared in the auth state change listener
        } catch (error) {
          console.error('Sign out error:', error)
          set({ isLoading: false })
        }
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
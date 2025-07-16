import { useAuthStore } from '@/stores/authStore'

/**
 * Utility to handle authentication errors throughout the app
 * Automatically clears expired sessions when detected
 */
export class AuthErrorHandler {
  /**
   * Check if an error indicates an expired or invalid session
   */
  static isSessionExpiredError(error: any): boolean {
    if (!error?.message) return false
    const message = error.message.toLowerCase()
    return message.includes('session_not_found') ||
           message.includes('expired') ||
           message.includes('jwt') ||
           message.includes('invalid_session') ||
           message.includes('token_expired') ||
           message.includes('unauthorized') ||
           error.status === 401
  }

  /**
   * Handle authentication errors by clearing expired sessions
   * Returns true if session was cleared, false otherwise
   */
  static handleAuthError(error: any): boolean {
    if (this.isSessionExpiredError(error)) {
      console.warn('Detected expired session, clearing auth state:', error.message)
      const { clearExpiredSession } = useAuthStore.getState()
      clearExpiredSession()
      return true
    }
    return false
  }

  /**
   * Wrapper for API calls that automatically handles auth errors
   */
  static async withAuthErrorHandling<T>(
    apiCall: () => Promise<T>,
    options: { onSessionExpired?: () => void } = {}
  ): Promise<T> {
    try {
      return await apiCall()
    } catch (error) {
      const wasSessionExpired = this.handleAuthError(error)
      
      if (wasSessionExpired && options.onSessionExpired) {
        options.onSessionExpired()
      }
      
      throw error
    }
  }
}

/**
 * Hook to automatically handle auth errors in React components
 */
export const useAuthErrorHandler = () => {
  return {
    handleAuthError: AuthErrorHandler.handleAuthError,
    isSessionExpiredError: AuthErrorHandler.isSessionExpiredError,
    withAuthErrorHandling: AuthErrorHandler.withAuthErrorHandling
  }
}
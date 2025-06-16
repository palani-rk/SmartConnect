import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { env } from '@/utils/env'

const LoginPage = () => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  // Debug error state changes
  const setErrorWithDebug = (newError: string) => {
    console.log('LoginPage: setError called with:', newError)
    console.log('LoginPage: Stack trace:', new Error().stack)
    setError(newError)
  }
  const navigate = useNavigate()
  const auth = useAuth()
  const { signIn, isLoading, isAuthenticated } = auth

  // Clear error when user starts typing again (only clear when input actually changes)
  const clearErrorOnInput = () => {
    if (error) {
      console.log('LoginPage: Clearing error on input')
      setErrorWithDebug('')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorWithDebug('')

    console.log('LoginPage: Starting sign in...')
    const result = await signIn(email, password)
    console.log('LoginPage: Sign in result:', result)
    
    if (!result.success) {
      const errorMessage = result.error || 'Login failed'
      console.log('LoginPage: Setting error message:', errorMessage)
      setErrorWithDebug(errorMessage)
      console.log('LoginPage: About to clear password...')
      setPassword('') // Clear password on error for security
      console.log('LoginPage: Password cleared, current error should be:', errorMessage)
      
      // Check if error persists after a brief delay
      setTimeout(() => {
        console.log('LoginPage: Error check after timeout, current error:', error)
      }, 100)
    } else {
      // Success - redirect to dashboard
      navigate('/dashboard')
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="max-w-md w-full mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-gray-900">
              Welcome to {env.APP_NAME}
            </h1>
            <p className="text-gray-600 mt-2">Sign in to your account</p>
          </div>

          {/* Error Message */}
          {console.log('LoginPage: Rendering, error state:', error)}
          {error && (
            <div style={{backgroundColor: '#FEE2E2', border: '1px solid #F87171', color: '#DC2626', padding: '16px', marginBottom: '24px', borderRadius: '8px'}}>
              <div style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
                <span>⚠️</span>
                <span style={{fontWeight: '600'}}>{error}</span>
              </div>
            </div>
          )}
          

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value)
                  clearErrorOnInput()
                }}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                placeholder="Enter your email"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value)
                  clearErrorOnInput()
                }}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                placeholder="Enter your password"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-primary-600 hover:bg-primary-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-semibold py-3 px-4 rounded-lg transition-all duration-200 flex items-center justify-center space-x-2"
            >
              {isLoading && (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              )}
              <span>{isLoading ? 'Signing in...' : 'Sign In'}</span>
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}

export default LoginPage
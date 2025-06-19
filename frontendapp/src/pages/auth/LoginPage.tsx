import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { env } from '@/utils/env'
import {
  Container,
  Paper,
  Box,
  Typography,
  TextField,
  Button,
  Alert,
  CircularProgress,
} from '@mui/material'

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
  const { signIn, isLoading } = auth

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
    <Container component="main" maxWidth="sm">
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Paper elevation={3} sx={{ padding: 4, width: '100%', maxWidth: 400 }}>
          {/* Header */}
          <Box textAlign="center" mb={4}>
            <Typography variant="h4" component="h1" gutterBottom>
              Welcome to {env.APP_NAME}
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Sign in to your account
            </Typography>
          </Box>

          {/* Error Message */}
          {error && (
            <Alert severity="error" sx={{ mb: 3 }}>
              {error}
            </Alert>
          )}

          {/* Login Form */}
          <Box component="form" onSubmit={handleSubmit}>
            <TextField
              margin="normal"
              required
              fullWidth
              id="email"
              label="Email"
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value)
                clearErrorOnInput()
              }}
              autoComplete="email"
              autoFocus
            />

            <TextField
              margin="normal"
              required
              fullWidth
              id="password"
              label="Password"
              type="password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value)
                clearErrorOnInput()
              }}
              autoComplete="current-password"
            />

            <Button
              type="submit"
              fullWidth
              variant="contained"
              disabled={isLoading}
              sx={{ mt: 3, mb: 2, py: 1.5 }}
              startIcon={isLoading ? <CircularProgress size={20} /> : null}
            >
              {isLoading ? 'Signing in...' : 'Sign In'}
            </Button>
          </Box>
        </Paper>
      </Box>
    </Container>
  )
}

export default LoginPage
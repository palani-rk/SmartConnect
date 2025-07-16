import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTranslation } from 'react-i18next';
import {
  Container,
  Paper,
  Box,
  Typography,
  TextField,
  Button,
  Link,
  Alert,
  CircularProgress,
} from '@mui/material';

interface LoginFormData {
  email: string;
  password: string;
}

const Login: React.FC = () => {
  const { t } = useTranslation();
  const { signIn, signUp } = useAuth();
  const navigate = useNavigate();
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>();

  const onSubmit = async (data: LoginFormData) => {
    setLoading(true);
    setError(null);
    
    try {
      if (isLogin) {
        const { error } = await signIn(data.email, data.password);
        if (error) throw error;
        navigate('/dashboard');
      } else {
        const { error } = await signUp(data.email, data.password);
        if (error) throw error;
        setError(String(t('auth.checkEmail')));
      }
    } catch (err: any) {
      setError(err.message || String(t('auth.unknownError')));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container component="main" maxWidth="xs">
      <Box
        sx={{
          marginTop: 8,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          minHeight: '100vh',
        }}
      >
        <Paper
          elevation={3}
          sx={{
            padding: 4,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            width: '100%',
          }}
        >
          <Typography component="h1" variant="h4" sx={{ mb: 3 }}>
            {isLogin ? t('auth.signIn') : t('auth.signUp')}
          </Typography>
          
          <Box component="form" onSubmit={handleSubmit(onSubmit)} sx={{ width: '100%' }}>
            <TextField
              margin="normal"
              required
              fullWidth
              id="email"
              label={t('auth.email')}
              type="email"
              autoComplete="email"
              autoFocus
              error={!!errors.email}
              helperText={errors.email?.message}
              {...register('email', {
                required: String(t('auth.emailRequired')),
                pattern: {
                  value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                  message: String(t('auth.invalidEmail')),
                },
              })}
            />
            
            <TextField
              margin="normal"
              required
              fullWidth
              id="password"
              label={t('auth.password')}
              type="password"
              autoComplete={isLogin ? 'current-password' : 'new-password'}
              error={!!errors.password}
              helperText={errors.password?.message}
              {...register('password', {
                required: String(t('auth.passwordRequired')),
                minLength: {
                  value: 6,
                  message: String(t('auth.passwordTooShort')),
                },
              })}
            />

            {error && (
              <Alert severity="error" sx={{ mt: 2 }}>
                {error}
              </Alert>
            )}

            <Button
              type="submit"
              fullWidth
              variant="contained"
              disabled={loading}
              sx={{ mt: 3, mb: 2 }}
              startIcon={loading ? <CircularProgress size={20} /> : null}
            >
              {isLogin ? t('auth.signIn') : t('auth.signUp')}
            </Button>
            
            <Box textAlign="center">
              <Link
                component="button"
                type="button"
                variant="body2"
                onClick={() => setIsLogin(!isLogin)}
                sx={{ cursor: 'pointer' }}
              >
                {isLogin
                  ? t('auth.needAccount')
                  : t('auth.alreadyHaveAccount')}
              </Link>
            </Box>
          </Box>
        </Paper>
      </Box>
    </Container>
  );
};

export default Login; 
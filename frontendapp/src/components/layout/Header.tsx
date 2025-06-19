import { useAuth } from '@/hooks/useAuth'
import { env } from '@/utils/env'
import {
  AppBar,
  Toolbar,
  Box,
  Typography,
  Chip,
  Avatar,
  Button,
  Stack,
} from '@mui/material'

export const Header = () => {
  const { user, signOut } = useAuth()

  const handleSignOut = async () => {
    await signOut()
  }

  return (
    <AppBar 
      position="static" 
      sx={{ 
        backgroundColor: 'white', 
        boxShadow: 2,
        borderBottom: 1,
        borderColor: 'grey.200'
      }}
    >
      <Toolbar sx={{ px: 3, py: 2 }}>
        {/* Logo/Brand */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexGrow: 1 }}>
          <Stack direction="row" alignItems="center" spacing={1}>
            <Avatar
              sx={{
                width: 32,
                height: 32,
                bgcolor: 'primary.600',
                borderRadius: 1.5,
                fontSize: '0.875rem',
                fontWeight: 'bold'
              }}
            >
              SC
            </Avatar>
            <Typography 
              variant="h6" 
              component="h1" 
              sx={{ 
                fontWeight: 'bold',
                color: 'grey.900' 
              }}
            >
              {env.APP_NAME}
            </Typography>
          </Stack>
          <Chip
            label={`v${env.APP_VERSION}`}
            size="small"
            sx={{
              backgroundColor: 'primary.50',
              color: 'primary.600',
              fontSize: '0.75rem',
              fontWeight: 'medium',
              height: 24
            }}
          />
        </Box>

        {/* User Menu */}
        {user && (
          <Stack direction="row" alignItems="center" spacing={2}>
            <Box sx={{ textAlign: 'right' }}>
              <Typography variant="body2" sx={{ fontWeight: 'medium', color: 'grey.900' }}>
                {user.email}
              </Typography>
              <Typography 
                variant="caption" 
                sx={{ 
                  color: 'primary.600', 
                  textTransform: 'capitalize',
                  fontWeight: 'medium'
                }}
              >
                {user.role}
              </Typography>
            </Box>
            
            <Button
              onClick={handleSignOut}
              variant="outlined"
              color="error"
              size="small"
              sx={{
                backgroundColor: 'error.50',
                borderColor: 'error.200',
                color: 'error.700',
                '&:hover': {
                  backgroundColor: 'error.100',
                  borderColor: 'error.300'
                }
              }}
            >
              Sign Out
            </Button>
          </Stack>
        )}
      </Toolbar>
    </AppBar>
  )
}
import { useAuth } from '@/hooks/useAuth'
import {
  Typography,
  Paper,
  Grid,
  Box,
} from '@mui/material'

const DashboardPage = () => {
  const { user } = useAuth()

  return (
    <Box>
      <Typography variant="h4" sx={{ fontWeight: 'bold', color: 'grey.900', mb: 3 }}>
        Dashboard
      </Typography>
      
      <Paper elevation={1} sx={{ p: 3 }}>
        <Typography variant="h6" sx={{ fontWeight: 'semibold', color: 'grey.800', mb: 3 }}>
          Welcome back, {user?.email}!
        </Typography>
        
        <Grid container spacing={3}>
          <Grid size={{ xs: 12, md: 4 }}>
            <Paper elevation={0} sx={{ backgroundColor: 'grey.50', p: 2 }}>
              <Typography variant="body1" sx={{ fontWeight: 'medium', color: 'grey.700' }}>
                Your Role
              </Typography>
              <Typography 
                variant="h4" 
                sx={{ 
                  fontWeight: 'bold', 
                  color: 'primary.600',
                  textTransform: 'capitalize',
                  mt: 1
                }}
              >
                {user?.role}
              </Typography>
            </Paper>
          </Grid>
          
          <Grid size={{ xs: 12, md: 4 }}>
            <Paper elevation={0} sx={{ backgroundColor: 'grey.50', p: 2 }}>
              <Typography variant="body1" sx={{ fontWeight: 'medium', color: 'grey.700' }}>
                Organization
              </Typography>
              <Typography variant="body2" sx={{ color: 'grey.600', mt: 1 }}>
                ID: {user?.organization_id}
              </Typography>
            </Paper>
          </Grid>
          
          <Grid size={{ xs: 12, md: 4 }}>
            <Paper elevation={0} sx={{ backgroundColor: 'grey.50', p: 2 }}>
              <Typography variant="body1" sx={{ fontWeight: 'medium', color: 'grey.700' }}>
                Integrations
              </Typography>
              <Box sx={{ mt: 1, display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                <Typography variant="caption" sx={{ color: 'grey.600' }}>
                  WhatsApp: {user?.whatsapp_id || 'Not connected'}
                </Typography>
                <Typography variant="caption" sx={{ color: 'grey.600' }}>
                  Instagram: {user?.instagram_id || 'Not connected'}
                </Typography>
              </Box>
            </Paper>
          </Grid>
        </Grid>
      </Paper>
    </Box>
  )
}

export default DashboardPage
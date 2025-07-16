import { Box, Typography, Paper } from '@mui/material'

const ProfilePage = () => {
  return (
    <Box>
      <Typography variant="h4" sx={{ fontWeight: 'bold', color: 'grey.900', mb: 3 }}>
        Profile
      </Typography>
      <Paper elevation={1} sx={{ p: 3 }}>
        <Typography variant="body1" color="text.secondary">
          User profile and settings
        </Typography>
      </Paper>
    </Box>
  )
}

export default ProfilePage
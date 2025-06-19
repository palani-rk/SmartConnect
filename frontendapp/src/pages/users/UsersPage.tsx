import { Box, Typography, Paper } from '@mui/material'

const UsersPage = () => {
  return (
    <Box>
      <Typography variant="h4" sx={{ fontWeight: 'bold', color: 'grey.900', mb: 3 }}>
        Users
      </Typography>
      <Paper elevation={1} sx={{ p: 3 }}>
        <Typography variant="body1" color="text.secondary">
          User management (God and Admin users)
        </Typography>
      </Paper>
    </Box>
  )
}

export default UsersPage
import { Box, Typography, Paper } from '@mui/material'

const OrganizationsPage = () => {
  return (
    <Box>
      <Typography variant="h4" sx={{ fontWeight: 'bold', color: 'grey.900', mb: 3 }}>
        Organizations
      </Typography>
      <Paper elevation={1} sx={{ p: 3 }}>
        <Typography variant="body1" color="text.secondary">
          Organization management (God users only)
        </Typography>
      </Paper>
    </Box>
  )
}

export default OrganizationsPage
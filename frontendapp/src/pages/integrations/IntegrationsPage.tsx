import { Box, Typography, Paper } from '@mui/material'

const IntegrationsPage = () => {
  return (
    <Box>
      <Typography variant="h4" sx={{ fontWeight: 'bold', color: 'grey.900', mb: 3 }}>
        Integrations
      </Typography>
      <Paper elevation={1} sx={{ p: 3 }}>
        <Typography variant="body1" color="text.secondary">
          WhatsApp & Instagram integration setup (Admin only)
        </Typography>
      </Paper>
    </Box>
  )
}

export default IntegrationsPage
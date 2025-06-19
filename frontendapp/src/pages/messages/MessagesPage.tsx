import { Box, Typography, Paper } from '@mui/material'

const MessagesPage = () => {
  return (
    <Box>
      <Typography variant="h4" sx={{ fontWeight: 'bold', color: 'grey.900', mb: 3 }}>
        Messages
      </Typography>
      <Paper elevation={1} sx={{ p: 3 }}>
        <Typography variant="body1" color="text.secondary">
          Messaging interface
        </Typography>
      </Paper>
    </Box>
  )
}

export default MessagesPage
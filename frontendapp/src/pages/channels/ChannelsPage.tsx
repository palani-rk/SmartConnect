import React from 'react'
import { Box, Typography } from '@mui/material'
import { useAuthStore } from '@/stores/authStore'
import { ChannelList } from '@/features/channel_mgmt'

const ChannelsPage: React.FC = () => {
  const { user } = useAuthStore()
  
  // Get organization ID from authenticated user
  const organizationId = user?.organization_id

  if (!organizationId) {
    return (
      <Box>
        <Typography variant="h4" sx={{ fontWeight: 'bold', color: 'grey.900', mb: 3 }}>
          Channels
        </Typography>
        <Typography variant="body1" color="error">
          No organization found. Please contact your administrator.
        </Typography>
      </Box>
    )
  }

  return (
    <Box>
      <Typography variant="h4" sx={{ fontWeight: 'bold', color: 'grey.900', mb: 3 }}>
        Channel Management
      </Typography>
      
      <ChannelList organizationId={organizationId} />
    </Box>
  )
}

export default ChannelsPage
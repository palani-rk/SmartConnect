import { useState, useEffect } from 'react'
import { 
  Box, 
  Typography, 
  Paper, 
  Grid, 
  List, 
  ListItem, 
  ListItemText, 
  ListItemButton,
  Alert,
  CircularProgress,
  Chip
} from '@mui/material'
import { useChannelStore } from '@/features/channel_mgmt/stores/channelStore'
import { useAuthStore } from '@/stores/authStore'
import { MessageList, MessageInput } from '@/features/messaging/components'
import { useMessageList } from '@/features/messaging/hooks'
import type { ChannelWithDetails } from '@/features/channel_mgmt/types/channel'

const MessagesPage = () => {
  const { user } = useAuthStore()
  const { 
    channels, 
    isLoading: channelsLoading, 
    error: channelsError,
    fetchChannels 
  } = useChannelStore()
  
  const [selectedChannel, setSelectedChannel] = useState<ChannelWithDetails | null>(null)
  
  // Get organization ID from authenticated user
  const organizationId = user?.organization_id
  
  // Load channels when component mounts
  useEffect(() => {
    if (organizationId) {
      fetchChannels(organizationId)
    }
  }, [organizationId, fetchChannels])

  // Auto-select first channel if none selected
  useEffect(() => {
    if (!selectedChannel && channels.length > 0) {
      setSelectedChannel(channels[0])
    }
  }, [selectedChannel, channels])

  // Use message list hook for the selected channel
  const {
    isSending,
    error: messagesError,
    connectionStatus,
    sendMessage,
    clearError,
  } = useMessageList({
    channelId: selectedChannel?.id || '',
    autoLoad: true,
  })

  const handleChannelSelect = (channel: ChannelWithDetails) => {
    setSelectedChannel(channel)
  }

  const handleSendMessage = async (content: string) => {
    if (!selectedChannel) return
    
    try {
      await sendMessage(content)
    } catch (error) {
      console.error('Failed to send message:', error)
    }
  }

  if (!user) {
    return (
      <Box>
        <Typography variant="h4" sx={{ fontWeight: 'bold', color: 'grey.900', mb: 3 }}>
          Messages
        </Typography>
        <Alert severity="warning">
          Please log in to view messages
        </Alert>
      </Box>
    )
  }

  if (!organizationId) {
    return (
      <Box>
        <Typography variant="h4" sx={{ fontWeight: 'bold', color: 'grey.900', mb: 3 }}>
          Messages
        </Typography>
        <Alert severity="warning">
          No organization found. Please contact your administrator.
        </Alert>
      </Box>
    )
  }

  return (
    <Box>
      <Typography variant="h4" sx={{ fontWeight: 'bold', color: 'grey.900', mb: 3 }}>
        Messages
      </Typography>
      
      <Grid container spacing={2} sx={{ height: 'calc(100vh - 200px)' }}>
        {/* Channel List */}
        <Grid size={{ xs: 12, md: 3 }}>
          <Paper elevation={1} sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <Box sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
              <Typography variant="h6" fontWeight="600">
                Channels
              </Typography>
            </Box>
            
            {channelsLoading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
                <CircularProgress size={24} />
              </Box>
            ) : channelsError ? (
              <Alert severity="error" sx={{ m: 2 }}>
                {channelsError}
              </Alert>
            ) : (
              <List sx={{ flexGrow: 1, overflow: 'auto' }}>
                {channels.map((channel) => (
                  <ListItem key={channel.id} disablePadding>
                    <ListItemButton
                      selected={selectedChannel?.id === channel.id}
                      onClick={() => handleChannelSelect(channel)}
                      sx={{
                        '&.Mui-selected': {
                          backgroundColor: 'primary.50',
                          borderRight: '3px solid',
                          borderColor: 'primary.main',
                        },
                      }}
                    >
                      <ListItemText
                        primary={
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Typography variant="body1" fontWeight="500">
                              #{channel.name}
                            </Typography>
                            <Chip
                              label={channel.type}
                              size="small"
                              variant="outlined"
                              sx={{ fontSize: '0.65rem' }}
                            />
                          </Box>
                        }
                        secondary={channel.description || `${channel.member_count} members`}
                      />
                    </ListItemButton>
                  </ListItem>
                ))}
              </List>
            )}
          </Paper>
        </Grid>

        {/* Message Interface */}
        <Grid size={{ xs: 12, md: 9 }}>
          <Paper elevation={1} sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            {selectedChannel ? (
              <>
                {/* Channel Header */}
                <Box sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
                  <Typography variant="h6" fontWeight="600">
                    #{selectedChannel.name}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {selectedChannel.description || `${selectedChannel.member_count} members`}
                  </Typography>
                </Box>

                {/* Messages Error */}
                {messagesError && (
                  <Alert severity="error" onClose={clearError} sx={{ m: 2 }}>
                    {messagesError}
                  </Alert>
                )}

                {/* Messages List */}
                <Box sx={{ flexGrow: 1, overflow: 'hidden' }}>
                  <MessageList
                    channelId={selectedChannel.id}
                    height={400}
                  />
                </Box>

                {/* Message Input */}
                <MessageInput
                  channelId={selectedChannel.id}
                  onSendMessage={async (data) => {
                    await handleSendMessage(data.content)
                  }}
                  isLoading={isSending}
                  disabled={connectionStatus !== 'connected'}
                />
              </>
            ) : (
              <Box
                sx={{
                  height: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexDirection: 'column',
                  gap: 2,
                }}
              >
                <Typography variant="h6" color="text.secondary">
                  Select a channel to start messaging
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Choose a channel from the list to view and send messages
                </Typography>
              </Box>
            )}
          </Paper>
        </Grid>
      </Grid>
    </Box>
  )
}

export default MessagesPage
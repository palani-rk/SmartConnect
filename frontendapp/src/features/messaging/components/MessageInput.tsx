import React, { useState, useRef, useCallback } from 'react'
import {
  Box,
  TextField,
  IconButton,
  Paper,
  Typography,
  Tooltip,
  CircularProgress,
  Chip,
} from '@mui/material'
import {
  Send as SendIcon,
  EmojiEmotions as EmojiIcon,
  AttachFile as AttachFileIcon,
  Close as CloseIcon,
} from '@mui/icons-material'
import type { MessageFormData } from '../types/message'

interface MessageInputProps {
  channelId: string
  onSendMessage: (data: MessageFormData) => Promise<void>
  isLoading?: boolean
  disabled?: boolean
  replyToMessage?: {
    id: string
    content: string
    author: string
  } | null
  onCancelReply?: () => void
}

const MessageInput: React.FC<MessageInputProps> = ({
  channelId,
  onSendMessage,
  isLoading = false,
  disabled = false,
  replyToMessage,
  onCancelReply,
}) => {
  const [message, setMessage] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const textFieldRef = useRef<HTMLInputElement>(null)

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
    
    const trimmedMessage = message.trim()
    if (!trimmedMessage || isSubmitting || disabled) return

    setIsSubmitting(true)
    
    try {
      const messageData: MessageFormData = {
        content: trimmedMessage,
        channelId,
        messageType: 'text',
        ...(replyToMessage && { threadId: replyToMessage.id }),
      }

      await onSendMessage(messageData)
      setMessage('')
      onCancelReply?.()
    } catch (error) {
      console.error('Failed to send message:', error)
      // Error handling is done in the parent component
    } finally {
      setIsSubmitting(false)
    }
  }, [message, isSubmitting, disabled, channelId, replyToMessage, onSendMessage, onCancelReply])

  const handleKeyPress = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e as any)
    }
  }, [handleSubmit])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setMessage(e.target.value)
  }

  const handleEmojiClick = () => {
    // TODO: Implement emoji picker
    console.log('Emoji picker not implemented yet')
  }

  const handleAttachFile = () => {
    // TODO: Implement file attachment
    console.log('File attachment not implemented yet')
  }

  const canSend = message.trim().length > 0 && !isSubmitting && !disabled

  return (
    <Paper
      elevation={2}
      sx={{
        p: 2,
        backgroundColor: 'background.paper',
        borderTop: '1px solid',
        borderColor: 'divider',
      }}
    >
      {/* Reply indicator */}
      {replyToMessage && (
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            mb: 1,
            p: 1,
            backgroundColor: 'action.hover',
            borderRadius: 1,
            border: '1px solid',
            borderColor: 'divider',
          }}
        >
          <Box sx={{ flexGrow: 1, minWidth: 0 }}>
            <Typography variant="caption" color="text.secondary">
              Replying to {replyToMessage.author}
            </Typography>
            <Typography
              variant="body2"
              sx={{
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                color: 'text.secondary',
              }}
            >
              {replyToMessage.content}
            </Typography>
          </Box>
          <IconButton
            size="small"
            onClick={onCancelReply}
            sx={{ color: 'text.secondary' }}
          >
            <CloseIcon fontSize="small" />
          </IconButton>
        </Box>
      )}

      {/* Message input form */}
      <form onSubmit={handleSubmit}>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'flex-end',
            gap: 1,
          }}
        >
          {/* Message input field */}
          <TextField
            ref={textFieldRef}
            fullWidth
            multiline
            maxRows={4}
            variant="outlined"
            placeholder={`Message #${channelId.slice(0, 8)}...`}
            value={message}
            onChange={handleChange}
            onKeyPress={handleKeyPress}
            disabled={disabled || isSubmitting}
            size="small"
            sx={{
              '& .MuiOutlinedInput-root': {
                borderRadius: 2,
                backgroundColor: 'background.default',
                '&:hover': {
                  backgroundColor: 'background.default',
                },
                '&.Mui-focused': {
                  backgroundColor: 'background.paper',
                },
              },
            }}
            InputProps={{
              endAdornment: (
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 0.5,
                    ml: 1,
                  }}
                >
                  {/* Emoji button */}
                  <Tooltip title="Add emoji">
                    <IconButton
                      size="small"
                      onClick={handleEmojiClick}
                      disabled={disabled}
                      sx={{ color: 'text.secondary' }}
                    >
                      <EmojiIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>

                  {/* File attachment button */}
                  <Tooltip title="Attach file">
                    <IconButton
                      size="small"
                      onClick={handleAttachFile}
                      disabled={disabled}
                      sx={{ color: 'text.secondary' }}
                    >
                      <AttachFileIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </Box>
              ),
            }}
          />

          {/* Send button */}
          <Tooltip title={canSend ? 'Send message' : 'Enter a message'}>
            <span>
              <IconButton
                type="submit"
                size="large"
                disabled={!canSend}
                sx={{
                  bgcolor: canSend ? 'primary.main' : 'action.disabled',
                  color: 'white',
                  '&:hover': {
                    bgcolor: canSend ? 'primary.dark' : 'action.disabled',
                  },
                  '&.Mui-disabled': {
                    bgcolor: 'action.disabled',
                    color: 'action.disabled',
                  },
                }}
              >
                {isSubmitting ? (
                  <CircularProgress size={20} color="inherit" />
                ) : (
                  <SendIcon />
                )}
              </IconButton>
            </span>
          </Tooltip>
        </Box>
      </form>

      {/* Message guidelines */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          mt: 1,
        }}
      >
        <Typography variant="caption" color="text.secondary">
          Press Enter to send, Shift+Enter for new line
        </Typography>
        
        {/* Character count */}
        <Typography
          variant="caption"
          color={message.length > 1000 ? 'error' : 'text.secondary'}
        >
          {message.length}/2000
        </Typography>
      </Box>

      {/* Connection status */}
      {disabled && (
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            mt: 1,
          }}
        >
          <Chip
            size="small"
            label="Disconnected"
            color="error"
            variant="outlined"
          />
          <Typography variant="caption" color="text.secondary">
            Reconnecting...
          </Typography>
        </Box>
      )}
    </Paper>
  )
}

export default MessageInput
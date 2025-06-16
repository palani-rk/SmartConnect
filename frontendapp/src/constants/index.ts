// Application constants
export const USER_ROLES = {
  GOD: 'god',
  ADMIN: 'admin', 
  USER: 'user',
  CLIENT: 'client'
} as const

export const MESSAGE_TYPES = {
  TEXT: 'text',
  IMAGE: 'image', 
  AUDIO: 'audio',
  FILE: 'file'
} as const

export const CHANNEL_TYPES = {
  PUBLIC: 'public',
  PRIVATE: 'private'
} as const
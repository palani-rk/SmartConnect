export interface CreateUserRequest {
  email: string
  password?: string
  auto_generate_password?: boolean
  organization_id: string
  role: 'god' | 'admin' | 'user' | 'client'
  whatsapp_id?: string
  instagram_id?: string
  send_welcome_email?: boolean
}

export interface CallerInfo {
  user_id: string
  role: 'god' | 'admin'
  organization_id: string
  can_create: boolean
}

/**
 * Validate the request body for user creation
 */
export function validateRequestBody(body: any): CreateUserRequest {
  if (!body || typeof body !== 'object') {
    throw new Error('Request body must be a valid JSON object')
  }

  const { 
    email, 
    password, 
    auto_generate_password,
    organization_id, 
    role, 
    whatsapp_id, 
    instagram_id,
    send_welcome_email 
  } = body
  
  // Check required fields
  if (!email || !organization_id || !role) {
    throw new Error('Missing required fields: email, organization_id, role')
  }
  
  // Validate password requirements
  if (!auto_generate_password && (!password || password.length < 8)) {
    throw new Error('Password must be provided and at least 8 characters, or set auto_generate_password to true')
  }
  
  // Validate email format
  if (!email.includes('@') || !email.includes('.')) {
    throw new Error('Invalid email format')
  }
  
  // Validate role
  if (!['god', 'admin', 'user', 'client'].includes(role)) {
    throw new Error('Invalid role. Must be god, admin, user, or client')
  }
  
  // Validate UUID format for organization_id
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  if (!uuidRegex.test(organization_id)) {
    throw new Error('Invalid organization_id format')
  }
  
  // Validate boolean flags
  if (auto_generate_password !== undefined && typeof auto_generate_password !== 'boolean') {
    throw new Error('auto_generate_password must be a boolean')
  }
  
  if (send_welcome_email !== undefined && typeof send_welcome_email !== 'boolean') {
    throw new Error('send_welcome_email must be a boolean')
  }

  // Validate optional string fields
  if (whatsapp_id !== undefined && (typeof whatsapp_id !== 'string' || whatsapp_id.trim() === '')) {
    throw new Error('whatsapp_id must be a non-empty string if provided')
  }

  if (instagram_id !== undefined && (typeof instagram_id !== 'string' || instagram_id.trim() === '')) {
    throw new Error('instagram_id must be a non-empty string if provided')
  }

  return {
    email: email.trim().toLowerCase(),
    password,
    auto_generate_password: auto_generate_password ?? false,
    organization_id,
    role,
    whatsapp_id: whatsapp_id?.trim() || undefined,
    instagram_id: instagram_id?.trim() || undefined,
    send_welcome_email: send_welcome_email ?? false
  }
}
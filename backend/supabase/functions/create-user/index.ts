import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'
import { generateSecurePassword } from '../_shared/password-generator.ts'
import { validateRequestBody, type CreateUserRequest, type CallerInfo } from '../_shared/validation.ts'
import { sendWelcomeEmail } from '../_shared/email-service.ts'

// Initialize Supabase client with service role key
// SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are automatically provided by Supabase
const supabaseAdmin = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Validate request method
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }),
        { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Parse and validate request body
    const rawBody = await req.json()
    const requestData = validateRequestBody(rawBody)
    
    // Verify caller permissions and get caller info
    const callerInfo = await verifyCallerPermissions(req, requestData.organization_id, requestData.role)
    
    // Generate password if needed
    if (requestData.auto_generate_password) {
      requestData.password = generateSecurePassword()
    }
    
    // Create user
    const result = await createUser(requestData, callerInfo)
    
    return new Response(
      JSON.stringify(result),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
    
  } catch (error) {
    console.error('Error in create-user function:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

/**
 * Verify caller permissions based on their role and the target organization/role
 */
async function verifyCallerPermissions(
  request: Request, 
  target_organization_id: string, 
  target_role: string
): Promise<CallerInfo> {
  // Get JWT token from Authorization header
  const authHeader = request.headers.get('authorization')
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new Error('Missing or invalid authorization header')
  }
  
  const token = authHeader.substring(7) // Remove 'Bearer ' prefix
  
  // Verify JWT and get user
  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token)
  if (error || !user) {
    throw new Error('Invalid or expired token')
  }
  
  // Get caller's user record from database
  const { data: callerRecord, error: callerError } = await supabaseAdmin
    .from('users')
    .select('id, role, organization_id')
    .eq('id', user.id)
    .single()
    
  if (callerError || !callerRecord) {
    throw new Error('Caller user record not found')
  }
  
  // Check permissions based on caller role
  if (callerRecord.role === 'god') {
    // God users can create any user in any organization
    return {
      user_id: user.id,
      role: 'god',
      organization_id: callerRecord.organization_id,
      can_create: true
    }
  } 
  else if (callerRecord.role === 'admin') {
    // Admin users can only create users in their own organization
    if (callerRecord.organization_id !== target_organization_id) {
      throw new Error('Admin users can only create users within their own organization')
    }
    
    // Admin users cannot create god users or other admin users
    if (target_role === 'god') {
      throw new Error('Admin users cannot create god users')
    }
    
    if (target_role === 'admin') {
      throw new Error('Admin users cannot create other admin users')
    }
    
    return {
      user_id: user.id,
      role: 'admin',
      organization_id: callerRecord.organization_id,
      can_create: true
    }
  }
  else {
    throw new Error('Insufficient permissions. Only god and admin users can create users.')
  }
}

/**
 * Create a new user with both auth and database records
 */
async function createUser(requestData: CreateUserRequest, callerInfo: CallerInfo) {
  const { 
    email, 
    password, 
    auto_generate_password,
    organization_id, 
    role, 
    whatsapp_id, 
    instagram_id,
    send_welcome_email
  } = requestData
  
  // Step 1: Verify organization exists
  const { data: orgExists, error: orgError } = await supabaseAdmin
    .from('organizations')
    .select('id, name')
    .eq('id', organization_id)
    .single()
    
  if (orgError || !orgExists) {
    throw new Error('Organization not found')
  }
  
  // Step 2: Check if email already exists
  const { data: existingUsers, error: emailError } = await supabaseAdmin
    .from('users')
    .select('id')
    .eq('email', email)
    
  if (emailError && emailError.code !== 'PGRST116') {
    throw new Error('Error checking email availability')
  }
  
  if (existingUsers && existingUsers.length > 0) {
    throw new Error('User with this email already exists')
  }
  
  // Step 3: Create auth user
  const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
    email: email,
    password: password!,
    email_confirm: true, // Auto-confirm for admin-created users
    user_metadata: {
      organization_id: organization_id,
      role: role,
      created_by: callerInfo.role,
      created_by_user_id: callerInfo.user_id,
      created_at: new Date().toISOString()
    }
  })
  
  if (authError) {
    throw new Error(`Failed to create auth user: ${authError.message}`)
  }
  
  if (!authData.user) {
    throw new Error('Auth user creation failed - no user returned')
  }
  
  // Step 4: Create user record in database
  const userRecord = {
    id: authData.user.id,
    email: email,
    organization_id: organization_id,
    role: role,
    whatsapp_id: whatsapp_id || null,
    instagram_id: instagram_id || null
  }
  
  const { data: dbUser, error: dbError } = await supabaseAdmin
    .from('users')
    .insert(userRecord)
    .select('*')
    .single()
    
  if (dbError) {
    // Cleanup: Delete the auth user if database insert fails
    try {
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id)
    } catch (cleanupError) {
      console.error('Failed to cleanup auth user:', cleanupError)
    }
    
    throw new Error(`Failed to create user record: ${dbError.message}`)
  }
  
  // Step 5: Send welcome email if requested
  if (send_welcome_email) {
    try {
      await sendWelcomeEmail({
        email: email,
        organization_name: orgExists.name,
        role: role,
        temporary_password: auto_generate_password ? password : undefined,
        created_by: callerInfo.role
      })
    } catch (emailError) {
      console.warn('Failed to send welcome email:', emailError)
      // Don't fail the entire operation for email issues
    }
  }
  
  // Step 6: Return success response
  const result = {
    success: true,
    user: dbUser,
    auth_user_id: authData.user.id,
    organization: {
      id: orgExists.id,
      name: orgExists.name
    },
    message: `${role} user created successfully`
  }
  
  // Include temporary password in response if auto-generated
  if (auto_generate_password) {
    (result as any).temporary_password = password
  }
  
  return result
}
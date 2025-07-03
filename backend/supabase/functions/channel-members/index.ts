import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
)

interface AddMembersRequest {
  channel_id: string
  user_ids: string[]
  role?: 'admin' | 'member'
}

interface RemoveMembersRequest {
  channel_id: string
  user_ids: string[]
}

interface UpdateMemberRoleRequest {
  channel_id: string
  user_id: string
  role: 'admin' | 'member'
}

interface GetMembersRequest {
  channel_id: string
}

interface MembershipResponse {
  success: boolean
  members?: any[]
  message?: string
  error?: string
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // Get user from auth header
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    )

    if (authError || !user) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid authorization token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get user's organization and role from metadata
    const userMetadata = user.user_metadata
    const organizationId = userMetadata?.organization_id
    const userRole = userMetadata?.role

    if (!organizationId) {
      return new Response(
        JSON.stringify({ success: false, error: 'User not associated with an organization' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const url = new URL(req.url)
    const method = req.method
    const action = url.searchParams.get('action')

    switch (method) {
      case 'GET':
        return await handleGetMembers(req, organizationId, userRole, user.id)
      case 'POST':
        if (action === 'add') {
          return await handleAddMembers(req, organizationId, userRole)
        } else if (action === 'remove') {
          return await handleRemoveMembers(req, organizationId, userRole)
        } else if (action === 'update-role') {
          return await handleUpdateMemberRole(req, organizationId, userRole)
        } else {
          return new Response(
            JSON.stringify({ success: false, error: 'Invalid action. Use: add, remove, or update-role' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }
      default:
        return new Response(
          JSON.stringify({ success: false, error: 'Method not allowed' }),
          { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }
  } catch (error) {
    console.error('Unexpected error in channel-members:', error)
    return new Response(
      JSON.stringify({ success: false, error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

async function handleGetMembers(
  req: Request,
  organizationId: string,
  userRole: string,
  userId: string
): Promise<Response> {
  try {
    const url = new URL(req.url)
    const channelId = url.searchParams.get('channel_id')

    if (!channelId) {
      return new Response(
        JSON.stringify({ success: false, error: 'Channel ID is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Verify channel exists and user has access
    const { data: channel, error: channelError } = await supabase
      .from('channels')
      .select('id, organization_id, type')
      .eq('id', channelId)
      .eq('organization_id', organizationId)
      .is('deleted_at', null)
      .single()

    if (channelError || !channel) {
      return new Response(
        JSON.stringify({ success: false, error: 'Channel not found or access denied' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check if user has permission to view members
    if (!['god', 'admin'].includes(userRole)) {
      // Regular users can only view members if they are members themselves
      const { data: userMembership } = await supabase
        .from('channel_memberships')
        .select('id')
        .eq('channel_id', channelId)
        .eq('user_id', userId)
        .single()

      if (!userMembership) {
        return new Response(
          JSON.stringify({ success: false, error: 'Access denied. You are not a member of this channel.' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    }

    // Fetch channel members
    const { data: members, error: membersError } = await supabase
      .from('channel_memberships')
      .select(`
        id,
        role,
        joined_at,
        created_at,
        user:users(
          id,
          email,
          first_name,
          last_name,
          role,
          avatar_url,
          last_seen_at
        )
      `)
      .eq('channel_id', channelId)
      .order('joined_at', { ascending: true })

    if (membersError) {
      console.error('Error fetching channel members:', membersError)
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to fetch channel members' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Process members to add computed fields
    const processedMembers = members?.map(member => ({
      ...member,
      can_remove: ['god', 'admin'].includes(userRole) && member.user?.id !== userId,
      can_change_role: ['god', 'admin'].includes(userRole) && member.user?.id !== userId,
      is_online: member.user?.last_seen_at ? 
        new Date(member.user.last_seen_at).getTime() > (Date.now() - 5 * 60 * 1000) : false
    })) || []

    const response: MembershipResponse = {
      success: true,
      members: processedMembers
    }

    return new Response(
      JSON.stringify(response),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in handleGetMembers:', error)
    return new Response(
      JSON.stringify({ success: false, error: 'Failed to retrieve channel members' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
}

async function handleAddMembers(
  req: Request,
  organizationId: string,
  userRole: string
): Promise<Response> {
  try {
    // Check permissions
    if (!['god', 'admin'].includes(userRole)) {
      return new Response(
        JSON.stringify({ success: false, error: 'Insufficient permissions to add channel members' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { channel_id, user_ids, role }: AddMembersRequest = await req.json()

    if (!channel_id || !user_ids || !Array.isArray(user_ids) || user_ids.length === 0) {
      return new Response(
        JSON.stringify({ success: false, error: 'Channel ID and user IDs array are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Verify channel exists and belongs to organization
    const { data: channel, error: channelError } = await supabase
      .from('channels')
      .select('id, organization_id')
      .eq('id', channel_id)
      .eq('organization_id', organizationId)
      .is('deleted_at', null)
      .single()

    if (channelError || !channel) {
      return new Response(
        JSON.stringify({ success: false, error: 'Channel not found or access denied' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Verify all users exist and belong to the same organization
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, email, first_name, last_name')
      .in('id', user_ids)
      .eq('organization_id', organizationId)

    if (usersError || !users || users.length !== user_ids.length) {
      return new Response(
        JSON.stringify({ success: false, error: 'Some users not found or not in the same organization' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check for existing memberships
    const { data: existingMemberships } = await supabase
      .from('channel_memberships')
      .select('user_id')
      .eq('channel_id', channel_id)
      .in('user_id', user_ids)

    const existingUserIds = existingMemberships?.map(m => m.user_id) || []
    const newUserIds = user_ids.filter(id => !existingUserIds.includes(id))

    if (newUserIds.length === 0) {
      return new Response(
        JSON.stringify({ success: false, error: 'All users are already members of this channel' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Create memberships for new users
    const memberships = newUserIds.map(userId => ({
      channel_id,
      user_id: userId,
      role: role || 'member'
    }))

    const { data: newMemberships, error: membershipError } = await supabase
      .from('channel_memberships')
      .insert(memberships)
      .select(`
        id,
        role,
        joined_at,
        user:users(id, email, first_name, last_name)
      `)

    if (membershipError) {
      console.error('Error adding channel members:', membershipError)
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to add members to channel' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const response: MembershipResponse = {
      success: true,
      message: `Successfully added ${newMemberships?.length || 0} members to channel`,
      members: newMemberships
    }

    if (existingUserIds.length > 0) {
      response.message += ` (${existingUserIds.length} users were already members)`
    }

    return new Response(
      JSON.stringify(response),
      { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in handleAddMembers:', error)
    return new Response(
      JSON.stringify({ success: false, error: 'Failed to add members to channel' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
}

async function handleRemoveMembers(
  req: Request,
  organizationId: string,
  userRole: string
): Promise<Response> {
  try {
    // Check permissions
    if (!['god', 'admin'].includes(userRole)) {
      return new Response(
        JSON.stringify({ success: false, error: 'Insufficient permissions to remove channel members' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { channel_id, user_ids }: RemoveMembersRequest = await req.json()

    if (!channel_id || !user_ids || !Array.isArray(user_ids) || user_ids.length === 0) {
      return new Response(
        JSON.stringify({ success: false, error: 'Channel ID and user IDs array are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Verify channel exists and belongs to organization
    const { data: channel, error: channelError } = await supabase
      .from('channels')
      .select('id, organization_id, created_by')
      .eq('id', channel_id)
      .eq('organization_id', organizationId)
      .is('deleted_at', null)
      .single()

    if (channelError || !channel) {
      return new Response(
        JSON.stringify({ success: false, error: 'Channel not found or access denied' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Prevent removing the channel creator
    if (user_ids.includes(channel.created_by)) {
      return new Response(
        JSON.stringify({ success: false, error: 'Cannot remove the channel creator' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Remove memberships
    const { data: removedMemberships, error: removeError } = await supabase
      .from('channel_memberships')
      .delete()
      .eq('channel_id', channel_id)
      .in('user_id', user_ids)
      .select(`
        id,
        user:users(id, email, first_name, last_name)
      `)

    if (removeError) {
      console.error('Error removing channel members:', removeError)
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to remove members from channel' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const response: MembershipResponse = {
      success: true,
      message: `Successfully removed ${removedMemberships?.length || 0} members from channel`,
      members: removedMemberships
    }

    return new Response(
      JSON.stringify(response),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in handleRemoveMembers:', error)
    return new Response(
      JSON.stringify({ success: false, error: 'Failed to remove members from channel' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
}

async function handleUpdateMemberRole(
  req: Request,
  organizationId: string,
  userRole: string
): Promise<Response> {
  try {
    // Check permissions
    if (!['god', 'admin'].includes(userRole)) {
      return new Response(
        JSON.stringify({ success: false, error: 'Insufficient permissions to update member roles' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { channel_id, user_id, role }: UpdateMemberRoleRequest = await req.json()

    if (!channel_id || !user_id || !role || !['admin', 'member'].includes(role)) {
      return new Response(
        JSON.stringify({ success: false, error: 'Channel ID, user ID, and valid role (admin/member) are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Verify channel exists and belongs to organization
    const { data: channel, error: channelError } = await supabase
      .from('channels')
      .select('id, organization_id, created_by')
      .eq('id', channel_id)
      .eq('organization_id', organizationId)
      .is('deleted_at', null)
      .single()

    if (channelError || !channel) {
      return new Response(
        JSON.stringify({ success: false, error: 'Channel not found or access denied' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Prevent changing the role of the channel creator to member
    if (user_id === channel.created_by && role === 'member') {
      return new Response(
        JSON.stringify({ success: false, error: 'Cannot change the channel creator to member role' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Update membership role
    const { data: updatedMembership, error: updateError } = await supabase
      .from('channel_memberships')
      .update({ role })
      .eq('channel_id', channel_id)
      .eq('user_id', user_id)
      .select(`
        id,
        role,
        joined_at,
        user:users(id, email, first_name, last_name)
      `)
      .single()

    if (updateError) {
      console.error('Error updating member role:', updateError)
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to update member role' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!updatedMembership) {
      return new Response(
        JSON.stringify({ success: false, error: 'Member not found in channel' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const response: MembershipResponse = {
      success: true,
      message: `Successfully updated member role to ${role}`,
      members: [updatedMembership]
    }

    return new Response(
      JSON.stringify(response),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in handleUpdateMemberRole:', error)
    return new Response(
      JSON.stringify({ success: false, error: 'Failed to update member role' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
}
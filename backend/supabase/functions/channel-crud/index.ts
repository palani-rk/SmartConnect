import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
)

interface CreateChannelRequest {
  name: string
  description?: string
  type: 'public' | 'private'
  member_ids?: string[]
}

interface UpdateChannelRequest {
  id: string
  name?: string
  description?: string
  type?: 'public' | 'private'
}

interface DeleteChannelRequest {
  id: string
  hard_delete?: boolean
}

interface ChannelResponse {
  success: boolean
  channel?: any
  channels?: any[]
  error?: string
  message?: string
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

    switch (method) {
      case 'GET':
        return await handleGetChannels(organizationId, userRole, user.id, url)
      case 'POST':
        return await handleCreateChannel(req, organizationId, userRole, user.id)
      case 'PUT':
        return await handleUpdateChannel(req, organizationId, userRole)
      case 'DELETE':
        return await handleDeleteChannel(req, organizationId, userRole)
      default:
        return new Response(
          JSON.stringify({ success: false, error: 'Method not allowed' }),
          { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }
  } catch (error) {
    console.error('Unexpected error in channel-crud:', error)
    return new Response(
      JSON.stringify({ success: false, error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

async function handleGetChannels(
  organizationId: string, 
  userRole: string, 
  userId: string, 
  url: URL
): Promise<Response> {
  try {
    const channelId = url.searchParams.get('id')
    const search = url.searchParams.get('search')
    const type = url.searchParams.get('type')
    const limit = parseInt(url.searchParams.get('limit') || '50')
    const offset = parseInt(url.searchParams.get('offset') || '0')

    let query = supabase
      .from('channels')
      .select(`
        *,
        channel_memberships:channel_memberships(count),
        creator:users!created_by(id, email, first_name, last_name),
        members:channel_memberships(
          id,
          role,
          joined_at,
          user:users(id, email, first_name, last_name, role)
        )
      `)
      .eq('organization_id', organizationId)
      .is('deleted_at', null)

    // Apply filters
    if (channelId) {
      query = query.eq('id', channelId)
    }

    if (search) {
      query = query.ilike('name', `%${search}%`)
    }

    if (type && ['public', 'private'].includes(type)) {
      query = query.eq('type', type)
    }

    // Apply role-based filtering
    if (!['god', 'admin'].includes(userRole)) {
      // Regular users can only see channels they're members of
      const { data: memberChannelIds } = await supabase
        .from('channel_memberships')
        .select('channel_id')
        .eq('user_id', userId)

      if (memberChannelIds && memberChannelIds.length > 0) {
        const channelIds = memberChannelIds.map(m => m.channel_id)
        query = query.in('id', channelIds)
      } else {
        // User is not a member of any channels
        return new Response(
          JSON.stringify({ success: true, channels: [], total: 0, has_more: false }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    }

    // Apply pagination
    query = query.range(offset, offset + limit - 1).order('created_at', { ascending: false })

    const { data: channels, error } = await query

    if (error) {
      console.error('Error fetching channels:', error)
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to fetch channels' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Process channels to add computed fields
    const processedChannels = channels?.map(channel => ({
      ...channel,
      member_count: channel.channel_memberships?.[0]?.count || 0,
      can_edit: ['god', 'admin'].includes(userRole),
      can_delete: ['god', 'admin'].includes(userRole),
      is_member: channel.members?.some((m: any) => m.user?.id === userId) || false
    })) || []

    const response: ChannelResponse = {
      success: true,
      ...(channelId ? { channel: processedChannels[0] } : { 
        channels: processedChannels,
        total: processedChannels.length,
        has_more: processedChannels.length === limit
      })
    }

    return new Response(
      JSON.stringify(response),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in handleGetChannels:', error)
    return new Response(
      JSON.stringify({ success: false, error: 'Failed to retrieve channels' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
}

async function handleCreateChannel(
  req: Request,
  organizationId: string,
  userRole: string,
  userId: string
): Promise<Response> {
  try {
    // Check permissions
    if (!['god', 'admin'].includes(userRole)) {
      return new Response(
        JSON.stringify({ success: false, error: 'Insufficient permissions to create channels' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { name, description, type, member_ids }: CreateChannelRequest = await req.json()

    // Validate required fields
    if (!name || name.trim().length === 0) {
      return new Response(
        JSON.stringify({ success: false, error: 'Channel name is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (name.trim().length > 100) {
      return new Response(
        JSON.stringify({ success: false, error: 'Channel name must be 100 characters or less' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Create the channel
    const { data: channel, error: channelError } = await supabase
      .from('channels')
      .insert({
        name: name.trim(),
        description: description?.trim(),
        type: type || 'public',
        organization_id: organizationId,
        created_by: userId
      })
      .select()
      .single()

    if (channelError) {
      console.error('Error creating channel:', channelError)
      
      // Handle unique constraint violation
      if (channelError.code === '23505') {
        return new Response(
          JSON.stringify({ success: false, error: 'A channel with this name already exists in your organization' }),
          { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      return new Response(
        JSON.stringify({ success: false, error: 'Failed to create channel' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Add channel creator as admin member
    const { error: creatorMembershipError } = await supabase
      .from('channel_memberships')
      .insert({
        channel_id: channel.id,
        user_id: userId,
        role: 'admin'
      })

    if (creatorMembershipError) {
      console.error('Error creating creator membership:', creatorMembershipError)
    }

    // Add additional members if provided
    if (member_ids && member_ids.length > 0) {
      const memberships = member_ids
        .filter(id => id !== userId) // Don't duplicate creator
        .map(memberId => ({
          channel_id: channel.id,
          user_id: memberId,
          role: 'member'
        }))

      if (memberships.length > 0) {
        const { error: bulkMembershipError } = await supabase
          .from('channel_memberships')
          .insert(memberships)

        if (bulkMembershipError) {
          console.error('Error adding channel members:', bulkMembershipError)
        }
      }
    }

    // Fetch the complete channel data
    const { data: channelWithDetails } = await supabase
      .from('channels')
      .select(`
        *,
        channel_memberships:channel_memberships(count),
        creator:users!created_by(id, email, first_name, last_name),
        members:channel_memberships(
          id,
          role,
          joined_at,
          user:users(id, email, first_name, last_name, role)
        )
      `)
      .eq('id', channel.id)
      .single()

    const response: ChannelResponse = {
      success: true,
      channel: {
        ...channelWithDetails,
        member_count: channelWithDetails?.channel_memberships?.[0]?.count || 0,
        can_edit: true,
        can_delete: true,
        is_member: true
      }
    }

    return new Response(
      JSON.stringify(response),
      { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in handleCreateChannel:', error)
    return new Response(
      JSON.stringify({ success: false, error: 'Failed to create channel' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
}

async function handleUpdateChannel(
  req: Request,
  organizationId: string,
  userRole: string
): Promise<Response> {
  try {
    // Check permissions
    if (!['god', 'admin'].includes(userRole)) {
      return new Response(
        JSON.stringify({ success: false, error: 'Insufficient permissions to update channels' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { id, name, description, type }: UpdateChannelRequest = await req.json()

    if (!id) {
      return new Response(
        JSON.stringify({ success: false, error: 'Channel ID is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Build update object
    const updateData: any = {}
    if (name !== undefined) {
      if (!name || name.trim().length === 0) {
        return new Response(
          JSON.stringify({ success: false, error: 'Channel name cannot be empty' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
      updateData.name = name.trim()
    }
    if (description !== undefined) updateData.description = description?.trim()
    if (type !== undefined) updateData.type = type

    // Update the channel
    const { data: channel, error: updateError } = await supabase
      .from('channels')
      .update(updateData)
      .eq('id', id)
      .eq('organization_id', organizationId)
      .is('deleted_at', null)
      .select(`
        *,
        channel_memberships:channel_memberships(count),
        creator:users!created_by(id, email, first_name, last_name)
      `)
      .single()

    if (updateError) {
      console.error('Error updating channel:', updateError)
      
      if (updateError.code === '23505') {
        return new Response(
          JSON.stringify({ success: false, error: 'A channel with this name already exists in your organization' }),
          { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      return new Response(
        JSON.stringify({ success: false, error: 'Failed to update channel' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!channel) {
      return new Response(
        JSON.stringify({ success: false, error: 'Channel not found or access denied' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const response: ChannelResponse = {
      success: true,
      channel: {
        ...channel,
        member_count: channel.channel_memberships?.[0]?.count || 0,
        can_edit: true,
        can_delete: true
      }
    }

    return new Response(
      JSON.stringify(response),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in handleUpdateChannel:', error)
    return new Response(
      JSON.stringify({ success: false, error: 'Failed to update channel' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
}

async function handleDeleteChannel(
  req: Request,
  organizationId: string,
  userRole: string
): Promise<Response> {
  try {
    // Check permissions
    if (!['god', 'admin'].includes(userRole)) {
      return new Response(
        JSON.stringify({ success: false, error: 'Insufficient permissions to delete channels' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { id, hard_delete }: DeleteChannelRequest = await req.json()

    if (!id) {
      return new Response(
        JSON.stringify({ success: false, error: 'Channel ID is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (hard_delete) {
      // Hard delete - completely remove the channel
      const { error: deleteError } = await supabase
        .from('channels')
        .delete()
        .eq('id', id)
        .eq('organization_id', organizationId)

      if (deleteError) {
        console.error('Error hard deleting channel:', deleteError)
        return new Response(
          JSON.stringify({ success: false, error: 'Failed to delete channel' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      return new Response(
        JSON.stringify({ success: true, message: 'Channel permanently deleted' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    } else {
      // Soft delete - set deleted_at timestamp
      const { data: channel, error: deleteError } = await supabase
        .from('channels')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id)
        .eq('organization_id', organizationId)
        .is('deleted_at', null)
        .select()
        .single()

      if (deleteError) {
        console.error('Error soft deleting channel:', deleteError)
        return new Response(
          JSON.stringify({ success: false, error: 'Failed to delete channel' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      if (!channel) {
        return new Response(
          JSON.stringify({ success: false, error: 'Channel not found or already deleted' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      return new Response(
        JSON.stringify({ success: true, message: 'Channel deleted', channel }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

  } catch (error) {
    console.error('Error in handleDeleteChannel:', error)
    return new Response(
      JSON.stringify({ success: false, error: 'Failed to delete channel' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
}
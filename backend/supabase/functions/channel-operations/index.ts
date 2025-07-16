import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
)

interface CreateWithTemplateRequest {
  template_name: string
  channel_name: string
  description?: string
  member_ids?: string[]
}

interface BulkCreateRequest {
  channels: Array<{
    name: string
    description?: string
    type: 'public' | 'private'
    member_ids?: string[]
  }>
}

interface BulkArchiveRequest {
  channel_ids: string[]
}

interface ChannelOperationsResponse {
  success: boolean
  channels?: any[]
  message?: string
  error?: string
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ success: false, error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
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

    // Check permissions - only admins can perform bulk operations
    if (!['god', 'admin'].includes(userRole)) {
      return new Response(
        JSON.stringify({ success: false, error: 'Insufficient permissions to perform channel operations' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const url = new URL(req.url)
    const action = url.searchParams.get('action')

    switch (action) {
      case 'create-with-template':
        return await handleCreateWithTemplate(req, organizationId, user.id)
      case 'bulk-create':
        return await handleBulkCreate(req, organizationId, user.id)
      case 'archive-batch':
        return await handleArchiveBatch(req, organizationId, userRole)
      case 'restore-batch':
        return await handleRestoreBatch(req, organizationId, userRole)
      default:
        return new Response(
          JSON.stringify({ success: false, error: 'Invalid action. Use: create-with-template, bulk-create, archive-batch, or restore-batch' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }
  } catch (error) {
    console.error('Unexpected error in channel-operations:', error)
    return new Response(
      JSON.stringify({ success: false, error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

async function handleCreateWithTemplate(
  req: Request,
  organizationId: string,
  userId: string
): Promise<Response> {
  try {
    const { template_name, channel_name, description, member_ids }: CreateWithTemplateRequest = await req.json()

    if (!template_name || !channel_name) {
      return new Response(
        JSON.stringify({ success: false, error: 'Template name and channel name are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Define channel templates
    const templates = {
      'general-discussion': {
        type: 'public',
        default_description: 'General discussion channel for team communication',
        auto_members: 'all_users' // Add all users in organization
      },
      'project-team': {
        type: 'private',
        default_description: 'Private project team channel',
        auto_members: 'specified_only' // Only add specified members
      },
      'announcement': {
        type: 'public',
        default_description: 'Announcements and important updates',
        auto_members: 'all_users'
      }
    }

    const template = templates[template_name as keyof typeof templates]
    if (!template) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid template name' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Create the channel
    const { data: channel, error: channelError } = await supabase
      .from('channels')
      .insert({
        name: channel_name.trim(),
        description: description || template.default_description,
        type: template.type,
        organization_id: organizationId,
        created_by: userId
      })
      .select()
      .single()

    if (channelError) {
      console.error('Error creating channel from template:', channelError)
      if (channelError.code === '23505') {
        return new Response(
          JSON.stringify({ success: false, error: 'A channel with this name already exists' }),
          { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to create channel' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Add creator as admin
    await supabase
      .from('channel_memberships')
      .insert({
        channel_id: channel.id,
        user_id: userId,
        role: 'admin'
      })

    // Handle auto-membership based on template
    if (template.auto_members === 'all_users') {
      // Get all users in the organization
      const { data: orgUsers } = await supabase
        .from('users')
        .select('id')
        .eq('organization_id', organizationId)
        .neq('id', userId) // Exclude creator (already added)

      if (orgUsers && orgUsers.length > 0) {
        const memberships = orgUsers.map(user => ({
          channel_id: channel.id,
          user_id: user.id,
          role: 'member'
        }))

        await supabase
          .from('channel_memberships')
          .insert(memberships)
      }
    } else if (template.auto_members === 'specified_only' && member_ids && member_ids.length > 0) {
      // Add only specified members
      const memberships = member_ids
        .filter(id => id !== userId) // Exclude creator
        .map(memberId => ({
          channel_id: channel.id,
          user_id: memberId,
          role: 'member'
        }))

      if (memberships.length > 0) {
        await supabase
          .from('channel_memberships')
          .insert(memberships)
      }
    }

    // Fetch the complete channel data
    const { data: channelWithDetails } = await supabase
      .from('channels')
      .select(`
        *,
        creator:users!created_by(id, email, first_name, last_name),
        members:channel_memberships(
          id,
          role,
          joined_at,
          user:users(id, email, first_name, last_name)
        )
      `)
      .eq('id', channel.id)
      .single()

    const response: ChannelOperationsResponse = {
      success: true,
      channels: [channelWithDetails],
      message: `Channel "${channel_name}" created successfully from template "${template_name}"`
    }

    return new Response(
      JSON.stringify(response),
      { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in handleCreateWithTemplate:', error)
    return new Response(
      JSON.stringify({ success: false, error: 'Failed to create channel from template' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
}

async function handleBulkCreate(
  req: Request,
  organizationId: string,
  userId: string
): Promise<Response> {
  try {
    const { channels }: BulkCreateRequest = await req.json()

    if (!channels || !Array.isArray(channels) || channels.length === 0) {
      return new Response(
        JSON.stringify({ success: false, error: 'Channels array is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (channels.length > 10) {
      return new Response(
        JSON.stringify({ success: false, error: 'Maximum 10 channels can be created at once' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Validate channel data
    for (const channel of channels) {
      if (!channel.name || channel.name.trim().length === 0) {
        return new Response(
          JSON.stringify({ success: false, error: 'All channels must have a name' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    }

    const createdChannels = []
    const errors = []

    // Create channels one by one to handle individual errors
    for (const channelData of channels) {
      try {
        // Create the channel
        const { data: channel, error: channelError } = await supabase
          .from('channels')
          .insert({
            name: channelData.name.trim(),
            description: channelData.description?.trim(),
            type: channelData.type || 'public',
            organization_id: organizationId,
            created_by: userId
          })
          .select()
          .single()

        if (channelError) {
          console.error(`Error creating channel ${channelData.name}:`, channelError)
          errors.push(`Failed to create channel "${channelData.name}": ${channelError.message}`)
          continue
        }

        // Add creator as admin
        await supabase
          .from('channel_memberships')
          .insert({
            channel_id: channel.id,
            user_id: userId,
            role: 'admin'
          })

        // Add specified members
        if (channelData.member_ids && channelData.member_ids.length > 0) {
          const memberships = channelData.member_ids
            .filter(id => id !== userId) // Exclude creator
            .map(memberId => ({
              channel_id: channel.id,
              user_id: memberId,
              role: 'member'
            }))

          if (memberships.length > 0) {
            await supabase
              .from('channel_memberships')
              .insert(memberships)
          }
        }

        createdChannels.push(channel)
      } catch (error) {
        console.error(`Error processing channel ${channelData.name}:`, error)
        errors.push(`Failed to create channel "${channelData.name}": ${error.message}`)
      }
    }

    const response: ChannelOperationsResponse = {
      success: createdChannels.length > 0,
      channels: createdChannels,
      message: `Successfully created ${createdChannels.length} of ${channels.length} channels`,
      ...(errors.length > 0 && { error: errors.join('; ') })
    }

    return new Response(
      JSON.stringify(response),
      { 
        status: createdChannels.length > 0 ? 201 : 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Error in handleBulkCreate:', error)
    return new Response(
      JSON.stringify({ success: false, error: 'Failed to create channels' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
}

async function handleArchiveBatch(
  req: Request,
  organizationId: string,
  userRole: string
): Promise<Response> {
  try {
    const { channel_ids }: BulkArchiveRequest = await req.json()

    if (!channel_ids || !Array.isArray(channel_ids) || channel_ids.length === 0) {
      return new Response(
        JSON.stringify({ success: false, error: 'Channel IDs array is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Archive channels (soft delete)
    const { data: archivedChannels, error: archiveError } = await supabase
      .from('channels')
      .update({ deleted_at: new Date().toISOString() })
      .in('id', channel_ids)
      .eq('organization_id', organizationId)
      .is('deleted_at', null)
      .select('id, name')

    if (archiveError) {
      console.error('Error archiving channels:', archiveError)
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to archive channels' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const response: ChannelOperationsResponse = {
      success: true,
      channels: archivedChannels,
      message: `Successfully archived ${archivedChannels?.length || 0} channels`
    }

    return new Response(
      JSON.stringify(response),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in handleArchiveBatch:', error)
    return new Response(
      JSON.stringify({ success: false, error: 'Failed to archive channels' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
}

async function handleRestoreBatch(
  req: Request,
  organizationId: string,
  userRole: string
): Promise<Response> {
  try {
    const { channel_ids }: BulkArchiveRequest = await req.json()

    if (!channel_ids || !Array.isArray(channel_ids) || channel_ids.length === 0) {
      return new Response(
        JSON.stringify({ success: false, error: 'Channel IDs array is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Restore channels (remove soft delete)
    const { data: restoredChannels, error: restoreError } = await supabase
      .from('channels')
      .update({ deleted_at: null })
      .in('id', channel_ids)
      .eq('organization_id', organizationId)
      .not('deleted_at', 'is', null)
      .select('id, name')

    if (restoreError) {
      console.error('Error restoring channels:', restoreError)
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to restore channels' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const response: ChannelOperationsResponse = {
      success: true,
      channels: restoredChannels,
      message: `Successfully restored ${restoredChannels?.length || 0} channels`
    }

    return new Response(
      JSON.stringify(response),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in handleRestoreBatch:', error)
    return new Response(
      JSON.stringify({ success: false, error: 'Failed to restore channels' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
}
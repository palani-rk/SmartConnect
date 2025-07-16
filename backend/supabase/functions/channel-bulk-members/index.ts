import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
)

interface BulkAddMembersRequest {
  channel_id: string
  user_ids: string[]
  role?: 'admin' | 'member'
}

interface BulkRemoveMembersRequest {
  channel_id: string
  user_ids: string[]
}

interface BulkAddToMultipleChannelsRequest {
  user_ids: string[]
  channel_ids: string[]
  role?: 'admin' | 'member'
}

interface SyncPermissionsRequest {
  channel_id: string
  role_based_permissions: {
    [key: string]: 'admin' | 'member' // role -> channel_role mapping
  }
}

interface BulkMembersResponse {
  success: boolean
  memberships?: any[]
  message?: string
  error?: string
  summary?: {
    added: number
    removed: number
    skipped: number
    failed: number
  }
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
        JSON.stringify({ success: false, error: 'Insufficient permissions to perform bulk member operations' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const url = new URL(req.url)
    const action = url.searchParams.get('action')

    switch (action) {
      case 'bulk-add':
        return await handleBulkAdd(req, organizationId)
      case 'bulk-remove':
        return await handleBulkRemove(req, organizationId)
      case 'bulk-add-to-multiple':
        return await handleBulkAddToMultipleChannels(req, organizationId)
      case 'sync-permissions':
        return await handleSyncPermissions(req, organizationId)
      default:
        return new Response(
          JSON.stringify({ success: false, error: 'Invalid action. Use: bulk-add, bulk-remove, bulk-add-to-multiple, or sync-permissions' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }
  } catch (error) {
    console.error('Unexpected error in channel-bulk-members:', error)
    return new Response(
      JSON.stringify({ success: false, error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

async function handleBulkAdd(
  req: Request,
  organizationId: string
): Promise<Response> {
  try {
    const { channel_id, user_ids, role }: BulkAddMembersRequest = await req.json()

    if (!channel_id || !user_ids || !Array.isArray(user_ids) || user_ids.length === 0) {
      return new Response(
        JSON.stringify({ success: false, error: 'Channel ID and user IDs array are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (user_ids.length > 100) {
      return new Response(
        JSON.stringify({ success: false, error: 'Maximum 100 users can be added at once' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Verify channel exists and belongs to organization
    const { data: channel, error: channelError } = await supabase
      .from('channels')
      .select('id, organization_id, name')
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

    if (usersError) {
      console.error('Error fetching users:', usersError)
      return new Response(
        JSON.stringify({ success: false, error: 'Error validating users' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const foundUserIds = users?.map(u => u.id) || []
    const invalidUserIds = user_ids.filter(id => !foundUserIds.includes(id))

    if (invalidUserIds.length > 0) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: `${invalidUserIds.length} users not found or not in the same organization` 
        }),
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

    let summary = {
      added: 0,
      removed: 0,
      skipped: existingUserIds.length,
      failed: 0
    }

    let newMemberships = []

    if (newUserIds.length > 0) {
      // Create memberships for new users in batches
      const batchSize = 50
      const membershipRole = role || 'member'

      for (let i = 0; i < newUserIds.length; i += batchSize) {
        const batch = newUserIds.slice(i, i + batchSize)
        const memberships = batch.map(userId => ({
          channel_id,
          user_id: userId,
          role: membershipRole
        }))

        const { data: batchMemberships, error: membershipError } = await supabase
          .from('channel_memberships')
          .insert(memberships)
          .select(`
            id,
            role,
            joined_at,
            user:users(id, email, first_name, last_name)
          `)

        if (membershipError) {
          console.error('Error adding batch of members:', membershipError)
          summary.failed += batch.length
        } else {
          newMemberships.push(...(batchMemberships || []))
          summary.added += batch.length
        }
      }
    }

    const response: BulkMembersResponse = {
      success: summary.added > 0 || summary.skipped > 0,
      memberships: newMemberships,
      message: `Bulk operation completed. Added: ${summary.added}, Skipped: ${summary.skipped}, Failed: ${summary.failed}`,
      summary
    }

    return new Response(
      JSON.stringify(response),
      { status: summary.added > 0 ? 201 : 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in handleBulkAdd:', error)
    return new Response(
      JSON.stringify({ success: false, error: 'Failed to add members to channel' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
}

async function handleBulkRemove(
  req: Request,
  organizationId: string
): Promise<Response> {
  try {
    const { channel_id, user_ids }: BulkRemoveMembersRequest = await req.json()

    if (!channel_id || !user_ids || !Array.isArray(user_ids) || user_ids.length === 0) {
      return new Response(
        JSON.stringify({ success: false, error: 'Channel ID and user IDs array are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Verify channel exists and belongs to organization
    const { data: channel, error: channelError } = await supabase
      .from('channels')
      .select('id, organization_id, created_by, name')
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

    // Remove memberships in batches
    const batchSize = 50
    let summary = {
      added: 0,
      removed: 0,
      skipped: 0,
      failed: 0
    }

    const removedMemberships = []

    for (let i = 0; i < user_ids.length; i += batchSize) {
      const batch = user_ids.slice(i, i + batchSize)
      
      const { data: batchRemoved, error: removeError } = await supabase
        .from('channel_memberships')
        .delete()
        .eq('channel_id', channel_id)
        .in('user_id', batch)
        .select(`
          id,
          user:users(id, email, first_name, last_name)
        `)

      if (removeError) {
        console.error('Error removing batch of members:', removeError)
        summary.failed += batch.length
      } else {
        removedMemberships.push(...(batchRemoved || []))
        summary.removed += batchRemoved?.length || 0
      }
    }

    const response: BulkMembersResponse = {
      success: summary.removed > 0,
      memberships: removedMemberships,
      message: `Bulk removal completed. Removed: ${summary.removed}, Failed: ${summary.failed}`,
      summary
    }

    return new Response(
      JSON.stringify(response),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in handleBulkRemove:', error)
    return new Response(
      JSON.stringify({ success: false, error: 'Failed to remove members from channel' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
}

async function handleBulkAddToMultipleChannels(
  req: Request,
  organizationId: string
): Promise<Response> {
  try {
    const { user_ids, channel_ids, role }: BulkAddToMultipleChannelsRequest = await req.json()

    if (!user_ids || !Array.isArray(user_ids) || user_ids.length === 0 ||
        !channel_ids || !Array.isArray(channel_ids) || channel_ids.length === 0) {
      return new Response(
        JSON.stringify({ success: false, error: 'User IDs and channel IDs arrays are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (user_ids.length * channel_ids.length > 500) {
      return new Response(
        JSON.stringify({ success: false, error: 'Maximum 500 total memberships can be created at once' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Verify all channels exist and belong to organization
    const { data: channels, error: channelsError } = await supabase
      .from('channels')
      .select('id, name')
      .in('id', channel_ids)
      .eq('organization_id', organizationId)
      .is('deleted_at', null)

    if (channelsError || !channels || channels.length !== channel_ids.length) {
      return new Response(
        JSON.stringify({ success: false, error: 'Some channels not found or not accessible' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Verify all users exist and belong to organization
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, email, first_name, last_name')
      .in('id', user_ids)
      .eq('organization_id', organizationId)

    if (usersError || !users || users.length !== user_ids.length) {
      return new Response(
        JSON.stringify({ success: false, error: 'Some users not found or not in organization' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check for existing memberships
    const { data: existingMemberships } = await supabase
      .from('channel_memberships')
      .select('channel_id, user_id')
      .in('channel_id', channel_ids)
      .in('user_id', user_ids)

    const existingPairs = new Set(
      existingMemberships?.map(m => `${m.channel_id}:${m.user_id}`) || []
    )

    // Create new memberships
    const newMemberships = []
    const membershipRole = role || 'member'

    for (const channelId of channel_ids) {
      for (const userId of user_ids) {
        const pair = `${channelId}:${userId}`
        if (!existingPairs.has(pair)) {
          newMemberships.push({
            channel_id: channelId,
            user_id: userId,
            role: membershipRole
          })
        }
      }
    }

    let summary = {
      added: 0,
      removed: 0,
      skipped: (user_ids.length * channel_ids.length) - newMemberships.length,
      failed: 0
    }

    const createdMemberships = []

    if (newMemberships.length > 0) {
      // Insert in batches
      const batchSize = 100
      for (let i = 0; i < newMemberships.length; i += batchSize) {
        const batch = newMemberships.slice(i, i + batchSize)
        
        const { data: batchCreated, error: createError } = await supabase
          .from('channel_memberships')
          .insert(batch)
          .select(`
            id,
            channel_id,
            role,
            joined_at,
            user:users(id, email, first_name, last_name),
            channel:channels(id, name)
          `)

        if (createError) {
          console.error('Error creating batch of memberships:', createError)
          summary.failed += batch.length
        } else {
          createdMemberships.push(...(batchCreated || []))
          summary.added += batchCreated?.length || 0
        }
      }
    }

    const response: BulkMembersResponse = {
      success: summary.added > 0 || summary.skipped > 0,
      memberships: createdMemberships,
      message: `Bulk add to multiple channels completed. Added: ${summary.added}, Skipped: ${summary.skipped}, Failed: ${summary.failed}`,
      summary
    }

    return new Response(
      JSON.stringify(response),
      { status: summary.added > 0 ? 201 : 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in handleBulkAddToMultipleChannels:', error)
    return new Response(
      JSON.stringify({ success: false, error: 'Failed to add users to multiple channels' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
}

async function handleSyncPermissions(
  req: Request,
  organizationId: string
): Promise<Response> {
  try {
    const { channel_id, role_based_permissions }: SyncPermissionsRequest = await req.json()

    if (!channel_id || !role_based_permissions || typeof role_based_permissions !== 'object') {
      return new Response(
        JSON.stringify({ success: false, error: 'Channel ID and role-based permissions mapping are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Verify channel exists
    const { data: channel, error: channelError } = await supabase
      .from('channels')
      .select('id, organization_id, name')
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

    // Get all users in the organization with their roles
    const { data: orgUsers, error: usersError } = await supabase
      .from('users')
      .select('id, email, first_name, last_name, role')
      .eq('organization_id', organizationId)

    if (usersError || !orgUsers) {
      return new Response(
        JSON.stringify({ success: false, error: 'Error fetching organization users' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get current channel memberships
    const { data: currentMemberships, error: membershipsError } = await supabase
      .from('channel_memberships')
      .select('id, user_id, role')
      .eq('channel_id', channel_id)

    if (membershipsError) {
      return new Response(
        JSON.stringify({ success: false, error: 'Error fetching current memberships' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const currentMembershipMap = new Map(
      currentMemberships?.map(m => [m.user_id, m]) || []
    )

    let summary = {
      added: 0,
      removed: 0,
      skipped: 0,
      failed: 0
    }

    const updates = []
    const additions = []
    const removals = []

    // Process each user based on their role
    for (const user of orgUsers) {
      const expectedChannelRole = role_based_permissions[user.role]
      const currentMembership = currentMembershipMap.get(user.id)

      if (expectedChannelRole) {
        // User should be in the channel
        if (currentMembership) {
          // User is already in channel, check if role needs updating
          if (currentMembership.role !== expectedChannelRole) {
            updates.push({
              id: currentMembership.id,
              role: expectedChannelRole
            })
          }
        } else {
          // User should be added to channel
          additions.push({
            channel_id,
            user_id: user.id,
            role: expectedChannelRole
          })
        }
      } else {
        // User should not be in the channel
        if (currentMembership) {
          removals.push(currentMembership.id)
        }
      }
    }

    // Perform updates
    for (const update of updates) {
      const { error } = await supabase
        .from('channel_memberships')
        .update({ role: update.role })
        .eq('id', update.id)

      if (error) {
        console.error('Error updating membership role:', error)
        summary.failed++
      } else {
        summary.added++ // Count as "added" for role updates
      }
    }

    // Perform additions
    if (additions.length > 0) {
      const { data: addedMemberships, error: addError } = await supabase
        .from('channel_memberships')
        .insert(additions)
        .select('id')

      if (addError) {
        console.error('Error adding new memberships:', addError)
        summary.failed += additions.length
      } else {
        summary.added += addedMemberships?.length || 0
      }
    }

    // Perform removals
    if (removals.length > 0) {
      const { data: removedMemberships, error: removeError } = await supabase
        .from('channel_memberships')
        .delete()
        .in('id', removals)
        .select('id')

      if (removeError) {
        console.error('Error removing memberships:', removeError)
        summary.failed += removals.length
      } else {
        summary.removed += removedMemberships?.length || 0
      }
    }

    const response: BulkMembersResponse = {
      success: true,
      message: `Permission sync completed. Updated/Added: ${summary.added}, Removed: ${summary.removed}, Failed: ${summary.failed}`,
      summary
    }

    return new Response(
      JSON.stringify(response),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in handleSyncPermissions:', error)
    return new Response(
      JSON.stringify({ success: false, error: 'Failed to sync channel permissions' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
}
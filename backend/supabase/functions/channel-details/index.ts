import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
)

interface ChannelDetailsResponse {
  success: boolean
  channel?: any
  statistics?: any
  error?: string
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  if (req.method !== 'GET') {
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

    const url = new URL(req.url)
    const channelId = url.searchParams.get('id')
    const includeStats = url.searchParams.get('include_stats') === 'true'
    const includeMessages = url.searchParams.get('include_messages') === 'true'
    const messageLimit = parseInt(url.searchParams.get('message_limit') || '10')

    if (!channelId) {
      return new Response(
        JSON.stringify({ success: false, error: 'Channel ID is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get channel details with memberships
    const { data: channel, error: channelError } = await supabase
      .from('channels')
      .select(`
        *,
        creator:users!created_by(
          id,
          email,
          first_name,
          last_name,
          avatar_url
        ),
        memberships:channel_memberships(
          id,
          role,
          joined_at,
          user:users(
            id,
            email,
            first_name,
            last_name,
            avatar_url,
            last_seen_at,
            role
          )
        )
      `)
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

    // Check if user has access to this channel
    const isAdmin = ['god', 'admin'].includes(userRole)
    const isMember = channel.memberships?.some((m: any) => m.user?.id === user.id)

    if (!isAdmin && !isMember) {
      return new Response(
        JSON.stringify({ success: false, error: 'Access denied. You are not a member of this channel.' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Process channel data
    const processedChannel = {
      ...channel,
      member_count: channel.memberships?.length || 0,
      can_edit: isAdmin,
      can_delete: isAdmin,
      can_manage_members: isAdmin,
      is_member: isMember,
      user_role_in_channel: channel.memberships?.find((m: any) => m.user?.id === user.id)?.role || null,
      members: channel.memberships?.map((membership: any) => ({
        ...membership,
        user: {
          ...membership.user,
          is_online: membership.user?.last_seen_at ? 
            new Date(membership.user.last_seen_at).getTime() > (Date.now() - 5 * 60 * 1000) : false
        },
        can_remove: isAdmin && membership.user?.id !== user.id && membership.user?.id !== channel.created_by,
        can_change_role: isAdmin && membership.user?.id !== user.id
      })) || []
    }

    // Remove the raw memberships to avoid duplication
    delete processedChannel.memberships

    let statistics = null
    if (includeStats && isAdmin) {
      // Get channel statistics
      const [
        { count: totalMessages },
        { count: todayMessages },
        { count: thisWeekMessages },
        { data: mostActiveMembers }
      ] = await Promise.all([
        // Total messages count (if messages table exists)
        supabase.from('messages').select('*', { count: 'exact', head: true }).eq('channel_id', channelId),
        
        // Today's messages count
        supabase.from('messages').select('*', { count: 'exact', head: true })
          .eq('channel_id', channelId)
          .gte('created_at', new Date().toISOString().split('T')[0]),
        
        // This week's messages count
        supabase.from('messages').select('*', { count: 'exact', head: true })
          .eq('channel_id', channelId)
          .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()),
        
        // Most active members (if messages table exists)
        supabase.from('messages')
          .select('user_id, users(first_name, last_name), count(*)')
          .eq('channel_id', channelId)
          .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
          .group('user_id, users.id, users.first_name, users.last_name')
          .order('count', { ascending: false })
          .limit(5)
      ])

      statistics = {
        total_messages: totalMessages || 0,
        messages_today: todayMessages || 0,
        messages_this_week: thisWeekMessages || 0,
        most_active_members: mostActiveMembers || [],
        created_days_ago: Math.floor((Date.now() - new Date(channel.created_at).getTime()) / (1000 * 60 * 60 * 24)),
        member_join_rate: {
          this_week: 0, // Calculate based on joined_at timestamps
          this_month: 0
        }
      }

      // Calculate member join rates
      const now = Date.now()
      const weekAgo = now - (7 * 24 * 60 * 60 * 1000)
      const monthAgo = now - (30 * 24 * 60 * 60 * 1000)

      statistics.member_join_rate.this_week = processedChannel.members.filter(
        (m: any) => new Date(m.joined_at).getTime() > weekAgo
      ).length

      statistics.member_join_rate.this_month = processedChannel.members.filter(
        (m: any) => new Date(m.joined_at).getTime() > monthAgo
      ).length
    }

    // Include recent messages if requested and user has access
    if (includeMessages && (isAdmin || isMember)) {
      try {
        const { data: recentMessages } = await supabase
          .from('messages')
          .select(`
            id,
            content,
            created_at,
            updated_at,
            message_type,
            user:users(
              id,
              first_name,
              last_name,
              avatar_url
            )
          `)
          .eq('channel_id', channelId)
          .order('created_at', { ascending: false })
          .limit(messageLimit)

        processedChannel.recent_messages = recentMessages || []
      } catch (error) {
        // Messages table might not exist yet, that's okay
        processedChannel.recent_messages = []
      }
    }

    const response: ChannelDetailsResponse = {
      success: true,
      channel: processedChannel,
      ...(statistics && { statistics })
    }

    return new Response(
      JSON.stringify(response),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Unexpected error in channel-details:', error)
    return new Response(
      JSON.stringify({ success: false, error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
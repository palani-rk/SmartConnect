import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
)

interface MessageOperationRequest {
  action: 'add_reaction' | 'remove_reaction' | 'upload_file' | 'process_audio';
  message_id?: string;
  emoji?: string;
  file_data?: {
    filename: string;
    content_type: string;
    file_size: number;
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // Get user from auth header
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: corsHeaders }
      )
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    )

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid authorization token' }),
        { status: 401, headers: corsHeaders }
      )
    }

    const { action, message_id, emoji, file_data } = await req.json()

    switch (action) {
      case 'add_reaction':
        return await handleAddReaction(message_id, emoji, user.id)
      case 'remove_reaction':
        return await handleRemoveReaction(message_id, emoji, user.id)
      case 'upload_file':
        return await handleFileUpload(file_data, user.id)
      case 'process_audio':
        return await handleAudioProcessing(message_id, user.id)
      default:
        return new Response(
          JSON.stringify({ error: 'Invalid action' }),
          { status: 400, headers: corsHeaders }
        )
    }
  } catch (error) {
    console.error('Error in message-operations:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: corsHeaders }
    )
  }
})

async function handleAddReaction(messageId: string, emoji: string, userId: string) {
  try {
    const { data, error } = await supabase
      .from('message_reactions')
      .insert({
        message_id: messageId,
        user_id: userId,
        emoji: emoji
      })
      .select()
      .single()

    if (error) {
      if (error.code === '23505') { // Unique constraint violation
        return new Response(
          JSON.stringify({ error: 'Reaction already exists' }),
          { status: 409, headers: corsHeaders }
        )
      }
      throw error
    }

    return new Response(
      JSON.stringify({ success: true, data }),
      { status: 201, headers: corsHeaders }
    )
  } catch (error) {
    console.error('Error adding reaction:', error)
    return new Response(
      JSON.stringify({ error: 'Failed to add reaction' }),
      { status: 500, headers: corsHeaders }
    )
  }
}

async function handleRemoveReaction(messageId: string, emoji: string, userId: string) {
  try {
    const { data, error } = await supabase
      .from('message_reactions')
      .delete()
      .eq('message_id', messageId)
      .eq('user_id', userId)
      .eq('emoji', emoji)
      .select()

    if (error) throw error

    return new Response(
      JSON.stringify({ success: true, data }),
      { status: 200, headers: corsHeaders }
    )
  } catch (error) {
    console.error('Error removing reaction:', error)
    return new Response(
      JSON.stringify({ error: 'Failed to remove reaction' }),
      { status: 500, headers: corsHeaders }
    )
  }
}

async function handleFileUpload(fileData: any, userId: string) {
  try {
    // Validate file data
    if (!fileData || !fileData.filename || !fileData.content_type || !fileData.file_size) {
      return new Response(
        JSON.stringify({ error: 'Invalid file data' }),
        { status: 400, headers: corsHeaders }
      )
    }

    // Validate file size
    const maxSizes = {
      'image/': 10 * 1024 * 1024, // 10MB
      'audio/': 25 * 1024 * 1024, // 25MB
      'default': 100 * 1024 * 1024 // 100MB
    }

    const maxSize = Object.entries(maxSizes)
      .find(([type]) => fileData.content_type.startsWith(type))?.[1] || maxSizes.default

    if (fileData.file_size > maxSize) {
      return new Response(
        JSON.stringify({ error: 'File too large' }),
        { status: 400, headers: corsHeaders }
      )
    }

    // Return success - actual file upload would be handled by frontend
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'File validation passed',
        bucket: getBucketName(fileData.content_type),
        path: `${userId}/${Date.now()}-${fileData.filename}`
      }),
      { status: 200, headers: corsHeaders }
    )
  } catch (error) {
    console.error('Error in file upload:', error)
    return new Response(
      JSON.stringify({ error: 'Failed to process file upload' }),
      { status: 500, headers: corsHeaders }
    )
  }
}

async function handleAudioProcessing(messageId: string, userId: string) {
  try {
    // Placeholder for audio processing logic
    // This could include waveform generation, duration calculation, etc.
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Audio processing initiated',
        messageId: messageId
      }),
      { status: 200, headers: corsHeaders }
    )
  } catch (error) {
    console.error('Error in audio processing:', error)
    return new Response(
      JSON.stringify({ error: 'Failed to process audio' }),
      { status: 500, headers: corsHeaders }
    )
  }
}

function getBucketName(contentType: string): string {
  if (contentType.startsWith('image/')) return 'message-images'
  if (contentType.startsWith('audio/')) return 'message-audio'
  return 'message-files'
}
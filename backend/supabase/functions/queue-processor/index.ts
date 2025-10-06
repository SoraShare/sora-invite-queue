import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    )

    // Get the authorization header
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Verify the JWT token
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(
      authHeader.replace('Bearer ', '')
    )

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid token' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Handle different HTTP methods
    switch (req.method) {
      case 'POST':
        return await handleQueueOperation(req, supabaseClient, user)
      case 'GET':
        return await handleGetQueueStatus(supabaseClient, user)
      default:
        return new Response(
          JSON.stringify({ error: 'Method not allowed' }),
          { 
            status: 405, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
    }

  } catch (error) {
    console.error('Queue processor error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})

async function handleQueueOperation(req: Request, supabaseClient: any, user: any) {
  const { action, isPremium = false } = await req.json()

  switch (action) {
    case 'join':
      return await joinQueue(supabaseClient, user.id, isPremium)
    case 'leave':
      return await leaveQueue(supabaseClient, user.id)
    case 'process':
      // Admin only - process next in queue
      return await processNextInQueue(supabaseClient)
    default:
      return new Response(
        JSON.stringify({ error: 'Invalid action' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
  }
}

async function joinQueue(supabaseClient: any, userId: string, isPremium: boolean) {
  try {
    // Check if user already in queue
    const { data: existingEntry } = await supabaseClient
      .from('queue_entries')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'waiting')
      .single()

    if (existingEntry) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Already in queue',
          data: existingEntry
        }),
        { 
          status: 409, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Get next position using the database function
    const { data: positionResult } = await supabaseClient
      .rpc('get_next_queue_position', { is_premium: isPremium })

    if (!positionResult) {
      throw new Error('Failed to get queue position')
    }

    // Insert new queue entry
    const { data: queueEntry, error: insertError } = await supabaseClient
      .from('queue_entries')
      .insert({
        user_id: userId,
        position: positionResult,
        priority: isPremium,
        status: 'waiting',
      })
      .select()
      .single()

    if (insertError) {
      throw insertError
    }

    // Get updated position info
    const position = await getQueuePosition(supabaseClient, userId)

    return new Response(
      JSON.stringify({ 
        success: true, 
        data: { 
          queueEntry,
          position
        }
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Error joining queue:', error)
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message || 'Failed to join queue' 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
}

async function leaveQueue(supabaseClient: any, userId: string) {
  try {
    const { error } = await supabaseClient
      .from('queue_entries')
      .delete()
      .eq('user_id', userId)
      .eq('status', 'waiting')

    if (error) {
      throw error
    }

    return new Response(
      JSON.stringify({ success: true }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Error leaving queue:', error)
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message || 'Failed to leave queue' 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
}

async function handleGetQueueStatus(supabaseClient: any, user: any) {
  try {
    const [position, stats] = await Promise.all([
      getQueuePosition(supabaseClient, user.id),
      getQueueStats(supabaseClient)
    ])

    return new Response(
      JSON.stringify({ 
        success: true, 
        data: { 
          position, 
          stats 
        } 
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Error getting queue status:', error)
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message || 'Failed to get queue status' 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
}

async function getQueuePosition(supabaseClient: any, userId: string) {
  const { data: entry } = await supabaseClient
    .from('queue_entries')
    .select('*')
    .eq('user_id', userId)
    .eq('status', 'waiting')
    .single()

  if (!entry) return null

  // Calculate actual position considering priority
  const { count: priorityAhead } = await supabaseClient
    .from('queue_entries')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'waiting')
    .eq('priority', true)
    .lt('created_at', entry.created_at)

  const { count: regularAhead } = await supabaseClient
    .from('queue_entries')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'waiting')
    .eq('priority', false)
    .lt('created_at', entry.created_at)

  const { count: totalPriority } = await supabaseClient
    .from('queue_entries')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'waiting')
    .eq('priority', true)

  const actualPosition = entry.priority 
    ? (priorityAhead || 0) + 1
    : (totalPriority || 0) + (regularAhead || 0) + 1

  // Calculate estimated wait time (1 code per hour assumption)
  const estimatedWaitTime = Math.max(1, actualPosition)

  return {
    position: actualPosition,
    estimatedWaitTime,
    isPriority: entry.priority,
    status: entry.status,
    joinedAt: entry.created_at
  }
}

async function getQueueStats(supabaseClient: any) {
  // Use the database function for consistent stats
  const { data: stats } = await supabaseClient
    .rpc('get_queue_statistics')

  if (!stats) {
    throw new Error('Failed to get queue statistics')
  }

  // Calculate return rate percentage
  const returnRate = stats.total_allocated > 0 
    ? (stats.total_returned / stats.total_allocated) * 100 
    : 0

  // Calculate average wait time (simplified)
  const averageWaitTime = stats.total_in_queue > 0 
    ? stats.total_in_queue / 1 // 1 code per hour processing rate
    : 0

  return {
    totalInQueue: stats.total_in_queue,
    averageWaitTime,
    totalProcessed: stats.total_processed,
    availableCodes: stats.available_codes,
    returnRate: Math.round(returnRate * 100) / 100
  }
}

async function processNextInQueue(supabaseClient: any) {
  try {
    // Use the database function to process queue allocation
    const { data: result } = await supabaseClient
      .rpc('process_queue_allocation')

    if (!result || !result.success) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: result?.message || 'No processing available' 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        data: result 
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Error processing queue:', error)
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message || 'Failed to process queue' 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
}
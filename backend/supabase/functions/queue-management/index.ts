import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface QueueJoinRequest {
  user_id: string;
  is_premium?: boolean;
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Create Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Verify authentication
    const authHeader = req.headers.get('Authorization')!
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token)
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    if (req.method === 'POST') {
      // Join queue
      const body: QueueJoinRequest = await req.json()
      
      // Validate user_id matches authenticated user
      if (body.user_id !== user.id) {
        return new Response(
          JSON.stringify({ error: 'Invalid user_id' }),
          { 
            status: 403, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }

      // Check if user is already in queue
      const { data: existingEntry } = await supabaseClient
        .from('queue_entries')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'waiting')
        .single()

      if (existingEntry) {
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: 'Already in queue',
            position: existingEntry.position 
          }),
          { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }

      // Get user premium status
      const { data: userProfile } = await supabaseClient
        .from('users')
        .select('subscription_status')
        .eq('id', user.id)
        .single()

      const isPremium = userProfile?.subscription_status === 'premium' || body.is_premium || false

      // Get next position
      const { count: totalInQueue } = await supabaseClient
        .from('queue_entries')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'waiting')

      const position = (totalInQueue || 0) + 1

      // Insert queue entry
      const { data: queueEntry, error: insertError } = await supabaseClient
        .from('queue_entries')
        .insert({
          user_id: user.id,
          position: position,
          priority: isPremium,
          status: 'waiting',
        })
        .select('*')
        .single()

      if (insertError) {
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: insertError.message 
          }),
          { 
            status: 500, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }

      // Update all queue positions
      const { error: updateError } = await supabaseClient.rpc('update_queue_positions')
      
      if (updateError) {
        console.error('Error updating queue positions:', updateError)
      }

      // Calculate estimated wait time (simplified)
      const estimatedWaitHours = Math.max(1, Math.ceil(position / 1)) // 1 code per hour assumption

      return new Response(
        JSON.stringify({
          success: true,
          data: {
            queueEntry,
            position: {
              position: queueEntry.position,
              estimatedWaitTime: estimatedWaitHours,
              isPriority: queueEntry.priority,
              status: queueEntry.status,
              joinedAt: queueEntry.created_at
            }
          }
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    if (req.method === 'DELETE') {
      // Leave queue
      const { error: deleteError } = await supabaseClient
        .from('queue_entries')
        .delete()
        .eq('user_id', user.id)
        .eq('status', 'waiting')

      if (deleteError) {
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: deleteError.message 
          }),
          { 
            status: 500, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }

      // Update positions for remaining queue members
      const { error: updateError } = await supabaseClient.rpc('update_queue_positions')
      
      if (updateError) {
        console.error('Error updating queue positions:', updateError)
      }

      return new Response(
        JSON.stringify({ success: true }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    if (req.method === 'GET') {
      // Get queue status
      const { data: queueEntry } = await supabaseClient
        .from('queue_entries')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'waiting')
        .single()

      let position = null
      if (queueEntry) {
        // Calculate actual position considering priority
        const { count: priorityAhead } = await supabaseClient
          .from('queue_entries')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'waiting')
          .eq('priority', true)
          .lt('created_at', queueEntry.created_at)

        const { count: regularAhead } = await supabaseClient
          .from('queue_entries')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'waiting')
          .eq('priority', false)
          .lt('created_at', queueEntry.created_at)

        const { count: totalPriority } = await supabaseClient
          .from('queue_entries')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'waiting')
          .eq('priority', true)

        const actualPosition = queueEntry.priority 
          ? (priorityAhead || 0) + 1
          : (totalPriority || 0) + (regularAhead || 0) + 1

        const estimatedWaitHours = Math.max(1, Math.ceil(actualPosition / 1))

        position = {
          position: actualPosition,
          estimatedWaitTime: estimatedWaitHours,
          isPriority: queueEntry.priority,
          status: queueEntry.status,
          joinedAt: queueEntry.created_at
        }
      }

      // Get queue statistics
      const { data: stats } = await supabaseClient
        .from('public_queue_stats')
        .select('*')
        .single()

      return new Response(
        JSON.stringify({
          success: true,
          data: {
            position,
            stats: {
              totalInQueue: stats?.total_in_queue || 0,
              averageWaitTime: stats?.avg_wait_hours || 0,
              totalProcessed: stats?.total_processed || 0,
              availableCodes: stats?.available_codes || 0,
              returnRate: stats?.return_rate_percentage || 0
            }
          }
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { 
        status: 405, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Error in queue-management function:', error)
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: 'Internal server error' 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})
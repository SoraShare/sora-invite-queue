import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface CodeSubmissionRequest {
  codes: string[];
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
      // Submit invitation codes
      const body: CodeSubmissionRequest = await req.json()
      
      if (!body.codes || !Array.isArray(body.codes) || body.codes.length === 0) {
        return new Response(
          JSON.stringify({ error: 'Invalid codes array' }),
          { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }

      // Validate code format (basic validation)
      const validCodes = body.codes.filter(code => {
        return typeof code === 'string' && 
               code.length >= 10 && 
               code.length <= 100 && 
               /^[a-zA-Z0-9\-_]+$/.test(code)
      })

      if (validCodes.length === 0) {
        return new Response(
          JSON.stringify({ error: 'No valid codes provided' }),
          { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }

      // Hash codes for security
      const hashedCodes = await Promise.all(validCodes.map(async (code) => {
        const encoder = new TextEncoder()
        const data = encoder.encode(code)
        const hashBuffer = await crypto.subtle.digest('SHA-256', data)
        const hashArray = Array.from(new Uint8Array(hashBuffer))
        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
      }))

      // Check for duplicates
      const { data: existingCodes } = await supabaseClient
        .from('invitation_codes')
        .select('code_hash')
        .in('code_hash', hashedCodes)

      const existingHashes = new Set(existingCodes?.map(c => c.code_hash) || [])
      const newHashes = hashedCodes.filter(hash => !existingHashes.has(hash))

      if (newHashes.length === 0) {
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: 'All codes already exist in the system' 
          }),
          { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }

      // Insert new codes
      const codeInserts = newHashes.map(hash => ({
        code_hash: hash,
        submitted_by: user.id,
        status: 'available'
      }))

      const { data: insertedCodes, error: insertError } = await supabaseClient
        .from('invitation_codes')
        .insert(codeInserts)
        .select('*')

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

      return new Response(
        JSON.stringify({
          success: true,
          data: {
            submitted: newHashes.length,
            total_submitted: validCodes.length,
            duplicates: validCodes.length - newHashes.length,
            codes: insertedCodes
          }
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    if (req.method === 'GET') {
      // Get user's submitted codes
      const { data: submittedCodes, error: fetchError } = await supabaseClient
        .from('invitation_codes')
        .select(`
          id,
          status,
          created_at,
          allocated_at,
          allocated_to
        `)
        .eq('submitted_by', user.id)
        .order('created_at', { ascending: false })

      if (fetchError) {
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: fetchError.message 
          }),
          { 
            status: 500, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }

      // Get statistics
      const totalSubmitted = submittedCodes?.length || 0
      const allocated = submittedCodes?.filter(c => c.status === 'allocated').length || 0
      const used = submittedCodes?.filter(c => c.status === 'used').length || 0
      const available = submittedCodes?.filter(c => c.status === 'available').length || 0

      return new Response(
        JSON.stringify({
          success: true,
          data: {
            codes: submittedCodes,
            statistics: {
              total_submitted: totalSubmitted,
              allocated: allocated,
              used: used,
              available: available,
              contribution_score: allocated + used
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
    console.error('Error in code-submission function:', error)
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
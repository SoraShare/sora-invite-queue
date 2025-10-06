import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
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

    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(
      authHeader.replace('Bearer ', '')
    )

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    switch (req.method) {
      case 'POST':
        return await handleCodeSubmission(req, supabaseClient, user)
      case 'GET':
        return await handleGetUserCodes(supabaseClient, user)
      default:
        return new Response(
          JSON.stringify({ error: 'Method not allowed' }),
          { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }

  } catch (error) {
    console.error('Code manager error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

async function handleCodeSubmission(req: Request, supabaseClient: any, user: any) {
  try {
    const { codes } = await req.json()

    if (!codes || !Array.isArray(codes) || codes.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Invalid codes array' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const submittedCodes = []

    for (const code of codes) {
      // Validate code format (basic validation)
      if (!isValidCodeFormat(code)) {
        return new Response(
          JSON.stringify({ error: `Invalid code format: ${code}` }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Hash the code for storage (security)
      const codeHash = await hashCode(code)

      // Check for duplicates
      const { data: existingCode } = await supabaseClient
        .from('invitation_codes')
        .select('id')
        .eq('code_hash', codeHash)
        .single()

      if (existingCode) {
        return new Response(
          JSON.stringify({ error: `Code already exists: ${code}` }),
          { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Insert new code
      const { data: newCode, error: insertError } = await supabaseClient
        .from('invitation_codes')
        .insert({
          code_hash: codeHash,
          submitted_by: user.id,
          status: 'available'
        })
        .select()
        .single()

      if (insertError) {
        throw insertError
      }

      submittedCodes.push(newCode)
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        data: { 
          submitted_count: submittedCodes.length,
          codes: submittedCodes
        }
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error submitting codes:', error)
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: 'Failed to submit codes'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
}

async function handleGetUserCodes(supabaseClient: any, user: any) {
  try {
    // Get codes submitted by user
    const { data: submittedCodes } = await supabaseClient
      .from('invitation_codes')
      .select('id, status, created_at')
      .eq('submitted_by', user.id)
      .order('created_at', { ascending: false })

    // Get codes allocated to user
    const { data: allocatedCodes } = await supabaseClient
      .from('invitation_codes')
      .select('id, status, allocated_at, code_hash')
      .eq('allocated_to', user.id)
      .order('allocated_at', { ascending: false })

    return new Response(
      JSON.stringify({ 
        success: true, 
        data: { 
          submitted: submittedCodes || [],
          allocated: allocatedCodes || []
        }
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error getting user codes:', error)
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: 'Failed to get user codes'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
}

function isValidCodeFormat(code: string): boolean {
  // Basic validation for Sora invitation codes
  // This should be updated based on actual Sora code format
  if (!code || typeof code !== 'string') return false
  
  // Remove whitespace
  const cleanCode = code.trim()
  
  // Check length (example: assume codes are 10-50 characters)
  if (cleanCode.length < 10 || cleanCode.length > 50) return false
  
  // Check for basic pattern (alphanumeric, possibly with hyphens/underscores)
  const codePattern = /^[A-Za-z0-9_-]+$/
  if (!codePattern.test(cleanCode)) return false
  
  return true
}

async function hashCode(code: string): Promise<string> {
  // Simple hash function for demonstration
  // In production, use proper cryptographic hashing
  const encoder = new TextEncoder()
  const data = encoder.encode(code.trim().toLowerCase())
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
  return hashHex
}
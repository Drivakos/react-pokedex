import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

console.log('GraphQL Edge Function loaded')

// Environment variables
const GRAPHQL_ENDPOINT = Deno.env.get('VITE_API_GRAPHQL_URL')
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!

// Initialize Supabase client for caching
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

interface CacheEntry {
  id?: string
  cache_key: string
  data: string
  created_at?: string
  expires_at: string
}

serve(async (req: Request) => {
  // Set CORS headers
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  }

  // Handle OPTIONS request for CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Parse the request body to get the GraphQL query
    let body
    try {
      body = await req.json()
    } catch (e) {
      return new Response(
        JSON.stringify({ error: 'Invalid JSON in request body' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    const { query, variables } = body

    if (!query) {
      return new Response(
        JSON.stringify({ error: 'GraphQL query is required' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Create a cache key based on the query and variables
    const cacheKey = `graphql:${btoa(JSON.stringify({ query, variables }))}`

    // Check cache first
    const { data: cachedData, error: cacheError } = await supabase
      .from('api_cache')
      .select('data, expires_at')
      .eq('cache_key', cacheKey)
      .gt('expires_at', new Date().toISOString())
      .single()

    if (cachedData && !cacheError) {
      console.log('Cache hit for:', cacheKey)
      return new Response(cachedData.data, {
        status: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
          'Cache-Control': 'public, max-age=3600, s-maxage=3600',
          'X-Cache': 'HIT',
        }
      })
    }

    console.log('Cache miss for:', cacheKey)

    // Make the GraphQL request
    const response = await fetch(GRAPHQL_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query, variables }),
    })

    if (!response.ok) {
      throw new Error(`GraphQL API returned ${response.status}: ${response.statusText}`)
    }

    const data = await response.json()
    const responseBody = JSON.stringify(data)

    // Cache the response for 1 hour
    const expiresAt = new Date(Date.now() + 3600000).toISOString() // 1 hour from now

    const { error: insertError } = await supabase
      .from('api_cache')
      .upsert({
        cache_key: cacheKey,
        data: responseBody,
        expires_at: expiresAt,
      })

    if (insertError) {
      console.error('Cache insert error:', insertError)
    }

    // Return the fresh data
    return new Response(responseBody, {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=3600, s-maxage=3600',
        'X-Cache': 'MISS',
      }
    })

  } catch (error) {
    console.error('Pokemon GraphQL API Error:', error)

    return new Response(
      JSON.stringify({
        error: 'Failed to fetch Pokemon data',
        message: error instanceof Error ? error.message : 'Unknown error'
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})

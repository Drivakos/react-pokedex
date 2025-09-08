import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

console.log('REST Edge Function loaded')

// Environment variables
const REST_ENDPOINT = Deno.env.get('VITE_API_REST_URL') || Deno.env.get('VITE_API_URL')
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
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  }

  // Handle OPTIONS request for CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Parse the URL to get the API endpoint
    const url = new URL(req.url)
    const pathSegments = url.pathname.split('/')

    // Extract the API path after 'rest'
    const restIndex = pathSegments.findIndex(segment => segment === 'rest')

    if (restIndex === -1 || restIndex >= pathSegments.length - 1) {
      return new Response(
        JSON.stringify({
          error: 'API path is required. Use /rest/{endpoint}',
          debug: {
            pathname: url.pathname,
            pathSegments,
            restIndex
          }
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Reconstruct the API path and query parameters
    const apiPath = pathSegments.slice(restIndex + 1).join('/')
    const queryString = url.searchParams.toString()
    const fullApiUrl = `${REST_ENDPOINT}/${apiPath}${queryString ? `?${queryString}` : ''}`

    console.log('Fetching from:', fullApiUrl)

    // Create a cache key based on the full API URL
    const cacheKey = `rest:${btoa(fullApiUrl)}`

    // Determine cache duration based on the endpoint
    let maxAge = 3600 // Default 1 hour

    if (apiPath.match(/pokemon\/\d+$/)) {
      // Individual Pokemon data - cache for 24 hours
      maxAge = 86400
    } else if (apiPath.includes('move/') || apiPath.includes('ability/') || apiPath.includes('type/')) {
      // Move, ability, type data - cache for 24 hours (rarely changes)
      maxAge = 86400
    } else if (apiPath.includes('pokemon?')) {
      // Pokemon lists with pagination - cache for 6 hours
      maxAge = 21600
    }

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
          'Cache-Control': `public, max-age=${maxAge}, s-maxage=${maxAge}`,
          'X-Cache': 'HIT',
          'X-Cache-Duration': maxAge.toString(),
        }
      })
    }

    console.log('Cache miss for:', cacheKey)

    // Make the API request
    const apiResponse = await fetch(fullApiUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Supabase-Pokemon-Cache/1.0',
      },
    })

    if (!apiResponse.ok) {
      throw new Error(`PokeAPI returned ${apiResponse.status}: ${apiResponse.statusText}`)
    }

    const data = await apiResponse.json()
    const responseBody = JSON.stringify(data)

    // Cache the response
    const expiresAt = new Date(Date.now() + maxAge * 1000).toISOString()

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
        'Cache-Control': `public, max-age=${maxAge}, s-maxage=${maxAge}`,
        'X-Cache': 'MISS',
        'X-Cache-Duration': maxAge.toString(),
      }
    })

  } catch (error) {
    console.error('Pokemon REST API Error:', error)

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


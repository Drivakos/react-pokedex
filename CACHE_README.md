# Netlify Cache API Implementation

This project now uses [Netlify's Cache API](https://docs.netlify.com/platform/cache-api/) to cache expensive 3rd party API calls to the PokeAPI, improving performance and reducing costs.

## 🚀 Features

- **Intelligent Caching**: Different cache durations based on data type
  - Individual Pokemon data: 24 hours (rarely changes)
  - Move/Ability/Type data: 24 hours (static data)
  - Pokemon lists: 6 hours (reasonable freshness)
  - GraphQL queries: 1 hour (default)

- **Automatic Fallback**: If cached endpoints fail, automatically falls back to direct API calls
- **Feature Flag**: Can be disabled via environment variable `VITE_USE_CACHED_API=false`
- **CORS Support**: Proper CORS headers for cross-origin requests
- **Error Handling**: Comprehensive error handling with logging

## 📁 File Structure

```
netlify/
└── functions/
    ├── pokemon-graphql.ts    # Cached GraphQL endpoint
    └── pokemon-rest.ts       # Cached REST endpoint

src/
└── services/
    ├── api.ts               # Main API service (updated with caching)
    └── cached-api.ts        # Cached API functions
```

## 🔧 Cache Strategy

### GraphQL Endpoint (`/api/pokemon/graphql`)
- Caches all GraphQL queries for 1 hour
- Uses query + variables as cache key
- Handles Pokemon searches, filters, and listings

### REST Endpoint (`/api/pokemon/rest/*`)
- Individual Pokemon: 24 hours cache
- Moves/Abilities/Types: 24 hours cache  
- Pokemon lists: 6 hours cache
- Default: 1 hour cache

## 🛠️ Configuration

### Environment Variables

```bash
# Enable/disable caching (default: true)
VITE_USE_CACHED_API=true

# API endpoints (for fallback)
VITE_API_GRAPHQL_URL=https://beta.pokeapi.co/graphql/v1beta
VITE_API_REST_URL=https://pokeapi.co/api/v2
```

### Cache Headers

The implementation uses standard HTTP cache control headers:
- `Cache-Control: public, max-age=3600, s-maxage=3600`
- `X-Cache-Duration`: Shows the cache duration used

## 📊 Performance Benefits

1. **Reduced API Calls**: Cached responses reduce requests to PokeAPI
2. **Faster Load Times**: Cached responses are served instantly
3. **Cost Efficiency**: Reduced function execution time and external API calls
4. **Better UX**: Faster page loads and smoother navigation

## 🔍 Usage Examples

### Direct Usage (automatic)
```typescript
// Automatically uses cached version if available
const pokemon = await fetchPokemonById(25); // Pikachu
```

### Manual Cache Control
```typescript
// Disable caching for specific requests
process.env.VITE_USE_CACHED_API = 'false';
const freshData = await fetchPokemonById(25);
```

## 🐛 Debugging

The implementation includes comprehensive logging:
- 🚀 Cached API calls
- 📡 Direct API fallback calls  
- ⚠️ Cache failures and fallbacks

Check browser console for cache status and performance info.

## 🚦 Cache Status

You can monitor cache performance:
1. Check browser DevTools → Network tab
2. Look for `X-Cache-Duration` headers
3. Monitor console logs for cache hits/misses

## ⚡ Cache Limits (Netlify)

- Maximum cache lookups per function: 100
- Maximum cache insertions per function: 20
- Cache is region-specific (not global)
- Cache invalidates on site redeployment

## 🔄 Cache Invalidation

Caches are automatically invalidated:
- When TTL expires (max-age)
- On site redeployment
- Manual cache clearing (if implemented)

## 🎯 Next Steps

1. **Analytics**: Add cache hit/miss analytics
2. **Monitoring**: Add cache performance monitoring
3. **Optimization**: Fine-tune cache durations based on usage
4. **Purging**: Implement manual cache purging endpoints 
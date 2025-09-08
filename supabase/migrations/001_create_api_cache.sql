-- Create table for API caching
CREATE TABLE IF NOT EXISTS api_cache (
  id SERIAL PRIMARY KEY,
  cache_key TEXT NOT NULL UNIQUE,
  data TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL
);

-- Create index on cache_key for faster lookups
CREATE INDEX IF NOT EXISTS idx_api_cache_key ON api_cache(cache_key);

-- Create index on expires_at for cleanup queries
CREATE INDEX IF NOT EXISTS idx_api_cache_expires_at ON api_cache(expires_at);

-- Create a function to clean up expired cache entries
CREATE OR REPLACE FUNCTION cleanup_expired_cache()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM api_cache WHERE expires_at < NOW();
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Create RLS policies
ALTER TABLE api_cache ENABLE ROW LEVEL SECURITY;

-- Allow anonymous read access (for edge functions)
CREATE POLICY "Allow anonymous read access" ON api_cache
  FOR SELECT USING (true);

-- Allow anonymous insert/update access (for edge functions)
CREATE POLICY "Allow anonymous insert access" ON api_cache
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow anonymous update access" ON api_cache
  FOR UPDATE USING (true);

-- Create a scheduled job to clean up expired cache entries (runs every hour)
-- Note: This requires pg_cron extension to be enabled
-- SELECT cron.schedule('cleanup-expired-cache', '0 * * * *', 'SELECT cleanup_expired_cache();');

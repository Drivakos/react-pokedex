/**
 * Redis connection diagnostics
 * Helper to check if Redis is configured correctly
 */

import { isCacheEnabled, getCacheStats } from '../lib/redis';

/**
 * Run diagnostics on Redis configuration
 */
export async function diagnoseRedis(): Promise<{
  configured: boolean;
  connected: boolean;
  issues: string[];
  suggestions: string[];
}> {
  const issues: string[] = [];
  const suggestions: string[] = [];

  // Check if environment variables are set
  const url = import.meta.env.VITE_UPSTASH_REDIS_REST_URL;
  const token = import.meta.env.VITE_UPSTASH_REDIS_REST_TOKEN;

  console.group('🔍 Redis Diagnostics');

  // Check configuration
  if (!url) {
    issues.push('VITE_UPSTASH_REDIS_REST_URL is not set');
    suggestions.push('Add VITE_UPSTASH_REDIS_REST_URL to your .env.local file');
  } else {
    console.log('✅ URL is set');
    
    if (!url.startsWith('https://')) {
      issues.push('Redis URL does not start with https://');
      suggestions.push('Check that your URL is correct. Should look like: https://your-db.upstash.io');
    } else {
      console.log('✅ URL format looks correct');
    }
  }

  if (!token) {
    issues.push('VITE_UPSTASH_REDIS_REST_TOKEN is not set');
    suggestions.push('Add VITE_UPSTASH_REDIS_REST_TOKEN to your .env.local file');
  } else {
    console.log('✅ Token is set');
    
    if (token.length < 10) {
      issues.push('Redis token seems too short');
      suggestions.push('Check that you copied the full token from Upstash dashboard');
    } else {
      console.log('✅ Token length looks correct');
    }
  }

  const configured = isCacheEnabled();
  console.log(`Cache enabled: ${configured}`);

  let connected = false;

  // Test connection if configured
  if (configured) {
    try {
      console.log('Testing connection...');
      const stats = await getCacheStats();
      
      if (stats.enabled) {
        connected = true;
        console.log('✅ Successfully connected to Redis!');
        console.log(`   Keys in cache: ${stats.keyCount || 0}`);
      } else {
        issues.push('Cache is enabled but connection failed');
        suggestions.push('Check your network connection');
        suggestions.push('Verify credentials in Upstash dashboard');
      }
    } catch (error) {
      issues.push('Connection test failed: ' + (error instanceof Error ? error.message : 'Unknown error'));
      suggestions.push('Check browser console for detailed error');
      suggestions.push('Try restarting your dev server');
      suggestions.push('Verify your Upstash database is active (not paused)');
      console.error('Connection test error:', error);
    }
  } else {
    issues.push('Redis is not configured');
    suggestions.push('Set up Upstash Redis and add credentials to .env.local');
  }

  console.groupEnd();

  return {
    configured,
    connected,
    issues,
    suggestions
  };
}

/**
 * Test Redis connection with a simple operation
 */
export async function testRedisConnection(): Promise<boolean> {
  try {
    // Try to get a test key
    const { getFromCache, setInCache } = await import('../lib/redis');
    
    const testKey = 'test:connection';
    const testValue = { test: true, timestamp: Date.now() };
    
    console.log('🧪 Testing Redis write...');
    const writeSuccess = await setInCache(testKey, testValue, 60);
    
    if (!writeSuccess) {
      console.error('❌ Write test failed');
      return false;
    }
    
    console.log('✅ Write test passed');
    console.log('🧪 Testing Redis read...');
    
    const readValue = await getFromCache(testKey);
    
    if (!readValue) {
      console.error('❌ Read test failed');
      return false;
    }
    
    console.log('✅ Read test passed');
    console.log('✅ Redis is working correctly!');
    
    return true;
  } catch (error) {
    console.error('❌ Connection test failed:', error);
    return false;
  }
}

/**
 * Export as window function for easy console access
 */
if (typeof window !== 'undefined') {
  (window as any).diagnoseRedis = diagnoseRedis;
  (window as any).testRedisConnection = testRedisConnection;
  
  console.log('💡 Redis diagnostics loaded!');
  console.log('   Run these in console:');
  console.log('   - diagnoseRedis()');
  console.log('   - testRedisConnection()');
}


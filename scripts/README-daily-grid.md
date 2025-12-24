# Daily PokéGrid Generation Automation

This document outlines the automated daily grid generation setup for the PokéGrid Challenge.

## Overview

The PokéGrid Challenge requires a new puzzle grid to be generated every day. This can be automated using several methods:

## 🎯 Automation Options

### 1. **Netlify Scheduled Functions** (Recommended)

**Files:**
- `netlify/functions/daily-pokegrid.js` - Scheduled function
- `netlify.toml` - Schedule configuration

**Setup:**
- Automatically runs at 2 AM UTC daily
- No external services required
- Integrated with your existing Netlify deployment

**Configuration in `netlify.toml`:**
```toml
[[schedule]]
  cron = "0 2 * * *"
  function = "daily-pokegrid"
```

### 2. **GitHub Actions** (Free Alternative)

**File:** `.github/workflows/daily-pokegrid.yml`

**Setup:**
- Requires GitHub repository
- Runs on GitHub's infrastructure
- Needs repository secrets configured

**Required Secrets:**
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

### 3. **External Cron Service** (Flexible)

**File:** `scripts/trigger-daily-grid.js`

**Setup:**
Use services like:
- **cron-job.org** (free)
- **EasyCron** (paid)
- **GitHub Actions** (scheduled workflows)

**Usage:**
```bash
# Direct execution
node scripts/trigger-daily-grid.js

# Or call via HTTP
curl -X POST https://your-site.netlify.app/.netlify/functions/daily-pokegrid
```

## 🔧 Manual Testing

### Test Grid Generation
```bash
# Generate today's grid
node scripts/generate-daily-grids.mjs

# Generate specific date
node scripts/generate-daily-grids.mjs 2025-12-25

# Generate multiple days
node scripts/generate-daily-grids.mjs 7
```

### Test Supabase Edge Function
```bash
# Generate today's grid
curl -X POST "https://your-project.supabase.co/functions/v1/pokegrid-scheduler?action=generate_daily" \
  -H "Authorization: Bearer YOUR_ANON_KEY"

# Check status
curl "https://your-project.supabase.co/functions/v1/pokegrid-scheduler?action=get_daily_status" \
  -H "Authorization: Bearer YOUR_ANON_KEY"
```

### Test Netlify Function
```bash
# Trigger daily generation
curl -X POST https://your-site.netlify.app/.netlify/functions/daily-pokegrid
```

## 📊 Monitoring

### Check Generated Grids
```bash
# Query database directly
psql "postgresql://..." -c "SELECT grid_date, created_at FROM pokegrid_daily_configs ORDER BY grid_date DESC LIMIT 7;"

# Or use the status endpoint
curl "https://your-project.supabase.co/functions/v1/pokegrid-scheduler?action=get_daily_status"
```

### Logs
- **Netlify**: Check function logs in Netlify dashboard
- **GitHub Actions**: View workflow runs in Actions tab
- **Supabase**: Check Edge Function logs in Supabase dashboard

## 🚨 Troubleshooting

### Common Issues

1. **Grid Not Generated**
   - Check function logs for errors
   - Verify database permissions
   - Confirm environment variables

2. **Function Timeout**
   - Edge Functions have 30-second timeout
   - Netlify Functions have similar limits
   - Optimize constraint generation if needed

3. **Database Connection Issues**
   - Verify Supabase credentials
   - Check Row Level Security policies
   - Ensure service role key is available

### Recovery
```bash
# Generate missing grids manually
for i in {1..7}; do
  date=$(date -d "$i days ago" +%Y-%m-%d)
  echo "Generating grid for $date"
  node scripts/generate-daily-grids.mjs $date
done
```

## 🔐 Security Considerations

- Store API keys as environment variables/secrets
- Use service role key for Edge Functions (backend operations)
- Anon key for client-side operations
- Rotate keys regularly
- Monitor for unauthorized access

## 📈 Scaling Considerations

- Current implementation generates one grid per day
- Constraint generation is lightweight (< 1 second)
- Database operations are minimal
- Can easily scale to multiple grids or different difficulties

## 🎯 Best Practices

1. **Monitor Daily**: Check that grids are generated successfully
2. **Test Weekly**: Run manual generation to ensure scripts work
3. **Backup Plan**: Have manual generation capability
4. **Alert on Failures**: Set up notifications for generation failures
5. **Log Everything**: Comprehensive logging for debugging

# Redis Troubleshooting Guide

This guide helps you diagnose and fix Redis configuration issues for PingBuoy rate limiting.

## 🚀 Quick Start

### 1. Test Your Configuration
```bash
# Run the automated Redis test
npm run test:redis

# Or check health status while app is running
npm run health:redis
```

### 2. Check Console Messages
When you start your development server, you'll see helpful messages:

```
🚀 PingBuoy Startup Validation

🔍 Validating Redis Rate Limiting Configuration...
✅ Redis connected successfully (45ms latency)
📊 Redis validation complete

✅ All startup validations passed!
```

## ❌ Common Error Messages & Solutions

### "Redis Rate Limiting Configuration Error"

**Error Message:**
```
❌ Redis Rate Limiting Configuration Error:
  • Missing UPSTASH_REDIS_REST_URL environment variable
  • Missing UPSTASH_REDIS_REST_TOKEN environment variable

💡 Quick Fix:
  • Add UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN to your environment variables
  • Get free Redis: https://upstash.com (10,000 requests/day free)
  • See setup guide: REDIS_RATE_LIMITING.md in your project
```

**Solution:**
1. Go to https://upstash.com
2. Create a free account
3. Create a new Redis database
4. Copy the credentials to your `.env.local`:
   ```bash
   UPSTASH_REDIS_REST_URL=https://your-database.upstash.io
   UPSTASH_REDIS_REST_TOKEN=your_token_here
   ```

---

### "🔍 Redis DNS resolution failed - check UPSTASH_REDIS_REST_URL"

**Cause:** The Redis URL is incorrect or unreachable

**Solutions:**
1. **Check your URL:** Make sure it starts with `https://` and ends with `.upstash.io`
2. **Verify in dashboard:** Copy the URL directly from your Upstash dashboard
3. **Network issues:** Try accessing the URL in your browser - you should see a Redis error message

**Example of correct URL:**
```bash
UPSTASH_REDIS_REST_URL=https://us1-fond-kite-12345.upstash.io
```

---

### "🔑 Redis authentication failed - check UPSTASH_REDIS_REST_TOKEN"

**Cause:** The Redis token is incorrect or expired

**Solutions:**
1. **Copy the token again:** Get it from your Upstash dashboard under "REST API"
2. **Check for whitespace:** Make sure there are no spaces or line breaks in the token
3. **Regenerate token:** In Upstash dashboard, you can generate a new token if needed

**Example of correct token:**
```bash
UPSTASH_REDIS_REST_TOKEN=AXGlCXXXXXXXXXXXXXXXXXXX
```

---

### "🔌 Redis connection refused - server may be down"

**Cause:** Redis server is not running or unreachable

**Solutions:**
1. **Check Upstash status:** Visit the Upstash dashboard to see if your database is running
2. **Try a different region:** Create a new database in a different region if needed
3. **Network/firewall:** Check if your network blocks the connection

---

### "⏱️ Redis connection timeout - server may be overloaded"

**Cause:** Redis server is slow to respond

**Solutions:**
1. **Try again:** Temporary network or server issues
2. **Check your plan:** Free tier has some limitations
3. **Consider upgrading:** If you need higher performance
4. **Regional latency:** Try a database closer to your location

---

## 🔧 Development vs Production Behavior

### Development Mode
- **Fails Open:** If Redis is not configured, rate limiting is disabled
- **Warnings:** Shows helpful warnings and setup instructions
- **Continues Running:** Application doesn't stop due to Redis issues

### Production Mode
- **Fails Closed:** Redis configuration is required
- **Stops on Error:** Application exits if Redis cannot be configured
- **Security First:** No fallback to allow all requests

## 🛠️ Debugging Tools

### 1. Configuration Validator
```bash
node scripts/test-redis.js
```
**Output:**
```
🔍 Testing Redis Configuration for PingBuoy Rate Limiting

📋 Step 1: Validating Environment Variables
✅ Configuration is valid!
📡 Provider: upstash

❤️  Step 2: Testing Redis Connection
✅ Connected successfully!
⚡ Latency: 42ms

⚡ Step 3: Testing Rate Limiting Functionality
  Request 1: ✅ Allowed (4 remaining)
  Request 2: ✅ Allowed (3 remaining)
  Request 3: ✅ Allowed (2 remaining)

🎉 All tests passed! Redis rate limiting is working correctly.
```

### 2. Health Check API
**While your app is running:**
```bash
curl http://localhost:4000/api/health/redis
```

**Example Response:**
```json
{
  "timestamp": "2024-01-15T10:30:00.000Z",
  "status": "healthy",
  "redis": {
    "configured": true,
    "connected": true,
    "provider": "upstash",
    "latency": 45
  },
  "rate_limiting": {
    "status": "active",
    "fallback_mode": "enforced"
  }
}
```

### 3. Console Logging
**Enable detailed logs:**
```bash
DEBUG=redis:* npm run dev
```

## 📊 Understanding Error Codes

| Status Code | Meaning | Action |
|-------------|---------|---------|
| 200 | ✅ Healthy | Everything working |
| 200 + warnings | ⚠️ Degraded | Check warnings, may need attention |
| 503 | ❌ Service Unavailable | Redis down, fix immediately |
| 500 | 💥 Internal Error | Check logs, restart may be needed |

## 🆘 Still Having Issues?

### Environment Variables Checklist
```bash
# Check your .env.local file contains:
UPSTASH_REDIS_REST_URL=https://...
UPSTASH_REDIS_REST_TOKEN=...

# Verify they're loaded:
node -e "console.log(process.env.UPSTASH_REDIS_REST_URL)"
```

### Restart Everything
```bash
# Stop your dev server (Ctrl+C)
# Restart it
npm run dev

# Watch the startup messages carefully
```

### Create a New Redis Database
If all else fails:
1. Go to your Upstash dashboard
2. Delete the old database (if any)
3. Create a new one
4. Copy the new credentials
5. Update your `.env.local`
6. Restart your app

### Contact Support
- **Upstash Issues:** Contact Upstash support if their service is down
- **Code Issues:** Check the GitHub issues for PingBuoy
- **Configuration Help:** Review the REDIS_RATE_LIMITING.md documentation

## 📚 Additional Resources

- **Upstash Documentation:** https://docs.upstash.com/redis
- **Redis Rate Limiting Guide:** `REDIS_RATE_LIMITING.md` in your project
- **Environment Variables:** Check your hosting provider's documentation for setting env vars
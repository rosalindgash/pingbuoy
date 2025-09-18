# CORS Configuration for Supabase Functions

This document outlines the secure CORS (Cross-Origin Resource Sharing) configuration for PingBuoy Supabase Edge Functions.

## 🔒 Security Overview

The CORS configuration has been updated to use **exact domain matching** instead of wildcards for enhanced security:

- ❌ **Before**: `Access-Control-Allow-Origin: *` (accepts any domain)
- ✅ **After**: `Access-Control-Allow-Origin: https://yourdomain.com` (exact match only)

## 📝 Environment Variables

### Required Configuration

Add these environment variables to your Supabase project:

```bash
# Production domains (comma-separated, no wildcards)
ALLOWED_ORIGINS=https://pingbuoy.com,https://www.pingbuoy.com,https://app.pingbuoy.com

# Development (include your local development URLs)
# ALLOWED_ORIGINS=http://localhost:3000,http://localhost:4000,https://pingbuoy.com
```

### Environment-Specific Examples

#### **Production**
```bash
ALLOWED_ORIGINS=https://pingbuoy.com,https://www.pingbuoy.com
```

#### **Staging**
```bash
ALLOWED_ORIGINS=https://staging.pingbuoy.com,https://pingbuoy-staging.vercel.app
```

#### **Development**
```bash
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:4000,http://127.0.0.1:3000,http://127.0.0.1:4000
```

#### **Mixed (Development + Production)**
```bash
ALLOWED_ORIGINS=http://localhost:4000,https://pingbuoy.com,https://www.pingbuoy.com
```

## 🛡️ Security Features

### 1. **Exact Origin Matching**
- No wildcards (*) allowed in production
- Each origin must be explicitly listed
- Automatic validation of origin format

### 2. **Environment-Aware Defaults**
- **Production**: Only HTTPS domains allowed
- **Development**: HTTP localhost allowed
- **Automatic detection** of deployment environment

### 3. **Request Validation**
- Origin header validation on every request
- Preflight (OPTIONS) request handling
- Automatic CORS header injection

### 4. **Error Handling**
- Clear error messages for invalid origins
- Graceful fallback to secure defaults
- Detailed logging of blocked requests

## 🔧 Implementation Details

### Supabase Functions Updated

1. **`uptime-monitor`** - Now uses secure CORS
2. **`dead-link-scanner`** - Now uses secure CORS
3. **`send-email`** - Now uses secure CORS

### CORS Headers Applied

```http
Access-Control-Allow-Origin: https://yourdomain.com
Access-Control-Allow-Headers: authorization, x-client-info, apikey, content-type, x-requested-with
Access-Control-Allow-Methods: POST, OPTIONS
Access-Control-Max-Age: 86400
Vary: Origin
```

### Security Validations

```typescript
// ✅ Valid origins
"https://pingbuoy.com"
"https://www.pingbuoy.com"
"http://localhost:4000" // development only

// ❌ Invalid origins (blocked)
"*"                     // wildcard
"http://evil.com"       // not in allowlist
"https://subdomain.evil.com" // not in allowlist
"http://pingbuoy.com"   // HTTP in production
```

## 🚨 Common Security Errors

### Error: "Wildcard (*) detected in ALLOWED_ORIGINS"

**Cause**: Using `*` in ALLOWED_ORIGINS
```bash
# ❌ Insecure
ALLOWED_ORIGINS=*
```

**Solution**: Use exact domains
```bash
# ✅ Secure
ALLOWED_ORIGINS=https://pingbuoy.com,https://www.pingbuoy.com
```

### Error: "CORS policy violation"

**Cause**: Request from non-allowed origin

**Check**:
1. Verify the requesting domain is in ALLOWED_ORIGINS
2. Ensure HTTPS is used in production
3. Check for typos in domain names

### Warning: "HTTP origins allowed in production"

**Cause**: Using HTTP in production environment

**Fix**: Use HTTPS for all production origins
```bash
# ❌ Insecure in production
ALLOWED_ORIGINS=http://pingbuoy.com

# ✅ Secure
ALLOWED_ORIGINS=https://pingbuoy.com
```

## 🔍 Testing CORS Configuration

### 1. **Check Current Configuration**

```bash
# Test from browser console on your website
fetch('https://your-project.supabase.co/functions/v1/uptime-monitor', {
  method: 'OPTIONS',
  headers: {
    'Origin': 'https://yourdomain.com'
  }
}).then(r => console.log('CORS Status:', r.status))
```

### 2. **Validate Environment Variables**

In Supabase dashboard → Settings → Edge Functions → Environment Variables:
- Verify `ALLOWED_ORIGINS` is set
- Check for typos in domain names
- Ensure no trailing slashes

### 3. **Test Different Origins**

```javascript
// Should succeed
fetch('https://your-project.supabase.co/functions/v1/uptime-monitor', {
  headers: { 'Origin': 'https://yourdomain.com' }
})

// Should fail (403)
fetch('https://your-project.supabase.co/functions/v1/uptime-monitor', {
  headers: { 'Origin': 'https://evil.com' }
})
```

## 🚀 Deployment Steps

### 1. **Update Environment Variables**

In Supabase Dashboard:
1. Go to Settings → Edge Functions
2. Add/update `ALLOWED_ORIGINS`
3. Use your exact production domain(s)

### 2. **Deploy Updated Functions**

```bash
# Deploy all functions with new CORS config
supabase functions deploy uptime-monitor
supabase functions deploy dead-link-scanner
supabase functions deploy send-email
```

### 3. **Verify Deployment**

1. Test from your production website
2. Check browser network tab for CORS headers
3. Verify blocked origins return 403

## 🌐 Multi-Domain Setup

### Example: Multiple Domains

```bash
# Support multiple domains and subdomains
ALLOWED_ORIGINS=https://pingbuoy.com,https://www.pingbuoy.com,https://app.pingbuoy.com,https://dashboard.pingbuoy.com
```

### Example: Development + Production

```bash
# Allow development and production simultaneously
ALLOWED_ORIGINS=http://localhost:4000,https://pingbuoy.com,https://app.pingbuoy.com
```

## 📊 Monitoring and Alerts

### Log Messages to Watch For

**✅ Success**:
```
✅ CORS configured for 2 origins: ["https://pingbuoy.com", "https://www.pingbuoy.com"]
```

**⚠️ Warnings**:
```
⚠️ CORS: Origin not allowed: https://evil.com
⚠️ CORS: Preflight blocked for origin: https://unauthorized.com
```

**❌ Errors**:
```
❌ Wildcard (*) detected in ALLOWED_ORIGINS - this is insecure!
❌ No valid origins found in ALLOWED_ORIGINS
```

### Set Up Monitoring

1. **Supabase Logs**: Monitor Edge Function logs for CORS blocks
2. **Browser Console**: Check for CORS errors in production
3. **Application Monitoring**: Track failed requests due to CORS

## 🔄 Migration Checklist

### Before Deployment

- [ ] Update `ALLOWED_ORIGINS` environment variable
- [ ] Remove any wildcard (*) origins
- [ ] Use HTTPS for production domains
- [ ] Include all legitimate subdomains
- [ ] Test CORS configuration locally

### After Deployment

- [ ] Verify functions deploy successfully
- [ ] Test from production website
- [ ] Check browser network tab for correct CORS headers
- [ ] Confirm unauthorized origins are blocked
- [ ] Monitor logs for any CORS-related errors

## 🆘 Troubleshooting

### "Function not working after CORS update"

1. **Check ALLOWED_ORIGINS**: Ensure your domain is listed exactly
2. **Protocol mismatch**: Use HTTPS in production
3. **Subdomain issues**: Add both `domain.com` and `www.domain.com`
4. **Trailing slashes**: Remove trailing slashes from domains

### "Still seeing wildcard in headers"

1. **Clear cache**: Hard refresh browser cache
2. **Function redeployment**: Redeploy the specific function
3. **Environment propagation**: Wait a few minutes for changes to propagate

### "CORS working in development but not production"

1. **Environment variables**: Different environments may have different ALLOWED_ORIGINS
2. **HTTPS requirement**: Production domains must use HTTPS
3. **Domain verification**: Double-check the exact production domain

## 📚 Additional Resources

- [MDN CORS Documentation](https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS)
- [Supabase Edge Functions CORS](https://supabase.com/docs/guides/functions/cors)
- [CORS Best Practices](https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS#best_practices)
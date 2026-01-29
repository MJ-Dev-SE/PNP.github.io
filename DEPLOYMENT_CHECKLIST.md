# 🚀 DEPLOYMENT SECURITY CHECKLIST

## Pre-Deployment Tasks

### 1. Environment Setup

- [ ] Create `.env.local` file (copy from `.env.example`)
- [ ] Add real Supabase URL to `VITE_SUPABASE_URL`
- [ ] Add real Supabase Anon Key to `VITE_SUPABASE_ANON_KEY`
- [ ] Set `VITE_ENV=production`
- [ ] Verify `.env.local` is in `.gitignore` (never commit!)
- [ ] Never store `.env.local` in version control

### 2. Code Review

- [ ] Check for hardcoded API keys or secrets
- [ ] Review all `console.log()` statements (removed in production)
- [ ] Verify no `localStorage` without `secureStorageSet()`
- [ ] Check all user input uses `sanitizeInput()` or validation functions
- [ ] Ensure all forms use `getCSRFToken()`
- [ ] Verify rate limiting on sensitive operations

### 3. Build Configuration

- [ ] Run `npm run lint` - fix any errors/warnings
- [ ] Run `npm run build` - build completes without errors
- [ ] Verify `vite.config.ts` has:
  - [ ] `minify: 'terser'` enabled
  - [ ] `sourcemap: false` (no source maps in production)
  - [ ] `drop_console: true` (removes console statements)
  - [ ] `mangle: true` (obfuscates variable names)

### 4. Test Build Output

- [ ] Open build output directory (`dist/`)
- [ ] Check `.js` files are minified (very small, unreadable)
- [ ] Open Network tab in DevTools → view `.js` file
- [ ] Verify code is completely unreadable (gibberish like `a()`, `b()`)
- [ ] Check no `.map` files exist (source maps removed)
- [ ] Verify build size is reasonable

### 5. Security Headers Verification

- [ ] Open `index.html` in browser
- [ ] View page source (`Ctrl+U` during development)
- [ ] Verify all security `<meta>` tags present:
  - [ ] `Content-Security-Policy` meta tag exists
  - [ ] `X-Frame-Options` set to SAMEORIGIN
  - [ ] `X-Content-Type-Options` set to nosniff
  - [ ] `X-XSS-Protection` set to 1; mode=block
  - [ ] `Permissions-Policy` present

### 6. DevTools Protection Testing

- [ ] Press F12 → Should NOT open DevTools
- [ ] Press Ctrl+Shift+I → Should be blocked
- [ ] Press Ctrl+Shift+J → Should be blocked
- [ ] Press Ctrl+Shift+C → Should be blocked
- [ ] Right-click → Context menu should NOT appear
- [ ] Ctrl+U (View Source) → Should be blocked

### 7. Security Feature Testing

#### Test CSP (Content Security Policy)

```javascript
// In browser console, try:
// This should be blocked by CSP
<img src=x onerror="alert('XSS')">
// Expected: Nothing happens, no alert
```

#### Test XSS Prevention

- [ ] Enter `<script>alert('test')</script>` in any input
- [ ] Expected: Displayed as text, not executed
- [ ] Check Network → No additional requests made

#### Test CSRF Protection

- [ ] Inspect Network tab
- [ ] Submit any form
- [ ] Expected: `X-CSRF-Token` header present in request

#### Test Rate Limiting

- [ ] Attempt login 6 times rapidly
- [ ] Expected: 5th attempt succeeds, 6th+ blocked with "Too many attempts" message

#### Test Input Validation

- [ ] Try invalid email format → Error message
- [ ] Try invalid phone format → Error message
- [ ] Try special characters → Sanitized or blocked

### 8. Database & API Security

- [ ] Enable authentication on all Supabase endpoints
- [ ] Enable Row Level Security (RLS) on all tables
- [ ] Verify API keys have minimal required permissions
- [ ] Check no sensitive data in API responses
- [ ] Verify rate limiting on backend API endpoints
- [ ] Enable HTTPS for all API calls

### 9. Sensitive Data Audit

- [ ] Search codebase for "password" → no hardcoded passwords
- [ ] Search for "key" → no hardcoded API keys
- [ ] Search for "secret" → no hardcoded secrets
- [ ] Search for "token" → no hardcoded tokens
- [ ] Verify all secrets loaded from `.env` variables

### 10. Performance & Monitoring

- [ ] Check page load time (<3 seconds ideal)
- [ ] Verify bundle size is reasonable (<500KB ideal)
- [ ] Test on slow 3G network
- [ ] Test on mobile devices
- [ ] Set up error logging (Sentry, LogRocket, etc.)
- [ ] Set up security monitoring alerts

### 11. Browser Compatibility

- [ ] Test in Chrome (latest)
- [ ] Test in Firefox (latest)
- [ ] Test in Safari (latest)
- [ ] Test in Edge (latest)
- [ ] Test in mobile browsers (iOS Safari, Chrome Mobile)
- [ ] Verify security features work in all browsers

### 12. SSL/TLS Certificate

- [ ] Verify HTTPS enabled on domain
- [ ] Check SSL certificate is valid (not expired)
- [ ] Verify SSL grade is A or higher (ssllabs.com)
- [ ] Enable HSTS header on server
- [ ] Redirect all HTTP traffic to HTTPS

### 13. Content Delivery Network (CDN)

- [ ] Set up CDN for static assets (CloudFlare, AWS CloudFront, etc.)
- [ ] Enable caching headers
- [ ] Verify all assets served over HTTPS
- [ ] Test cache invalidation works after deployment

### 14. Backup & Disaster Recovery

- [ ] Verify database backups are automatic
- [ ] Test backup restoration process
- [ ] Document recovery procedures
- [ ] Store backup copies in multiple locations
- [ ] Test data integrity after restoration

### 15. Logging & Monitoring

- [ ] Set up server-side logging
- [ ] Log all authentication attempts
- [ ] Log all data modifications
- [ ] Log all failed validation attempts
- [ ] Set up alerts for suspicious activity
- [ ] Monitor error rates and performance

### 16. Final Security Scan

- [ ] Run OWASP ZAP security scan
- [ ] Run Snyk security audit
- [ ] Check npm dependencies for vulnerabilities: `npm audit`
- [ ] Fix critical vulnerabilities before deploying
- [ ] Document all known vulnerabilities and risk levels

### 17. Post-Deployment Validation

#### Test in Production

- [ ] Access production URL
- [ ] Test login functionality
- [ ] Test data CRUD operations (Create, Read, Update, Delete)
- [ ] Test in incognito/private mode (clear cache)
- [ ] Verify DevTools blocking works in production
- [ ] Check Network tab shows minified code

#### Monitor for Issues

- [ ] Check error logs for unusual activity
- [ ] Monitor for failed authentication attempts
- [ ] Watch for 4xx/5xx HTTP errors
- [ ] Verify response times are acceptable
- [ ] Check that CSRF tokens are being generated
- [ ] Monitor rate limit effectiveness

### 18. Documentation

- [ ] Document deployment procedure
- [ ] Create runbook for emergency response
- [ ] Document how to roll back deployment
- [ ] Create security incident response plan
- [ ] Document security policies and procedures
- [ ] Train team on security best practices

---

## Security Checklist Summary

### Code Minification

```bash
npm run build
# Verify in dist/ directory:
# - All .js files are minified
# - No .js.map files exist (source maps)
# - No original source code readable
```

### Environment Variables

```bash
# Before deployment:
cp .env.example .env.local
# Edit .env.local with real credentials
# Add to .gitignore:
.env.local
.env
.env*.local
```

### Security Headers

```html
<!-- In index.html, verify these exist: -->
<meta http-equiv="Content-Security-Policy" content="..." />
<meta http-equiv="X-Frame-Options" content="SAMEORIGIN" />
<meta http-equiv="X-Content-Type-Options" content="nosniff" />
<meta http-equiv="X-XSS-Protection" content="1; mode=block" />
<meta http-equiv="Permissions-Policy" content="..." />
```

### Test DevTools Blocking

```
F12          → Blocked ❌
Ctrl+Shift+I → Blocked ❌
Ctrl+Shift+J → Blocked ❌
Ctrl+Shift+C → Blocked ❌
Right-click  → Blocked ❌
Ctrl+U       → Blocked ❌
```

---

## Common Issues & Solutions

### Issue: DevTools still opens

**Solution:** Verify code in `src/main.tsx` has DevTools blocking enabled

### Issue: CSRF token errors

**Solution:** Ensure `X-CSRF-Token` header is sent with every POST/DELETE request

### Issue: Minified code still readable

**Solution:** Check `mangle: true` in vite.config.ts terserOptions

### Issue: Environment variables not loading

**Solution:** Check `.env.local` exists and variables start with `VITE_` prefix

### Issue: CSS/images not loading after build

**Solution:** Check paths in index.html use `/` prefix for absolute paths

### Issue: CORS errors on API calls

**Solution:** Add API domain to CSP `connect-src` directive in index.html

---

## Quick Deployment Commands

```bash
# 1. Install dependencies
npm install

# 2. Lint code
npm run lint

# 3. Build for production
npm run build

# 4. Preview production build locally
npm run preview

# 5. Check for vulnerabilities
npm audit

# 6. Deploy dist/ folder to hosting
# (Vercel, Netlify, AWS, etc.)
```

---

## Hosting Recommendations

### Vercel (Recommended)

- ✅ Automatic HTTPS
- ✅ CSP headers support
- ✅ Edge caching
- ✅ Zero-config deployment
- ✅ Environment variables management
- Deploy: `vercel`

### Netlify

- ✅ Automatic HTTPS
- ✅ Custom headers
- ✅ Form handling
- ✅ Edge functions
- Deploy: `netlify deploy`

### AWS CloudFront + S3

- ✅ Global edge locations
- ✅ DDoS protection
- ✅ WAF integration
- ⚠️ Requires more configuration

### GitHub Pages

- ✅ Free hosting
- ✅ HTTPS included
- ⚠️ Limited to static sites
- Deploy: Auto from main branch

---

## Post-Deployment Checklist

- [ ] Website loads without errors
- [ ] All pages accessible
- [ ] DevTools blocked successfully
- [ ] Code is minified (unreadable)
- [ ] CSP headers present
- [ ] HTTPS enforced
- [ ] Forms submit successfully
- [ ] Authentication works
- [ ] Database operations work
- [ ] No console errors
- [ ] Performance acceptable
- [ ] Mobile view responsive
- [ ] Error logs monitored
- [ ] Security alerts configured
- [ ] Backup verified

---

## Emergency Response

If security breach detected:

1. **Isolate:** Take site offline if needed
2. **Assess:** Determine scope and impact
3. **Notify:** Alert users if data compromised
4. **Investigate:** Review logs for how breach occurred
5. **Patch:** Fix vulnerability immediately
6. **Deploy:** Redeploy fixed version
7. **Monitor:** Watch for subsequent attacks
8. **Report:** File incident report
9. **Follow-up:** Implement preventive measures

---

## Monthly Security Maintenance

- [ ] Run `npm audit` and update packages
- [ ] Review error logs for anomalies
- [ ] Check HTTPS certificate expiration date
- [ ] Verify backup integrity
- [ ] Test disaster recovery procedures
- [ ] Review access logs for suspicious activity
- [ ] Update security patches
- [ ] Rotate API keys if needed
- [ ] Review user permissions
- [ ] Audit database access logs

---

## Reference Files

- **Security Guide:** [SECURITY.md](SECURITY.md)
- **Security Summary:** [SECURITY_SUMMARY.md](SECURITY_SUMMARY.md)
- **Code Examples:** [SECURITY_EXAMPLES.tsx](SECURITY_EXAMPLES.tsx)
- **Security Utilities:** [src/utils/security.ts](src/utils/security.ts)
- **Vite Config:** [vite.config.ts](vite.config.ts)
- **HTML Headers:** [index.html](index.html)

---

## Questions?

Review the comprehensive security documentation in:

- `SECURITY.md` - Detailed technical explanations
- `SECURITY_SUMMARY.md` - High-level overview
- `SECURITY_EXAMPLES.tsx` - Code examples and usage

✅ **Your project is now production-ready with enterprise-level security!**

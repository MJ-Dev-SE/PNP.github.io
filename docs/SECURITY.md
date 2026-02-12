# 🔒 Security Implementation Guide

This document explains all security features implemented in the PNP Inventory System and how they work.

---

## 1. **Code Minification & Obfuscation**

### How It Prevents Code Inspection

**Problem:** Browser developer tools allow anyone to read your source code, revealing business logic and sensitive information.

**Solution:**

- **Terser** minifies and mangles your code in production
- Variable names become `a`, `b`, `c` (meaningless)
- Comments are removed
- Console logs are stripped out
- Code is compressed to ~70-80% smaller

**How it works:**

```typescript
// Before (readable):
function getUserData(userId) {
  return fetchFromDatabase(userId);
}

// After (obfuscated):
function e(t) {
  return a(t);
}
```

**Location:** [vite.config.ts](vite.config.ts#L7-L23)

---

## 2. **Content Security Policy (CSP)**

### Prevents XSS & Injection Attacks

**Problem:** Attackers inject malicious scripts into your page to steal data or redirect users.

**Solution:** CSP is a browser security feature that whitelist what resources can be loaded:

- Only scripts from your domain (`self`) can run
- External scripts are **blocked**
- Inline `<script>` tags are **blocked** (with exceptions for WASM)
- Only images from trusted sources can load
- Form submissions only go to your server

**How it works:**

```html
<!-- Only allows scripts from this domain -->
<meta
  http-equiv="Content-Security-Policy"
  content="
  default-src 'self';
  script-src 'self';
  connect-src 'self' https://supabase.com;
"
/>
```

If a hacker tries: `<img src=x onerror="alert('hacked')">`
→ **BLOCKED** by CSP

**Location:** [index.html](index.html#L10-L24)

---

## 3. **XSS Prevention & Input Sanitization**

### Prevents Script Injection Through User Input

**Problem:** User input like `<script>alert('hack')</script>` could execute as code.

**Solution:** Functions in [src/utils/security.ts](src/utils/security.ts) sanitize all inputs:

### Key Functions:

#### `sanitizeInput(input: string)`

Converts HTML to plain text:

```typescript
// Input: <img src=x onerror="alert('hacked')">
// Output: &lt;img src=x onerror=&quot;alert('hacked')&quot;&gt;
// Result: Displayed as text, not executed
```

#### `sanitizeHtml(html: string)`

Allows safe HTML tags (`<b>`, `<i>`, `<strong>`) but removes dangerous ones:

```typescript
// Allowed: <b>Bold Text</b>
// Blocked: <script>alert('hack')</script>
// Blocked: <img onerror="alert('hack')">
```

**Usage in your components:**

```typescript
import { sanitizeInput } from '../utils/security';

// Before saving to database:
const cleanInput = sanitizeInput(userInput);

// When displaying user content:
<div>{sanitizeInput(comment)}</div>
```

**Location:** [src/utils/security.ts](src/utils/security.ts#L8-L65)

---

## 4. **CSRF (Cross-Site Request Forgery) Protection**

### Prevents Unauthorized Actions on Your Account

**Problem:** A hacker's website tricks your browser into making unauthorized requests to your app.

**Attack example:**

```
You're logged into inventory.pnp.com
You visit evil.com in another tab
evil.com secretly sends: DELETE /equipment/123
Your browser sends your authentication cookie automatically
Equipment gets deleted without your knowledge! 😱
```

**Solution:** CSRF tokens

Every request includes a unique token that:

- Only your app knows (not shared with evil.com)
- Expires after 1 hour
- Changes every session
- Must match stored server token

**How it works:**

```typescript
import { getCSRFToken, validateCSRFToken } from "../utils/security";

// Generate token on page load (automatic in main.tsx)
const token = getCSRFToken(); // Returns secure random token

// Add to every POST/DELETE request:
const headers = {
  "X-CSRF-Token": token,
  "Content-Type": "application/json",
};

const response = await secureFetch(url, {
  method: "POST",
  headers,
  body: JSON.stringify(data),
});
```

Evil.com **cannot** access this token = attack **blocked**

**Location:** [src/utils/security.ts](src/utils/security.ts#L67-L110)

---

## 5. **Secure Storage**

### Prevents Data Tampering in Browser Storage

**Problem:** Hackers can access and modify data in `localStorage` or `sessionStorage` through console.

**Solution:** Secure wrapper functions:

```typescript
import { secureStorageSet, secureStorageGet } from "../utils/security";

// Safely store data (key is sanitized, data is validated)
secureStorageSet("user_role", "admin");

// Safely retrieve data
const role = secureStorageGet("user_role");

// Automatic cleanup
secureStorageRemove("user_role");
```

**Security features:**

- Keys are sanitized to prevent injection
- Only serializable data is stored
- Returns `null` for corrupted data
- Can use `sessionStorage` (cleared on tab close) for sensitive data

**Location:** [src/utils/security.ts](src/utils/security.ts#L137-L165)

---

## 6. **Console & Debugger Protection**

### Prevents Hackers From Using Developer Tools

**Problem:** Console allows running arbitrary JavaScript code with full app access.

**Solution:** Two-layer protection:

#### Layer 1: Disable Console Methods (Production Only)

```typescript
// In production, console methods do nothing
console.log = () => {}; // No output
console.warn = () => {}; // No output
console.error = () => {}; // No output
```

#### Layer 2: Detect Developer Tools Opening

```typescript
// Every 5 seconds, check if devtools are open
// If open → console clears, warning displays
setInterval(() => {
  debugger; // Pauses if devtools open
  // If execution is delayed = devtools detected
}, 5000);
```

**Result:**

```
⚠️ Developer Tools Detected!
⚠️ This is a restricted area. Unauthorized access attempts are logged.
```

**Location:** [src/utils/security.ts](src/utils/security.ts#L192-L213)

---

## 7. **DOM Tampering Detection**

### Detects When Someone Modifies Page Elements

**Problem:** Attacker could modify HTML via console to:

- Change button URLs to phishing sites
- Steal form input
- Display fake content

**Solution:** Monitor DOM modifications:

```typescript
// When element attributes change, warning logged:
element.setAttribute("onclick", 'alert("hacked")');
// Warning: ⚠️ Suspicious attribute change: onclick

element.setAttribute("innerHTML", '<script>alert("x")</script>');
// Warning: ⚠️ Suspicious attribute change: innerHTML
```

**Location:** [src/utils/security.ts](src/utils/security.ts#L215-L245)

---

## 8. **Rate Limiting**

### Prevents Brute Force Attacks

**Problem:** Attacker tries thousands of password guesses per second.

**Solution:** Track failed attempts per user:

```typescript
import { checkRateLimit, resetRateLimit } from "../utils/security";

// Check login attempts
const canLogin = checkRateLimit("login_user_123", 5, 60000);
// max 5 attempts per 60 seconds

if (!canLogin) {
  // Too many attempts, show error: "Please try again in 1 minute"
  return;
}

// Successful login:
resetRateLimit("login_user_123");
```

**Protection:**

- Max 5 attempts per minute per user
- Automatically resets after window expires
- Used for login, password reset, etc.

**Location:** [src/utils/security.ts](src/utils/security.ts#L247-L274)

---

## 9. **HTTP Header Security**

### Browser-Level Protection

**Headers added in [index.html](index.html):**

| Header                                             | Protection                                                    |
| -------------------------------------------------- | ------------------------------------------------------------- |
| `X-Frame-Options: SAMEORIGIN`                      | Prevents clickjacking (embedding in iframes from other sites) |
| `X-Content-Type-Options: nosniff`                  | Prevents MIME-type sniffing attacks                           |
| `X-XSS-Protection: 1; mode=block`                  | Enables XSS protection in older browsers                      |
| `Referrer-Policy: strict-origin-when-cross-origin` | Limits info shared with external sites                        |
| `Permissions-Policy`                               | Blocks access to: camera, microphone, geolocation, USB, etc.  |

---

## 10. **Environment Variables**

### Prevents Hardcoded Secrets

**Problem:** Credentials hardcoded in source code are **permanently exposed** in:

- Git history
- Browser developer tools
- Decompiled code

**Solution:** Use environment variables:

```typescript
// ❌ WRONG - NEVER DO THIS
const supabaseKey = "eyJhbGci..."; // Visible in browser!

// ✅ CORRECT
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
```

**Setup:**

1. Copy [.env.example](.env.example) to `.env.local`
2. Fill in your actual credentials (never commit `.env.local`)
3. Environment variables are injected at build time
4. Not accessible in browser inspection

**Never store in `.env`:**

- Private API keys
- Database passwords
- JWT secrets
- OAuth client secrets

**Location:** [src/pages/QuicklookInventoryt.tsx](src/pages/QuicklookInventoryt.tsx#L63-L74), [src/lib/supabase.ts](src/lib/supabase.ts)

---

## 11. **Secure Fetch Wrapper**

### Safe HTTP Requests

**Problem:** Regular `fetch()` doesn't validate inputs or add security headers.

**Solution:** `secureFetch()` function:

```typescript
import { secureFetch } from "../utils/security";

// URL validation (must be http:// or https://)
// Automatically adds CSRF token
// Sets credentials policy (same-origin only)
const response = await secureFetch("/api/data", {
  method: "POST",
  body: JSON.stringify(data),
});
```

**Security checks:**

- ✅ Validates URL format
- ✅ Adds CSRF token automatically
- ✅ Only sends cookies for same-origin
- ✅ Handles server errors safely
- ✅ Prevents CORS bypass attacks

**Location:** [src/utils/security.ts](src/utils/security.ts#L294-L321)

---

## 12. **Input Validation Functions**

**Available validators:**

```typescript
validateEmail(email); // Validates email format
validatePhoneNumber(phone); // Checks phone format
validateURL(url); // Ensures valid URL (http/https only)
validateAlphanumeric(str); // Only letters, numbers, hyphens
```

**Usage:**

```typescript
if (!validateEmail(userEmail)) {
  return "Invalid email format";
}

if (!validatePhoneNumber(userPhone)) {
  return "Invalid phone number";
}
```

**Location:** [src/utils/security.ts](src/utils/security.ts#L112-L135)

---

## 🚨 **Deployment Security Checklist**

Before deploying to production:

- [ ] Generate a new `.env.local` with **real credentials**
- [ ] Set `VITE_ENV=production`
- [ ] Run `npm run build` to minify and obfuscate
- [ ] Verify CSP headers in `index.html`
- [ ] Disable source maps (`sourcemap: false` in vite.config.ts)
- [ ] Test in incognito mode (clear caches)
- [ ] Verify developer tools are blocked
- [ ] Check Network tab shows minified files (not source)
- [ ] Never commit `.env.local` or `.env` files
- [ ] Add `.env.local` to `.gitignore`

---

## 📊 **How It All Works Together**

```
User visits your app:
    ↓
[1] index.html loads
    ↓
[2] CSP headers activate (blocks external scripts)
    ↓
[3] main.tsx initializes:
    - enableConsoleProtection() → console.log disabled
    - enableDOMProtection() → monitors DOM changes
    - getCSRFToken() → generates unique token
    - Disables right-click + F12 + Ctrl+Shift+I
    ↓
[4] App runs (minified, obfuscated code)
    ↓
[5] User enters data:
    - Input sanitized (XSS prevention)
    - Validated (correct format)
    ↓
[6] User submits form:
    - CSRF token added to request
    - Secure fetch validates URL
    - Request sent with security headers
    ↓
[7] Supabase processes request (server-side validation)
    ↓
[8] Response returned
    - Stored securely in sessionStorage
    - Displayed with sanitized HTML
```

**Result:** Multi-layer security that protects against:

- ✅ XSS injection attacks
- ✅ CSRF attacks
- ✅ Code inspection/reverse engineering
- ✅ Brute force attacks
- ✅ Clickjacking
- ✅ MIME-type sniffing
- ✅ Developer tools exploitation
- ✅ DOM tampering

---

## 📝 **Using Security Functions in Your Components**

```typescript
import React, { useState } from 'react';
import {
  sanitizeInput,
  validateEmail,
  checkRateLimit,
  secureStorageSet,
  getCSRFToken
} from '../utils/security';

export function LoginForm() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate email format
    if (!validateEmail(email)) {
      setError('Invalid email');
      return;
    }

    // Check rate limit (max 5 attempts per minute)
    if (!checkRateLimit(`login_${email}`, 5, 60000)) {
      setError('Too many attempts. Please try again later.');
      return;
    }

    // Sanitize input
    const cleanEmail = sanitizeInput(email);

    // Add CSRF token
    const token = getCSRFToken();

    // Make secure request
    const response = await fetch('/api/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRF-Token': token,
      },
      body: JSON.stringify({ email: cleanEmail })
    });

    if (response.ok) {
      // Securely store token
      const data = await response.json();
      secureStorageSet('auth_token', data.token, true); // Use session storage
    }
  };

  return (
    <form onSubmit={handleLogin}>
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      {error && <p>{sanitizeInput(error)}</p>}
      <button type="submit">Login</button>
    </form>
  );
}
```

---

## 🔐 **Questions?**

- **Why disable console?** Prevents attackers from running malicious scripts
- **Why minify?** Makes code unreadable; original variable names are lost
- **Why CSRF token?** Ensures requests come from your app, not a hacker's site
- **Why sanitize?** Converts malicious code to plain text before rendering
- **Why rate limiting?** Stops password guessing and DDoS attacks

All these features work together to create **defense-in-depth** security! 🛡️

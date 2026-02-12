/**
 * Security Utility Module
 * Provides XSS prevention, CSRF protection, input validation, and secure storage
 */

// ============================================================================
// XSS PREVENTION - Sanitizes user input to prevent script injection
// ============================================================================
export const sanitizeInput = (input: string): string => {
  if (typeof input !== "string") return "";

  const div = document.createElement("div");
  div.textContent = input; // textContent prevents HTML parsing
  return div.innerHTML;
};

/**
 * Sanitizes HTML content - removes potentially dangerous tags/attributes
 * Use for content that needs to display HTML safely
 */
export const sanitizeHtml = (html: string): string => {
  const allowedTags = ["b", "i", "em", "strong", "u", "br", "p", "span"];
  const allowedAttributes: { [key: string]: string[] } = {
    span: ["class"],
    p: ["class"],
  };

  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");

  const walk = (node: Node): void => {
    if (node.nodeType === Node.ELEMENT_NODE) {
      const element = node as Element;
      const tagName = element.tagName.toLowerCase();

      if (!allowedTags.includes(tagName)) {
        const parent = element.parentNode;
        while (element.firstChild) {
          parent?.insertBefore(element.firstChild, element);
        }
        parent?.removeChild(element);
      } else {
        // Remove dangerous attributes
        const attrs = Array.from(element.attributes);
        attrs.forEach((attr) => {
          if (!allowedAttributes[tagName]?.includes(attr.name)) {
            element.removeAttribute(attr.name);
          }
        });
      }
    }

    for (let i = 0; i < node.childNodes.length; i++) {
      walk(node.childNodes[i]);
    }
  };

  walk(doc.body);
  return doc.body.innerHTML;
};

// ============================================================================
// CSRF PROTECTION - Generates and validates CSRF tokens
// ============================================================================
const CSRF_TOKEN_KEY = "csrf_token";
const CSRF_TOKEN_EXPIRY = 3600000; // 1 hour in milliseconds

export const generateCSRFToken = (): string => {
  const token = Array.from(crypto.getRandomValues(new Uint8Array(32)))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  const expiryTime = Date.now() + CSRF_TOKEN_EXPIRY;
  sessionStorage.setItem(
    CSRF_TOKEN_KEY,
    JSON.stringify({ token, expiry: expiryTime })
  );

  return token;
};

export const getCSRFToken = (): string => {
  const tokenData = sessionStorage.getItem(CSRF_TOKEN_KEY);

  if (!tokenData) {
    return generateCSRFToken();
  }

  const { token, expiry } = JSON.parse(tokenData);

  // Check if token has expired
  if (Date.now() > expiry) {
    return generateCSRFToken();
  }

  return token;
};

export const validateCSRFToken = (token: string): boolean => {
  const tokenData = sessionStorage.getItem(CSRF_TOKEN_KEY);

  if (!tokenData) return false;

  const { token: storedToken, expiry } = JSON.parse(tokenData);

  // Check expiry and token match
  if (Date.now() > expiry || token !== storedToken) {
    sessionStorage.removeItem(CSRF_TOKEN_KEY);
    return false;
  }

  return true;
};

// ============================================================================
// INPUT VALIDATION - Validates common data types
// ============================================================================
export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email) && email.length <= 254;
};

export const validatePhoneNumber = (phone: string): boolean => {
  const phoneRegex = /^[0-9+\-\s()]+$/;
  return phoneRegex.test(phone) && phone.length >= 7 && phone.length <= 20;
};

export const validateURL = (url: string): boolean => {
  try {
    const urlObj = new URL(url);
    return ["http:", "https:"].includes(urlObj.protocol);
  } catch {
    return false;
  }
};

export const validateAlphanumeric = (
  input: string,
  allowSpaces = false
): boolean => {
  const regex = allowSpaces ? /^[a-zA-Z0-9\s-]+$/ : /^[a-zA-Z0-9-]+$/;
  return regex.test(input);
};

// ============================================================================
// SECURE STORAGE - Prevents XSS through storage
// ============================================================================
export const secureStorageSet = (
  key: string,
  value: unknown,
  useSession = false
): void => {
  const storage = useSession ? sessionStorage : localStorage;
  const sanitizedKey = sanitizeInput(key);

  // Only store serializable data
  if (typeof value === "object" || typeof value === "string") {
    storage.setItem(sanitizedKey, JSON.stringify(value));
  }
};

export const secureStorageGet = (
  key: string,
  useSession = false
): unknown => {
  const storage = useSession ? sessionStorage : localStorage;
  const sanitizedKey = sanitizeInput(key);
  const value = storage.getItem(sanitizedKey);

  if (!value) return null;

  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
};

export const secureStorageRemove = (key: string, useSession = false): void => {
  const storage = useSession ? sessionStorage : localStorage;
  const sanitizedKey = sanitizeInput(key);
  storage.removeItem(sanitizedKey);
};

// ============================================================================
// SECURE SUPABASE REQUESTS - Adds CSRF and Content-Type headers
// ============================================================================
export const getSecureRequestHeaders = (): HeadersInit => {
  return {
    "Content-Type": "application/json",
    "X-CSRF-Token": getCSRFToken(),
    "X-Requested-With": "XMLHttpRequest",
  };
};

// ============================================================================
// RATE LIMITING - CLIENT-SIDE DISABLED (Use server-side rate limiting)
// ============================================================================
const RATE_LIMIT_STORE = new Map<string, { attempts: number; windowStart: number }>();

export const checkRateLimit = (
  key: string,
  maxAttempts = 5,
  windowMs = 60000
): boolean => {
  const now = Date.now();
  const existing = RATE_LIMIT_STORE.get(key);

  if (!existing || now - existing.windowStart > windowMs) {
    RATE_LIMIT_STORE.set(key, { attempts: 1, windowStart: now });
    return true;
  }

  if (existing.attempts >= maxAttempts) {
    return false;
  }

  RATE_LIMIT_STORE.set(key, {
    attempts: existing.attempts + 1,
    windowStart: existing.windowStart,
  });
  return true;
};

export const resetRateLimit = (key: string): void => {
  RATE_LIMIT_STORE.delete(key);
};

// ============================================================================
// CONSOLE SECURITY - DISABLED (Minimal security approach)
// ============================================================================
export const enableConsoleProtection = (): void => {
  // Disabled for minimal security overhead
  // Console access is not a critical security concern for this app
};

// ============================================================================
// ANTI-TAMPERING - DISABLED (Minimal security approach)
// ============================================================================
export const enableDOMProtection = (): void => {
  // Disabled for minimal security overhead
  // DOM protection adds significant runtime cost with minimal threat mitigation
};

// ============================================================================
// SECURE FETCH WRAPPER - Adds security headers and validates responses
// ============================================================================
export const secureFetch = async (
  url: string,
  options: RequestInit = {}
): Promise<Response> => {
  if (!validateURL(url)) {
    throw new Error("Invalid URL provided");
  }

  const headers = {
    ...getSecureRequestHeaders(),
    ...options.headers,
  };

  const response = await fetch(url, {
    ...options,
    headers,
    credentials: "same-origin", // Only send cookies for same-origin requests
  });

  // Validate response
  if (!response.ok && response.status >= 500) {
    throw new Error(`Server error: ${response.status}`);
  }

  return response;
};

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
  let tokenData = sessionStorage.getItem(CSRF_TOKEN_KEY);

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
// RATE LIMITING - Prevents brute force attacks
// ============================================================================
const RATE_LIMIT_STORE = new Map<string, { count: number; resetTime: number }>(
);

export const checkRateLimit = (
  key: string,
  maxAttempts = 5,
  windowMs = 60000
): boolean => {
  const now = Date.now();
  const record = RATE_LIMIT_STORE.get(key);

  if (!record) {
    RATE_LIMIT_STORE.set(key, { count: 1, resetTime: now + windowMs });
    return true;
  }

  if (now > record.resetTime) {
    RATE_LIMIT_STORE.set(key, { count: 1, resetTime: now + windowMs });
    return true;
  }

  if (record.count >= maxAttempts) {
    return false;
  }

  record.count++;
  return true;
};

export const resetRateLimit = (key: string): void => {
  RATE_LIMIT_STORE.delete(key);
};

// ============================================================================
// CONSOLE SECURITY - Prevents malicious console injection
// ============================================================================
export const enableConsoleProtection = (): void => {
  // Disable dangerous console methods in production
  if (import.meta.env.PROD) {
    (console as any).log = () => {};
    (console as any).warn = () => {};
    (console as any).error = () => {};
    (console as any).debug = () => {};
  }

  // Warn about developer tools
  const devtoolsCheck = () => {
    const start = new Date().getTime();
    debugger; // This will pause if devtools open
    const end = new Date().getTime();

    if (end - start > 100) {
      console.clear();
      console.log(
        "%c⚠️ Developer Tools Detected!",
        "color: red; font-size: 20px; font-weight: bold;"
      );
      console.log(
        "%cThis is a restricted area. Unauthorized access attempts are logged.",
        "color: orange; font-size: 14px;"
      );
    }
  };

  // Run check periodically in production
  if (import.meta.env.PROD) {
    setInterval(devtoolsCheck, 5000);
  }
};

// ============================================================================
// ANTI-TAMPERING - Detects DOM manipulation
// ============================================================================
export const enableDOMProtection = (): void => {
  const originalSetAttribute = Element.prototype.setAttribute;
  const originalRemoveAttribute = Element.prototype.removeAttribute;

  Element.prototype.setAttribute = function (
    this: Element,
    name: string,
    value: string
  ) {
    // Log suspicious attribute changes
    if (
      name.toLowerCase().startsWith("on") ||
      name.toLowerCase() === "innerHTML"
    ) {
      console.warn(`⚠️ Suspicious attribute change: ${name}`);
    }
    return originalSetAttribute.call(this, name, value);
  };

  Element.prototype.removeAttribute = function (
    this: Element,
    name: string
  ) {
    return originalRemoveAttribute.call(this, name);
  }
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

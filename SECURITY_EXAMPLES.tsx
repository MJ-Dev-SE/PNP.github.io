/**
 * PRACTICAL EXAMPLES: How to Use Security Functions in Your Code
 * Copy & paste these examples into your React components
 */

import React, { useState, useEffect } from "react";
import {
  sanitizeInput,
  validateEmail,
  checkRateLimit,
  getCSRFToken,
  secureFetch,
  sanitizeHtml,
  validateAlphanumeric,
  validatePhoneNumber,
  secureStorageSet,
  secureStorageGet,
  secureStorageRemove,
} from "./src/utils/security";

// ============================================================================
// EXAMPLE 1: SECURE LOGIN FORM
// ============================================================================

export function SecureLoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      // Step 1: Validate email format
      if (!validateEmail(email)) {
        setError("Invalid email format");
        return;
      }

      // Step 2: Check rate limiting (max 5 attempts per minute)
      if (!checkRateLimit(`login_${email}`, 5, 60000)) {
        setError("Too many login attempts. Please try again in 1 minute.");
        return;
      }

      // Step 3: Sanitize inputs
      const cleanEmail = sanitizeInput(email);
      const cleanPassword = sanitizeInput(password);

      // Step 4: Get CSRF token
      const csrfToken = getCSRFToken();

      // Step 5: Make secure request
      const response = await secureFetch("/api/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-CSRF-Token": csrfToken,
        },
        body: JSON.stringify({
          email: cleanEmail,
          password: cleanPassword,
        }),
      });

      if (!response.ok) {
        throw new Error("Login failed");
      }

      console.log("Login successful");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleLogin}>
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Email"
        disabled={loading}
      />
      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Password"
        disabled={loading}
      />
      {error && <div className="error">{sanitizeInput(error)}</div>}
      <button type="submit" disabled={loading}>
        {loading ? "Logging in..." : "Login"}
      </button>
    </form>
  );
}

// ============================================================================
// EXAMPLE 2: DISPLAY USER COMMENTS SAFELY
// ============================================================================

interface Comment {
  id: number;
  author: string;
  text: string;
  html?: string;
}

export function CommentThread({ comments }: { comments: Comment[] }) {
  return (
    <div className="comments">
      {comments.map((comment) => (
        <div key={comment.id} className="comment">
          <strong>{sanitizeInput(comment.author)}</strong>
          <p>{sanitizeInput(comment.text)}</p>

          {comment.html && (
            <div
              dangerouslySetInnerHTML={{
                __html: sanitizeHtml(comment.html),
              }}
            />
          )}
        </div>
      ))}
    </div>
  );
}

// ============================================================================
// EXAMPLE 3: INVENTORY FORM WITH VALIDATION
// ============================================================================

interface FormData {
  equipment: string;
  serialNumber: string;
  station: string;
}

export function AddInventoryForm() {
  const [formData, setFormData] = useState<FormData>({
    equipment: "",
    serialNumber: "",
    station: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: sanitizeInput(value),
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, string> = {};

    if (!validateAlphanumeric(formData.equipment, true)) {
      newErrors.equipment =
        "Equipment name can only contain letters, numbers, and spaces";
    }

    if (!validateAlphanumeric(formData.serialNumber)) {
      newErrors.serialNumber =
        "Serial number can only contain letters, numbers, and hyphens";
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    if (!checkRateLimit("inventory_submit", 10, 60000)) {
      setErrors({ submit: "Too many submissions. Please wait a moment." });
      return;
    }

    try {
      const response = await secureFetch("/api/inventory/add", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-CSRF-Token": getCSRFToken(),
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        console.log("Equipment added successfully");
        setFormData({ equipment: "", serialNumber: "", station: "" });
      }
    } catch (err) {
      setErrors({ submit: "Failed to add equipment" });
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="text"
        name="equipment"
        value={formData.equipment}
        onChange={handleChange}
        placeholder="Equipment Name"
      />
      {errors.equipment && <span className="error">{errors.equipment}</span>}

      <input
        type="text"
        name="serialNumber"
        value={formData.serialNumber}
        onChange={handleChange}
        placeholder="Serial Number"
      />
      {errors.serialNumber && (
        <span className="error">{errors.serialNumber}</span>
      )}

      <button type="submit">Add Equipment</button>
      {errors.submit && <span className="error">{errors.submit}</span>}
    </form>
  );
}

// ============================================================================
// EXAMPLE 4: SECURE DATA STORAGE
// ============================================================================

export function AuthTokenManager() {
  const storeAuthToken = (token: string) => {
    secureStorageSet("auth_token", token, true);
  };

  const getAuthToken = () => {
    return secureStorageGet("auth_token", true);
  };

  const clearAuthToken = () => {
    secureStorageRemove("auth_token", true);
  };

  const storeUserPreferences = (prefs: { theme: string; language: string }) => {
    secureStorageSet("user_prefs", prefs, false);
  };

  const getUserPreferences = () => {
    return secureStorageGet("user_prefs", false);
  };

  return {
    storeAuthToken,
    getAuthToken,
    clearAuthToken,
    storeUserPreferences,
    getUserPreferences,
  };
}

// ============================================================================
// EXAMPLE 5: API REQUEST WITH SECURITY
// ============================================================================

interface EquipmentData {
  id: number;
  name: string;
  serialNumber: string;
  status: string;
}

export async function fetchEquipmentWithSecurity(): Promise<EquipmentData[]> {
  try {
    const response = await secureFetch("/api/equipment", {
      method: "GET",
      headers: {
        "X-CSRF-Token": getCSRFToken(),
      },
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const data = await response.json();

    const sanitizedData = data.map((item: EquipmentData) => ({
      ...item,
      name: sanitizeInput(item.name),
      serialNumber: sanitizeInput(item.serialNumber),
      status: sanitizeInput(item.status),
    }));

    return sanitizedData;
  } catch (error) {
    console.error("Failed to fetch equipment:", error);
    throw error;
  }
}

// ============================================================================
// EXAMPLE 6: DELETE OPERATION WITH RATE LIMITING
// ============================================================================

export async function deleteEquipment(equipmentId: number): Promise<boolean> {
  if (!checkRateLimit(`delete_${equipmentId}`, 5, 60000)) {
    throw new Error(
      "Too many delete requests. Please wait before trying again.",
    );
  }

  try {
    const response = await secureFetch(`/api/equipment/${equipmentId}`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        "X-CSRF-Token": getCSRFToken(),
      },
    });

    if (!response.ok) {
      throw new Error("Failed to delete equipment");
    }

    return true;
  } catch (error) {
    console.error("Delete error:", error);
    throw error;
  }
}

// ============================================================================
// EXAMPLE 7: SEARCH WITH SANITIZATION
// ============================================================================

export function EquipmentSearch() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<EquipmentData[]>([]);

  const handleSearch = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawQuery = e.target.value;
    const cleanQuery = sanitizeInput(rawQuery);
    setQuery(cleanQuery);

    if (cleanQuery.length < 2) {
      setResults([]);
      return;
    }

    try {
      const response = await secureFetch(
        `/api/equipment/search?q=${encodeURIComponent(cleanQuery)}`,
        {
          method: "GET",
          headers: {
            "X-CSRF-Token": getCSRFToken(),
          },
        },
      );

      const data = await response.json();

      const sanitizedResults = data.map((item: EquipmentData) => ({
        ...item,
        name: sanitizeInput(item.name),
      }));

      setResults(sanitizedResults);
    } catch (error) {
      console.error("Search error:", error);
    }
  };

  return (
    <div>
      <input
        type="text"
        value={query}
        onChange={handleSearch}
        placeholder="Search equipment..."
      />
      {results.map((item) => (
        <div key={item.id}>
          <h3>{item.name}</h3>
          <p>Serial: {item.serialNumber}</p>
          <p>Status: {item.status}</p>
        </div>
      ))}
    </div>
  );
}

// ============================================================================
// EXAMPLE 8: SECURE AUTHENTICATION
// ============================================================================

export function useSecureAuth() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const token = secureStorageGet("auth_token", true);
    setIsAuthenticated(!!token);
  }, []);

  const login = async (email: string, password: string) => {
    const token = "received_from_api";
    secureStorageSet("auth_token", token, true);
    setIsAuthenticated(true);
  };

  const logout = () => {
    secureStorageRemove("auth_token", true);
    setIsAuthenticated(false);
  };

  return { isAuthenticated, login, logout };
}

// ============================================================================
// EXAMPLE 9: FORM VALIDATION
// ============================================================================

export function StationReportForm() {
  const [formData, setFormData] = useState({
    contactEmail: "",
    contactPhone: "",
    stationName: "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateEmail(formData.contactEmail)) {
      alert("Invalid email address");
      return;
    }

    if (!validatePhoneNumber(formData.contactPhone)) {
      alert("Invalid phone number");
      return;
    }

    console.log("Form data valid, submitting...");
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="email"
        value={formData.contactEmail}
        onChange={(e) =>
          setFormData({
            ...formData,
            contactEmail: e.target.value,
          })
        }
        placeholder="Contact Email"
      />
      <input
        type="tel"
        value={formData.contactPhone}
        onChange={(e) =>
          setFormData({
            ...formData,
            contactPhone: e.target.value,
          })
        }
        placeholder="Contact Phone"
      />
      <button type="submit">Submit Report</button>
    </form>
  );
}

// ============================================================================
// EXAMPLE 10: SAFE DISPLAY OF ADMIN LOGS
// ============================================================================

interface AdminLog {
  id: number;
  action: string;
  userEmail: string;
  timestamp: string;
  details: string;
}

export function AdminLogs({ logs }: { logs: AdminLog[] }) {
  return (
    <table>
      <thead>
        <tr>
          <th>Action</th>
          <th>User</th>
          <th>Time</th>
          <th>Details</th>
        </tr>
      </thead>
      <tbody>
        {logs.map((log) => (
          <tr key={log.id}>
            <td>{sanitizeInput(log.action)}</td>
            <td>{sanitizeInput(log.userEmail)}</td>
            <td>{sanitizeInput(log.timestamp)}</td>
            <td>{sanitizeInput(log.details)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

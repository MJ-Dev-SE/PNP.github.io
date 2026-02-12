import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";

// IMPORTANT: this pulls in Tailwind
import "./index.css";

// ========== ERROR HANDLING ==========
window.addEventListener("error", (event) => {
  console.error("Global error:", event.error);
});

window.addEventListener("unhandledrejection", (event) => {
  console.error("Unhandled promise rejection:", event.reason);
});

// ========== SECURITY INITIALIZATION ==========
import {
  enableConsoleProtection,
  enableDOMProtection,
  getCSRFToken,
} from "./utils/security";

try {
  // Initialize security features
  enableConsoleProtection();
  enableDOMProtection();

  // Generate initial CSRF token
  getCSRFToken();
} catch (error) {
  console.error("Security initialization failed:", error);
}

// Optional UI friction only (not real security): disable right-click and some devtools shortcuts.
// Set VITE_BLOCK_BROWSER_TOOLS=true to enable in any environment.
const shouldBlockBrowserTools =
  import.meta.env.VITE_BLOCK_BROWSER_TOOLS === "true";

if (shouldBlockBrowserTools) {
  document.addEventListener("contextmenu", (e) => {
    e.preventDefault();
    return false;
  });

  document.addEventListener("keydown", (e) => {
    // F12, Ctrl+Shift+I, Ctrl+Shift+J, Ctrl+Shift+C
    if (
      e.key === "F12" ||
      (e.ctrlKey && e.shiftKey && e.key === "I") ||
      (e.ctrlKey && e.shiftKey && e.key === "J") ||
      (e.ctrlKey && e.shiftKey && e.key === "C") ||
      (e.ctrlKey && e.key === "U") // View source
    ) {
      e.preventDefault();
      return false;
    }
  });
}

const root = document.getElementById("root");

if (!root) {
  throw new Error("Root element not found! Check your index.html");
}

try {
  ReactDOM.createRoot(root).render(
    <React.StrictMode>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </React.StrictMode>,
  );
} catch (error) {
  console.error("Failed to render app:", error);
  root.innerHTML = `<div style="padding: 20px; color: red; font-family: monospace;">
    <h1>Error loading app</h1>
    <pre>${String(error)}</pre>
  </div>`;
}

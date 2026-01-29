import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";

// IMPORTANT: this pulls in Tailwind
import "./index.css";

// ========== SECURITY INITIALIZATION ==========
import {
  enableConsoleProtection,
  enableDOMProtection,
  getCSRFToken,
} from "./utils/security";

// Initialize security features
enableConsoleProtection();
enableDOMProtection();

// Generate initial CSRF token
getCSRFToken();

// Prevent right-click context menu in production
if (import.meta.env.PROD) {
  document.addEventListener("contextmenu", (e) => {
    e.preventDefault();
    return false;
  });
}

// Disable common keyboard shortcuts for developer tools
if (import.meta.env.PROD) {
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

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>,
);

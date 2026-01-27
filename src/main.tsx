import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";

// IMPORTANT: this pulls in Tailwind
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>,
);

// Hide the loading screen after the app has started rendering
const loadingElement = document.getElementById("loading");
if (loadingElement) {
  loadingElement.style.display = "none";
}

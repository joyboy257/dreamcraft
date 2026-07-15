import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import { AppErrorBoundary } from "./app/AppErrorBoundary";
import "./styles.css";

const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error("DreamCraft could not find its application root.");
}

createRoot(rootElement).render(
  <StrictMode>
    <AppErrorBoundary>
      <App />
    </AppErrorBoundary>
  </StrictMode>,
);

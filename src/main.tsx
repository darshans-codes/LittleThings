import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import VaultGate from "./VaultGate";
import { clearTemporaryExports } from "./export";
void clearTemporaryExports();
import "@fontsource/dm-sans/latin-400.css";
import "@fontsource/dm-sans/latin-500.css";
import "@fontsource/dm-sans/latin-600.css";
import "@fontsource/manrope/latin-400.css";
import "@fontsource/manrope/latin-500.css";
import "@fontsource/manrope/latin-700.css";
createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <VaultGate>{(lock) => <App onLock={lock} />}</VaultGate>
  </React.StrictMode>,
);

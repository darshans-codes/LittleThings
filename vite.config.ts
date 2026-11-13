import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
export default defineConfig({
  plugins: [
    react(),
    {
      name: "development-csp",
      transformIndexHtml(html, ctx) {
        return ctx.server
          ? html.replace(
              /<meta\s+http-equiv="Content-Security-Policy"[\s\S]*?\/>/i,
              "",
            )
          : html;
      },
    },
  ],
  server: { port: 5173, strictPort: true },
});

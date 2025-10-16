import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5174,
    strictPort: true,
    // PROXY YOK! (yanlışlıkla /api -> 5174'e yönlenmesin)
  },
});

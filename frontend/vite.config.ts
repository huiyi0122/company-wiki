import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: "192.168.0.206", // 👈 改这里，让前端用同一个 IP
    port: 5173, // 可改可不改，默认5173
  },
});

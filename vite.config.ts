import { defineConfig } from "vite";
export default defineConfig({
  build: {
    outDir: "dist/client",
  },
  server: {
    hmr: true,
    fs: { deny: ["**/.env", "**/.env.*", "**/*.{crt,pem}", "**/data/**"] },
  },
});

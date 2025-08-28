import { defineConfig } from "vite";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default defineConfig({
  root: resolve(__dirname, "web"),
  server: {
    open: true,
    port: 5173,
  },
  build: {
    outDir: resolve(__dirname, "dist-web"),
    emptyOutDir: true,
  },
  resolve: {
    alias: {
      "@src": resolve(__dirname, "src"),
    },
  },
});

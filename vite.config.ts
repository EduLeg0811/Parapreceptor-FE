import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import fs from "fs";
import { componentTagger } from "lovable-tagger";

// Porta do Main-Server; dev.ps1 exporta DEV_PORT com a porta que conseguiu abrir.
const backendPort = process.env.DEV_PORT || "8000";
const rootIconPath = path.resolve(__dirname, "./icon.png");

/** Exposes the repository's canonical icon without duplicating it under public/. */
// Tipar como `Plugin` dá acesso ao contexto do Rollup em generateBundle
// (`this.emitFile`) e dispensa a assinatura manual de configureServer.
const rootIcon: Plugin = {
  name: "root-icon",
  configureServer(server) {
    server.middlewares.use("/icon.png", (_request, response) => {
      response.setHeader("Content-Type", "image/png");
      response.end(fs.readFileSync(rootIconPath));
    });
  },
  generateBundle() {
    this.emitFile({
      type: "asset",
      fileName: "icon.png",
      source: fs.readFileSync(rootIconPath),
    });
  },
};

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 5175,
    proxy: {
      "/api": {
        target: `http://127.0.0.1:${backendPort}`,
        changeOrigin: true,
      },
    },
    hmr: {
      overlay: false,
    },
  },
  plugins: [react(), rootIcon, mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));

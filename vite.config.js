import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import legacy from "@vitejs/plugin-legacy";
import tailwindcss from "@tailwindcss/vite";
import { VitePWA } from "vite-plugin-pwa";
import { readFileSync } from "fs";

// Gera /version.json a partir do APP_VERSION de version.js — o auto-update (main.jsx) compara os dois
const versionJson = () => ({
    name: "version-json",
    generateBundle() {
        const version = readFileSync(new URL("./version.js", import.meta.url), "utf8").match(/APP_VERSION\s*=\s*"([^"]+)"/)[1];
        this.emitFile({ type: "asset", fileName: "version.json", source: JSON.stringify({ version }) });
    },
});

export default defineConfig({
    plugins: [
        react(),
        versionJson(),
        legacy({
            targets: ["Android >= 6", "Chrome >= 60", "iOS >= 12"],
            modernPolyfills: true,
        }),
        tailwindcss(),
        VitePWA({
            injectRegister: false,
            includeAssets: ["favicon.ico", "icons/*.png"],
            manifest: {
                name: "FourTEX — Controle de Produção",
                short_name: "FourTEX",
                description: "Sistema de controle de produção — FourTEX Indústria Têxtil",
                theme_color: "#F97316",
                background_color: "#ffffff",
                display: "standalone",
                orientation: "portrait",
                start_url: "/",
                icons: [
                    {
                        src: "/icons/icon-192.png",
                        sizes: "192x192",
                        type: "image/png",
                    },
                    {
                        src: "/icons/icon-512.png",
                        sizes: "512x512",
                        type: "image/png",
                    },
                ],
            },
        }),
    ],
    root: ".",
    build: {
        outDir: "dist",
        target: "es2015",
        minify: "terser",
    },
});

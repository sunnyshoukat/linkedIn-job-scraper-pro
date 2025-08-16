import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "path";
import { copyFileSync, existsSync, mkdirSync } from "fs";
import path from "path";

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'copy-options-html',
      generateBundle() {
        // Copy options.html to the correct location
        const srcPath = resolve(__dirname, 'src/options.html');
        const destPath = resolve(__dirname, 'dist/options.html');
        if (existsSync(srcPath)) {
          // Ensure dist directory exists
          const distDir = path.dirname(destPath);
          if (!existsSync(distDir)) {
            mkdirSync(distDir, { recursive: true });
          }
          copyFileSync(srcPath, destPath);
        }
      }
    }
  ],
  build: {
    target: 'esnext',
    rollupOptions: {
      input: {
        popup: resolve(__dirname, "index.html"),
        background: resolve(__dirname, "src/scripts/background.js"),
        content: resolve(__dirname, "src/scripts/content.js"),
        keywordHelper: resolve(
          __dirname,
          "src/scripts/helpers/keywordHelper.js"
        ),
        languageAndLocationHelper: resolve(
          __dirname,
          "src/scripts/helpers/languageAndLocationHelper.js"
        ),
        optionsScript: resolve(__dirname, "src/options.js"),
      },
      output: {
        entryFileNames: (chunkInfo) => {
          if (
            chunkInfo.name === "background" ||
            chunkInfo.name === "content" 
          ) {
            return `scripts/${chunkInfo.name}.js`;
          }

          if (
            chunkInfo.name === "keywordHelper" ||
            chunkInfo.name === "languageAndLocationHelper"
          ) {
            return `scripts/helpers/${chunkInfo.name}.js`;
          }
          
          if (chunkInfo.name === "optionsScript") {
            return "options.js";
          }
          
          return "assets/[name]-[hash].js";
        },
        chunkFileNames: "assets/[name]-[hash].js",
        assetFileNames: "assets/[name]-[hash].[ext]",
      },
    },
    outDir: "dist",
    emptyOutDir: true,
  },
  define: {
    global: "globalThis",
  },
});

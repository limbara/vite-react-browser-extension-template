import path from "node:path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { viteStaticCopy } from "vite-plugin-static-copy";

type BrowserType = "firefox" | "chrome";

const root = path.resolve(__dirname, "src");

export default (browser: BrowserType) => {
  const outDir = path.resolve(__dirname, "dist", browser);
  const assetDir = path.resolve(outDir, "assets");

  const externalBrowserPolyfillMinJs = path.resolve(
    __dirname,
    "node_modules",
    "webextension-polyfill",
    "dist",
    "browser-polyfill.min.js"
  );

  // https://vitejs.dev/config/
  return defineConfig(({ mode }) => {
    const isDevelopmentMode = mode === "development";

    return {
      root,
      publicDir: "../public",
      plugins: [
        react(),
        viteStaticCopy({
          targets: [
            {
              src: externalBrowserPolyfillMinJs,
              dest: assetDir,
            },
          ],
        }),
      ],
      server: {
        host: "0.0.0.0",
      },
      build: {
        rollupOptions: {
          input: {
            content_main: path.resolve(root, "content_main.ts"),
            content_script: path.resolve(root, "content_script.js"),
            background: path.resolve(root, "background.ts"),
            popup: path.resolve(root, "popup.html"),
          },
          external(source) {
            // externalize webextension-polyfill at all time because of content_script.js, cannot run module esm on content_scripts
            // feels like a waste of bundled resources because of content_scripts alone
            if (source.includes("webextension-polyfill")) return true;
          },
          output: {
            entryFileNames: "assets/[name].js",
            chunkFileNames: "assets/[name].js",
            paths: (id) => {
              if (id.includes("webextension-polyfill")) {
                // link to statically copied externalBrowserPolyfillMinJs
                return "./browser-polyfill.min.js";
              }

              return id;
            },
          },
          preserveEntrySignatures: "exports-only", // keep exports for content script module api
        },
        outDir,
        emptyOutDir: true,
        minify: isDevelopmentMode ? false : true,
      },
    };
  });
};

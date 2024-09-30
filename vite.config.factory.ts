import path from "node:path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { viteStaticCopy } from "vite-plugin-static-copy";

type BrowserType = "firefox" | "chrome";

const root = path.resolve(__dirname, "src");

export default (browser: BrowserType) => {
  const outDir = path.resolve(__dirname, "dist", browser);
  const browserManifest = path.resolve(__dirname, browser, "manifest.json");

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
              src: browserManifest,
              dest: outDir,
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
            // add scripts here to build
            background: path.resolve(root, "background.ts"),
            popup: path.resolve(root, "popup.html"),
          },
          output: {
            entryFileNames: "assets/[name].js",
          },
          plugins: isDevelopmentMode
            ? [
                {
                  name: "watch-manifest",
                  buildStart() {
                    this.addWatchFile(browserManifest);
                  },
                },
              ]
            : undefined,
        },
        outDir,
        emptyOutDir: true,
        minify: isDevelopmentMode ? false : true,
        watch: isDevelopmentMode ? {} : null,
      },
    };
  });
};

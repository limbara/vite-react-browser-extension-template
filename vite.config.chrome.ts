import path from "node:path";
import rollupPluginBrowserManifest from "./rollup-plugin-browser-manifest";
import { mergeConfig, defineConfig } from "vite";
import viteConfigBase from "./vite.config.base";
import { isValidManifestVersion, parsePackageJsonAuthor } from "./utils";

const browserManifest = path.resolve(__dirname, "chrome", "manifest.json");

export default defineConfig((configEnv) => {
  const isProduction = configEnv.mode === "production";

  return mergeConfig(
    viteConfigBase("chrome")(configEnv),
    {
      build: {
        rollupOptions: {
          plugins: [
            rollupPluginBrowserManifest({
              src: browserManifest,
              syncPackageJson: {
                description: true,
                version(manifestJson, packageJson) {
                  const version = packageJson?.version ?? manifestJson?.version;
                  if (typeof version !== "string")
                    this.error(
                      `version is not typeof string. version : ${JSON.stringify(
                        version,
                        null,
                        2
                      )}`
                    );

                  if (
                    isProduction &&
                    !isValidManifestVersion(version as string)
                  ) {
                    this.error(
                      `version format is not valid. version : ${version}`
                    );
                  }
                  return version;
                },
                author: (manifestJson, packageJson) => {
                  const previousValues = manifestJson?.author;

                  switch (typeof packageJson?.author) {
                    case "object":
                      return packageJson.author.email
                        ? {
                            email: packageJson.author.email,
                          }
                        : previousValues;
                    case "string": {
                      const authorObject = parsePackageJsonAuthor(
                        packageJson.author
                      );

                      return authorObject?.email
                        ? {
                            email: authorObject?.email,
                          }
                        : previousValues;
                    }
                    default:
                      return previousValues;
                  }
                },
              },
            }),
          ],
        },
      },
    },
    false
  );
});

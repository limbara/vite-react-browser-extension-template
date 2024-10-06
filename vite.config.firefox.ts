import path from "node:path";
import rollupPluginBrowserManifest from "./rollup-plugin-browser-manifest";
import { mergeConfig, defineConfig } from "vite";
import viteConfigBase from "./vite.config.base";
import { isValidManifestVersion, parsePackageJsonAuthor } from "./utils";

const browserManifest = path.resolve(__dirname, "firefox", "manifest.json");

export default defineConfig((configEnv) => {
  const isProduction = configEnv.mode === "production";

  return mergeConfig(
    viteConfigBase("firefox")(configEnv),
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
                developer: (manifestJson, packageJson) => {
                  const previousValues = manifestJson?.author;

                  switch (typeof packageJson?.author) {
                    case "object":
                      return packageJson.author.url && packageJson.author.name
                        ? {
                            name: packageJson.author.name,
                            url: packageJson.author.url,
                          }
                        : previousValues;
                    case "string": {
                      const authorObject = parsePackageJsonAuthor(
                        packageJson.author
                      );

                      return authorObject?.url && authorObject.name
                        ? {
                            name: authorObject.name,
                            url: authorObject.url,
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

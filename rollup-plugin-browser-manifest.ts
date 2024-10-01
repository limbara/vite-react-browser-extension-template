import fs from "node:fs/promises";
import path from "node:path";
import rollup from "rollup";

type PluginOptions = {
  /**
   * the absolute file path to manifest.json
   */
  readonly src: string;

  /**
   * the destination path relative to rollup's output.dir
   */
  readonly dest?: string;

  /**
   * sync package json related properties to manifest.json
   */
  readonly syncPackageJson?:
    | Partial<{
        name: boolean;
        description: boolean;
        version: boolean;
      }>
    | boolean;
};

const packageJsonPath = path.resolve(__dirname, "package.json");

/**
 * plugin in to sync browser manifest.json and package.json related properties
 * @param options
 * @returns
 */
const plugin = (options: PluginOptions): rollup.Plugin => {
  const { src: srcAbsPath, dest, syncPackageJson = false } = options;

  const manifestFileName = path.basename(srcAbsPath);

  return {
    name: "rollup-plugin-browser-manifest",
    async buildStart() {
      const srcStats = await fs.stat(srcAbsPath);

      if (!srcStats.isFile()) {
        this.error('options "src" is not a manifest.json file');
      }

      if (this.meta.watchMode) {
        this.addWatchFile(srcAbsPath);

        if (syncPackageJson) {
          this.addWatchFile(packageJsonPath);
        }
      }

      if (syncPackageJson === false) {
        this.emitFile({
          type: "asset",
          name: manifestFileName,
          originalFileName: srcAbsPath,
        });

        return;
      }

      const manifestSource = JSON.parse(
        await fs.readFile(srcAbsPath, { encoding: "utf-8" })
      );
      const packageJsonSource = JSON.parse(
        await fs.readFile(packageJsonPath, { encoding: "utf-8" })
      );

      let toSyncProps = {
        name: packageJsonSource.name ?? manifestSource.name ?? "",
        description:
          packageJsonSource.description ?? manifestSource.description ?? "",
        version: packageJsonSource.version ?? manifestSource.version ?? "0.0.0",
      };

      if (typeof syncPackageJson === "object") {
        toSyncProps = Object.entries(syncPackageJson).reduce(
          (acc, [key, value]) => {
            if (value === true) {
              Object.assign(acc, {
                [key]: toSyncProps[key as keyof typeof toSyncProps],
              });
            }
            return acc;
          },
          {} as typeof toSyncProps
        );
      }

      const source = Object.assign(manifestSource, toSyncProps);

      this.emitFile({
        type: "asset",
        name: manifestFileName,
        originalFileName: srcAbsPath,
        source: JSON.stringify(source, null, 2),
      });
    },
    outputOptions({ assetFileNames, ...restOptions }) {
      return {
        ...restOptions,
        assetFileNames: (o) => {
          if (o.name === manifestFileName) {
            if (dest) {
              const normalizedDest = path.isAbsolute(dest)
                ? dest.slice(1)
                : dest;

              return path.join(normalizedDest, manifestFileName);
            } else {
              return manifestFileName;
            }
          }

          if (typeof assetFileNames === "function") {
            return assetFileNames(o);
          }

          return assetFileNames ?? "assets/[name]-[hash][extname]";
        },
      };
    },
  };
};

export default plugin;

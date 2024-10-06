import fs from "node:fs/promises";
import path from "node:path";
import rollup, { PluginContext } from "rollup";
import { JsonObject, JsonValue, PackageJson } from "type-fest";

/**
 * A function type that accept both manifest & package json source, returning new value to write into manifest, returning undefined will exclude the field to be written from manifest
 */
type FieldSyncFn = (
  this: PluginContext,
  manifestJson: JsonObject,
  packageJson: PackageJson
) => JsonValue | undefined;

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
   * @example sync manifest.json field 'description' to package json 'name'
   * ```
   *  {
   *    "description" : "name"
   *  }
   * ```
   * @default {}
   */
  readonly syncPackageJson?: Partial<
    Record<string, boolean | string | FieldSyncFn>
  >;
};

const packageJsonPath = path.resolve(__dirname, "package.json");

/**
 * plugin in to sync browser manifest.json and package.json related properties
 * @param options
 * @returns
 */
const plugin = (options: PluginOptions): rollup.Plugin => {
  const { src: srcAbsPath, dest, syncPackageJson = {} } = options;

  const manifestFileName = path.basename(srcAbsPath);
  const hasToSyncPackageJson = Object.keys(syncPackageJson).length !== 0;

  return {
    name: "rollup-plugin-browser-manifest",
    async buildStart() {
      const srcStats = await fs.stat(srcAbsPath);

      if (!srcStats.isFile()) {
        this.error('options "src" is not a manifest.json file');
      }

      if (this.meta.watchMode && hasToSyncPackageJson) {
        this.addWatchFile(packageJsonPath);
      }

      if (!hasToSyncPackageJson) {
        this.emitFile({
          type: "asset",
          name: manifestFileName,
          originalFileName: srcAbsPath,
          source: await fs.readFile(srcAbsPath, { encoding: "utf-8" }),
        });

        return;
      }

      const manifestSource = JSON.parse(
        await fs.readFile(srcAbsPath, { encoding: "utf-8" })
      );

      const packageJsonSource = JSON.parse(
        await fs.readFile(packageJsonPath, { encoding: "utf-8" })
      );

      const toSyncEntries = Object.entries(syncPackageJson).reduce(
        (acc, [manifestField, jsonFieldOrSyncFnOrBool]) => {
          switch (typeof jsonFieldOrSyncFnOrBool) {
            case "function":
              acc.push([
                manifestField,
                jsonFieldOrSyncFnOrBool.call(
                  this,
                  manifestSource,
                  packageJsonSource
                ),
              ]);
              break;
            case "string":
              acc.push([
                manifestField,
                packageJsonSource[jsonFieldOrSyncFnOrBool] ??
                  manifestSource[manifestField],
              ]);
              break;
            case "boolean":
              if (jsonFieldOrSyncFnOrBool) {
                acc.push([
                  manifestField,
                  packageJsonSource[manifestField] ??
                    manifestSource[manifestField],
                ]);
              }
              break;
          }

          return acc;
        },
        [] as [string, JsonValue | undefined][]
      );

      const source = Object.assign(
        manifestSource,
        Object.fromEntries(
          toSyncEntries.filter((_key, _value) => _value !== undefined)
        )
      );

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

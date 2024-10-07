import fs from "node:fs";
import fastGlob from "fast-glob";
import path from "node:path";
import rollup from "rollup";
import chalk from "chalk";
import yazl from "yazl";

interface PluginOptions {
  /**
   * Path or glob of what to zip.
   */
  readonly src: string | readonly string[];
  /**
   * the absolute output zip path
   * @default rollup.NormalizedOutputOptions.dir
   * @default process.cwd()
   */
  readonly zipDest?: string;
  /**
   * the output zip filename
   * @default npm_package_name-npm_package_version from process.env, if none then
   * @default "bundle.zip"
   */
  readonly zipFileName?: string;

  /**
   * Output zipped items to console.
   *
   * @default false
   */
  readonly verbose?: boolean;

  /**
   * fast glob options that is use to match with src
   */
  readonly fastGlobOptions?: fastGlob.Options;
}

const getDefaultfilename = (env: NodeJS.ProcessEnv) => {
  const {
    npm_package_name: packageName = "bundle",
    npm_package_version: packageVersion,
  } = env;

  if (packageVersion) {
    return `${packageName}-${packageVersion}`;
  }

  return packageName;
};

const zip = (pluginOptions: PluginOptions): rollup.Plugin => {
  let resolvedOutputOptions: rollup.NormalizedOutputOptions;

  const {
    src,
    zipDest,
    zipFileName = getDefaultfilename(process.env),
    fastGlobOptions,
    verbose = false,
  } = pluginOptions;

  return {
    name: "rollup-plugin-zip",
    renderStart(outputOptions) {
      resolvedOutputOptions = outputOptions;
    },
    writeBundle: {
      order: "post",
      sequential: true,
      async handler() {
        const zipFile = new yazl.ZipFile();

        const patterns = (typeof src === "string" ? [src] : src).filter(
          (x) => x !== undefined
        );

        if (patterns.length === 0) {
          return this.error(new Error(`No src specified`));
        }

        const outDir = path.resolve(
          zipDest ?? resolvedOutputOptions?.dir ?? process.cwd()
        );

        const outFile = path.join(outDir, `${zipFileName}.zip`);

        const cwd = fastGlobOptions?.cwd ?? process.cwd();

        if (verbose) {
          this.info(`glob working on cwd : ${chalk.green(cwd)}`);
        }

        const matchs = (
          await Promise.all(
            patterns.map(async (pattern) => {
              const matchedPaths = await fastGlob(pattern, {
                absolute: true,
                onlyFiles: true,
                dot: true,
                ...fastGlobOptions,
                cwd,
              });

              return Promise.all(
                matchedPaths.map(async (matchedPath) => {
                  return {
                    matchedPath,
                    stats: await fs.promises.stat(matchedPath),
                  };
                })
              );
            })
          )
        ).flat();

        if (matchs.length === 0) {
          return this.error("nothing to zipped");
        }

        return new Promise((resolve) => {
          for (const { matchedPath, stats } of matchs) {
            if (stats.isDirectory()) {
              zipFile.addEmptyDirectory(matchedPath);

              this.info(`added directory : ${chalk.blue(matchedPath)}`);
            } else {
              const realPath = path.resolve(cwd, matchedPath);
              const filename = path.relative(cwd, matchedPath);

              zipFile.addFile(realPath, filename);

              this.info(`added file : ${chalk.blue(filename)}`);
            }
          }
          const writeStream = fs.createWriteStream(outFile);
          zipFile.outputStream.pipe(writeStream);
          zipFile.end();
          writeStream.on("close", () => {
            if (verbose) {
              this.info(`zipped file in ${chalk.green(outFile)}`);
            }

            resolve();
          });
        });
      },
    },
  };
};

export default zip;

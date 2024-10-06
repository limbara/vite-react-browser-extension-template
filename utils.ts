import { PackageJson } from "type-fest";

type AuthorPersonObject = Exclude<PackageJson.Person, string>;

/**
 * parse author from package.json 'author' field
 * @param author the author string from package.json
 * @returns returns null if no match
 */
export const parsePackageJsonAuthor = (
  author: string
): AuthorPersonObject | null => {
  const regex = /^([a-zA-Z\s]+)\s<([^>]+)>\s\(([^)]+)\)$/;
  const match = regex.exec(author);

  if (match) {
    return {
      name: match[1],
      email: match[2],
      url: match[3],
    };
  }

  return null;
};

/**
 * check if a version string is a valid manifest.json 'version' format. as per chrome & mozilla specs.
 * @link https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/manifest.json/version
 * @param version the version string
 * @returns
 */
export const isValidManifestVersion = (version: string): boolean => {
  const regex =
    /^(?!0+(\.0+){0,3}$)(0|[1-9][0-9]{0,8})([.](0|[1-9][0-9]{0,8})){0,3}$/;

  return regex.test(version);
};

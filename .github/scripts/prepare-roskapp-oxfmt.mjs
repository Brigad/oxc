import { existsSync, readFileSync, writeFileSync } from "node:fs";

const version = process.env.OXFMT_VERSION ?? process.argv[2];
const packageName = process.env.OXFMT_PACKAGE_NAME ?? "@roskapp/oxfmt";
const bindingPackageName =
  process.env.OXFMT_BINDING_PACKAGE_NAME ?? "@roskapp/oxfmt-binding";
const repositoryUrl =
  process.env.OXFMT_REPOSITORY_URL ?? "git+https://github.com/Brigad/oxc.git";

if (!version) {
  throw new Error("Set OXFMT_VERSION or pass the version as argv[2].");
}

updatePackageJson("apps/oxfmt/package.json", pkg => {
  pkg.version = version;
  pkg.napi ??= {};
  pkg.napi.packageName = bindingPackageName;
});

updatePackageJson("npm/oxfmt/package.json", pkg => {
  const previousVersion = pkg.version;
  pkg.name = packageName;
  pkg.version = version;
  pkg.repository = {
    type: "git",
    url: repositoryUrl,
    directory: "npm/oxfmt",
  };
  pkg.bugs = "https://github.com/Brigad/oxc/issues";
  pkg.homepage = "https://github.com/Brigad/oxc/tree/main/npm/oxfmt#readme";
  pkg.publishConfig = { access: "public" };
  pkg.napi ??= {};
  pkg.napi.packageName = bindingPackageName;

  patchBindings(previousVersion);
});

function updatePackageJson(path, update) {
  const pkg = JSON.parse(readFileSync(path, "utf8"));
  update(pkg);
  writeFileSync(path, `${JSON.stringify(pkg, null, 2)}\n`);
}

function patchBindings(previousVersion) {
  const path = "apps/oxfmt/src-js/bindings.js";
  if (!existsSync(path)) return;

  const escapedPreviousVersion = previousVersion.replaceAll(".", "\\.");
  const contents = readFileSync(path, "utf8")
    .replaceAll("@oxfmt/binding", bindingPackageName)
    .replace(new RegExp(escapedPreviousVersion, "g"), version);

  writeFileSync(path, contents);
}

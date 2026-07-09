import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const [npmDir, mainPackageDir] = process.argv.slice(2);

if (!npmDir || !mainPackageDir) {
  throw new Error("Usage: check-roskapp-npm-packages.mjs <npm_dir> <main_package_dir>");
}

const packageDirs = [
  ...readdirSync(npmDir)
    .map(name => join(npmDir, name))
    .filter(path => statSync(path).isDirectory()),
  mainPackageDir,
];

for (const packageDir of packageDirs) {
  checkPackage(packageDir);
}

function checkPackage(packageDir) {
  const packageJsonPath = join(packageDir, "package.json");
  if (!existsSync(packageJsonPath)) {
    throw new Error(`Missing package.json in ${packageDir}`);
  }

  const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf8"));
  const { name, version } = packageJson;

  console.log(`\n# ${name}@${version}`);

  for (const file of packageJson.files ?? []) {
    const filePath = join(packageDir, file);
    if (!existsSync(filePath)) {
      throw new Error(`Package file entry does not exist: ${filePath}`);
    }
  }

  const published = npmViewVersion(`${name}@${version}`);
  if (published === version) {
    console.log(`::warning::${name}@${version} already exists on npm.`);
  } else {
    console.log("Version is not published yet.");
  }

  execFileSync("npm", ["pack", "--dry-run", "--json"], {
    cwd: packageDir,
    stdio: "inherit",
  });
}

function npmViewVersion(spec) {
  const result = spawnSync("npm", ["view", spec, "version"], {
    encoding: "utf8",
  });

  if (result.status === 0) return result.stdout.trim();
  if (result.stderr.includes("E404")) return null;

  process.stderr.write(result.stderr);
  throw new Error(`npm view failed for ${spec}`);
}

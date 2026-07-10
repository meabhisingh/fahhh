import fs from "node:fs";
import path from "node:path";

const packageName = process.argv[2]?.trim();

if (!packageName) {
	console.error("❌ Please provide a package name.");
	process.exit(1);
}

if (!/^[a-z0-9-]+$/.test(packageName)) {
	console.error(
		"❌ Package name must contain only lowercase letters, numbers, and hyphens.",
	);
	process.exit(1);
}

const rootDir = process.cwd();
const rootPkgPath = path.join(rootDir, "package.json");

if (!fs.existsSync(rootPkgPath)) {
	console.error("❌ Root package.json not found.");
	process.exit(1);
}

const rootPkg = JSON.parse(fs.readFileSync(rootPkgPath, "utf8"));

if (!rootPkg.name) {
	console.error("❌ Root package.json must have a name.");
	process.exit(1);
}

const packageDir = path.join(rootDir, "packages", packageName);

if (fs.existsSync(packageDir)) {
	console.error(`❌ Package "${packageName}" already exists.`);
	process.exit(1);
}

const srcDir = path.join(packageDir, "src");

fs.mkdirSync(srcDir, { recursive: true });

function writeJson(file, data) {
	fs.writeFileSync(file, `${JSON.stringify(data, null, 2)}\n`);
}

function writeFile(file, content) {
	fs.writeFileSync(file, `${content.trimStart()}\n`);
}

writeJson(path.join(packageDir, "package.json"), {
  name: `@${rootPkg.name}/${packageName}`,
  private: true,
  type: "module",
  version: "0.0.0",
  exports: "./src/index.ts",
  scripts: {
    lint: "biome check .",
    "lint:fix": "biome check --write .",
  },
  devDependencies: {
    [`@${rootPkg.name}/typescript-config`]: "workspace:*",
  },
});

writeJson(path.join(packageDir, "tsconfig.json"), {
	extends: `@${rootPkg.name}/typescript-config/bundler.json`,
	include: ["src"],
});

writeFile(
	path.join(srcDir, "index.ts"),
	`// Public exports
export {};
`,
);

console.log(`✅ Created @${rootPkg.name}/${packageName}`);
console.log(`📁 packages/${packageName}`);
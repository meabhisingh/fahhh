import fs from "node:fs/promises";
import path from "node:path";
import type { ApiManifest } from "@fahhh/deploy-core";

export function generateServerEntry(
	manifest: ApiManifest,
	outputDir: string,
): string {
	const routeImports = manifest.routes.map(
		(route, index) =>
			`import * as route${index} from ${JSON.stringify(toImportPath(outputDir, route.filePath))};`,
	);

	const middlewareImports = manifest.middlewareFiles.map(
		(file, index) =>
			`import * as middleware${index} from ${JSON.stringify(toImportPath(outputDir, file))};`,
	);

	const routes = manifest.routes.map((route, index) => {
		const methods = route.methods
			.map((method) => `${method}: route${index}.${method}`)
			.join(",\n");

		return `{
  path: ${JSON.stringify(route.routePath)},
  methods: {
${methods}
  }
}`;
	});

	const middleware = manifest.middlewareFiles.map(
		(_, index) => `resolveMiddleware(middleware${index})`,
	);

	return `
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createServer, type Middleware, type RouteDefinition } from "@fahhh/runtime";

${routeImports.join("\n")}
${middlewareImports.join("\n")}

const dirname = path.dirname(fileURLToPath(import.meta.url));
const staticDir = path.resolve(dirname, "../dist");

const routes: RouteDefinition[] = [
${routes.join(",\n")}
];

const middleware = [
${middleware.join(",\n")}
].flat().filter(Boolean) as Middleware[];

await createServer({
  routes,
  middleware,
  staticDir,
  port: Number(process.env.PORT ?? 3000),
});

function resolveMiddleware(mod: { default?: unknown; middleware?: unknown }) {
  const exported = mod.middleware ?? mod.default;

  if (typeof exported === "function") return exported;
  if (Array.isArray(exported)) return exported;

  if (typeof exported === "object" && exported !== null && "middleware" in exported) {
    const nested = (exported as { middleware?: unknown }).middleware;
    if (typeof nested === "function" || Array.isArray(nested)) return nested;
  }

  return undefined;
}
`.trimStart();
}

export async function bundleServer(
	entrySource: string,
	outFile: string,
): Promise<void> {
	const { build } = await import("esbuild");

	const outDir = path.dirname(outFile);

	await fs.rm(outDir, { recursive: true, force: true });
	await fs.mkdir(outDir, { recursive: true });

	const entryFile = path.join(outDir, "__fahhh_server_entry.ts");
	await fs.writeFile(entryFile, entrySource);

	try {
		await build({
			entryPoints: [entryFile],
			bundle: true,
			platform: "node",
			format: "esm",
			target: "node20",
			outfile: outFile,
			packages: "external",
		});
	} finally {
		await fs.rm(entryFile, { force: true });
	}
}

function toImportPath(fromDir: string, filePath: string): string {
	const withoutExtension = filePath.replace(/\.[cm]?[tj]sx?$/, "");
	let relative = path.relative(fromDir, withoutExtension).replaceAll("\\", "/");
	if (!relative.startsWith(".")) relative = `./${relative}`;
	return relative;
}

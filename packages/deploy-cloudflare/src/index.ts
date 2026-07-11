import { spawn } from "node:child_process";
import fs from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";
import type { DeployContext, DeploymentProvider } from "@fahhh/deploy-core";
import { copyDir, emptyDir, pathExists } from "@fahhh/deploy-core";
import { build as esbuild } from "esbuild";

interface ManifestRoute {
	filePath: string;
	routePath: string;
	methods: string[];
}

interface ApiManifest {
	routes: ManifestRoute[];
}

const require = createRequire(import.meta.url);
const workerRuntimeFile = require.resolve("@fahhh/runtime/worker");

export interface CloudflarePagesOptions {
	projectName?: string;
	branch?: string;
	stagingDir?: string;
}

export function cloudflarePages(
	options: CloudflarePagesOptions = {},
): DeploymentProvider {
	return {
		name: "cloudflare-pages",

		async uploadStatic(context) {
			if (!(await pathExists(context.distDir))) {
				throw new Error(`[fahhh] Missing build output: ${context.distDir}`);
			}

			const { stageRoot, stageDist } = getStagePaths(context, options);
			await emptyDir(stageRoot);
			await copyDir(context.distDir, stageDist);
		},

		async uploadFunctions(context) {
			const { stageFunctions } = getStagePaths(context, options);
			await emptyDir(stageFunctions);

			const manifest = await readManifest(context.manifestFile);

			for (const route of manifest.routes) {
				if (!isPathInside(context.apiDir, route.filePath)) {
					throw new Error(
						`[fahhh] API route is outside apiDir: ${route.filePath}`,
					);
				}
				await writeCloudflareFunction(stageFunctions, route);
			}

			const middlewareFile = path.join(context.apiDir, "_middleware.ts");
			if (await pathExists(middlewareFile)) {
				await writeCloudflareMiddleware(stageFunctions, middlewareFile);
			}
		},

		async finish(context) {
			const { stageRoot } = getStagePaths(context, options);

			const args = ["--no-install", "wrangler", "pages", "deploy", "dist"];

			if (options.projectName) {
				args.push("--project-name", options.projectName);
			}

			if (options.branch) {
				args.push("--branch", options.branch);
			}

			await runCommand("npx", args, stageRoot);
		},
	};
}

function getStagePaths(
	context: DeployContext,
	options: CloudflarePagesOptions,
) {
	const stageRoot = path.resolve(
		options.stagingDir ?? path.join(context.outDir, "cloudflare"),
	);
	assertSafeStageRoot(stageRoot, context);

	return {
		stageRoot,
		stageDist: path.join(stageRoot, "dist"),
		stageFunctions: path.join(stageRoot, "functions"),
	};
}

function assertSafeStageRoot(stageRoot: string, context: DeployContext): void {
	const protectedPaths = [
		context.root,
		context.apiDir,
		context.distDir,
		context.outDir,
		process.cwd(),
	];

	for (const protectedPath of protectedPaths) {
		const relative = path.relative(stageRoot, path.resolve(protectedPath));
		if (
			relative === "" ||
			(!relative.startsWith("..") && !path.isAbsolute(relative))
		) {
			throw new Error(
				`[fahhh] Refusing to use unsafe Cloudflare staging directory: ${stageRoot}`,
			);
		}
	}
}

async function readManifest(manifestFile: string): Promise<ApiManifest> {
	const source = await fs.readFile(manifestFile, "utf8");
	const manifest: unknown = JSON.parse(source);
	if (!isManifest(manifest)) {
		throw new Error(`[fahhh] Invalid API manifest: ${manifestFile}`);
	}
	return manifest;
}

function isManifest(value: unknown): value is ApiManifest {
	if (!value || typeof value !== "object" || !("routes" in value)) return false;
	const routes = (value as { routes?: unknown }).routes;
	return (
		Array.isArray(routes) &&
		routes.every(
			(route) =>
				route !== null &&
				typeof route === "object" &&
				typeof (route as ManifestRoute).filePath === "string" &&
				isRoutePath((route as ManifestRoute).routePath) &&
				Array.isArray((route as ManifestRoute).methods) &&
				(route as ManifestRoute).methods.every((method) =>
					["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"].includes(
						method,
					),
				),
		)
	);
}

function isRoutePath(value: unknown): value is string {
	if (typeof value !== "string") return false;
	const segments = value.split("/").filter(Boolean);
	if (segments[0] !== "api") return false;
	return segments.every(
		(segment) =>
			/^[A-Za-z0-9_-][A-Za-z0-9._-]*$/.test(segment) ||
			/^:[A-Za-z_][A-Za-z0-9_]*$/.test(segment),
	);
}

function isPathInside(parent: string, child: string): boolean {
	const relative = path.relative(path.resolve(parent), path.resolve(child));
	return (
		relative !== "" && !relative.startsWith("..") && !path.isAbsolute(relative)
	);
}

async function writeCloudflareFunction(
	functionsDir: string,
	route: ManifestRoute,
): Promise<void> {
	const functionFile = toFunctionFile(functionsDir, route.routePath);
	await fs.mkdir(path.dirname(functionFile), { recursive: true });

	const routeImport = toImportSpecifier(functionFile, route.filePath);
	const runtimeImport = toImportSpecifier(functionFile, workerRuntimeFile);
	await bundleFunction(
		functionFile,
		generateFunctionSource(route, routeImport, runtimeImport),
	);
}

function toFunctionFile(functionsDir: string, routePath: string): string {
	const parts = routePath
		.replace(/^\/+/, "")
		.split("/")
		.filter(Boolean)
		.map((part) => (part.startsWith(":") ? `[${part.slice(1)}]` : part));

	return `${path.join(functionsDir, ...parts)}.js`;
}

function generateFunctionSource(
	route: ManifestRoute,
	routeImport: string,
	runtimeImport: string,
): string {
	const handlers = route.methods
		.map((method) => `  ${JSON.stringify(method)}: routeModule.${method}`)
		.join(",\n");

	return `
import { methodNotAllowed, toApiRequest, toResponse } from ${JSON.stringify(runtimeImport)};
import * as routeModule from ${JSON.stringify(routeImport)};

type PagesContext = {
  request: Request;
  params?: Record<string, string | string[]>;
};

const handlers = {
${handlers}
};

export async function onRequest(context: PagesContext): Promise<Response> {
  const method = context.request.method as keyof typeof handlers;
  const handler = handlers[method];

  if (!handler) {
    return methodNotAllowed(Object.keys(handlers));
  }

  const params = Object.fromEntries(
    Object.entries(context.params ?? {}).map(([key, value]) => [
      key,
      Array.isArray(value) ? value.join("/") : value,
    ]),
  );
  const req = toApiRequest(context.request, params);
  return toResponse(await handler(req as any));
}
`.trimStart();
}

async function writeCloudflareMiddleware(
	functionsDir: string,
	middlewareFile: string,
): Promise<void> {
	const functionFile = path.join(functionsDir, "api", "_middleware.js");
	await fs.mkdir(path.dirname(functionFile), { recursive: true });
	const middlewareImport = toImportSpecifier(functionFile, middlewareFile);
	const runtimeImport = toImportSpecifier(functionFile, workerRuntimeFile);
	const source = `
import { composeMiddleware, toApiRequest } from ${JSON.stringify(runtimeImport)};
import * as middlewareModule from ${JSON.stringify(middlewareImport)};

type PagesContext = {
  request: Request;
  params?: Record<string, string | string[]>;
  next(): Promise<Response>;
};

const defaultKey = "default";
const defaultExport = middlewareModule[defaultKey];
const candidate = middlewareModule.middleware
  ?? defaultExport?.middleware
  ?? defaultExport;
const middlewares = Array.isArray(candidate)
  ? candidate
  : typeof candidate === "function"
    ? [candidate]
    : [];

export async function onRequest(context: PagesContext): Promise<Response> {
  const params = Object.fromEntries(
    Object.entries(context.params ?? {}).map(([key, value]) => [
      key,
      Array.isArray(value) ? value.join("/") : value,
    ]),
  );
  const request = toApiRequest(context.request, params);
  return composeMiddleware(middlewares, () => context.next())(request);
}
`.trimStart();
	await bundleFunction(functionFile, source);
}

async function bundleFunction(filePath: string, source: string): Promise<void> {
	const result = await esbuild({
		stdin: {
			contents: source,
			loader: "ts",
			resolveDir: path.dirname(filePath),
			sourcefile: path.basename(filePath),
		},
		bundle: true,
		format: "esm",
		platform: "browser",
		target: "es2022",
		alias: {
			fahhh: workerRuntimeFile,
			"@fahhh/runtime": workerRuntimeFile,
			"@fahhh/runtime/worker": workerRuntimeFile,
		},
		write: false,
	});
	const output = result.outputFiles[0];
	if (!output)
		throw new Error(`[fahhh] Failed to bundle function: ${filePath}`);
	await fs.writeFile(filePath, output.contents);
}

function toImportSpecifier(fromFile: string, toFile: string): string {
	const target = toFile.replace(/\.[cm]?[tj]sx?$/, "");
	let relative = path
		.relative(path.dirname(fromFile), target)
		.replaceAll("\\", "/");

	if (!relative.startsWith(".")) {
		relative = `./${relative}`;
	}

	return relative;
}

function runCommand(
	command: string,
	args: string[],
	cwd: string,
): Promise<void> {
	const executable = process.platform === "win32" ? `${command}.cmd` : command;

	return new Promise((resolve, reject) => {
		const child = spawn(executable, args, {
			cwd,
			stdio: "inherit",
		});

		child.on("error", reject);
		child.on("exit", (code) => {
			if (code === 0) resolve();
			else
				reject(
					new Error(
						`[fahhh] ${command} ${args.join(" ")} failed with exit code ${code}`,
					),
				);
		});
	});
}

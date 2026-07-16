import fs from "node:fs/promises";
import path from "node:path";
import { scanApiRoutes } from "@fahhh/compiler";
import type { Middleware, RouteDefinition, RouteModule } from "@fahhh/runtime";

type MiddlewareExport = Middleware | Middleware[];

type MiddlewareModule = {
	default?: MiddlewareExport | MiddlewareModule;
	middleware?: MiddlewareExport;
};

export type ModuleLoader = (filePath: string) => Promise<unknown>;

export async function loadApiRoutes(
	apiDir: string,
	loadModule: ModuleLoader,
): Promise<RouteDefinition[]> {
	const manifest = await scanApiRoutes({ apiDir });
	const routes: RouteDefinition[] = [];

	for (const scanned of manifest.routes) {
		const mod = (await loadModule(scanned.filePath)) as RouteModule;
		const methods: RouteDefinition["methods"] = {};

		for (const method of scanned.methods) {
			const handler = mod[method];

			if (typeof handler !== "function") {
				throw new Error(
					`[fahhh] ${scanned.filePath} declares ${method}, but no handler was exported`,
				);
			}

			methods[method] = handler;
		}

		routes.push({
			path: scanned.routePath,
			methods,
		});
	}

	return routes;
}

export async function loadApiMiddleware(
	apiDir: string,
	loadModule: ModuleLoader,
): Promise<Middleware[]> {
	const middlewareFile = path.join(apiDir, "_middleware.ts");

	try {
		await fs.access(middlewareFile);
	} catch {
		return [];
	}

	const mod = (await loadModule(middlewareFile)) as MiddlewareModule;
	const exported = resolveMiddlewareExport(mod);

	if (!exported) return [];
	return Array.isArray(exported) ? exported : [exported];
}

function resolveMiddlewareExport(
	mod: MiddlewareModule,
): MiddlewareExport | undefined {
	if (isMiddlewareExport(mod.middleware)) {
		return mod.middleware;
	}

	if (isMiddlewareExport(mod.default)) {
		return mod.default;
	}

	if (isObject(mod.default)) {
		const nested = mod.default as MiddlewareModule;

		if (isMiddlewareExport(nested.middleware)) {
			return nested.middleware;
		}
	}

	return undefined;
}

function isMiddlewareExport(value: unknown): value is MiddlewareExport {
	return (
		typeof value === "function" ||
		(Array.isArray(value) && value.every((item) => typeof item === "function"))
	);
}

function isObject(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null;
}

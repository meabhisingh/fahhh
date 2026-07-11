import fs from "node:fs/promises";
import path from "node:path";
import type { HttpMethod } from "@fahhh/runtime";
import { toRoutePath } from "./paths";
import type { ApiManifest, ScannedRoute } from "./types";

const HTTP_METHODS: HttpMethod[] = [
	"GET",
	"POST",
	"PUT",
	"PATCH",
	"DELETE",
	"HEAD",
	"OPTIONS",
];

export interface ScanApiOptions {
	apiDir: string;
}

export async function scanApiRoutes({
	apiDir,
}: ScanApiOptions): Promise<ApiManifest> {
	const exists = await pathExists(apiDir);
	if (!exists) return { routes: [] };

	const files = await walk(apiDir);
	const routes: ScannedRoute[] = [];

	for (const filePath of files) {
		if (!filePath.endsWith(`${path.sep}index.ts`)) continue;

		const source = stripCommentsAndStrings(await fs.readFile(filePath, "utf8"));

		const methods = HTTP_METHODS.filter((method) =>
			new RegExp(
				`export\\s+(?:(?:async\\s+)?function\\s+${method}\\b|(?:const|let|var)\\s+${method}\\s*=)`,
			).test(source),
		);

		if (methods.length === 0) continue;

		routes.push({
			filePath,
			routePath: toRoutePath(apiDir, filePath),
			methods,
		});
	}

	assertNoAmbiguousRoutes(routes);
	routes.sort(compareRoutes);
	return { routes };
}

function compareRoutes(a: ScannedRoute, b: ScannedRoute): number {
	const aParts = a.routePath.split("/").filter(Boolean);
	const bParts = b.routePath.split("/").filter(Boolean);
	const length = Math.max(aParts.length, bParts.length);

	for (let index = 0; index < length; index++) {
		const aPart = aParts[index];
		const bPart = bParts[index];
		if (aPart === undefined) return -1;
		if (bPart === undefined) return 1;
		const aDynamic = aPart.startsWith(":");
		const bDynamic = bPart.startsWith(":");
		if (aDynamic !== bDynamic) return aDynamic ? 1 : -1;
		const compared = aPart.localeCompare(bPart);
		if (compared !== 0) return compared;
	}

	return 0;
}

function assertNoAmbiguousRoutes(routes: ScannedRoute[]): void {
	const patterns = new Map<string, ScannedRoute>();

	for (const route of routes) {
		const pattern = route.routePath.replace(
			/:[A-Za-z_][A-Za-z0-9_]*/g,
			":param",
		);
		const existing = patterns.get(pattern);
		if (existing) {
			throw new Error(
				`[fahhh] Ambiguous API routes: ${existing.filePath} and ${route.filePath}`,
			);
		}
		patterns.set(pattern, route);
	}
}

function stripCommentsAndStrings(source: string): string {
	let result = "";
	let index = 0;
	let state: "code" | "line" | "block" | "single" | "double" | "template" =
		"code";

	while (index < source.length) {
		const char = source[index] ?? "";
		const next = source[index + 1] ?? "";

		if (state === "code") {
			if (char === "/" && next === "/") {
				state = "line";
				result += "  ";
				index += 2;
				continue;
			}
			if (char === "/" && next === "*") {
				state = "block";
				result += "  ";
				index += 2;
				continue;
			}
			if (char === "'" || char === '"' || char === "`") {
				state = char === "'" ? "single" : char === '"' ? "double" : "template";
				result += " ";
				index++;
				continue;
			}
			result += char;
			index++;
			continue;
		}

		if (state === "line") {
			if (char === "\n") {
				state = "code";
				result += "\n";
			} else {
				result += " ";
			}
			index++;
			continue;
		}

		if (state === "block") {
			if (char === "*" && next === "/") {
				state = "code";
				result += "  ";
				index += 2;
			} else {
				result += char === "\n" ? "\n" : " ";
				index++;
			}
			continue;
		}

		const closing = state === "single" ? "'" : state === "double" ? '"' : "`";
		if (char === "\\") {
			result += "  ";
			index += 2;
		} else if (char === closing) {
			state = "code";
			result += " ";
			index++;
		} else {
			result += char === "\n" ? "\n" : " ";
			index++;
		}
	}

	return result;
}

async function walk(dir: string): Promise<string[]> {
	const entries = await fs.readdir(dir, { withFileTypes: true });
	const files: string[] = [];

	for (const entry of entries) {
		const fullPath = path.join(dir, entry.name);

		if (entry.isDirectory()) {
			files.push(...(await walk(fullPath)));
		}

		if (entry.isFile()) {
			files.push(fullPath);
		}
	}

	return files;
}

async function pathExists(filePath: string): Promise<boolean> {
	try {
		await fs.access(filePath);
		return true;
	} catch (error) {
		if ((error as NodeJS.ErrnoException).code === "ENOENT") return false;
		throw error;
	}
}

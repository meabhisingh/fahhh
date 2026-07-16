import path from "node:path";

const PARAM_NAME = /^[A-Za-z_][A-Za-z0-9_]*$/;

function assertParamName(param: string, part: string): void {
	if (!PARAM_NAME.test(param)) {
		throw new Error(`[fahhh] Invalid route parameter folder: ${part}`);
	}
}

function toRoutePart(part: string): string {
	if (part.startsWith("[[...") && part.endsWith("]]")) {
		const param = part.slice(5, -2);
		assertParamName(param, part);
		return `:${param}*?`;
	}

	if (part.startsWith("[...") && part.endsWith("]")) {
		const param = part.slice(4, -1);
		assertParamName(param, part);
		return `:${param}*`;
	}

	if (part.startsWith("[") && part.endsWith("]")) {
		const param = part.slice(1, -1);
		assertParamName(param, part);
		return `:${param}`;
	}

	if (part.includes("[") || part.includes("]")) {
		throw new Error(`[fahhh] Invalid route folder: ${part}`);
	}

	return part;
}

export function toRoutePath(apiDir: string, filePath: string): string {
	const relative = path.relative(apiDir, filePath);
	const parts = relative.split(path.sep);

	// Only api/**/index.ts files become routes.
	parts.pop();

	const routeParts = parts.map((part, index) => {
		const routePart = toRoutePart(part);

		if (
			(routePart.endsWith("*") || routePart.endsWith("*?")) &&
			index !== parts.length - 1
		) {
			throw new Error(
				`[fahhh] Catch-all route parameter must be last: ${part}`,
			);
		}

		return routePart;
	});

	const joined = routeParts.filter(Boolean).join("/");
	return joined ? `/api/${joined}` : "/api";
}

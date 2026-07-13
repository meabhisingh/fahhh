import path from "node:path";

export function toRoutePath(apiDir: string, filePath: string): string {
	const relative = path.relative(apiDir, filePath);
	const parts = relative.split(path.sep);

	// Only api/**/index.ts files become routes.
	parts.pop();

	const routeParts = parts.map((part) => {
		if (part.startsWith("[") && part.endsWith("]")) {
			const param = part.slice(1, -1);
			if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(param)) {
				throw new Error(`[fahhh] Invalid route parameter folder: ${part}`);
			}
			return `:${param}`;
		}
		if (part.includes("[") || part.includes("]")) {
			throw new Error(`[fahhh] Invalid route folder: ${part}`);
		}
		return part;
	});

	const joined = routeParts.filter(Boolean).join("/");
	return joined ? `/api/${joined}` : "/api";
}

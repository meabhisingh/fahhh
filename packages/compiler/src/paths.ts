import path from "node:path";

export function toRoutePath(apiDir: string, filePath: string): string {
	const relative = path.relative(apiDir, filePath);
	const parts = relative.split(path.sep);

	// Only api/**/index.ts files become routes.
	parts.pop();

	const routeParts = parts.map((part) => {
		if (part.startsWith("[") && part.endsWith("]")) {
			return `:${part.slice(1, -1)}`;
		}
		return part;
	});

	const joined = routeParts.filter(Boolean).join("/");
	return joined ? `/api/${joined}` : "/api";
}

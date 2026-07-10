export interface CompiledRoute {
	pattern: RegExp;
	paramNames: string[];
	path: string;
}

/** Turns "/posts/:id" into a matchable regex, capturing param names in order. */
export function compileRoute(path: string): CompiledRoute {
	const paramNames: string[] = [];

	const regexPath = path
		.split("/")
		.filter(Boolean)
		.map((segment) => {
			if (segment.startsWith(":")) {
				paramNames.push(segment.slice(1));
				return "([^/]+)";
			}
			return segment.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
		})
		.join("/");

	return {
		pattern: new RegExp(`^/${regexPath}/?$`),
		paramNames,
		path,
	};
}

export function matchRoute(
	compiled: CompiledRoute,
	pathname: string,
): Record<string, string> | null {
	const match = compiled.pattern.exec(pathname);
	if (!match) return null;

	const params: Record<string, string> = {};
	compiled.paramNames.forEach((name, i) => {
		const value = match[i + 1];

		if (value === undefined) {
			throw new Error(`[fahhh] Missing route param: ${name}`);
		}

		params[name] = decodeURIComponent(value);
	});
	return params;
}

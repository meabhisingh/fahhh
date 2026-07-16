import type { RouteParams } from "./types";

type ParamKind = "single" | "catchAll" | "optionalCatchAll";

interface CompiledParam {
	name: string;
	kind: ParamKind;
}

export interface CompiledRoute {
	pattern: RegExp;
	params: CompiledParam[];
	path: string;
}

export class InvalidRouteParameterError extends Error {}

export function compileRoute(path: string): CompiledRoute {
	const params: CompiledParam[] = [];
	let regexPath = "";

	for (const segment of path.split("/").filter(Boolean)) {
		if (segment.startsWith(":")) {
			if (segment.endsWith("*?")) {
				params.push({
					name: segment.slice(1, -2),
					kind: "optionalCatchAll",
				});
				regexPath += "(?:/(.*))?";
				continue;
			}

			if (segment.endsWith("*")) {
				params.push({
					name: segment.slice(1, -1),
					kind: "catchAll",
				});
				regexPath += "/(.+)";
				continue;
			}

			params.push({ name: segment.slice(1), kind: "single" });
			regexPath += "/([^/]+)";
			continue;
		}

		regexPath += `/${segment.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`;
	}

	return {
		pattern: new RegExp(`^${regexPath || "/"}?$`),
		params,
		path,
	};
}

export function matchRoute(
	compiled: CompiledRoute,
	pathname: string,
): RouteParams | null {
	const match = compiled.pattern.exec(pathname);
	if (!match) return null;

	const params: RouteParams = {};

	compiled.params.forEach((param, index) => {
		const value = match[index + 1];

		if (param.kind === "optionalCatchAll") {
			params[param.name] = value
				? value.split("/").filter(Boolean).map(decodeRouteSegment)
				: undefined;
			return;
		}

		if (value === undefined) {
			throw new Error(`[fahhh] Missing route param: ${param.name}`);
		}

		if (param.kind === "catchAll") {
			params[param.name] = value
				.split("/")
				.filter(Boolean)
				.map(decodeRouteSegment);
			return;
		}

		params[param.name] = decodeRouteSegment(value);
	});

	return params;
}

function decodeRouteSegment(value: string): string {
	try {
		return decodeURIComponent(value);
	} catch {
		throw new InvalidRouteParameterError(
			"[fahhh] Invalid encoded route parameter",
		);
	}
}

import { HttpException } from "./errors";

export function json(data: unknown, init: ResponseInit = {}): Response {
	const headers = new Headers(init.headers);
	if (!headers.has("Content-Type")) {
		headers.set("Content-Type", "application/json");
	}
	return new Response(JSON.stringify(data), { ...init, headers });
}

export function text(body: string, init: ResponseInit = {}): Response {
	const headers = new Headers(init.headers);
	if (!headers.has("Content-Type")) {
		headers.set("Content-Type", "text/plain");
	}
	return new Response(body, { ...init, headers });
}

export function redirect(
	location: string,
	status: 301 | 302 | 307 | 308 = 302,
): Response {
	return new Response(null, {
		status,
		headers: { Location: location },
	});
}

export function notFound(message = "Not Found"): Response {
	return new Response(message, { status: 404 });
}

export function methodNotAllowed(allowedMethods: string[] = []): Response {
	const headers = new Headers();

	if (allowedMethods.length > 0) {
		headers.set("Allow", allowedMethods.join(", "));
	}

	return new Response("Method Not Allowed", {
		status: 405,
		headers,
	});
}

/**
 * Normalizes a handler's return value: if it's already a Response
 * (from redirect()/notFound()/json() etc), pass it through untouched.
 * Otherwise treat it as raw data and JSON-encode it -- this is what lets
 * `export async function GET(): Promise<User[]>` just `return users`.
 */
export function toResponse(result: unknown): Response {
	if (result instanceof Response) return result;

	if (result instanceof HttpException) return result.toResponse();

	if (result === undefined) {
		return new Response(null, {
			status: 204,
			headers: { [DATA_RESPONSE_HEADER]: "empty" },
		});
	}

	return json(result, { headers: { [DATA_RESPONSE_HEADER]: "json" } });
}
export const DATA_RESPONSE_HEADER = "X-Fahhh-Data";

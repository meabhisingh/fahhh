import type { ApiRequest } from "./types";

type RequestLike = ApiRequest | Request;

export function headers(req: RequestLike): Headers {
	return req instanceof Request ? req.headers : req.headers;
}

export function bearer(req: RequestLike): string | undefined {
	const value = headers(req).get("Authorization");
	if (!value) return undefined;

	const [scheme, token] = value.split(/\s+/, 2);
	return scheme?.toLowerCase() === "bearer" ? token : undefined;
}

export function basicAuth(
	req: RequestLike,
): { username: string; password: string } | undefined {
	const value = headers(req).get("Authorization");
	if (!value) return undefined;

	const [scheme, encoded] = value.split(/\s+/, 2);
	if (scheme?.toLowerCase() !== "basic" || !encoded) return undefined;

	const decoded = atob(encoded);
	const index = decoded.indexOf(":");

	if (index === -1) return undefined;

	return {
		username: decoded.slice(0, index),
		password: decoded.slice(index + 1),
	};
}

export function cookies(req: RequestLike): RequestCookies {
	return new RequestCookies(headers(req).get("cookie"));
}

export class RequestCookies {
	private readonly values = new Map<string, string[]>();

	constructor(cookieHeader: string | null) {
		for (const part of cookieHeader?.split(";") ?? []) {
			const index = part.indexOf("=");
			if (index === -1) continue;

			const name = part.slice(0, index).trim();
			const value = safeDecode(part.slice(index + 1).trim());

			if (!name) continue;

			const existing = this.values.get(name) ?? [];
			existing.push(value);
			this.values.set(name, existing);
		}
	}

	get(name: string): { name: string; value: string } | undefined {
		const value = this.values.get(name)?.[0];
		return value === undefined ? undefined : { name, value };
	}

	getAll(name: string): Array<{ name: string; value: string }> {
		return (this.values.get(name) ?? []).map((value) => ({ name, value }));
	}

	has(name: string): boolean {
		return this.values.has(name);
	}
}

function safeDecode(value: string): string {
	try {
		return decodeURIComponent(value);
	} catch {
		return value;
	}
}

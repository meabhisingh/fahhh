import type { ApiRequest, RouteParams } from "./types";

export function toApiRequest<TBody = undefined, TParams = RouteParams>(
	raw: Request,
	params: TParams,
): ApiRequest<TBody, TParams> {
	const url = new URL(raw.url);
	return {
		raw,
		params,
		query: url.searchParams,
		headers: raw.headers,
		json: () => raw.json() as Promise<TBody>,
	};
}

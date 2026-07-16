import type { ApiRequest, RouteParams } from "./types";

export function toApiRequest<TBody = undefined, TParams = RouteParams>(
	raw: Request,
	params: TParams,
): ApiRequest<TBody, TParams> {
	return {
		raw,
		params,
		headers: raw.headers,
		json: () => raw.json() as Promise<TBody>,
	};
}

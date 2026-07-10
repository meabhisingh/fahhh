import type { ApiRequest } from "./types";

export function toApiRequest<
	TBody = undefined,
	TParams = Record<string, string>,
>(raw: Request, params: TParams): ApiRequest<TBody, TParams> {
	return {
		raw,
		params,
		headers: raw.headers,
		json: () => raw.json() as Promise<TBody>,
	};
}

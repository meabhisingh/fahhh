export type HttpMethod =
	| "GET"
	| "POST"
	| "PUT"
	| "PATCH"
	| "DELETE"
	| "HEAD"
	| "OPTIONS";

export type RouteParamValue = string | string[] | undefined;
export type RouteParams = Record<string, RouteParamValue>;

/**
 * Wraps the real Fetch API Request so the same handler code runs
 * unmodified locally (Node) and on Cloudflare Workers (which already
 * hand you a real Request).
 *
 * `TBody` and `TParams` exist purely for compile-time typing:
 * - `TBody` lets the compiler infer a typed client call from
 *   `typeof someHandler`.
 * - `TParams` provides the typed shape of route parameters.
 *
 * At runtime, `.json()` simply forwards to the underlying `Request`.
 */
export interface ApiRequest<TBody = undefined, TParams = RouteParams> {
	raw: Request;
	params: TParams;
	query: URLSearchParams;
	headers: Headers;
	json(): Promise<TBody>;
}

/** A handler can return raw, JSON-serializable data OR a real Response (for redirects, custom status, etc). */
export type HandlerResult<TReturn = unknown> = TReturn | Response;

export type Handler<
	TReturn = unknown,
	TBody = undefined,
	TParams = RouteParams,
> = (
	req: ApiRequest<TBody, TParams>,
) => HandlerResult<TReturn> | Promise<HandlerResult<TReturn>>;

export type RouteHandler = Handler<unknown, never, never>;

export type Middleware = (
	req: ApiRequest<unknown, RouteParams>,
	next: () => Promise<Response>,
) => Response | Promise<Response>;

/** Shape of a loaded api/**\/index.ts module. */
export type RouteModule = Partial<Record<HttpMethod, RouteHandler>>;

/**
 * A single scanned route, ready to be dispatched by the dev server.
 * `path` uses `:param` syntax (compiler converts `[id]` -> `:id`).
 */
export interface RouteDefinition {
	path: string;
	methods: Partial<Record<HttpMethod, RouteHandler>>;
}

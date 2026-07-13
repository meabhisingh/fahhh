export type HttpMethod =
	| "GET"
	| "POST"
	| "PUT"
	| "PATCH"
	| "DELETE"
	| "HEAD"
	| "OPTIONS";

/**
 * Wraps the real Fetch API Request so the same handler code runs
 * unmodified locally (Node) and on Cloudflare Workers (which already
 * hand you a real Request). TBody exists purely so the compiler can
 * infer a typed client call from `typeof someHandler` -- at runtime
 * `.json()` just forwards to the real Request.
 */
export interface ApiRequest<
	TBody = undefined,
	TParams = Record<string, string>,
> {
	raw: Request;
	params: TParams;
	headers: Headers;
	json(): Promise<TBody>;
}

/** A handler can return raw, JSON-serializable data OR a real Response (for redirects, custom status, etc). */
export type HandlerResult<TReturn = unknown> = TReturn | Response;

export type Handler<
	TReturn = unknown,
	TBody = undefined,
	TParams = Record<string, string>,
> = (
	req: ApiRequest<TBody, TParams>,
) => HandlerResult<TReturn> | Promise<HandlerResult<TReturn>>;

export type RouteHandler = Handler<unknown, never, never>;

export type Middleware = (
	req: ApiRequest<unknown, Record<string, string>>,
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

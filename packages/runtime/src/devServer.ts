import type { Server, ServerResponse } from "node:http";
import { createServer as createNodeServer } from "node:http";
import { composeMiddleware } from "./middleware";
import {
	RequestBodyTooLargeError,
	sendFetchResponse,
	toFetchRequest,
} from "./nodeAdapter";
import { toApiRequest } from "./request";
import { methodNotAllowed, notFound, toResponse } from "./response";
import { compileRoute, InvalidRouteParameterError, matchRoute } from "./router";
import { serveStatic } from "./static";
import type {
	ApiRequest,
	HttpMethod,
	Middleware,
	RouteDefinition,
	RouteParams,
} from "./types";

export interface DevServerOptions {
	routes: RouteDefinition[];
	middleware?: Middleware[];
	port?: number;
	host?: string;
	maxBodySize?: number;
	silent?: boolean;
}

export interface DevServer extends Server {
	update(routes: RouteDefinition[], middleware?: Middleware[]): void;
}

export interface ServerOptions extends DevServerOptions {
	staticDir?: string;
	silent?: boolean;
}

type CompiledRoutes = ReturnType<typeof compileRoutes>;

async function dispatchApiRequest(
	fetchReq: Request,
	compiled: CompiledRoutes,
	middleware: Middleware[],
): Promise<Response | undefined> {
	const url = new URL(fetchReq.url);
	const method = fetchReq.method as HttpMethod;

	let pathMatched = false;
	let matchedParams: RouteParams | undefined;
	const allowedMethods = new Set<HttpMethod>();

	for (const { route, compiled: pattern } of compiled) {
		const params = matchRoute(pattern, url.pathname);
		if (!params) continue;

		pathMatched = true;
		matchedParams ??= params;

		for (const allowedMethod of Object.keys(route.methods) as HttpMethod[]) {
			allowedMethods.add(allowedMethod);
		}

		const handler =
			route.methods[method] ??
			(method === "HEAD" ? route.methods.GET : undefined);

		if (!handler) continue;

		const apiReq = toApiRequest(fetchReq, params);
		const normalizedHandler = async (
			req: ApiRequest<unknown>,
		): Promise<Response> =>
			toResponse(await handler(req as Parameters<typeof handler>[0]));

		const dispatch = composeMiddleware(middleware, normalizedHandler);
		return dispatch(apiReq);
	}

	if (pathMatched) {
		const apiReq = toApiRequest(fetchReq, matchedParams ?? {});
		const dispatch = composeMiddleware(middleware, () =>
			methodNotAllowed(Array.from(allowedMethods)),
		);
		return dispatch(apiReq);
	}

	return undefined;
}

async function handleRequestError(
	nodeRes: ServerResponse,
	error: unknown,
): Promise<void> {
	if (error instanceof RequestBodyTooLargeError) {
		await sendFetchResponse(
			nodeRes,
			new Response("Payload Too Large", {
				status: 413,
				headers: { Connection: "close" },
			}),
		);
		return;
	}

	if (error instanceof InvalidRouteParameterError) {
		await sendFetchResponse(
			nodeRes,
			new Response("Bad Request", { status: 400 }),
		);
		return;
	}

	console.error("fahhh request failed:", error);
	if (!nodeRes.headersSent) nodeRes.statusCode = 500;
	if (!nodeRes.writableEnded) nodeRes.end("Internal Server Error");
}

function listen(server: Server, port: number, host: string): Promise<void> {
	return new Promise((resolve, reject) => {
		const onError = (error: Error) => reject(error);
		server.once("error", onError);
		server.listen(port, host, () => {
			server.off("error", onError);
			resolve();
		});
	});
}

export async function createServer({
	routes,
	middleware = [],
	port = Number(process.env.PORT ?? 3000),
	host = "0.0.0.0",
	maxBodySize = 1024 * 1024,
	staticDir,
	silent = false,
}: ServerOptions): Promise<Server> {
	const state = {
		compiled: compileRoutes(routes),
		middleware,
	};

	const server = createNodeServer(async (nodeReq, nodeRes) => {
		try {
			const fetchReq = await toFetchRequest(nodeReq, maxBodySize);
			const apiResponse = await dispatchApiRequest(
				fetchReq,
				state.compiled,
				state.middleware,
			);

			if (apiResponse) {
				await sendFetchResponse(nodeRes, apiResponse);
				return;
			}

			if (staticDir) {
				const staticResponse = await serveStatic(fetchReq, staticDir);
				if (staticResponse) {
					await sendFetchResponse(nodeRes, staticResponse);
					return;
				}
			}

			await sendFetchResponse(nodeRes, notFound());
		} catch (error) {
			await handleRequestError(nodeRes, error);
		}
	});

	await listen(server, port, host);
	if (!silent) console.log(`fahhh server running on http://${host}:${port}`);
	return server;
}

export async function createDevServer({
	routes,
	middleware = [],
	port = 8787,
	host = "127.0.0.1",
	maxBodySize = 1024 * 1024,
	silent = false,
}: DevServerOptions): Promise<DevServer> {
	let currentMiddleware = middleware;
	let compiled = compileRoutes(routes);

	const server = createNodeServer(async (nodeReq, nodeRes) => {
		try {
			const fetchReq = await toFetchRequest(nodeReq, maxBodySize);
			const apiResponse = await dispatchApiRequest(
				fetchReq,
				compiled,
				currentMiddleware,
			);

			await sendFetchResponse(nodeRes, apiResponse ?? notFound());
		} catch (error) {
			await handleRequestError(nodeRes, error);
		}
	}) as DevServer;

	server.update = (nextRoutes, nextMiddleware = []) => {
		compiled = compileRoutes(nextRoutes);
		currentMiddleware = nextMiddleware;
	};

	await listen(server, port, host);

	if (!silent) {
		console.log(`fahhh api dev server running on http://${host}:${port}`);
	}

	return server;
}

function compileRoutes(routes: RouteDefinition[]) {
	return [...routes]
		.sort((a, b) => routeSpecificity(b.path) - routeSpecificity(a.path))
		.map((route) => ({ route, compiled: compileRoute(route.path) }));
}

function routeSpecificity(routePath: string): number {
	return routePath
		.split("/")
		.filter(Boolean)
		.reduce(
			(score, segment) => score * 2 + (segment.startsWith(":") ? 0 : 1),
			0,
		);
}

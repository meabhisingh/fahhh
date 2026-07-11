import { createServer, type Server } from "node:http";
import { composeMiddleware } from "./middleware";
import {
	RequestBodyTooLargeError,
	sendFetchResponse,
	toFetchRequest,
} from "./nodeAdapter";
import { toApiRequest } from "./request";
import { methodNotAllowed, notFound, toResponse } from "./response";
import { compileRoute, InvalidRouteParameterError, matchRoute } from "./router";
import type {
	ApiRequest,
	HttpMethod,
	Middleware,
	RouteDefinition,
} from "./types";

export interface DevServerOptions {
	routes: RouteDefinition[];
	/** From api/_middleware.ts, if present. Runs before every matched route. */
	middleware?: Middleware[];
	port?: number;
	host?: string;
	maxBodySize?: number;
}

export interface DevServer extends Server {
	update(routes: RouteDefinition[], middleware?: Middleware[]): void;
}

export async function createDevServer({
	routes,
	middleware = [],
	port = 8787,
	host = "127.0.0.1",
	maxBodySize = 1024 * 1024,
}: DevServerOptions): Promise<DevServer> {
	let currentMiddleware = middleware;
	let compiled = compileRoutes(routes);

	const server = createServer(async (nodeReq, nodeRes) => {
		try {
			const fetchReq = await toFetchRequest(nodeReq, maxBodySize);
			const url = new URL(fetchReq.url);
			const method = fetchReq.method as HttpMethod;

			let pathMatched = false;
			let matchedParams: Record<string, string> | undefined;
			const allowedMethods = new Set<HttpMethod>();

			for (const { route, compiled: pattern } of compiled) {
				const params = matchRoute(pattern, url.pathname);
				if (!params) continue;

				pathMatched = true;
				matchedParams ??= params;

				for (const allowedMethod of Object.keys(
					route.methods,
				) as HttpMethod[]) {
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

				const dispatch = composeMiddleware(
					currentMiddleware,
					normalizedHandler,
				);
				const response = await dispatch(apiReq);

				await sendFetchResponse(nodeRes, response);
				return;
			}

			if (pathMatched) {
				const apiReq = toApiRequest(fetchReq, matchedParams ?? {});
				const dispatch = composeMiddleware(currentMiddleware, () =>
					methodNotAllowed(Array.from(allowedMethods)),
				);
				await sendFetchResponse(nodeRes, await dispatch(apiReq));
				return;
			}

			await sendFetchResponse(nodeRes, notFound());
		} catch (error) {
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
	}) as DevServer;

	server.update = (nextRoutes, nextMiddleware = []) => {
		compiled = compileRoutes(nextRoutes);
		currentMiddleware = nextMiddleware;
	};

	await new Promise<void>((resolve, reject) => {
		const onError = (error: Error) => reject(error);
		server.once("error", onError);
		server.listen(port, host, () => {
			server.off("error", onError);
			resolve();
		});
	});
	console.log(`fahhh api dev server running on http://${host}:${port}`);

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

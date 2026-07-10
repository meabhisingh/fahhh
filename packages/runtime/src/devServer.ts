import { createServer, type Server } from "node:http";
import { composeMiddleware } from "./middleware";
import { sendFetchResponse, toFetchRequest } from "./nodeAdapter";
import { toApiRequest } from "./request";
import { methodNotAllowed, notFound, toResponse } from "./response";
import { compileRoute, matchRoute } from "./router";
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
}

export function createDevServer({
	routes,
	middleware = [],
	port = 8787,
}: DevServerOptions): Server {
	const compiled = routes.map((route) => ({
		route,
		compiled: compileRoute(route.path),
	}));

	const server = createServer(async (nodeReq, nodeRes) => {
		try {
			const fetchReq = await toFetchRequest(nodeReq);
			const url = new URL(fetchReq.url);
			const method = fetchReq.method as HttpMethod;

			let pathMatched = false;
			const allowedMethods = new Set<HttpMethod>();

			for (const { route, compiled: pattern } of compiled) {
				const params = matchRoute(pattern, url.pathname);
				if (!params) continue;

				pathMatched = true;

				for (const allowedMethod of Object.keys(
					route.methods,
				) as HttpMethod[]) {
					allowedMethods.add(allowedMethod);
				}

				const handler = route.methods[method];
				if (!handler) continue;

				const apiReq = toApiRequest(fetchReq, params);
				const normalizedHandler = async (
					req: ApiRequest<unknown>,
				): Promise<Response> =>
					toResponse(await handler(req as Parameters<typeof handler>[0]));

				const dispatch = composeMiddleware(middleware, normalizedHandler);
				const response = await dispatch(apiReq);

				await sendFetchResponse(nodeRes, response);
				return;
			}

			if (pathMatched) {
				await sendFetchResponse(
					nodeRes,
					methodNotAllowed(Array.from(allowedMethods)),
				);
				return;
			}

			await sendFetchResponse(nodeRes, notFound());
		} catch (error) {
			console.error("fahhh request failed:", error);
			nodeRes.statusCode = 500;
			nodeRes.end("Internal Server Error");
		}
	});

	server.listen(port, () => {
		console.log(`fahhh api dev server running on http://localhost:${port}`);
	});

	return server;
}

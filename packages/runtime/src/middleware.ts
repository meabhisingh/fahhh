import type { ApiRequest, Middleware } from "./types";

export function composeMiddleware(
	middlewares: Middleware[],
	finalHandler: (req: ApiRequest<unknown>) => Response | Promise<Response>,
) {
	return async (req: ApiRequest<unknown>): Promise<Response> => {
		let index = -1;

		async function dispatch(i: number): Promise<Response> {
			if (i <= index) {
				throw new Error("fahhh next() called multiple times in middleware");
			}
			index = i;

			const middleware = middlewares[i];
			if (!middleware) {
				return finalHandler(req);
			}
			return middleware(req, () => dispatch(i + 1));
		}

		return dispatch(0);
	};
}

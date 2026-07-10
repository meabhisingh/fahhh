import type { Middleware } from "fahhh";

export const middleware: Middleware = async (req, next) => {
  const response = await next();
  response.headers.set("X-Powered-By", "fahhh");
  return response;
};

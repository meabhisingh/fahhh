import fs from "node:fs/promises";
import path from "node:path";
import { scanApiRoutes } from "@fahhh/compiler";
import type { Middleware, RouteDefinition, RouteModule } from "@fahhh/runtime";
import { createJiti } from "jiti";

type MiddlewareExport = Middleware | Middleware[];
type MiddlewareModule = {
  default?: MiddlewareExport;
  middleware?: MiddlewareExport;
};

export async function loadApiRoutes(
  apiDir: string,
): Promise<RouteDefinition[]> {
  const manifest = await scanApiRoutes({ apiDir });
  const jiti = createJiti(import.meta.url);

  const routes: RouteDefinition[] = [];

  for (const scanned of manifest.routes) {
    const mod = (await jiti.import(scanned.filePath)) as RouteModule;
    const methods: RouteDefinition["methods"] = {};

    for (const method of scanned.methods) {
      const handler = mod[method];

      if (typeof handler !== "function") {
        throw new Error(
          `[fahhh] ${scanned.filePath} declares ${method}, but no handler was exported`,
        );
      }

      methods[method] = handler;
    }

    routes.push({
      path: scanned.routePath,
      methods,
    });
  }

  return routes;
}

export async function loadApiMiddleware(apiDir: string): Promise<Middleware[]> {
  const middlewareFile = path.join(apiDir, "_middleware.ts");

  try {
    await fs.access(middlewareFile);
  } catch {
    return [];
  }

  const jiti = createJiti(import.meta.url);
  const mod = (await jiti.import(middlewareFile)) as MiddlewareModule;
  const exported = resolveMiddlewareExport(mod);

  if (!exported) return [];
  return Array.isArray(exported) ? exported : [exported];
}

function resolveMiddlewareExport(
  mod: MiddlewareModule,
): MiddlewareExport | undefined {
  if (isMiddlewareExport(mod.middleware)) {
    return mod.middleware;
  }

  if (isMiddlewareExport(mod.default)) {
    return mod.default;
  }

  if (isObject(mod.default)) {
    const nested = mod.default as MiddlewareModule;

    if (isMiddlewareExport(nested.middleware)) {
      return nested.middleware;
    }
  }

  return undefined;
}

function isMiddlewareExport(value: unknown): value is MiddlewareExport {
  return typeof value === "function" || Array.isArray(value);
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

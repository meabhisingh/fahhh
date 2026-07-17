import path from "node:path";
import {
	scanApiRoutes,
	writeManifest,
	writeVirtualApiTypes,
} from "@fahhh/compiler";
import type { ApiManifest } from "@fahhh/deploy-core";
import type { Plugin, ViteDevServer } from "vite";

const VIRTUAL_API_ID = "virtual:api";
const RESOLVED_VIRTUAL_API_ID = "\0virtual:api";

export interface FahhhVitePluginOptions {
	root?: string;
	apiDir?: string;
	outDir?: string;
	apiPort?: number;
	apiBaseUrl?: string;
	onApiChange?: () => void | Promise<void>;
}

export function fahhh(options: FahhhVitePluginOptions = {}): Plugin {
	let root = "";
	let apiDir = "";
	let outDir = "";
	let manifest: ApiManifest = { routes: [], middlewareFiles: [] };
	let refreshQueue = Promise.resolve();
	const apiPort = options.apiPort ?? 8787;

	async function refresh(server?: ViteDevServer): Promise<void> {
		const previousShape = manifestShape(manifest);
		manifest = await scanApiRoutes({ apiDir });
		await writeManifest(outDir, manifest);
		await writeVirtualApiTypes(outDir, manifest);

		if (server && previousShape !== manifestShape(manifest)) {
			const mod = server.moduleGraph.getModuleById(RESOLVED_VIRTUAL_API_ID);
			if (mod) server.moduleGraph.invalidateModule(mod);
			server.ws.send({ type: "full-reload" });
		}

		await options.onApiChange?.();
	}

	function scheduleRefresh(server: ViteDevServer): void {
		refreshQueue = refreshQueue
			.then(() => refresh(server))
			.catch((error: unknown) => {
				server.config.logger.error(
					error instanceof Error ? error.message : String(error),
				);
			});
	}

	return {
		name: "fahhh:vite-plugin",

		config() {
			return {
				server: {
					proxy: {
						"/api": {
							target: `http://localhost:${apiPort}`,
							changeOrigin: true,
						},
					},
				},
			};
		},

		configResolved(config) {
			root = path.resolve(options.root ?? config.root);
			apiDir = path.resolve(root, options.apiDir ?? "src/api");
			outDir = path.resolve(root, options.outDir ?? ".fahhh");
		},

		async buildStart() {
			await refresh();
		},

		configureServer(server) {
			server.watcher.add(apiDir);

			for (const event of [
				"add",
				"change",
				"unlink",
				"addDir",
				"unlinkDir",
			] as const) {
				server.watcher.on(event, (filePath) => {
					if (isApiFile(apiDir, filePath)) {
						scheduleRefresh(server);
					}
				});
			}
		},

		resolveId(id) {
			if (id === VIRTUAL_API_ID) return RESOLVED_VIRTUAL_API_ID;
			return null;
		},

		load(id) {
			if (id === RESOLVED_VIRTUAL_API_ID) {
				return generateVirtualApiModule(manifest, options.apiBaseUrl);
			}

			return null;
		},
	};
}

export default fahhh;

function isApiFile(apiDir: string, filePath: string): boolean {
	const resolved = path.resolve(filePath);
	return resolved === apiDir || resolved.startsWith(`${apiDir}${path.sep}`);
}

function manifestShape(manifest: ApiManifest): string {
	return JSON.stringify(
		manifest.routes.map(({ routePath, methods }) => ({ routePath, methods })),
	);
}

function generateVirtualApiModule(
	manifest: ApiManifest,
	apiBaseUrl = "",
): string {
	const routes = manifest.routes
		.map((route) => {
			const methods = route.methods
				.map(
					(method) =>
						`${JSON.stringify(method)}: createClient(${JSON.stringify(route.routePath)}, ${JSON.stringify(method)})`,
				)
				.join(",\n");

			return `${JSON.stringify(route.routePath)}: {\n${methods}\n}`;
		})
		.join(",\n");

	return `
  const API_BASE_URL = ${JSON.stringify(apiBaseUrl)};

function createClient(routePath, method) {
  return async function callApi(input) {
    const options = input || {};
    const url = withQuery(
      joinUrl(API_BASE_URL, applyParams(routePath, options.params)),
      options.query,
    );
    const headers = new Headers(options.headers);

    const init = { method, headers, signal: options.signal };

    if (options.body !== undefined) {
      if (!headers.has("Content-Type")) {
        headers.set("Content-Type", "application/json");
      }
      init.body = JSON.stringify(options.body);
    }

    const response = await fetch(url, init);
    const dataType = response.headers.get("X-Fahhh-Data");

    if (dataType === "json") {
      return response.json();
    }

    if (dataType === "empty") return undefined;

    return response;
  };
}

function joinUrl(baseUrl, path) {
  if (!baseUrl) return path;
  return baseUrl.replace(/\\/+$/, "") + "/" + path.replace(/^\\/+/, "");
}

function withQuery(url, query) {
  if (!query) return url;

  const base =
    typeof window === "undefined" ? "http://fahhh.local" : window.location.origin;
  const parsed = new URL(url, base);

  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null) continue;

    const values = Array.isArray(value) ? value : [value];

    for (const item of values) {
      if (item === undefined || item === null) continue;
      parsed.searchParams.append(key, String(item));
    }
  }

  if (url.startsWith("http://") || url.startsWith("https://")) {
    return parsed.toString();
  }

  return parsed.pathname + parsed.search + parsed.hash;
}


function applyParams(routePath, params) {
  return routePath
    .split("/")
    .filter(Boolean)
    .flatMap((segment) => {
      if (!segment.startsWith(":")) return segment;

      if (segment.endsWith("*?")) {
        const name = segment.slice(1, -2);
        const value = params && params[name];
        if (value === undefined) return [];
        return encodeCatchAll(value, name).split("/");
      }

      if (segment.endsWith("*")) {
        const name = segment.slice(1, -1);
        const value = params && params[name];

        if (value === undefined) {
          throw new Error("[fahhh] Missing route param: " + name);
        }

        return encodeCatchAll(value, name).split("/");
      }

      const name = segment.slice(1);
      const value = params && params[name];

      if (value === undefined) {
        throw new Error("[fahhh] Missing route param: " + name);
      }

      return encodeURIComponent(String(value));
    })
    .join("/")
    .replace(/^/, "/");
}

function encodeCatchAll(value, name) {
  const parts = Array.isArray(value) ? value : [value];

  if (parts.length === 0) {
    throw new Error("[fahhh] Missing route param: " + name);
  }

  return parts.map((part) => encodeURIComponent(String(part))).join("/");
}

const api = {
${routes}
};

export default api;
`.trimStart();
}

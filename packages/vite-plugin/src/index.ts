import path from "node:path";
import {
	type ApiManifest,
	scanApiRoutes,
	writeManifest,
	writeVirtualApiTypes,
} from "@fahhh/compiler";
import type { Plugin, ViteDevServer } from "vite";

const VIRTUAL_API_ID = "virtual:api";
const RESOLVED_VIRTUAL_API_ID = "\0virtual:api";

export interface FahhhVitePluginOptions {
	root?: string;
	apiDir?: string;
	outDir?: string;
	apiPort?: number;
}

export function fahhh(options: FahhhVitePluginOptions = {}): Plugin {
	let root = "";
	let apiDir = "";
	let outDir = "";
	let manifest: ApiManifest = { routes: [] };
	const apiPort = options.apiPort ?? 8787;

	async function refresh(server?: ViteDevServer): Promise<void> {
		manifest = await scanApiRoutes({ apiDir });
		await writeManifest(outDir, manifest);
		await writeVirtualApiTypes(outDir, manifest);

		if (server) {
			const mod = server.moduleGraph.getModuleById(RESOLVED_VIRTUAL_API_ID);
			if (mod) server.moduleGraph.invalidateModule(mod);
			server.ws.send({ type: "full-reload" });
		}
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
			apiDir = path.resolve(root, options.apiDir ?? "api");
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
						void refresh(server);
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
				return generateVirtualApiModule(manifest);
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

function generateVirtualApiModule(manifest: ApiManifest): string {
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
function createClient(routePath, method) {
  return async function callApi(input) {
    const options = normalizeInput(input);
    const url = applyParams(routePath, options.params);
    const headers = new Headers(options.headers);

    const init = { method, headers };

    if (options.body !== undefined) {
      if (!headers.has("Content-Type")) {
        headers.set("Content-Type", "application/json");
      }
      init.body = JSON.stringify(options.body);
    }

    const response = await fetch(url, init);
    const contentType = response.headers.get("Content-Type") || "";

    if (contentType.includes("application/json")) {
      return response.json();
    }

    return response;
  };
}

function normalizeInput(input) {
  if (
    input &&
    typeof input === "object" &&
    ("body" in input || "params" in input || "headers" in input)
  ) {
    return input;
  }

  if (input === undefined) {
    return {};
  }

  return { body: input };
}

function applyParams(routePath, params) {
  if (!params) return routePath;

  return routePath.replace(/:([A-Za-z0-9_]+)/g, (_, name) => {
    const value = params[name];

    if (value === undefined) {
      throw new Error("[fahhh] Missing route param: " + name);
    }

    return encodeURIComponent(String(value));
  });
}

const api = {
${routes}
};

export default api;
`.trimStart();
}

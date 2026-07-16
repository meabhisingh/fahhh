import path from "node:path";
import { createDevServer, type DevServer } from "@fahhh/runtime";
import { fahhh } from "@fahhh/vite-plugin";
import {
	createServer as createViteServer,
	mergeConfig,
	normalizePath,
	type ViteDevServer,
} from "vite";
import { loadApiMiddleware, loadApiRoutes } from "./apiLoader";
import { loadConfig } from "./config";

export interface DevOptions {
	cwd?: string;
	config?: string;
	host?: string | boolean;
	port?: number;
}

export async function dev(options: DevOptions = {}) {
	const config = await loadConfig(options.cwd, options.config);

	let apiServer: DevServer | undefined;

	const viteServer = await createViteServer(
		mergeConfig(config.vite, {
			root: config.root,
			plugins: [
				fahhh({
					root: config.root,
					apiDir: config.apiDir,
					outDir: config.outDir,
					apiPort: config.apiPort,
					apiBaseUrl: config.apiBaseUrl,
					onApiChange: async () => {
						if (!apiServer) return;

						const loadModule = createViteApiLoader(config.root, viteServer);

						const [nextRoutes, nextMiddleware] = await Promise.all([
							loadApiRoutes(config.apiDir, loadModule),
							loadApiMiddleware(config.apiDir, loadModule),
						]);

						apiServer.update(nextRoutes, nextMiddleware);
					},
				}),
			],
			server: {
				host: options.host,
				port: options.port,
			},
		}),
	);

	try {
		const loadModule = createViteApiLoader(config.root, viteServer);

		const [routes, middleware] = await Promise.all([
			loadApiRoutes(config.apiDir, loadModule),
			loadApiMiddleware(config.apiDir, loadModule),
		]);

		apiServer = await createDevServer({
			routes,
			middleware,
			port: config.apiPort,
		});

		await viteServer.listen();
	} catch (error) {
		apiServer?.close();
		await viteServer.close();
		throw error;
	}

	viteServer.watcher.once("close", () => apiServer?.close());
	viteServer.printUrls();

	return {
		config,
		apiServer,
		viteServer,
	};
}

function createViteApiLoader(root: string, viteServer: ViteDevServer) {
	return (filePath: string) =>
		viteServer.ssrLoadModule(
			`${toViteModuleId(root, filePath)}?t=${Date.now()}`,
		);
}

function toViteModuleId(root: string, filePath: string): string {
	const relative = normalizePath(path.relative(root, filePath));

	if (relative.startsWith("..")) {
		return `/@fs/${normalizePath(filePath)}`;
	}

	return `/${relative}`;
}

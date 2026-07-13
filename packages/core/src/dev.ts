import { createDevServer } from "@fahhh/runtime";
import { fahhh } from "@fahhh/vite-plugin";
import { createServer as createViteServer, mergeConfig } from "vite";
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

	const routes = await loadApiRoutes(config.apiDir);
	const middleware = await loadApiMiddleware(config.apiDir);

	const apiServer = await createDevServer({
		routes,
		middleware,
		port: config.apiPort,
	});

	let viteServer: Awaited<ReturnType<typeof createViteServer>>;
	try {
		viteServer = await createViteServer(
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
							const [nextRoutes, nextMiddleware] = await Promise.all([
								loadApiRoutes(config.apiDir),
								loadApiMiddleware(config.apiDir),
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
	} catch (error) {
		apiServer.close();
		throw error;
	}

	try {
		await viteServer.listen();
	} catch (error) {
		apiServer.close();
		await viteServer.close();
		throw error;
	}
	viteServer.watcher.once("close", () => apiServer.close());
	viteServer.printUrls();

	return {
		config,
		apiServer,
		viteServer,
	};
}

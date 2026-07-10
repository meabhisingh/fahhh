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

	const apiServer = createDevServer({
		routes,
		middleware,
		port: config.apiPort,
	});

	const viteServer = await createViteServer(
		mergeConfig(config.vite, {
			root: config.root,
			plugins: [
				fahhh({
					root: config.root,
					apiDir: config.apiDir,
					outDir: config.outDir,
					apiPort: config.apiPort,
				}),
			],
			server: {
				host: options.host,
				port: options.port,
			},
		}),
	);

	await viteServer.listen();
	viteServer.printUrls();

	return {
		config,
		apiServer,
		viteServer,
	};
}

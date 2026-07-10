import path from "node:path";
import {
	scanApiRoutes,
	writeManifest,
	writeVirtualApiTypes,
} from "@fahhh/compiler";
import { fahhh } from "@fahhh/vite-plugin";
import { mergeConfig, build as viteBuild } from "vite";
import { loadConfig } from "./config";

export interface BuildOptions {
	cwd?: string;
	config?: string;
}

export async function build(options: BuildOptions = {}): Promise<void> {
	const config = await loadConfig(options.cwd, options.config);

	const manifest = await scanApiRoutes({ apiDir: config.apiDir });
	await writeManifest(config.outDir, manifest);
	await writeVirtualApiTypes(config.outDir, manifest);

	await viteBuild(
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
			build: {
				outDir: path.relative(config.root, config.distDir),
				emptyOutDir: true,
			},
		}),
	);
}

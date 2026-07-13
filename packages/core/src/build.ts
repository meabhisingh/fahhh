import path from "node:path";
import {
	bundleServer,
	generateServerEntry,
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
	assertSafeDistDir(config.root, config.distDir);

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
					apiBaseUrl: config.apiBaseUrl,
				}),
			],
			build: {
				outDir: path.relative(config.root, config.distDir),
				emptyOutDir: true,
			},
		}),
	);

	const serverOutDir = path.join(config.root, "dist-server");
	assertSafeDistDir(config.root, serverOutDir);

	const serverOutFile = path.join(serverOutDir, "api.js");
	const serverEntry = generateServerEntry(manifest, serverOutDir);

	await bundleServer(serverEntry, serverOutFile);
}

function assertSafeDistDir(root: string, distDir: string): void {
	const relative = path.relative(distDir, root);
	if (
		relative === "" ||
		(!relative.startsWith("..") && !path.isAbsolute(relative))
	) {
		throw new Error(
			`[fahhh] Refusing to empty unsafe dist directory: ${distDir}`,
		);
	}
}

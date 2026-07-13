import { join } from "node:path";
import type { DeployContext, DeploymentProvider } from "@fahhh/deploy-core";
import { build } from "./build";
import { loadConfig } from "./config";

export interface DeployOptions {
	cwd?: string;
	config?: string;
}

export async function deploy(options: DeployOptions = {}): Promise<void> {
	const config = await loadConfig(options.cwd, options.config);

	if (!config.adapter) {
		throw new Error("[fahhh] Missing deployment adapter in config");
	}

	await build(options);

	const provider = await resolveProvider(config.adapter);

	const serverDir = join(config.root, "dist-server");
	const serverEntry = join(serverDir, "api.js");

	const context: DeployContext = {
		root: config.root,
		distDir: config.distDir,
		apiDir: config.apiDir,
		outDir: config.outDir,
		manifestFile: join(config.outDir, "manifest.json"),
		serverDir,
		serverEntry,
	};

	await provider.build?.(context);
	await provider.uploadStatic(context);
	await provider.uploadFunctions(context);
	await provider.finish(context);
}

async function resolveProvider(
	provider:
		| DeploymentProvider
		| (() => DeploymentProvider | Promise<DeploymentProvider>),
): Promise<DeploymentProvider> {
	if (typeof provider === "function") {
		return provider();
	}

	return provider;
}

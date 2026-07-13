import fs from "node:fs/promises";
import path from "node:path";
import type { DeploymentProvider } from "@fahhh/deploy-core";
import { createJiti } from "jiti";
import type { UserConfig } from "vite";

export interface FahhhConfig {
	root?: string;
	apiBaseUrl?: string;
	apiDir?: string;
	webDir?: string;
	outDir?: string;
	distDir?: string;
	apiPort?: number;
	vite?: UserConfig;
	adapter?:
		| DeploymentProvider
		| (() => DeploymentProvider | Promise<DeploymentProvider>);
}

export interface ResolvedFahhhConfig {
	root: string;
	apiBaseUrl?: string;
	apiDir: string;
	webDir: string;
	outDir: string;
	distDir: string;
	apiPort: number;
	vite: UserConfig;
	adapter?: FahhhConfig["adapter"];
}

type ConfigModule = {
	default?: FahhhConfig;
	config?: FahhhConfig;
};

const CONFIG_FILES = [
	"fahhh.config.ts",
	"fahhh.config.mts",
	"fahhh.config.js",
	"framework.config.ts",
	"framework.config.js",
];

export function defineConfig(config: FahhhConfig): FahhhConfig {
	return config;
}

export async function loadConfig(
	cwd = process.cwd(),
	configFile?: string,
): Promise<ResolvedFahhhConfig> {
	const resolvedConfigFile = configFile
		? path.resolve(cwd, configFile)
		: await findConfigFile(cwd);

	if (!resolvedConfigFile) {
		return resolveConfig({}, cwd);
	}

	const jiti = createJiti(import.meta.url);
	const mod = (await jiti.import(resolvedConfigFile)) as ConfigModule;
	const config = mod.default ?? mod.config ?? {};

	return resolveConfig(config, cwd);
}

function resolveConfig(
	config: FahhhConfig,
	baseDir: string,
): ResolvedFahhhConfig {
	const root = path.resolve(baseDir, config.root ?? ".");
	const apiPort = config.apiPort ?? 8787;
	if (!Number.isInteger(apiPort) || apiPort < 1 || apiPort > 65_535) {
		throw new Error(`[fahhh] Invalid API port: ${apiPort}`);
	}

	return {
		root,
		apiBaseUrl: config.apiBaseUrl,
		apiDir: path.resolve(root, config.apiDir ?? "src/api"),
		webDir: path.resolve(root, config.webDir ?? "src/web"),
		outDir: path.resolve(root, config.outDir ?? ".fahhh"),
		distDir: path.resolve(root, config.distDir ?? "dist"),
		apiPort,
		vite: config.vite ?? {},
		adapter: config.adapter,
	};
}

async function findConfigFile(cwd: string): Promise<string | undefined> {
	for (const file of CONFIG_FILES) {
		const fullPath = path.resolve(cwd, file);

		try {
			await fs.access(fullPath);
			return fullPath;
		} catch {
			// keep looking
		}
	}

	return undefined;
}

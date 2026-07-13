import type { HttpMethod } from "@fahhh/runtime";

export interface ManifestRoute {
	filePath: string;
	routePath: string;
	methods: HttpMethod[];
}

export interface ApiManifest {
	routes: ManifestRoute[];
	middlewareFiles: string[];
}

export interface DeployContext {
	root: string;
	distDir: string;
	apiDir: string;
	outDir: string;
	manifestFile: string;
	serverDir: string;
	serverEntry: string;
}

export interface DeploymentProvider {
	name: string;
	build?(context: DeployContext): Promise<void> | void;
	uploadStatic(context: DeployContext): Promise<void> | void;
	uploadFunctions(context: DeployContext): Promise<void> | void;
	finish(context: DeployContext): Promise<void> | void;
}

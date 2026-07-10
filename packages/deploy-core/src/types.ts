export interface DeployContext {
	root: string;
	distDir: string;
	apiDir: string;
	outDir: string;
	manifestFile: string;
}

export interface DeploymentProvider {
	name: string;

	build?(context: DeployContext): Promise<void> | void;

	uploadStatic(context: DeployContext): Promise<void> | void;

	uploadFunctions(context: DeployContext): Promise<void> | void;

	finish(context: DeployContext): Promise<void> | void;
}

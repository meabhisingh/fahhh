import type { HttpMethod } from "@fahhh/runtime";

export interface ScannedRoute {
	filePath: string;
	routePath: string;
	methods: HttpMethod[];
}

export interface ApiManifest {
	routes: ScannedRoute[];
}

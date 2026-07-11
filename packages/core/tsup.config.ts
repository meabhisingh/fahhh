import { defineConfig } from "tsup";

export default defineConfig({
	entry: ["src/index.ts", "src/cli.ts"],
	format: ["esm"],
	clean: true,
	platform: "node",
	target: "es2022",
	skipNodeModulesBundle: true,
	splitting: false,
	noExternal: ["@fahhh/compiler", "@fahhh/deploy-core", "@fahhh/vite-plugin"],
	external: ["@fahhh/runtime", "vite", "jiti"],
});

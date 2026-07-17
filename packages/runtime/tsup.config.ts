import { defineConfig } from "tsup";

export default defineConfig({
	entry: ["src/index.ts", "src/worker.ts", "src/errors.ts", "src/utils.ts"],
	format: ["esm"],
	clean: true,
	platform: "neutral",
	target: "es2022",
	skipNodeModulesBundle: true,
});

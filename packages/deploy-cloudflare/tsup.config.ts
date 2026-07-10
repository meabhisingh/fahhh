import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm"],
  clean: true,
  platform: "node",
  target: "es2022",
  skipNodeModulesBundle: true,
});

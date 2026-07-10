import fs from "node:fs/promises";
import path from "node:path";
import type { ApiManifest } from "./types";

export async function writeManifest(
	outDir: string,
	manifest: ApiManifest,
): Promise<void> {
	await fs.mkdir(outDir, { recursive: true });

	const filePath = path.join(outDir, "manifest.json");
	await fs.writeFile(filePath, JSON.stringify(manifest, null, 2));
}

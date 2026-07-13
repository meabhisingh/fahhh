import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";

export async function pathExists(filePath: string): Promise<boolean> {
	try {
		await fs.access(filePath);
		return true;
	} catch (error) {
		if ((error as NodeJS.ErrnoException).code === "ENOENT") return false;
		throw error;
	}
}

export async function emptyDir(dir: string): Promise<void> {
	await fs.rm(dir, { recursive: true, force: true });
	await fs.mkdir(dir, { recursive: true });
}

export async function copyDir(from: string, to: string): Promise<void> {
	await fs.mkdir(to, { recursive: true });

	const entries = await fs.readdir(from, { withFileTypes: true });

	for (const entry of entries) {
		const source = path.join(from, entry.name);
		const target = path.join(to, entry.name);

		if (entry.isDirectory()) {
			await copyDir(source, target);
			continue;
		}

		if (entry.isFile()) {
			await fs.copyFile(source, target);
		}
	}
}

export async function hashFile(filePath: string): Promise<string> {
	const content = await fs.readFile(filePath);
	return crypto.createHash("sha256").update(content).digest("hex");
}

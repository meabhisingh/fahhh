#!/usr/bin/env node

import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const dirname = path.dirname(fileURLToPath(import.meta.url));

async function main(): Promise<void> {
	const projectName = process.argv[2];

	if (!projectName) {
		console.error("Usage: npm create fahhh@latest <project-name>");
		process.exitCode = 1;
		return;
	}

	const targetDir = path.resolve(process.cwd(), projectName);
	const packageName = projectName.startsWith("@")
		? projectName.replaceAll("\\", "/")
		: path.basename(targetDir);
	assertValidPackageName(packageName);

	const targetExisted = await assertCanCreate(targetDir);
	try {
		await copyTemplate(targetDir, packageName);
	} catch (error) {
		if (!targetExisted)
			await fs.rm(targetDir, { recursive: true, force: true });
		throw error;
	}

	console.log(
		`
Created ${projectName}

Next:
  cd ${projectName}
  pnpm install
  pnpm dev
`.trim(),
	);
}

async function assertCanCreate(targetDir: string): Promise<boolean> {
	try {
		const entries = await fs.readdir(targetDir);

		if (entries.length > 0) {
			throw new Error(`[fahhh] Target directory is not empty: ${targetDir}`);
		}
		return true;
	} catch (error) {
		if ((error as NodeJS.ErrnoException).code === "ENOENT") {
			return false;
		}

		throw error;
	}
}

function assertValidPackageName(packageName: string): void {
	const segment = "[a-z0-9][a-z0-9._-]*";
	if (!new RegExp(`^(?:@${segment}/)?${segment}$`).test(packageName)) {
		throw new Error(`[fahhh] Invalid package name: ${packageName}`);
	}
}

async function copyTemplate(
	targetDir: string,
	projectName: string,
): Promise<void> {
	const templateDir = path.resolve(dirname, "template");
	await copyDir(templateDir, targetDir, projectName);
}

async function copyDir(
	from: string,
	to: string,
	projectName: string,
): Promise<void> {
	await fs.mkdir(to, { recursive: true });

	const entries = await fs.readdir(from, { withFileTypes: true });

	for (const entry of entries) {
		const source = path.join(from, entry.name);
		const targetName = entry.name === "_gitignore" ? ".gitignore" : entry.name;
		const target = path.join(to, targetName);

		if (entry.isDirectory()) {
			await copyDir(source, target, projectName);
			continue;
		}

		if (entry.isFile()) {
			if (entry.name === "package.json") {
				const contents = await fs.readFile(source, "utf8");
				await fs.writeFile(
					target,
					contents.replaceAll("__PROJECT_NAME__", projectName),
				);
			} else {
				await fs.copyFile(source, target);
			}
		}
	}
}

main().catch((error) => {
	console.error(error instanceof Error ? error.message : error);
	process.exitCode = 1;
});

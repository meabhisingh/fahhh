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

  await assertCanCreate(targetDir);
  await copyTemplate(targetDir, projectName);

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

async function assertCanCreate(targetDir: string): Promise<void> {
  try {
    const entries = await fs.readdir(targetDir);

    if (entries.length > 0) {
      throw new Error(`[fahhh] Target directory is not empty: ${targetDir}`);
    }
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return;
    }

    throw error;
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
      let contents = await fs.readFile(source, "utf8");
      contents = contents.replaceAll("__PROJECT_NAME__", projectName);
      await fs.writeFile(target, contents);
    }
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});

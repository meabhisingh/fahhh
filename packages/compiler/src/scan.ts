import fs from "node:fs/promises";
import path from "node:path";
import type { HttpMethod } from "@fahhh/runtime";
import { toRoutePath } from "./paths";
import type { ApiManifest, ScannedRoute } from "./types";

const HTTP_METHODS: HttpMethod[] = ["GET", "POST", "PUT", "PATCH", "DELETE"];

export interface ScanApiOptions {
  apiDir: string;
}

export async function scanApiRoutes({
  apiDir,
}: ScanApiOptions): Promise<ApiManifest> {
  const exists = await pathExists(apiDir);
  if (!exists) return { routes: [] };

  const files = await walk(apiDir);
  const routes: ScannedRoute[] = [];

  for (const filePath of files) {
    if (!filePath.endsWith(`${path.sep}index.ts`)) continue;

    const source = await fs.readFile(filePath, "utf8");

    const methods = HTTP_METHODS.filter((method) =>
      new RegExp(`export\\s+(async\\s+)?function\\s+${method}\\b`).test(source),
    );

    if (methods.length === 0) continue;

    routes.push({
      filePath,
      routePath: toRoutePath(apiDir, filePath),
      methods,
    });
  }

  routes.sort((a, b) => a.routePath.localeCompare(b.routePath));
  return { routes };
}

async function walk(dir: string): Promise<string[]> {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      files.push(...(await walk(fullPath)));
    }

    if (entry.isFile()) {
      files.push(fullPath);
    }
  }

  return files;
}

async function pathExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

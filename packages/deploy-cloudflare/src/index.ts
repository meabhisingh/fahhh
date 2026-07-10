import fs from "node:fs/promises";
import path from "node:path";
import { spawn } from "node:child_process";
import type { DeployContext, DeploymentProvider } from "@fahhh/deploy-core";
import { copyDir, emptyDir, pathExists } from "@fahhh/deploy-core";

interface ManifestRoute {
  filePath: string;
  routePath: string;
  methods: string[];
}

interface ApiManifest {
  routes: ManifestRoute[];
}

export interface CloudflarePagesOptions {
  projectName?: string;
  branch?: string;
  stagingDir?: string;
}

export function cloudflarePages(
  options: CloudflarePagesOptions = {},
): DeploymentProvider {
  return {
    name: "cloudflare-pages",

    async uploadStatic(context) {
      if (!(await pathExists(context.distDir))) {
        throw new Error(`[fahhh] Missing build output: ${context.distDir}`);
      }

      const { stageRoot, stageDist } = getStagePaths(context, options);
      await emptyDir(stageRoot);
      await copyDir(context.distDir, stageDist);
    },

    async uploadFunctions(context) {
      const { stageFunctions } = getStagePaths(context, options);
      await emptyDir(stageFunctions);

      const manifest = await readManifest(context.manifestFile);

      for (const route of manifest.routes) {
        await writeCloudflareFunction(stageFunctions, route);
      }
    },

    async finish(context) {
      const { stageRoot } = getStagePaths(context, options);

      const args = ["wrangler", "pages", "deploy", "dist"];

      if (options.projectName) {
        args.push("--project-name", options.projectName);
      }

      if (options.branch) {
        args.push("--branch", options.branch);
      }

      await runCommand("npx", args, stageRoot);
    },
  };
}

function getStagePaths(
  context: DeployContext,
  options: CloudflarePagesOptions,
) {
  const stageRoot = path.resolve(
    options.stagingDir ?? path.join(context.outDir, "cloudflare"),
  );

  return {
    stageRoot,
    stageDist: path.join(stageRoot, "dist"),
    stageFunctions: path.join(stageRoot, "functions"),
  };
}

async function readManifest(manifestFile: string): Promise<ApiManifest> {
  const source = await fs.readFile(manifestFile, "utf8");
  return JSON.parse(source) as ApiManifest;
}

async function writeCloudflareFunction(
  functionsDir: string,
  route: ManifestRoute,
): Promise<void> {
  const functionFile = toFunctionFile(functionsDir, route.routePath);
  await fs.mkdir(path.dirname(functionFile), { recursive: true });

  const routeImport = toImportSpecifier(functionFile, route.filePath);
  await fs.writeFile(functionFile, generateFunctionSource(route, routeImport));
}

function toFunctionFile(functionsDir: string, routePath: string): string {
  const parts = routePath
    .replace(/^\/+/, "")
    .split("/")
    .filter(Boolean)
    .map((part) => (part.startsWith(":") ? `[${part.slice(1)}]` : part));

  return path.join(functionsDir, ...parts) + ".ts";
}

function generateFunctionSource(
  route: ManifestRoute,
  routeImport: string,
): string {
  const exports = route.methods
    .map((method) => {
      const exportName = toCloudflareExport(method);
      return `export async function ${exportName}(context: PagesContext): Promise<Response> {
  return dispatch(context, ${JSON.stringify(method)});
}`;
    })
    .join("\n\n");

  const handlers = route.methods
    .map((method) => `  ${JSON.stringify(method)}: routeModule.${method}`)
    .join(",\n");

  return `
import { methodNotAllowed, toApiRequest, toResponse } from "@fahhh/runtime/worker";
import * as routeModule from ${JSON.stringify(routeImport)};

type PagesContext = {
  request: Request;
  params?: Record<string, string>;
};

const handlers = {
${handlers}
};

${exports}

async function dispatch(context: PagesContext, method: keyof typeof handlers): Promise<Response> {
  const handler = handlers[method];

  if (!handler) {
    return methodNotAllowed(Object.keys(handlers));
  }

  const req = toApiRequest(context.request, context.params ?? {});
  return toResponse(await handler(req as any));
}
`.trimStart();
}

function toCloudflareExport(method: string): string {
  const lower = method.toLowerCase();
  return `onRequest${lower[0].toUpperCase()}${lower.slice(1)}`;
}

function toImportSpecifier(fromFile: string, toFile: string): string {
  const target = toFile.replace(/\.[cm]?[tj]sx?$/, "");
  let relative = path
    .relative(path.dirname(fromFile), target)
    .replaceAll("\\", "/");

  if (!relative.startsWith(".")) {
    relative = `./${relative}`;
  }

  return relative;
}

function runCommand(
  command: string,
  args: string[],
  cwd: string,
): Promise<void> {
  const executable = process.platform === "win32" ? `${command}.cmd` : command;

  return new Promise((resolve, reject) => {
    const child = spawn(executable, args, {
      cwd,
      stdio: "inherit",
    });

    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) resolve();
      else
        reject(
          new Error(
            `[fahhh] ${command} ${args.join(" ")} failed with exit code ${code}`,
          ),
        );
    });
  });
}

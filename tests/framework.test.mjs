import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { promisify } from "node:util";
import { scanApiRoutes } from "../packages/compiler/dist/index.js";
import { cloudflarePages } from "../packages/deploy-cloudflare/dist/index.js";
import {
	createDevServer,
	json,
	toResponse,
} from "../packages/runtime/dist/index.js";
import { fahhh } from "../packages/vite-plugin/dist/index.js";

const execFileAsync = promisify(execFile);

async function temporaryDirectory(t) {
	const directory = await fs.mkdtemp(path.join(os.tmpdir(), "fahhh-test-"));
	t.after(() => fs.rm(directory, { recursive: true, force: true }));
	return directory;
}

test("scanner prioritizes static routes and detects exported constants", async (t) => {
	const root = await temporaryDirectory(t);
	const apiDir = path.join(root, "src", "api");
	await fs.mkdir(path.join(apiDir, "users", "[id]"), { recursive: true });
	await fs.mkdir(path.join(apiDir, "users", "new"), { recursive: true });
	await fs.writeFile(
		path.join(apiDir, "users", "[id]", "index.ts"),
		"export async function GET() { return {}; }",
	);
	await fs.writeFile(
		path.join(apiDir, "users", "new", "index.ts"),
		"// export function POST() {}\nexport const GET = async () => ({});",
	);

	const manifest = await scanApiRoutes({ apiDir });
	assert.deepEqual(
		manifest.routes.map((route) => [route.routePath, route.methods]),
		[
			["/api/users/new", ["GET"]],
			["/api/users/:id", ["GET"]],
		],
	);
});

test("scanner rejects ambiguous dynamic routes", async (t) => {
	const root = await temporaryDirectory(t);
	const apiDir = path.join(root, "api");
	for (const parameter of ["id", "slug"]) {
		const directory = path.join(apiDir, `[${parameter}]`);
		await fs.mkdir(directory, { recursive: true });
		await fs.writeFile(
			path.join(directory, "index.ts"),
			"export function GET() { return {}; }",
		);
	}

	await assert.rejects(() => scanApiRoutes({ apiDir }), /Ambiguous API routes/);
});

test("plain values are marked for decoding while explicit responses are preserved", async () => {
	const dataResponse = toResponse({ ok: true });
	assert.equal(dataResponse.headers.get("X-Fahhh-Data"), "json");
	assert.deepEqual(await dataResponse.json(), { ok: true });

	const explicitResponse = json({ ok: false }, { status: 400 });
	assert.equal(toResponse(explicitResponse), explicitResponse);
	assert.equal(explicitResponse.headers.get("X-Fahhh-Data"), null);

	const emptyResponse = toResponse(undefined);
	assert.equal(emptyResponse.status, 204);
	assert.equal(emptyResponse.headers.get("X-Fahhh-Data"), "empty");
});

test("generated client uses an explicit input envelope and preserves responses", async (t) => {
	const root = await temporaryDirectory(t);
	const apiDir = path.join(root, "src", "api", "items", "[id]");
	await fs.mkdir(apiDir, { recursive: true });
	await fs.writeFile(
		path.join(apiDir, "index.ts"),
		"export async function POST(request: { json(): Promise<{ headers: string }> }) { return request.json(); }",
	);
	const plugin = fahhh({ root });
	plugin.configResolved({ root });
	await plugin.buildStart();
	const resolvedId = plugin.resolveId("virtual:api");
	const source = plugin.load(resolvedId);
	assert.equal(typeof source, "string");
	const module = await import(
		`data:text/javascript;base64,${Buffer.from(source).toString("base64")}`
	);

	const originalFetch = globalThis.fetch;
	t.after(() => {
		globalThis.fetch = originalFetch;
	});
	let request;
	globalThis.fetch = async (url, init) => {
		request = { url, init };
		return new Response(JSON.stringify({ ok: true }), {
			headers: { "X-Fahhh-Data": "json" },
		});
	};
	const result = await module.default["/api/items/:id"].POST({
		params: { id: "a/b" },
		body: { headers: "part of the body" },
	});
	assert.deepEqual(result, { ok: true });
	assert.equal(request.url, "/api/items/a%2Fb");
	assert.equal(
		request.init.body,
		JSON.stringify({ headers: "part of the body" }),
	);

	globalThis.fetch = async () => new Response("missing", { status: 404 });
	const response = await module.default["/api/items/:id"].POST({
		params: { id: "missing" },
		body: { headers: "value" },
	});
	assert.ok(response instanceof Response);
	assert.equal(response.status, 404);
	await assert.rejects(
		() =>
			module.default["/api/items/:id"].POST({
				body: { headers: "value" },
			}),
		/Missing route param: id/,
	);
});

test("development server prioritizes static routes and accepts live updates", async (t) => {
	const server = await createDevServer({
		port: 0,
		routes: [
			{
				path: "/api/users/:id",
				methods: { GET: (request) => ({ route: request.params.id }) },
			},
			{
				path: "/api/users/new",
				methods: { GET: () => ({ route: "static" }) },
			},
		],
	});
	t.after(() => server.close());
	const address = server.address();
	assert.ok(address && typeof address === "object");
	const baseUrl = `http://127.0.0.1:${address.port}`;

	assert.deepEqual(await (await fetch(`${baseUrl}/api/users/new`)).json(), {
		route: "static",
	});

	server.update([
		{
			path: "/api/users/new",
			methods: { GET: () => ({ route: "updated" }) },
		},
	]);
	assert.deepEqual(await (await fetch(`${baseUrl}/api/users/new`)).json(), {
		route: "updated",
	});
});

test("Cloudflare adapter rejects a staging directory that contains the project", async (t) => {
	const root = await temporaryDirectory(t);
	const distDir = path.join(root, "dist");
	await fs.mkdir(distDir);
	const provider = cloudflarePages({ stagingDir: root });

	await assert.rejects(
		() =>
			provider.uploadStatic({
				root,
				distDir,
				apiDir: path.join(root, "src", "api"),
				outDir: path.join(root, ".fahhh"),
				manifestFile: path.join(root, ".fahhh", "manifest.json"),
			}),
		/unsafe Cloudflare staging directory/,
	);
});

test("Cloudflare adapter generates functions and middleware that Wrangler compiles", async (t) => {
	const root = path.resolve("examples/basic");
	const stageRoot = path.join(root, ".fahhh", "test-cloudflare");
	t.after(() => fs.rm(stageRoot, { recursive: true, force: true }));
	const provider = cloudflarePages({ stagingDir: stageRoot });
	const context = {
		root,
		distDir: path.join(root, "dist"),
		apiDir: path.join(root, "src", "api"),
		outDir: path.join(root, ".fahhh"),
		manifestFile: path.join(root, ".fahhh", "manifest.json"),
	};
	await provider.uploadStatic(context);
	await provider.uploadFunctions(context);

	const functionsDir = path.join(stageRoot, "functions");
	await fs.access(path.join(functionsDir, "api", "_middleware.js"));
	const workerDir = await temporaryDirectory(t);
	const pnpm = process.platform === "win32" ? "pnpm.cmd" : "pnpm";
	await execFileAsync(
		pnpm,
		[
			"--filter",
			"@fahhh/cloudflare",
			"exec",
			"wrangler",
			"pages",
			"functions",
			"build",
			functionsDir,
			"--outdir",
			workerDir,
		],
		{ cwd: path.resolve(), shell: process.platform === "win32" },
	);
});

test("create-fahhh copies its packaged template", async (t) => {
	const root = await temporaryDirectory(t);
	await execFileAsync(
		process.execPath,
		[path.resolve("packages/create-app/dist/index.js"), "demo-app"],
		{ cwd: root },
	);
	const packageJson = JSON.parse(
		await fs.readFile(path.join(root, "demo-app", "package.json"), "utf8"),
	);
	assert.equal(packageJson.name, "demo-app");
	assert.equal(packageJson.dependencies.fahhh, "^0.1.0");
	assert.equal(packageJson.dependencies.clsx, "^2.1.1");
	await fs.access(path.join(root, "demo-app", ".gitignore"));
	await fs.access(path.join(root, "demo-app", "public", "favicon.svg"));
});

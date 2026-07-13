import fs from "node:fs/promises";
import path from "node:path";

export async function serveStatic(
	req: Request,
	staticDir: string,
): Promise<Response | undefined> {
	if (req.method !== "GET" && req.method !== "HEAD") return undefined;

	const url = new URL(req.url);
	const root = path.resolve(staticDir);
	const requested = path.resolve(root, `.${decodeURIComponent(url.pathname)}`);

	if (requested !== root && !requested.startsWith(`${root}${path.sep}`)) {
		return new Response("Bad Request", { status: 400 });
	}

	let file = (await isFile(requested)) ? requested : undefined;

	const acceptsHtml = req.headers.get("accept")?.includes("text/html");
	if (
		!file &&
		!path.extname(requested) &&
		(url.pathname === "/" || acceptsHtml)
	) {
		const indexFile = path.join(root, "index.html");
		file = (await isFile(indexFile)) ? indexFile : undefined;
	}

	if (!file) return undefined;

	const buffer = await fs.readFile(file);
	const body =
		req.method === "HEAD"
			? null
			: buffer.buffer.slice(
					buffer.byteOffset,
					buffer.byteOffset + buffer.byteLength,
				);

	return new Response(body, {
		headers: { "Content-Type": contentType(file) },
	});
}

async function isFile(file: string): Promise<boolean> {
	try {
		return (await fs.stat(file)).isFile();
	} catch {
		return false;
	}
}

function contentType(file: string): string {
	if (file.endsWith(".html")) return "text/html; charset=utf-8";
	if (file.endsWith(".js")) return "text/javascript; charset=utf-8";
	if (file.endsWith(".css")) return "text/css; charset=utf-8";
	if (file.endsWith(".json")) return "application/json; charset=utf-8";
	if (file.endsWith(".svg")) return "image/svg+xml";
	if (file.endsWith(".png")) return "image/png";
	if (file.endsWith(".jpg") || file.endsWith(".jpeg")) return "image/jpeg";
	return "application/octet-stream";
}

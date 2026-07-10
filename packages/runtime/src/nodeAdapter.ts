import type { IncomingMessage, ServerResponse } from "node:http";

export async function toFetchRequest(req: IncomingMessage): Promise<Request> {
	const host = req.headers.host ?? "localhost";
	const url = new URL(req.url ?? "/", `http://${host}`);

	const headers = new Headers();
	for (const [key, value] of Object.entries(req.headers)) {
		if (value === undefined) continue;
		headers.set(key, Array.isArray(value) ? value.join(", ") : value);
	}

	const method = req.method ?? "GET";
	const hasBody = method !== "GET" && method !== "HEAD";
	const body = hasBody ? await readBody(req) : undefined;

	return new Request(url, {
		method,
		headers,
		// Fetch spec forbids a body on GET/HEAD requests.
		body,
	});
}

export async function sendFetchResponse(
	res: ServerResponse,
	response: Response,
): Promise<void> {
	res.statusCode = response.status;
	response.headers.forEach((value, key) => {
		res.setHeader(key, value);
	});

	if (!response.body) {
		res.end();
		return;
	}

	const buffer = Buffer.from(await response.arrayBuffer());
	res.end(buffer);
}

function readBody(req: IncomingMessage): Promise<ArrayBuffer> {
	return new Promise((resolve, reject) => {
		const chunks: Buffer[] = [];

		req.on("data", (chunk: Buffer) => chunks.push(chunk));
		req.on("end", () => {
			const buffer = Buffer.concat(chunks);
			resolve(
				buffer.buffer.slice(
					buffer.byteOffset,
					buffer.byteOffset + buffer.byteLength,
				),
			);
		});
		req.on("error", reject);
	});
}

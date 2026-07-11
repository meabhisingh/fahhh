import type { IncomingMessage, ServerResponse } from "node:http";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";

export class RequestBodyTooLargeError extends Error {}

export async function toFetchRequest(
	req: IncomingMessage,
	maxBodySize = 1024 * 1024,
): Promise<Request> {
	const host = req.headers.host ?? "localhost";
	const url = new URL(req.url ?? "/", `http://${host}`);

	const headers = new Headers();
	for (const [key, value] of Object.entries(req.headers)) {
		if (value === undefined) continue;
		headers.set(key, Array.isArray(value) ? value.join(", ") : value);
	}

	const method = req.method ?? "GET";
	const hasBody = method !== "GET" && method !== "HEAD";
	const contentLength = Number(req.headers["content-length"]);
	if (
		hasBody &&
		Number.isFinite(contentLength) &&
		contentLength > maxBodySize
	) {
		throw new RequestBodyTooLargeError("[fahhh] Request body too large");
	}
	const body = hasBody ? await readBody(req, maxBodySize) : undefined;

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
		if (key.toLowerCase() === "set-cookie") return;
		res.setHeader(key, value);
	});
	const headers = response.headers as Headers & {
		getSetCookie?: () => string[];
	};
	const cookies = headers.getSetCookie?.() ?? [];
	if (cookies.length > 0) res.setHeader("Set-Cookie", cookies);

	if (!response.body) {
		res.end();
		return;
	}

	await pipeline(
		Readable.fromWeb(
			response.body as unknown as Parameters<typeof Readable.fromWeb>[0],
		),
		res,
	);
}

function readBody(
	req: IncomingMessage,
	maxBodySize: number,
): Promise<ArrayBuffer> {
	return new Promise((resolve, reject) => {
		const chunks: Buffer[] = [];
		let size = 0;
		let settled = false;

		const fail = (error: Error) => {
			if (settled) return;
			settled = true;
			reject(error);
		};

		req.on("data", (chunk: Buffer) => {
			size += chunk.length;
			if (size > maxBodySize) {
				fail(new RequestBodyTooLargeError("[fahhh] Request body too large"));
				req.pause();
				return;
			}
			chunks.push(chunk);
		});
		req.on("end", () => {
			if (settled) return;
			settled = true;
			const buffer = Buffer.concat(chunks);
			resolve(
				buffer.buffer.slice(
					buffer.byteOffset,
					buffer.byteOffset + buffer.byteLength,
				),
			);
		});
		req.on("aborted", () => fail(new Error("[fahhh] Request aborted")));
		req.on("error", fail);
	});
}

import type { ApiRequest } from "fahhh";
import { notFound } from "fahhh";

interface Params {
	id: string;
}

export async function GET(req: ApiRequest<undefined, Params>) {
	const posts = {
		"1": { id: "1", title: "Hello from fahhh" },
	};

	const post = posts[req.params.id as keyof typeof posts];

	if (!post) {
		return notFound();
	}

	return post;
}

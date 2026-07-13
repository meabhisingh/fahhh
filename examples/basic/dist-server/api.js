var __defProp = Object.defineProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// dist-server/__fahhh_server_entry.ts
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createServer } from "@fahhh/runtime";

// src/api/posts/[id]/index.ts
import { notFound } from "fahhh";
async function GET(req) {
  const posts = {
    "1": { id: "1", title: "Hello from fahhh" }
  };
  const post = posts[req.params.id];
  if (!post) {
    return notFound();
  }
  return post;
}

// src/api/users/index.ts
var users = [
  { id: "1", name: "Angena Ghatram" },
  { id: "2", name: "Naine Vaktram" }
];
async function GET2() {
  return users;
}
async function POST(req) {
  const body = await req.json();
  const user = {
    id: String(users.length + 1),
    name: body.name
  };
  users.push(user);
  return user;
}

// src/api/_middleware.ts
var middleware_exports = {};
__export(middleware_exports, {
  middleware: () => middleware
});
var middleware = async (_req, next) => {
  const response = await next();
  response.headers.set("X-Powered-By", "fahhh");
  return response;
};

// dist-server/__fahhh_server_entry.ts
var dirname = path.dirname(fileURLToPath(import.meta.url));
var staticDir = path.resolve(dirname, "../dist");
var routes = [
  {
    path: "/api/posts/:id",
    methods: {
      GET
    }
  },
  {
    path: "/api/users",
    methods: {
      GET: GET2,
      POST
    }
  }
];
var middleware2 = [
  resolveMiddleware(middleware_exports)
].flat().filter(Boolean);
await createServer({
  routes,
  middleware: middleware2,
  staticDir,
  port: Number(process.env.PORT ?? 3e3)
});
function resolveMiddleware(mod) {
  const exported = mod.middleware ?? mod.default;
  if (typeof exported === "function") return exported;
  if (Array.isArray(exported)) return exported;
  if (typeof exported === "object" && exported !== null && "middleware" in exported) {
    const nested = exported.middleware;
    if (typeof nested === "function" || Array.isArray(nested)) return nested;
  }
  return void 0;
}

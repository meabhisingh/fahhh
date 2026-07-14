"use client";

import clsx from "clsx";
import { CheckIcon, ClipboardCheckIcon, CopyIcon } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/button";
import { Syntax } from "@/components/syntax";
import { gitConfig } from "@/lib/shared";

const features = [
	{
		title: "Nothing to Commit",
		desc: "A typed client is generated automatically at build time from your real route files — gitignored, never hand-written, never committed to your repo.",
	},
	{
		title: "File-System Routing",
		desc: "Your API routes are your endpoints. Nest files in your api folder and they become callable from the client the moment the dev server picks them up.",
	},
	{
		title: "End-to-End Type Safety",
		desc: "Your client gets the exact types your server handlers declare — params, request body, and return value — inferred directly from real TypeScript. No schema library required.",
	},
	{
		title: "Framework Agnostic Client",
		desc: "Works seamlessly with React, Vue, Svelte, or vanilla JS. If it speaks TypeScript, it speaks Fahhh.",
	},
	{
		title: "First-class DX",
		desc: "Hover over any client call to see the exact response type — inferred straight from your real handler code, not a duplicated schema.",
	},
	{
		title: "Lightweight & Fast",
		desc: "No bulky runtime on the client. Just a thin proxy wrapper around standard fetch calls, optimized for edge deployments.",
	},
];

const serverCode = `
import type { ApiRequest } from "fahhh"

interface CreateUserBody {
  name: string
}

const users = [
  { id: "1", name: "Angena Ghatram" },
  { id: "2", name: "Naine Vaktram" },
];

export async function GET() {
  return users
}

export async function POST(req: ApiRequest<CreateUserBody>) {
  const body = await req.json()

  const user = {
    id: String(users.length + 1),
    name: body.name,
  }

  users.push(user)
  return user
}
`;

const clientCode = `
import api from "virtual:api"
import { useEffect, useState } from "react"

type User = { id: string; name: string }

export default function App() {
  const [users, setUsers] = useState<User[]>([])

  useEffect(() => {
    api["/api/users"].GET().then(setUsers)
  }, [])

  return (
    <ul>
      {users.map((u) => (
        <li key={u.id}>{u.name}</li>
      ))}
    </ul>
  )
}
`;

const serverCode2 = `export async function GET() {
  return { id: 1 };
}`;

const clientCode2 = `
import api from "virtual:api"

const data =
 await api["/api/users"].GET()

// data is inferred as:
type Data = {
  id: number
};
`;

export default function FahhhLandingPage() {
	const audioRef = useRef<HTMLAudioElement | null>(null);

	const [activeTab, setActiveTab] = useState("server");
	const [copied, setCopied] = useState(false);

	const handleCopy = () => {
		navigator.clipboard.writeText("npx create-fahhh myapp");
		setCopied(true);
		setTimeout(() => setCopied(false), 2000);
	};

	useEffect(() => {
		audioRef.current = new Audio("/fahhh.mp3");
		audioRef.current.preload = "auto";

		const handleClick = () => {
			const audio = audioRef.current?.cloneNode() as HTMLAudioElement;
			audio.play().catch(() => {});
		};

		window.addEventListener("pointerdown", handleClick);

		return () => {
			window.removeEventListener("pointerdown", handleClick);
		};
	}, []);

	return (
		<div className="relative min-h-screen overflow-clip bg-fd-background text-fd-foreground font-sans selection:bg-green-500/30 selection:text-fd-foreground">
			{/* Background Gradients */}
			<div className="pointer-events-none absolute inset-0 z-0 flex justify-center opacity-50">
				<div className="absolute top-[-10%] left-[20%] size-136 rounded-full bg-green-500/20 blur-[120px]" />
				<div className="absolute top-[18%] right-[10%] size-120 rounded-full bg-teal-500/15 blur-[120px]" />
			</div>

			<main className="relative z-10">
				<section className="py-16 pt-24 lg:py-24 lg:pb-16" id="start">
					<div className="mx-auto grid w-[min(1180px,calc(100%-40px))] grid-cols-1 items-center gap-10 lg:grid-cols-[1.02fr_0.78fr]">
						{/* Hero Content */}
						<div>
							<div className="inline-flex items-center gap-2.5 rounded-full border border-green-500/30 bg-green-500/10 px-3 py-1.5 font-mono text-xs font-medium uppercase tracking-widest text-green-700 dark:text-green-400">
								<span className="h-2 w-2 rounded-full bg-green-500 shadow-[0_0_0_0_rgba(34,197,94,0.45)] animate-[pulse_2.1s_infinite]" />
								Code-first full-stack TypeScript
							</div>

							<h1 className="mt-6 max-w-[850px] text-balance text-[clamp(47px,13vw,68px)] font-bold leading-[0.98] tracking-tight lg:text-[clamp(54px,7vw,94px)] text-fd-foreground">
								One codebase. Typed end to end.{" "}
								<span className="bg-linear-to-br from-fd-foreground via-green-600 to-green-500 dark:via-green-100 dark:to-green-500 bg-clip-text text-transparent">
									Deployed in one command.
								</span>
							</h1>

							<p className="mt-6 max-w-[720px] text-pretty text-[17px] leading-relaxed text-fd-muted-foreground lg:text-[clamp(18px,2.2vw,22px)]">
								Fahhh turns a folder of API route files into a fully typed
								client, a route manifest, and deployable functions —
								automatically. No OpenAPI spec to maintain, no SDK to generate,
								no <code className="font-mono text-fd-foreground">fetch()</code>{" "}
								to write by hand.
							</p>

							<div className="mt-8 flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
								<Link href={"/docs"}>
									<Button className="h-12">Start building</Button>
								</Link>

								<div className="inline-grid w-full h-13 grid-cols-[1fr_auto] items-center gap-3 rounded-2xl border border-fd-border/80 bg-fd-secondary/30 pl-4 pr-2 shadow-inner sm:w-auto sm:grid-cols-[auto_auto]">
									<code className="font-mono text-[13px] text-fd-foreground whitespace-nowrap">
										npx create-fahhh myapp
									</code>
									<button
										type="button"
										onClick={handleCopy}
										aria-label={copied ? "Copied" : "Copy to clipboard"}
										title={copied ? "Copied!" : "Copy"}
										className={clsx(
											"my-1 rounded-full p-2 transition-all duration-200",
											"bg-fd-secondary text-fd-foreground",
											"hover:scale-105 active:scale-95",
											copied
												? "bg-green-500/20 text-green-500"
												: "hover:bg-fd-accent hover:text-fd-accent-foreground",
										)}
									>
										{copied ? (
											<ClipboardCheckIcon className="size-4" />
										) : (
											<CopyIcon className="size-4" />
										)}
									</button>
								</div>
							</div>

							<div className="mt-8 flex flex-wrap gap-x-4 gap-y-2 font-mono text-xs text-fd-muted-foreground">
								<div className="flex items-center gap-1">
									<CheckIcon className="size-3 text-green-600 stroke-4" />
									<span>Plain Vite</span>
								</div>
								<div className="flex items-center gap-1">
									<CheckIcon className="size-3 text-green-600 stroke-4" />
									Compile-time inference
								</div>
								<div className="flex items-center gap-1">
									<CheckIcon className="size-3 text-green-600 stroke-4" />
									No generated SDK
								</div>
							</div>
						</div>

						{/* Terminal Window */}
						<aside className="relative overflow-hidden rounded-[28px] border border-fd-border/80 bg-linear-to-b from-white/5 to-transparent bg-fd-card shadow-2xl lg:max-w-none max-w-[760px] mx-auto w-full">
							<div className="flex min-h-[50px] items-center justify-between gap-3 border-b border-fd-border bg-fd-background/50 px-4">
								<div className="flex gap-1.5 opacity-70">
									<div className="h-2.5 w-2.5 rounded-full bg-red-500" />
									<div className="h-2.5 w-2.5 rounded-full bg-yellow-500" />
									<div className="h-2.5 w-2.5 rounded-full bg-green-500" />
								</div>
								<div className="min-w-0 overflow-hidden text-ellipsis whitespace-nowrap font-mono text-[11px] text-fd-muted-foreground">
									{activeTab === "server"
										? "src/api/users/index.ts"
										: "src/web/App.tsx"}
								</div>
								<span className="rounded-full border border-green-500/40 bg-green-500/10 px-2.5 py-1.5 font-mono text-[11px] text-green-600 dark:text-green-500">
									typed
								</span>
							</div>

							<div className="flex gap-2 border-b border-fd-border bg-fd-background/30 p-2">
								<button
									type="button"
									onClick={() => setActiveTab("server")}
									className={`min-h-[38px] rounded-lg border px-3 font-mono text-xs tracking-widest transition-colors ${
										activeTab === "server"
											? "border-green-500/40 bg-green-500/10 text-fd-foreground"
											: "border-transparent text-fd-muted-foreground hover:text-fd-foreground"
									}`}
								>
									SERVER
								</button>
								<button
									type="button"
									onClick={() => setActiveTab("client")}
									className={`min-h-[38px] rounded-lg border px-3 font-mono text-xs tracking-widest transition-colors ${
										activeTab === "client"
											? "border-green-500/40 bg-green-500/10 text-fd-foreground"
											: "border-transparent text-fd-muted-foreground hover:text-fd-foreground"
									}`}
								>
									CLIENT
								</button>
							</div>

							<div className="relative min-h-[370px] bg-fd-background p-4 lg:min-h-[400px] lg:p-6 text-[11px] lg:text-[12px] font-mono leading-[1.78] text-fd-foreground overflow-auto">
								{activeTab === "server" && <Syntax>{serverCode}</Syntax>}

								{activeTab === "client" && <Syntax>{clientCode}</Syntax>}
							</div>
						</aside>
					</div>
				</section>
			</main>

			{/* Features Section */}
			<section
				className="py-16 lg:py-24 border-t border-fd-border/40 relative z-10"
				id="features"
			>
				<div className="mx-auto w-[min(1180px,calc(100%-40px))]">
					<div className="mb-12">
						<h2 className="text-3xl font-bold tracking-tight text-fd-foreground sm:text-4xl">
							Everything you need.
							<br />
							<span className="text-fd-muted-foreground">
								Nothing you don't.
							</span>
						</h2>
					</div>

					<div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
						{features.map((feature) => (
							<div
								key={feature.title}
								className="group rounded-3xl border border-fd-border/60 bg-fd-card/30 p-6 shadow-sm transition-colors hover:bg-fd-card hover:border-green-500/30"
							>
								<div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-fd-secondary/50 text-green-700 dark:text-green-400 group-hover:bg-green-500/10 group-hover:text-green-600 dark:group-hover:text-green-500 transition-colors">
									<svg
										className="h-5 w-5"
										fill="none"
										viewBox="0 0 24 24"
										stroke="currentColor"
										strokeWidth={2}
									>
										<title>Feature</title>
										<path
											strokeLinecap="round"
											strokeLinejoin="round"
											d="M13 10V3L4 14h7v7l9-11h-7z"
										/>
									</svg>
								</div>
								<h3 className="font-semibold text-fd-foreground mb-2">
									{feature.title}
								</h3>
								<p className="text-[15px] text-fd-muted-foreground leading-relaxed">
									{feature.desc}
								</p>
							</div>
						))}
					</div>
				</div>
			</section>

			{/* Typed API Visual Section */}
			<section
				className="py-16 lg:py-24 border-t border-fd-border/40 relative z-10"
				id="typed-api"
			>
				<div className="mx-auto w-[min(1180px,calc(100%-40px))] text-center">
					<h2 className="text-3xl font-bold tracking-tight text-fd-foreground sm:text-4xl mb-4">
						Invisible RPC
					</h2>
					<p className="mx-auto max-w-[600px] text-lg text-fd-muted-foreground mb-16">
						Fahhh leverages TypeScript's module resolution to create a virtual
						API client. You get auto-completion and compile-time guarantees
						without writing fetch boilerplate.
					</p>

					{/* Visual Flow Diagram */}
					<div className="relative mx-auto flex max-w-4xl flex-col items-center justify-between gap-6 md:flex-row font-mono text-sm">
						{/* Server Block */}
						<div className="flex w-full flex-col items-center md:w-1/3">
							<div className="w-full rounded-2xl border border-fd-border bg-fd-card p-4 shadow-lg text-left">
								<div className="mb-3 text-xs text-fd-muted-foreground border-b border-fd-border pb-2">
									src/api/users/index.ts
								</div>
								<Syntax>{serverCode2}</Syntax>
							</div>
						</div>

						{/* Connection / Types */}
						<div className="flex flex-col items-center gap-2 md:w-1/3">
							<div className="h-10 w-[2px] bg-linear-to-b from-fd-border to-green-500/50 md:h-[2px] md:w-full md:bg-linear-to-r" />
							<div className="rounded-full border border-green-500/30 bg-green-500/10 px-4 py-1.5 text-xs text-green-700 dark:text-green-400 whitespace-nowrap">
								Type Inference
							</div>
							<div className="h-10 w-[2px] bg-linear-to-t from-fd-border to-green-500/50 md:h-[2px] md:w-full md:bg-linear-to-l" />
						</div>

						{/* Client Block */}
						<div className="flex w-full flex-col items-center md:w-1/3">
							<div className="w-full rounded-2xl border border-fd-border bg-fd-card p-4 shadow-lg text-left ring-1 ring-green-500/20">
								<div className="mb-3 text-xs text-fd-muted-foreground border-b border-fd-border pb-2">
									src/web/App.tsx
								</div>
								<Syntax>{clientCode2}</Syntax>
							</div>
						</div>
					</div>
				</div>
			</section>

			{/* Compare Section */}
			<section
				className="py-16 lg:py-32 border-t border-fd-border/40 relative z-10"
				id="compare"
			>
				<div className="mx-auto w-[min(1100px,calc(100%-40px))]">
					<h2 className="text-3xl font-bold tracking-tight text-fd-foreground sm:text-4xl text-center mb-12">
						How it compares
					</h2>
					<div className="overflow-hidden rounded-3xl border border-fd-border/80 bg-fd-card shadow-2xl">
						<div className="overflow-x-auto">
							<table className="w-full text-left text-sm whitespace-nowrap">
								<thead className="bg-fd-secondary/30">
									<tr>
										<th className="px-6 py-5 font-semibold text-fd-foreground border-b border-fd-border/80">
											Feature
										</th>
										<th className="px-6 py-5 font-bold text-green-700 dark:text-green-400 border-b border-fd-border/80 bg-green-500/5">
											Fahhh
										</th>
										<th className="px-6 py-5 font-semibold text-fd-muted-foreground border-b border-fd-border/80">
											Next.js
										</th>
										<th className="px-6 py-5 font-semibold text-fd-muted-foreground border-b border-fd-border/80">
											Express
										</th>
										<th className="px-6 py-5 font-semibold text-fd-muted-foreground border-b border-fd-border/80">
											tRPC
										</th>
									</tr>
								</thead>
								<tbody className="divide-y divide-fd-border/40 text-fd-muted-foreground bg-transparent">
									<tr className="hover:bg-fd-secondary/10 transition-colors">
										<td className="px-6 py-4 font-medium text-fd-foreground">
											Typed client included
										</td>
										<td className="px-6 py-4 text-green-700 dark:text-green-300 bg-green-500/5">
											Yes, built-in
										</td>
										<td className="px-6 py-4">No (bring your own)</td>
										<td className="px-6 py-4">No</td>
										<td className="px-6 py-4">Yes, built-in</td>
									</tr>
									<tr className="hover:bg-fd-secondary/10 transition-colors">
										<td className="px-6 py-4 font-medium text-fd-foreground">
											Routing paradigm
										</td>
										<td className="px-6 py-4 text-green-700 dark:text-green-300 bg-green-500/5">
											File-system
										</td>
										<td className="px-6 py-4">File-system</td>
										<td className="px-6 py-4">Manual (app.get/post)</td>
										<td className="px-6 py-4">Object/procedure-based</td>
									</tr>
									<tr className="hover:bg-fd-secondary/10 transition-colors">
										<td className="px-6 py-4 font-medium text-fd-foreground">
											Client code generation
										</td>
										<td className="px-6 py-4 text-green-700 dark:text-green-300 bg-green-500/5">
											None (inferred)
										</td>
										<td className="px-6 py-4">N/A</td>
										<td className="px-6 py-4">N/A</td>
										<td className="px-6 py-4">None (inferred)</td>
									</tr>
									<tr className="hover:bg-fd-secondary/10 transition-colors">
										<td className="px-6 py-4 font-medium text-fd-foreground">
											Edge / Workers runtime
										</td>
										<td className="px-6 py-4 text-green-700 dark:text-green-300 bg-green-500/5">
											Yes (Cloudflare adapter)
										</td>
										<td className="px-6 py-4">Yes (platform edge runtime)</td>
										<td className="px-6 py-4">No (Node-only, tied to http)</td>
										<td className="px-6 py-4">Yes (via fetch adapter)</td>
									</tr>
								</tbody>
							</table>
						</div>
					</div>
				</div>
			</section>

			{/* Contribute Section */}
			<section
				className="py-16 lg:py-24 border-t border-fd-border/40 relative z-10"
				id="contribute"
			>
				<div className="mx-auto w-[min(1180px,calc(100%-40px))]">
					<div className="relative overflow-hidden rounded-[32px] border border-green-500/20 bg-fd-secondary/20 px-6 py-16 text-center shadow-2xl sm:px-16 sm:py-24">
						<h2 className="relative z-10 text-3xl font-bold tracking-tight text-fd-foreground sm:text-5xl mb-6">
							Ready to shape the future?
						</h2>
						<p className="relative z-10 mx-auto max-w-2xl text-lg text-fd-muted-foreground mb-10">
							Fahhh is open-source and built for the community. Whether you're
							fixing a bug, adding a feature, or writing documentation, we'd
							love to have you on board.
						</p>

						<div className="relative z-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
							<a
								href={`https://github.com/${gitConfig.user}/${gitConfig.repo}`}
								target="_blank"
								rel="noreferrer"
								className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-fd-foreground px-8 font-medium text-fd-background transition-all sm:w-auto hover:opacity-90 hover:scale-[1.02]"
							>
								<svg
									viewBox="0 0 24 24"
									className="h-5 w-5 fill-current"
									aria-hidden="true"
								>
									<path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
								</svg>
								View on GitHub
							</a>
							<Link
								href="/docs"
								className="inline-flex h-12 w-full items-center justify-center rounded-full border border-fd-border/80 bg-fd-card px-8 font-medium text-fd-foreground transition-all hover:bg-fd-secondary/40 sm:w-auto"
							>
								Read the Docs
							</Link>
						</div>
					</div>
				</div>
			</section>
		</div>
	);
}

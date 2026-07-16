import api from "virtual:api";
import clsx from "clsx";
import { useEffect, useState } from "react";

const fahhhDocs = "https://fahhh.pages.dev";

export default function App() {
	const [users, setUsers] = useState<Array<{ id: string; name: string }>>([]);

	useEffect(() => {
		api["/api/users"].GET().then(setUsers);
	}, []);

	const playFahhh = () => {
		const audio = new Audio("https://fahhh.pages.dev/fahhh.mp3");
		audio.play();
	};

	return (
		<main className="relative flex min-h-dvh flex-col items-center justify-center gap-8 overflow-hidden bg-gray-950 px-6 text-white selection:bg-green-700 selection:text-white">
			<div className="pointer-events-none absolute inset-0">
				<div className="absolute left-1/2 top-1/4 h-96 w-96 -translate-x-1/2 rounded-full bg-green-500/20 blur-[120px]" />
				<div className="absolute bottom-1/4 right-1/4 h-64 w-64 rounded-full bg-emerald-500/10 blur-[100px]" />
			</div>

			<div className="relative z-10 flex flex-col items-center gap-8">
				<img
					src="/logo.svg"
					alt="FAHHH"
					className="size-40 drop-shadow-green-600 drop-shadow-2xl "
				/>

				<div className="text-center">
					<h1 className="bg-linear-to-b from-white to-gray-400 bg-clip-text text-4xl font-extrabold tracking-tight text-transparent sm:text-5xl">
						FAHHH STARTER APP
					</h1>
					<p className="mt-3 text-sm text-gray-400">
						This data is fetched from the backend using fahhh
					</p>
				</div>

				<div className="w-full max-w-sm rounded-2xl border border-white/10 bg-white/5 p-1 backdrop-blur-sm">
					<div className="rounded-xl bg-gray-900/60 px-5 py-4">
						<p className="mb-3 text-xs font-semibold uppercase tracking-widest text-gray-500">
							Users
						</p>
						<ul className="flex flex-col divide-y divide-white/5">
							{users.map((user) => (
								<li
									key={user.id}
									className="flex items-center gap-3 py-2.5 text-sm text-gray-300"
								>
									<span className="flex h-6 w-6 items-center justify-center rounded-full bg-green-500/15 text-xs font-bold text-green-400">
										{user.id}
									</span>
									{user.name}
								</li>
							))}
						</ul>
					</div>
				</div>

				<div className="flex items-center gap-4">
					<FahhhButton onClick={playFahhh}>FAHHH</FahhhButton>
					<FahhhButton
						variant="secondary"
						onClick={() => window.open(fahhhDocs, "_blank")}
					>
						Docs
					</FahhhButton>
				</div>
			</div>

			<footer className="absolute bottom-6 text-xs text-gray-600">
				Built with fahhh · Edit{" "}
				<code className="rounded bg-white/5 px-1.5 py-0.5 text-gray-500">
					src/web/App.tsx
				</code>{" "}
				to get started
			</footer>
		</main>
	);
}

type FahhhButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
	variant?: "primary" | "secondary" | "outline" | "danger";
};

const variants = {
	primary:
		"text-black bg-linear-to-b from-green-400 to-green-500 hover:bg-linear-to-b hover:from-green-400/90 hover:to-green-500/90  shadow-[0_6px_0_rgb(29,140,0)]",
	secondary:
		"bg-gray-200 hover:bg-gray-100 text-gray-800 shadow-[0_6px_0_rgb(156,163,175)]",
	danger:
		"bg-red-600 hover:bg-red-500 text-white shadow-[0_6px_0_rgb(150,0,0)]",
	outline:
		"bg-transparent border-2 border-green-500 text-green-500 hover:bg-green-500 hover:text-white shadow-[0_6px_0_rgb(29,140,0)]",
};

const FahhhButton = ({
	children = "FAHHH",
	className = "",
	onClick,
	variant = "primary",
	...props
}: FahhhButtonProps) => {
	return (
		<button
			type="button"
			onClick={onClick}
			className={clsx(
				"relative  cursor-pointer px-6 py-3 rounded-xl font-semibold transition-all duration-100 ease-in-out active:translate-y-1.5 active:shadow-none",
				variants[variant],
				className,
			)}
			{...props}
		>
			{children}
		</button>
	);
};

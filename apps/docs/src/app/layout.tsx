import { Inter } from "next/font/google";
import { Provider } from "@/components/provider";
import "./global.css";
import type { Metadata } from "next";

const inter = Inter({
	subsets: ["latin"],
});

export default function Layout({ children }: LayoutProps<"/">) {
	return (
		<html lang="en" className={inter.className} suppressHydrationWarning>
			<body className="flex flex-col min-h-screen selection:bg-green-700/80 selection:text-white">
				<Provider>{children}</Provider>
			</body>
		</html>
	);
}

export const metadata: Metadata = {
	title: "Fahhh | Open-source Web Framework",
	description:
		"A modern, flexible open-source web framework for building full-stack applications. Easy to customize, integrate, and extend, with comprehensive docs, APIs, and architecture guides to power your application.",
	icons: {
		icon: "/logo.svg",
	},
};

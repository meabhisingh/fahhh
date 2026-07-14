import type { ReactNode } from "react";

type Variant = "keyword" | "string" | "func" | "type" | "variable" | "comment";

const variantStyles: Record<Variant, string> = {
	keyword: "text-teal-700 dark:text-teal-400",
	string: "text-amber-700 dark:text-yellow-300",
	func: "text-green-700 dark:text-green-400",
	type: "text-purple-700 dark:text-purple-400",
	variable: "",
	comment: "text-gray-500 italic",
};

export function Code({
	variant = "variable",
	children,
}: {
	variant?: Variant;
	children: ReactNode;
}) {
	return <span className={variantStyles[variant]}>{children}</span>;
}

export type { Variant };

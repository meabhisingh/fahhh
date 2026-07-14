import { useMemo } from "react";
import type { Variant } from "./code";
import { Code } from "./code";

const KEYWORDS = new Set([
	"import",
	"export",
	"from",
	"interface",
	"const",
	"function",
	"return",
	"await",
	"default",
	"type",
	"if",
	"else",
	"async",
	"true",
	"false",
	"void",
	"new",
	"class",
	"extends",
	"implements",
	"try",
	"catch",
	"throw",
]);

const TYPES = new Set([
	"string",
	"number",
	"boolean",
	"any",
	"never",
	"unknown",
	"null",
	"undefined",
]);

type Token = {
	text: string;
	variant?: Variant;
};

export function Syntax({
	children,
	className = "",
}: {
	children: string;
	className?: string;
}) {
	const parts = useMemo(() => {
		const code = children.replace(/^\n/, "");
		const out: Token[] = [];

		const re =
			/\/\/[^\n]*|\/\*[\s\S]*?\*\/|"[^"\\]*(?:\\.[^"\\]*)*"|'[^'\\]*(?:\\.[^'\\]*)*'|`[^`\\]*(?:\\.[^`\\]*)*`|\b\w+\b|./gs;

		let m = re.exec(code);

		while (m !== null) {
			const t = m[0];

			if (t.startsWith('"') || t.startsWith("'") || t.startsWith("`")) {
				out.push({ text: t, variant: "string" });
			} else if (t.startsWith("//") || t.startsWith("/*")) {
				out.push({ text: t, variant: "comment" });
			} else if (KEYWORDS.has(t)) {
				out.push({ text: t, variant: "keyword" });
			} else if (TYPES.has(t)) {
				out.push({ text: t, variant: "type" });
			} else if (/^[A-Z][A-Za-z0-9_]*$/.test(t)) {
				const prev = out[out.length - 1]?.text;

				out.push({
					text: t,
					variant:
						prev === ":" ||
						prev === "<" ||
						prev === "," ||
						prev === "extends" ||
						prev === "implements"
							? "type"
							: "func",
				});
			} else {
				out.push({ text: t });
			}

			m = re.exec(code);
		}

		return out;
	}, [children]);

	return (
		<pre
			className={`animate-in fade-in slide-in-from-bottom-1 duration-200 ${className}`}
		>
			<code>
				{parts.map((p, i) => {
					const key = `${i}-${p.variant ?? "plain"}-${p.text}`;

					return p.variant ? (
						<Code key={key} variant={p.variant}>
							{p.text}
						</Code>
					) : (
						<span key={key}>{p.text}</span>
					);
				})}
			</code>
		</pre>
	);
}

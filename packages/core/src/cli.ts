#!/usr/bin/env node

import { build } from "./build";
import { deploy } from "./deploy";
import { dev } from "./dev";

type Command = "dev" | "build" | "deploy" | "help";

interface ParsedArgs {
	command: Command;
	cwd?: string;
	config?: string;
	host?: string | boolean;
	port?: number;
}

async function main(): Promise<void> {
	const args = parseArgs(process.argv.slice(2));

	if (args.command === "help") {
		printHelp();
		return;
	}

	if (args.command === "dev") {
		await dev({
			cwd: args.cwd,
			config: args.config,
			host: args.host,
			port: args.port,
		});
		return;
	}

	if (args.command === "build") {
		await build({
			cwd: args.cwd,
			config: args.config,
		});
		return;
	}

	if (args.command === "deploy") {
		await deploy({
			cwd: args.cwd,
			config: args.config,
		});
		return;
	}
}

function parseArgs(argv: string[]): ParsedArgs {
	const [rawCommand = "help", ...rest] = argv;
	const command = normalizeCommand(rawCommand);

	const parsed: ParsedArgs = { command };

	for (let i = 0; i < rest.length; i++) {
		const arg = rest[i];

		if (arg === "--cwd") {
			parsed.cwd = readValue(rest, ++i, "--cwd");
			continue;
		}

		if (arg === "--config" || arg === "-c") {
			parsed.config = readValue(rest, ++i, arg);
			continue;
		}

		if (arg === "--host") {
			const value = rest[i + 1];

			if (!value || value.startsWith("-")) {
				parsed.host = true;
			} else {
				parsed.host = value;
				i++;
			}

			continue;
		}

		if (arg === "--port" || arg === "-p") {
			parsed.port = Number(readValue(rest, ++i, arg));

			if (
				!Number.isInteger(parsed.port) ||
				parsed.port < 1 ||
				parsed.port > 65_535
			) {
				throw new Error(`[fahhh] Invalid port: ${rest[i]}`);
			}

			continue;
		}

		throw new Error(`[fahhh] Unknown option: ${arg}`);
	}

	return parsed;
}

function normalizeCommand(command: string): Command {
	if (
		command === "dev" ||
		command === "build" ||
		command === "deploy" ||
		command === "help" ||
		command === "--help" ||
		command === "-h"
	) {
		return command === "--help" || command === "-h" ? "help" : command;
	}

	throw new Error(`[fahhh] Unknown command: ${command}`);
}

function readValue(argv: string[], index: number, flag: string): string {
	const value = argv[index];

	if (!value || value.startsWith("-")) {
		throw new Error(`[fahhh] Missing value for ${flag}`);
	}

	return value;
}

function printHelp(): void {
	console.log(
		`
fahhh

Usage:
  fahhh dev [--port 5173] [--host] [--config fahhh.config.ts]
  fahhh build [--config fahhh.config.ts]
  fahhh deploy [--config fahhh.config.ts]

Options:
  --cwd <dir>       Project directory
  -c, --config      Config file
  -p, --port        Vite dev server port
  --host [host]     Expose dev server
`.trim(),
	);
}

main().catch((error) => {
	console.error(error instanceof Error ? error.message : error);
	process.exitCode = 1;
});

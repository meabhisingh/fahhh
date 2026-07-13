import { spawn } from "node:child_process";
import path from "node:path";
import { loadConfig } from "./config";

export interface StartOptions {
	cwd?: string;
	config?: string;
	port?: number;
}

export async function start(options: StartOptions = {}): Promise<void> {
	const config = await loadConfig(options.cwd, options.config);
	const entry = path.join(config.root, "dist-server", "api.js");

	const env = {
		...process.env,
		...(options.port ? { PORT: String(options.port) } : {}),
	};

	const child = spawn(process.execPath, [entry], {
		cwd: config.root,
		stdio: "inherit",
		env,
	});

	await new Promise<void>((resolve, reject) => {
		child.on("error", reject);
		child.on("exit", (code) => {
			if (code === 0 || code === null) {
				resolve();
				return;
			}

			reject(new Error(`[fahhh] start failed with exit code ${code}`));
		});
	});
}

import fs from "node:fs/promises";
import path from "node:path";

const root = process.cwd();

await fs.rm(path.join(root, "dist/template"), {
  recursive: true,
  force: true,
});

await fs.cp(path.join(root, "template"), path.join(root, "dist/template"), {
  recursive: true,
});
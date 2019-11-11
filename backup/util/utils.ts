import fs from "fs";
import zlib from "zlib";
import path from "path";
import tar from "tar";
import { execFile } from "child_process";

export function decode(encoded: string): string {
  return Buffer.from(encoded, "base64").toString("utf-8");
}

export function gunzip(file: string): void {
  const a = fs.readFileSync(file);
  const b = zlib.gunzipSync(a);
  const p = path.parse(file);
  fs.writeFileSync(path.join(p.dir, p.name), b);
}

export function gunzipAll(dir: string): void {
  fs.readdirSync(dir)
    .filter(f => path.parse(f).ext === ".gz")
    .forEach(f => gunzip(path.join(dir, f)));
}

export async function untar(file: string): Promise<void> {
  const p = path.parse(file);
  await tar.extract({ file: file, cwd: p.dir });
}

/**
 * Execute the given script and return the full output as
 * first element, the stdout as second, the stderr as third,
 * and the exit code as last.
 */
export async function execScript(
  script: string,
  args: string[] = []
): Promise<[string, string, string, number]> {
  return await new Promise((resolve, reject) => {
    const out = [];
    const stdout = [];
    const stderr = [];
    const child = execFile(script, args);
    child.stdout.on("data", d => {
      out.push(d);
      stdout.push(d);
    });
    child.stderr.on("data", d => {
      out.push(d);
      stderr.push(d);
    });
    child.on("error", e => reject(e));
    child.on("exit", c => {
      resolve([out.join(""), stdout.join(""), stderr.join(""), c]);
    });
  });
}

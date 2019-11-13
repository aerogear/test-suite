import fs from "fs";
import zlib from "zlib";
import path from "path";
import tar from "tar";
import { execFile } from "child_process";
import { Writable } from "stream";

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

class BufferBox {
  // initialize an empty buffer
  private buffer = Buffer.from([]);

  public append(buffer: Buffer): void {
    this.buffer = Buffer.concat([this.buffer, buffer]);
  }

  public toString(): string {
    return this.buffer.toString();
  }
}

/**
 * Create a Writable stream that collect all data into a
 * string and return them as a Promise once the stream end
 */
export function writable(): [Writable, BufferBox] {
  const data = new BufferBox();

  // create a stream that collect everything in
  // the data list and resolve the promise once the
  // stream end
  const stream = new Writable({
    write: (chunk, encoding, callback): void => {
      if (Buffer.isBuffer(chunk)) {
        data.append(chunk);
        callback();
      } else {
        callback(new Error(`can not process encoding: ${encoding}`));
      }
    }
  });

  return [stream, data];
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

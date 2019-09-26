import { SLOWDOWN } from "./config";

export async function sleep(ms: number): Promise<void> {
  return new Promise(r => setTimeout(r, ms));
}

export async function slowdown(): Promise<void> {
  await sleep(SLOWDOWN);
}

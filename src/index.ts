import { WebsiteMonitor } from "./monitor.js";

const INTERVAL_MS = 60_000;
const monitor = new WebsiteMonitor();
let stopping = false;

function parseMaxCycles(): number | null {
  const raw = process.env.MAX_CYCLES?.trim();
  if (!raw) return null;

  const value = Number.parseInt(raw, 10);
  return Number.isFinite(value) && value > 0 ? value : null;
}

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

async function shutdown(): Promise<void> {
  if (stopping) return;
  stopping = true;
  await monitor.stop();
}

process.once("SIGINT", () => {
  void shutdown().finally(() => process.exit(0));
});

process.once("SIGTERM", () => {
  void shutdown().finally(() => process.exit(0));
});

async function main(): Promise<void> {
  await monitor.start();

  const maxCycles = parseMaxCycles();
  let completedCycles = 0;

  while (!stopping) {
    const cycleStartedAt = Date.now();
    await monitor.runCycle();
    completedCycles += 1;

    if (maxCycles !== null && completedCycles >= maxCycles) break;
    if (stopping) break;

    const nextMinute = Math.ceil((cycleStartedAt + 1) / INTERVAL_MS) * INTERVAL_MS;
    const waitMs = Math.max(1_000, nextMinute - Date.now());
    await sleep(waitMs);
  }

  await monitor.stop();
}

main().catch(async () => {
  await monitor.stop().catch(() => undefined);
  process.exit(1);
});

import { chromium, type Browser } from "playwright";
import { checkSite } from "./checker.js";
import { SITES } from "./sites.js";
import type { Baseline, CheckResult, SiteConfig } from "./types.js";

const MAX_CONCURRENCY = 2;

export class WebsiteMonitor {
  private browser: Browser | null = null;
  private readonly baselines = new Map<string, Baseline>();
  private readonly latest = new Map<string, CheckResult>();
  private running = false;

  async start(): Promise<void> {
    await this.ensureBrowser();
  }

  async stop(): Promise<void> {
    const browser = this.browser;
    this.browser = null;
    if (browser) await browser.close().catch(() => undefined);
  }

  getLatestResults(): ReadonlyMap<string, CheckResult> {
    return this.latest;
  }

  async runCycle(): Promise<void> {
    if (this.running) return;
    this.running = true;

    try {
      await this.ensureBrowser();
      const browser = this.browser;
      if (!browser) return;

      let cursor = 0;
      const workers = Array.from({ length: Math.min(MAX_CONCURRENCY, SITES.length) }, async () => {
        while (true) {
          const index = cursor;
          cursor += 1;
          const site = SITES[index];
          if (!site) return;
          await this.checkOne(browser, site);
        }
      });

      await Promise.all(workers);

      if (!browser.isConnected()) {
        this.browser = null;
      }
    } finally {
      this.running = false;
    }
  }

  private async checkOne(browser: Browser, site: SiteConfig): Promise<void> {
    const baseline = this.baselines.get(site.url);
    const result = await checkSite(browser, site, baseline);
    this.latest.set(site.url, result);

    if (result.status === "UP") {
      this.updateBaseline(site.url, result);
    }
  }

  private updateBaseline(url: string, result: CheckResult): void {
    const current = this.baselines.get(url);
    if (!current) {
      this.baselines.set(url, {
        textLength: result.textLength,
        htmlBytes: result.htmlBytes,
      });
      return;
    }

    this.baselines.set(url, {
      textLength: Math.round(current.textLength * 0.8 + result.textLength * 0.2),
      htmlBytes: Math.round(current.htmlBytes * 0.8 + result.htmlBytes * 0.2),
    });
  }

  private async ensureBrowser(): Promise<void> {
    if (this.browser?.isConnected()) return;

    if (this.browser) {
      await this.browser.close().catch(() => undefined);
      this.browser = null;
    }

    this.browser = await chromium.launch({
      headless: true,
      args: ["--disable-dev-shm-usage"],
    });
  }
}

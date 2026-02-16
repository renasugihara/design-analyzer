import { chromium, Browser } from 'playwright';

export interface ScreenshotResult {
  screenshot: Buffer;
  html: string;
  success: boolean;
  error?: string;
}

export async function captureWebsite(url: string): Promise<ScreenshotResult> {
  let browser: Browser | null = null;

  try {
    new URL(url);

    browser = await chromium.launch({
      headless: true,
    });

    const page = await browser.newPage({
      viewport: { width: 1920, height: 1080 },
    });

    await page.goto(url, {
      waitUntil: 'networkidle',
      timeout: 30000,
    });

    const screenshot = await page.screenshot({
      fullPage: true,
      type: 'png',
    });

    const html = await page.content();

    await browser.close();

    return {
      screenshot,
      html,
      success: true,
    };
  } catch (error: unknown) {
    if (browser) await browser.close();

    const message = error instanceof Error ? error.message : String(error);

    if (message.includes('timeout')) {
      return {
        screenshot: Buffer.from(''),
        html: '',
        success: false,
        error: 'timeout',
      };
    }

    if (message.includes('net::ERR')) {
      return {
        screenshot: Buffer.from(''),
        html: '',
        success: false,
        error: 'unreachable',
      };
    }

    return {
      screenshot: Buffer.from(''),
      html: '',
      success: false,
      error: 'screenshot-failed',
    };
  }
}

export function extractTailwindClasses(html: string): string[] {
  const classRegex = /class=["']([^"']+)["']/g;
  const classes: Set<string> = new Set();

  let match;
  while ((match = classRegex.exec(html)) !== null) {
    const classList = match[1].split(/\s+/);
    classList.forEach(cls => {
      if (cls.includes('-') && !cls.startsWith('_')) {
        classes.add(cls);
      }
    });
  }

  return Array.from(classes);
}

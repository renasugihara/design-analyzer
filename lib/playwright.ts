// TODO: Implement screenshot capture (Task 4)
export interface ScreenshotResult {
  screenshot: Buffer;
  html: string;
  success: boolean;
  error?: string;
}

export async function captureWebsite(_url: string): Promise<ScreenshotResult> {
  throw new Error('Not implemented - Task 4');
}

export function extractTailwindClasses(_html: string): string[] {
  throw new Error('Not implemented - Task 4');
}

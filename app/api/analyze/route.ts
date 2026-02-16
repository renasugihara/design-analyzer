import { NextRequest, NextResponse } from 'next/server';
import { captureWebsite, extractTailwindClasses } from '@/lib/playwright';
import { analyzeScreenshot } from '@/lib/analyzer';
import { generateFixPrompt, generateMegaPrompt } from '@/lib/prompts';
import { AnalysisResult, AnalysisError } from '@/lib/types';

export async function POST(request: NextRequest) {
  try {
    const { url, tier = 'free' } = await request.json();

    if (!url) {
      const error: AnalysisError = {
        type: 'invalid-url',
        message: 'Invalid URL format',
        suggestion: 'Please enter a complete URL including https:// or http://',
      };
      return NextResponse.json({ error }, { status: 400 });
    }

    // Capture screenshot and HTML
    const captureResult = await captureWebsite(url);

    if (!captureResult.success) {
      const errorMessages: Record<string, AnalysisError> = {
        unreachable: {
          type: 'unreachable',
          message: `Couldn't load ${url}`,
          suggestion: 'The site might be down, blocking automated access, or the URL might be incorrect. Check if the site is live and try again.',
        },
        timeout: {
          type: 'timeout',
          message: 'Analysis timed out',
          suggestion: 'The site took longer than 30 seconds to load. Try analyzing a faster page or wait and retry.',
        },
        'screenshot-failed': {
          type: 'screenshot-failed',
          message: "Couldn't capture screenshot",
          suggestion: "The site loaded but we couldn't capture a screenshot. Try a different page or contact support.",
        },
      };

      const error = errorMessages[captureResult.error || 'screenshot-failed'];
      return NextResponse.json({ error }, { status: 400 });
    }

    // Extract Tailwind classes
    const tailwindClasses = extractTailwindClasses(captureResult.html);

    // Analyze with Claude Vision
    const issues = await analyzeScreenshot(captureResult.screenshot, tier);

    // Generate fix prompts (only for paid tier)
    if (tier === 'paid') {
      issues.forEach(issue => {
        issue.fixPrompt = generateFixPrompt(issue, tailwindClasses);
      });
    }

    // Generate mega prompt (only for paid tier)
    const megaPrompt = tier === 'paid'
      ? generateMegaPrompt(issues, tailwindClasses)
      : undefined;

    const result: AnalysisResult = {
      url,
      screenshot: captureResult.screenshot.toString('base64'),
      issues,
      megaPrompt,
      tier,
    };

    return NextResponse.json(result);
  } catch (error: unknown) {
    console.error('Analysis API error:', error);

    const analysisError: AnalysisError = {
      type: 'analysis-failed',
      message: 'Analysis service temporarily unavailable',
      suggestion: "Our AI analysis service encountered an error. We've been notified and are working to fix it.",
    };

    return NextResponse.json({ error: analysisError }, { status: 500 });
  }
}

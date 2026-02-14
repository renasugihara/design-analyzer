# Design Analyzer MVP Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build an AI-powered tool that detects generic design patterns in websites and generates specific fix prompts for AI development tools (Cursor, v0, Lovable).

**Architecture:** Next.js 14 app with API routes, Playwright for screenshots + HTML extraction, Claude Vision API for pattern detection, freemium model (free: 3 issues no prompts, paid: 5 issues with prompts), Stripe for payments.

**Tech Stack:** Next.js 14 (App Router), TypeScript, Tailwind CSS, shadcn/ui, Playwright, Claude API (Sonnet 4), Stripe, Vercel deployment.

---

## Phase 1: Project Setup & Infrastructure

### Task 1: Initialize Next.js Project

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `next.config.js`
- Create: `tailwind.config.ts`
- Create: `.env.local.example`
- Create: `.gitignore`

**Step 1: Initialize Next.js with TypeScript**

```bash
npx create-next-app@14 . --typescript --tailwind --app --no-src-dir --import-alias "@/*"
```

Expected: Next.js 14 project created with App Router

**Step 2: Install dependencies**

```bash
npm install @anthropic-ai/sdk playwright stripe @stripe/stripe-js react-hot-toast framer-motion
npm install -D @types/node
```

**Step 3: Install shadcn/ui**

```bash
npx shadcn-ui@latest init
```

Choose: Default style, Slate color, CSS variables: yes

**Step 4: Add shadcn components**

```bash
npx shadcn-ui@latest add button input card toast
```

**Step 5: Create environment variables template**

File: `.env.local.example`
```env
# Claude API
ANTHROPIC_API_KEY=your_key_here

# Stripe
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=your_key_here
STRIPE_SECRET_KEY=your_key_here
STRIPE_PRICE_ID=your_price_id_here

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

**Step 6: Commit**

```bash
git init
git add .
git commit -m "feat: initialize Next.js project with dependencies"
```

---

### Task 2: Create GitHub Repository

**Step 1: Create GitHub repo via gh CLI**

```bash
gh repo create design-analyzer --public --description "AI-powered tool to detect generic design patterns and generate fix prompts" --clone=false
```

Expected: Repository created at github.com/[username]/design-analyzer

**Step 2: Add remote and push**

```bash
git remote add origin https://github.com/[username]/design-analyzer.git
git branch -M main
git push -u origin main
```

**Step 3: Verify**

```bash
gh repo view
```

Expected: Shows repository details

---

### Task 3: Create Project Structure

**Files:**
- Create: `lib/playwright.ts`
- Create: `lib/analyzer.ts`
- Create: `lib/prompts.ts`
- Create: `lib/types.ts`
- Create: `app/api/analyze/route.ts`
- Create: `app/api/checkout/route.ts`
- Create: `components/url-input.tsx`
- Create: `components/analysis-progress.tsx`
- Create: `components/results-display.tsx`
- Create: `components/issue-card.tsx`
- Create: `components/copy-button.tsx`
- Create: `test-urls.md`

**Step 1: Create directory structure**

```bash
mkdir -p lib components app/api/analyze app/api/checkout
```

**Step 2: Create types file**

File: `lib/types.ts`
```typescript
export type PatternType =
  | 'heavy-shadows'
  | 'default-neutrals'
  | 'centered-layouts'
  | 'weak-typography'
  | 'low-contrast'
  | 'small-fonts'
  | 'red-ctas'
  | 'identical-cards'
  | 'cramped-spacing';

export type LocationWeight = 'hero' | 'above-fold' | 'below-fold';

export interface DetectedIssue {
  id: string;
  pattern: PatternType;
  title: string;
  description: string;
  descriptionFree: string; // Natural language for free tier
  severity: number; // 0-10
  location: LocationWeight;
  impact: number; // Calculated: location weight × severity
  affectedElements?: string[]; // HTML classes/elements
  fixPrompt?: string; // Only for paid tier
}

export interface AnalysisResult {
  url: string;
  screenshot?: string; // Base64
  issues: DetectedIssue[];
  megaPrompt?: string; // Only for paid tier
  tier: 'free' | 'paid';
}

export interface AnalysisError {
  type: 'unreachable' | 'timeout' | 'screenshot-failed' | 'analysis-failed' | 'invalid-url';
  message: string;
  suggestion: string;
}
```

**Step 3: Commit**

```bash
git add .
git commit -m "feat: create project structure and types"
```

---

## Phase 2: Playwright Screenshot Service

### Task 4: Implement Screenshot Capture

**Files:**
- Create: `lib/playwright.ts`

**Step 1: Write Playwright service**

File: `lib/playwright.ts`
```typescript
import { chromium, Browser, Page } from 'playwright';

export interface ScreenshotResult {
  screenshot: Buffer;
  html: string;
  success: boolean;
  error?: string;
}

export async function captureWebsite(url: string): Promise<ScreenshotResult> {
  let browser: Browser | null = null;
  let page: Page | null = null;

  try {
    // Validate URL
    new URL(url);

    // Launch browser
    browser = await chromium.launch({
      headless: true,
    });

    page = await browser.newPage({
      viewport: { width: 1920, height: 1080 },
    });

    // Navigate with 30s timeout
    await page.goto(url, {
      waitUntil: 'networkidle',
      timeout: 30000,
    });

    // Capture screenshot
    const screenshot = await page.screenshot({
      fullPage: true,
      type: 'png',
    });

    // Get HTML content
    const html = await page.content();

    await browser.close();

    return {
      screenshot,
      html,
      success: true,
    };
  } catch (error: any) {
    if (browser) await browser.close();

    // Determine error type
    if (error.message.includes('timeout')) {
      return {
        screenshot: Buffer.from(''),
        html: '',
        success: false,
        error: 'timeout',
      };
    }

    if (error.message.includes('net::ERR')) {
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
      // Only Tailwind utility classes
      if (cls.includes('-') && !cls.startsWith('_')) {
        classes.add(cls);
      }
    });
  }

  return Array.from(classes);
}
```

**Step 2: Test manually**

Create test file: `test-playwright.ts`
```typescript
import { captureWebsite } from './lib/playwright';

async function test() {
  const result = await captureWebsite('https://lovablemerch.lovable.app/');
  console.log('Success:', result.success);
  console.log('Screenshot size:', result.screenshot.length);
  console.log('HTML length:', result.html.length);
}

test();
```

Run: `npx tsx test-playwright.ts`
Expected: Success: true, screenshot and HTML captured

**Step 3: Commit**

```bash
git add lib/playwright.ts
git commit -m "feat: add Playwright screenshot capture service"
```

---

## Phase 3: Claude Vision Analysis

### Task 5: Implement Detection Engine

**Files:**
- Create: `lib/analyzer.ts`

**Step 1: Write Claude vision prompt**

File: `lib/analyzer.ts`
```typescript
import Anthropic from '@anthropic-ai/sdk';
import { DetectedIssue, PatternType, LocationWeight } from './types';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const VISION_PROMPT = `Analyze this website screenshot for generic AI-generated design patterns.
Rate each pattern 0-10 (10 = most generic).

Detect these patterns:

1. LAYOUT REPETITION (pattern: centered-layouts)
   - Identical section structures repeated
   - Everything centered
   - Uniform spacing between sections

2. COLOR PALETTE (pattern: default-neutrals)
   - Zinc/slate color dominance (count usage)
   - Lack of custom color palette

3. COMPONENT STYLING - Heavy Shadows (pattern: heavy-shadows)
   - Heavy shadows (shadow-xl, shadow-2xl visual appearance)

4. COMPONENT STYLING - Identical Cards (pattern: identical-cards)
   - All cards have identical treatments

5. TYPOGRAPHY (pattern: weak-typography)
   - Weak hierarchy (headlines barely larger than body)
   - Too many font sizes (>5)

6. TYPOGRAPHY (pattern: small-fonts)
   - Font sizes too small (body text <16px appearance)

7. CONTRAST (pattern: low-contrast)
   - Low contrast text (hard to read)

8. SPACING (pattern: cramped-spacing)
   - Cramped spacing (<16px gaps appearance)

9. SEMANTIC COLORS (pattern: red-ctas)
   - Red used for primary CTAs/buttons (not errors)

For each detected issue (severity 6+), provide JSON:
{
  "pattern": "pattern-type",
  "severity": 8,
  "location": "hero" | "above-fold" | "below-fold",
  "elements": "Brief description of affected elements"
}

Return ONLY valid JSON array: [{ pattern, severity, location, elements }, ...]`;

interface ClaudeIssue {
  pattern: PatternType;
  severity: number;
  location: LocationWeight;
  elements: string;
}

export async function analyzeScreenshot(
  screenshotBuffer: Buffer,
  tier: 'free' | 'paid'
): Promise<DetectedIssue[]> {
  try {
    const base64Image = screenshotBuffer.toString('base64');

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2000,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: 'image/png',
                data: base64Image,
              },
            },
            {
              type: 'text',
              text: VISION_PROMPT,
            },
          ],
        },
      ],
    });

    // Parse Claude response
    const content = message.content[0];
    if (content.type !== 'text') {
      throw new Error('Unexpected response type');
    }

    // Extract JSON from response
    const jsonMatch = content.text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      return [];
    }

    const claudeIssues: ClaudeIssue[] = JSON.parse(jsonMatch[0]);

    // Calculate impact scores and sort
    const issues = claudeIssues.map((issue, index) => {
      const locationWeights = {
        hero: 3,
        'above-fold': 2,
        'below-fold': 1,
      };
      const impact = issue.severity * locationWeights[issue.location];

      return {
        id: `issue-${index + 1}`,
        pattern: issue.pattern,
        title: getIssueTitle(issue.pattern),
        description: getIssueDescription(issue.pattern, issue.elements, 'paid'),
        descriptionFree: getIssueDescription(issue.pattern, issue.elements, 'free'),
        severity: issue.severity,
        location: issue.location,
        impact,
        affectedElements: [issue.elements],
      };
    });

    // Sort by impact (highest first)
    issues.sort((a, b) => b.impact - a.impact);

    // Return top 3 for free, top 5 for paid
    const limit = tier === 'free' ? 3 : 5;
    return issues.slice(0, limit);
  } catch (error) {
    console.error('Analysis error:', error);
    throw new Error('analysis-failed');
  }
}

function getIssueTitle(pattern: PatternType): string {
  const titles: Record<PatternType, string> = {
    'heavy-shadows': 'Heavy shadows throughout',
    'default-neutrals': 'Default Tailwind neutrals',
    'centered-layouts': 'Repetitive centered layouts',
    'weak-typography': 'Weak typography hierarchy',
    'low-contrast': 'Low contrast text',
    'small-fonts': 'Font sizes too small',
    'red-ctas': 'Red used for primary buttons',
    'identical-cards': 'Identical card styling',
    'cramped-spacing': 'Cramped spacing throughout',
  };
  return titles[pattern];
}

function getIssueDescription(
  pattern: PatternType,
  elements: string,
  tier: 'free' | 'paid'
): string {
  const descriptions: Record<PatternType, { free: string; paid: string }> = {
    'heavy-shadows': {
      free: 'Your site uses heavy shadows extensively, which creates a heavy, generic AI look.',
      paid: 'Your site uses shadow-xl and shadow-2xl extensively, which creates a heavy, generic AI look.',
    },
    'default-neutrals': {
      free: 'Your site uses Tailwind\'s default neutral colors (zinc/slate), which is a telltale sign of AI-generated design.',
      paid: 'Your site uses Tailwind\'s default zinc and slate colors heavily, which is a telltale sign of AI-generated design. Custom neutral palettes look more intentional.',
    },
    'centered-layouts': {
      free: 'Multiple sections use identical centered layouts with uniform spacing, creating repetitive visual rhythm.',
      paid: 'Multiple sections use identical centered layouts with uniform spacing, creating repetitive visual rhythm. Affected: ' + elements,
    },
    'weak-typography': {
      free: 'Your headlines are only slightly larger than body text, making it hard to scan the page and diminishing visual impact.',
      paid: 'Your headlines are only slightly larger than body text, making it hard to scan the page and diminishing visual impact. Affected: ' + elements,
    },
    'low-contrast': {
      free: 'Your body text is hard to read due to low contrast. This is one of the fastest ways to lose readers - fixing it immediately improves engagement.',
      paid: 'Your body text uses low contrast colors, making it hard to read. This is one of the fastest ways to lose readers - fixing it immediately improves engagement. Affected: ' + elements,
    },
    'small-fonts': {
      free: 'Your body text uses small font sizes, which strains reading especially on mobile. Increasing font size can significantly reduce bounce rates.',
      paid: 'Your body text uses 12px or smaller font size, which strains reading especially on mobile. Increasing to 16px can significantly reduce bounce rates.',
    },
    'red-ctas': {
      free: 'Your primary call-to-action buttons use red, which signals danger or errors to users. This creates confusion and may reduce conversions.',
      paid: 'Your primary call-to-action buttons use red-500/red-600, which signals danger or errors to users. This creates confusion and may reduce conversions.',
    },
    'identical-cards': {
      free: 'All cards use the same treatment, missing opportunities for visual variety.',
      paid: 'All cards use the same treatment (rounded corners, shadows, padding), missing opportunities for visual variety. Affected: ' + elements,
    },
    'cramped-spacing': {
      free: 'Sections and components are packed tightly, making the design feel cluttered.',
      paid: 'Sections and components use tight spacing (less than 16px gaps), making the design feel cluttered. Affected: ' + elements,
    },
  };

  return descriptions[pattern][tier];
}
```

**Step 2: Commit**

```bash
git add lib/analyzer.ts
git commit -m "feat: add Claude vision analysis engine"
```

---

## Phase 4: Prompt Generation

### Task 6: Implement Prompt Generator

**Files:**
- Create: `lib/prompts.ts`

**Step 1: Write prompt templates**

File: `lib/prompts.ts`
```typescript
import { DetectedIssue, PatternType } from './types';

export function generateFixPrompt(
  issue: DetectedIssue,
  tailwindClasses: string[]
): string {
  const templates: Record<PatternType, (classes: string[]) => string> = {
    'heavy-shadows': (classes) => {
      const hasTailwind = classes.some(c => c.startsWith('shadow-'));
      if (hasTailwind) {
        return `Replace all shadow-xl and shadow-2xl with shadow-sm throughout your site. Use shadow-md only on interactive elements like buttons and cards on hover.`;
      }
      return `Replace your current heavy drop shadows with subtle shadows. Use medium shadows only on interactive elements like buttons and cards.`;
    },

    'default-neutrals': () => {
      return `Replace all zinc and slate color utilities (zinc-50, zinc-100, zinc-900, slate-600, etc.) with stone color utilities. Use stone-50 and stone-100 for backgrounds instead of zinc-50. Use stone-800 and stone-900 for text instead of zinc-900. Since stone is a warm neutral, pair it with a warm accent color: use amber-600 or orange-600 for buttons, links, and interactive elements.

Alternative cool palette: Replace with gray-50, gray-100 for backgrounds and gray-800, gray-900 for text. Use blue-600, indigo-600, or violet-600 for accents.

Reserve red for errors only, green/emerald for success states only.`;
    },

    'centered-layouts': () => {
      return `Change layouts to alternate between centered and asymmetric. Keep the hero section centered. Make the following section asymmetric with content on left and image on right. Continue alternating this pattern. Use py-12 for some sections and py-24 for others instead of uniform spacing.`;
    },

    'weak-typography': () => {
      return `Increase headline sizes. Make h1 headlines text-5xl or text-6xl (currently too small). Make h2 headlines text-4xl. Keep body text at text-base. Use maximum 5 font sizes total: text-sm for small text, text-base for body, text-2xl for h3, text-4xl for h2, text-6xl for h1.`;
    },

    'low-contrast': () => {
      return `Replace gray-400 text with gray-700 or gray-800 for body text. Use gray-600 minimum for secondary text. Reserve gray-400 only for disabled states.`;
    },

    'small-fonts': () => {
      return `Increase font sizes. Use text-base (16px) minimum for body text. Use text-sm (14px) only for captions and secondary information. Replace all text-xs with text-sm or larger.`;
    },

    'red-ctas': () => {
      return `Change all primary buttons and CTAs from red-500/red-600 to blue-600, indigo-600, orange-600, or violet-600. Reserve red exclusively for error messages, destructive actions (delete, remove), and critical warnings.`;
    },

    'identical-cards': () => {
      return `Apply different styling to different card types. Keep rounded-xl and shadow-sm for feature cards. Change testimonial cards to rounded-lg with border-l-4 border-amber-500 and no shadow. Change blog cards to rounded-none with border border-stone-200 and no shadow. Use p-6 for some cards and p-8 for others.`;
    },

    'cramped-spacing': () => {
      return `Increase spacing values. Replace gap-2 with gap-6. Replace gap-4 with gap-8. Change section padding from py-8 to py-16 or py-20. Change card padding from p-4 to p-6 minimum. Use space-y-12 or space-y-16 between sections instead of space-y-6 or space-y-8.`;
    },
  };

  return templates[issue.pattern](tailwindClasses);
}

export function generateMegaPrompt(
  issues: DetectedIssue[],
  tailwindClasses: string[]
): string {
  const prompts = issues.map((issue, index) => {
    const prompt = generateFixPrompt(issue, tailwindClasses);
    return `${index + 1}. ${issue.title}\n${prompt}`;
  });

  return `Fix these ${issues.length} design issues to make your site look more professional:

${prompts.join('\n\n')}

Apply these changes throughout the site for consistency.`;
}
```

**Step 2: Commit**

```bash
git add lib/prompts.ts
git commit -m "feat: add prompt generation templates"
```

---

## Phase 5: API Routes

### Task 7: Implement Analysis API

**Files:**
- Create: `app/api/analyze/route.ts`

**Step 1: Write API route**

File: `app/api/analyze/route.ts`
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { captureWebsite, extractTailwindClasses } from '@/lib/playwright';
import { analyzeScreenshot } from '@/lib/analyzer';
import { generateFixPrompt, generateMegaPrompt } from '@/lib/prompts';
import { AnalysisResult, AnalysisError } from '@/lib/types';

export async function POST(request: NextRequest) {
  try {
    const { url, tier = 'free' } = await request.json();

    // Validate URL
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
          message: 'Couldn\'t capture screenshot',
          suggestion: 'The site loaded but we couldn\'t capture a screenshot. Try a different page or contact support.',
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
  } catch (error: any) {
    console.error('Analysis API error:', error);

    const analysisError: AnalysisError = {
      type: 'analysis-failed',
      message: 'Analysis service temporarily unavailable',
      suggestion: 'Our AI analysis service encountered an error. We\'ve been notified and are working to fix it.',
    };

    return NextResponse.json({ error: analysisError }, { status: 500 });
  }
}
```

**Step 2: Test API route**

Create test file: `test-api.ts`
```typescript
async function testAPI() {
  const response = await fetch('http://localhost:3000/api/analyze', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      url: 'https://lovablemerch.lovable.app/',
      tier: 'free',
    }),
  });

  const data = await response.json();
  console.log('Issues found:', data.issues?.length);
  console.log('First issue:', data.issues?.[0]);
}

testAPI();
```

Run dev server: `npm run dev`
Run test: `npx tsx test-api.ts`
Expected: 3 issues returned, no prompts

**Step 3: Commit**

```bash
git add app/api/analyze/route.ts
git commit -m "feat: add analysis API route"
```

---

## Phase 6: Frontend Components

### Task 8: Build URL Input Component

**Files:**
- Create: `components/url-input.tsx`

**Step 1: Write URL input component**

File: `components/url-input.tsx`
```typescript
'use client';

import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

interface URLInputProps {
  onAnalyze: (url: string) => void;
  isLoading: boolean;
}

export function URLInput({ onAnalyze, isLoading }: URLInputProps) {
  const [url, setUrl] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Basic URL validation
    try {
      new URL(url);
      onAnalyze(url);
    } catch {
      setError('Please enter a valid URL (include https://)');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-2xl mx-auto">
      <div className="flex gap-2">
        <Input
          type="text"
          placeholder="https://yoursite.com"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          disabled={isLoading}
          className="flex-1"
        />
        <Button type="submit" disabled={isLoading || !url}>
          {isLoading ? 'Analyzing...' : 'Analyze'}
        </Button>
      </div>
      {error && (
        <p className="text-sm text-red-600 mt-2">{error}</p>
      )}
      <p className="text-sm text-gray-600 mt-2">
        Try free analysis • No signup required
      </p>
    </form>
  );
}
```

**Step 2: Commit**

```bash
git add components/url-input.tsx
git commit -m "feat: add URL input component"
```

---

### Task 9: Build Analysis Progress Component

**Files:**
- Create: `components/analysis-progress.tsx`

**Step 1: Write progress component**

File: `components/analysis-progress.tsx`
```typescript
'use client';

interface AnalysisProgressProps {
  stage: 'screenshot' | 'analyzing' | 'generating' | null;
}

export function AnalysisProgress({ stage }: AnalysisProgressProps) {
  if (!stage) return null;

  const stages = [
    { id: 'screenshot', label: 'Capturing screenshot' },
    { id: 'analyzing', label: 'Analyzing design patterns' },
    { id: 'generating', label: 'Generating fixes' },
  ];

  return (
    <div className="w-full max-w-md mx-auto py-8">
      <p className="text-center text-lg font-medium mb-4">
        Analyzing your site...
      </p>
      <div className="space-y-2">
        {stages.map((s) => (
          <div key={s.id} className="flex items-center gap-3">
            {s.id === stage ? (
              <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
            ) : stages.indexOf(s) < stages.findIndex((st) => st.id === stage) ? (
              <div className="w-5 h-5 bg-green-600 rounded-full flex items-center justify-center text-white text-xs">
                ✓
              </div>
            ) : (
              <div className="w-5 h-5 border-2 border-gray-300 rounded-full" />
            )}
            <span className={s.id === stage ? 'font-medium' : 'text-gray-600'}>
              {s.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add components/analysis-progress.tsx
git commit -m "feat: add analysis progress component"
```

---

### Task 10: Build Copy Button Component

**Files:**
- Create: `components/copy-button.tsx`

**Step 1: Write copy button component**

File: `components/copy-button.tsx`
```typescript
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import toast from 'react-hot-toast';

interface CopyButtonProps {
  text: string;
  label?: string;
}

export function CopyButton({ text, label = 'Copy Prompt' }: CopyButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success('Copied to clipboard!');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Button
      onClick={handleCopy}
      variant={copied ? 'outline' : 'default'}
      size="sm"
    >
      {copied ? '✓ Copied' : label} 📋
    </Button>
  );
}
```

**Step 2: Commit**

```bash
git add components/copy-button.tsx
git commit -m "feat: add copy button component"
```

---

### Task 11: Build Issue Card Component

**Files:**
- Create: `components/issue-card.tsx`

**Step 1: Write issue card component**

File: `components/issue-card.tsx`
```typescript
'use client';

import { Card } from '@/components/ui/card';
import { CopyButton } from './copy-button';
import { DetectedIssue } from '@/lib/types';

interface IssueCardProps {
  issue: DetectedIssue;
  tier: 'free' | 'paid';
}

export function IssueCard({ issue, tier }: IssueCardProps) {
  const description = tier === 'free' ? issue.descriptionFree : issue.description;

  return (
    <Card className="p-6">
      <div className="flex items-start justify-between mb-2">
        <h3 className="font-semibold text-lg">
          {issue.title}
        </h3>
        <span className="text-sm font-medium text-gray-600">
          Impact: {issue.impact}/10
        </span>
      </div>

      <p className="text-gray-700 mb-4">
        {description}
      </p>

      {tier === 'paid' && issue.fixPrompt ? (
        <CopyButton text={issue.fixPrompt} />
      ) : (
        <div className="flex items-center gap-2 text-gray-500">
          <span className="text-xl">🔒</span>
          <span className="text-sm">Upgrade to get fix prompt</span>
        </div>
      )}
    </Card>
  );
}
```

**Step 2: Commit**

```bash
git add components/issue-card.tsx
git commit -m "feat: add issue card component"
```

---

### Task 12: Build Results Display Component

**Files:**
- Create: `components/results-display.tsx`

**Step 1: Write results display component**

File: `components/results-display.tsx`
```typescript
'use client';

import { AnalysisResult } from '@/lib/types';
import { IssueCard } from './issue-card';
import { CopyButton } from './copy-button';
import { Button } from '@/components/ui/button';

interface ResultsDisplayProps {
  result: AnalysisResult;
  onUpgrade?: () => void;
}

export function ResultsDisplay({ result, onUpgrade }: ResultsDisplayProps) {
  return (
    <div className="w-full max-w-4xl mx-auto py-8">
      <h2 className="text-2xl font-bold mb-2">
        Analysis Results for {new URL(result.url).hostname}
      </h2>

      {/* Mega Prompt */}
      {result.tier === 'paid' && result.megaPrompt ? (
        <div className="mb-6">
          <CopyButton text={result.megaPrompt} label="COPY MEGA PROMPT" />
        </div>
      ) : (
        <div className="mb-6 p-6 border-2 border-dashed border-gray-300 rounded-lg bg-gray-50">
          <div className="flex items-center justify-between mb-2">
            <span className="font-semibold text-gray-400">
              COPY MEGA PROMPT - UPGRADE TO UNLOCK
            </span>
            <span className="text-2xl">🔒</span>
          </div>
          <div className="h-20 bg-gray-200 rounded blur-sm" />
        </div>
      )}

      {/* Issue count */}
      <p className="text-gray-600 mb-6">
        {result.tier === 'free' && (
          <>Showing {result.issues.length} highest-impact issues (2 more in paid report)</>
        )}
        {result.tier === 'paid' && (
          <>All {result.issues.length} issues + specific fix prompts</>
        )}
      </p>

      {/* Issues */}
      <div className="space-y-6">
        {result.issues.map((issue) => (
          <IssueCard key={issue.id} issue={issue} tier={result.tier} />
        ))}
      </div>

      {/* Upgrade CTA */}
      {result.tier === 'free' && onUpgrade && (
        <div className="mt-8 text-center">
          <Button onClick={onUpgrade} size="lg">
            Get All 5 Issues + Fix Prompts - $19 →
          </Button>
        </div>
      )}
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add components/results-display.tsx
git commit -m "feat: add results display component"
```

---

## Phase 7: Main Page

### Task 13: Build Landing Page

**Files:**
- Modify: `app/page.tsx`
- Create: `app/globals.css` (update)

**Step 1: Write main page**

File: `app/page.tsx`
```typescript
'use client';

import { useState } from 'react';
import { URLInput } from '@/components/url-input';
import { AnalysisProgress } from '@/components/analysis-progress';
import { ResultsDisplay } from '@/components/results-display';
import { AnalysisResult, AnalysisError } from '@/lib/types';
import { Toaster } from 'react-hot-toast';

type Stage = 'screenshot' | 'analyzing' | 'generating' | null;

export default function Home() {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [stage, setStage] = useState<Stage>(null);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<AnalysisError | null>(null);

  const handleAnalyze = async (url: string) => {
    setIsAnalyzing(true);
    setError(null);
    setResult(null);

    try {
      // Stage 1: Screenshot
      setStage('screenshot');
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Stage 2: Analyzing
      setStage('analyzing');

      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, tier: 'free' }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error);
        setStage(null);
        setIsAnalyzing(false);
        return;
      }

      // Stage 3: Generating
      setStage('generating');
      await new Promise(resolve => setTimeout(resolve, 500));

      setResult(data);
      setStage(null);
    } catch (err) {
      setError({
        type: 'analysis-failed',
        message: 'Something went wrong',
        suggestion: 'Please try again or contact support',
      });
      setStage(null);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleUpgrade = () => {
    // TODO: Implement Stripe checkout
    console.log('Upgrade to paid');
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-white to-gray-50">
      <Toaster position="top-center" />

      {/* Hero Section */}
      <section className="pt-20 pb-16 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-5xl font-bold mb-4">
            Stop Looking Like Every Other AI-Generated Site
          </h1>
          <p className="text-xl text-gray-600 mb-8">
            Detect generic design patterns in your website and get specific prompts
            to fix them in Cursor, v0, or any AI tool.
          </p>

          <URLInput onAnalyze={handleAnalyze} isLoading={isAnalyzing} />
        </div>
      </section>

      {/* Progress */}
      {stage && (
        <section className="py-8">
          <AnalysisProgress stage={stage} />
        </section>
      )}

      {/* Error */}
      {error && (
        <section className="py-8 px-4">
          <div className="max-w-2xl mx-auto bg-red-50 border border-red-200 rounded-lg p-6">
            <h3 className="font-semibold text-red-900 mb-2">
              ❌ {error.message}
            </h3>
            <p className="text-red-700 mb-4">{error.suggestion}</p>
            <button
              onClick={() => setError(null)}
              className="text-red-900 underline"
            >
              Try again
            </button>
          </div>
        </section>
      )}

      {/* Results */}
      {result && (
        <section className="py-8 px-4">
          <ResultsDisplay result={result} onUpgrade={handleUpgrade} />
        </section>
      )}

      {/* TODO: Add floating bubbles section */}
      {/* TODO: Add how it works section */}
      {/* TODO: Add pricing section */}
      {/* TODO: Add FAQ section */}
      {/* TODO: Add footer */}
    </main>
  );
}
```

**Step 2: Commit**

```bash
git add app/page.tsx
git commit -m "feat: build main landing page with analysis flow"
```

---

## Phase 8: Testing & Validation

### Task 14: Create Test URL Collection

**Files:**
- Create: `test-urls.md`

**Step 1: Add test URLs**

File: `test-urls.md`
```markdown
# Test URLs

## Generic AI Sites (22 sites - Should detect 3-5 issues each)
https://lovablemerch.lovable.app/
https://lovify.lovable.app/privacy
https://fifi.lovable.app/
https://simple.lovable.app/
https://rwh.lovable.app/
https://bar.lovable.app/
https://studiolab.lovable.app/
https://sponty.lovable.app/
https://rasa.lovable.app/
https://beglobal.lovable.app/
https://pixelana.lovable.app/
https://ourlegacy.lovable.app/
https://clear-ai-chat.lovable.app/
https://cosmic-ai.lovable.app/
https://fi15.lovable.app/
https://income-ledger.lovable.app/
https://shebuildsinsights.lovable.app/
https://fluxmc.lovable.app/
https://rung-store.lovable.app/
https://cupboard-culinary.lovable.app/
https://orbitha-io.lovable.app/
https://echosphere.lovable.app/
https://videtailer.lovable.app/

## Professional Sites (20 sites - Should detect 0-2 issues)
https://aquavoice.com
https://www.searchable.com
https://antimetal.com
https://www.v7labs.com
https://clerk.com
https://attio.com
https://tailscale.com
https://plain.com
https://raycast.com
https://cycle.app
https://runwayml.com
https://opal.so
https://invary.com
https://duna.com
https://huly.io
https://peachweb.io
https://payhawk.com
https://segment.com
https://hellobonsai.com
https://gemnote.com
```

**Step 2: Manual testing checklist**

Create: `TESTING.md`
```markdown
# Testing Checklist

## Before Each Deploy

### Happy Path (Free Tier)
- [ ] Enter URL → Analysis completes
- [ ] See 3 issues with natural language descriptions
- [ ] No specific code mentions in descriptions
- [ ] Mega prompt shows as locked/skeleton
- [ ] No copy buttons for individual prompts
- [ ] "Upgrade" CTA visible

### Happy Path (Paid Tier - Manual Test)
- [ ] Modify API call to tier: 'paid'
- [ ] See 5 issues with specific descriptions
- [ ] Code mentions in descriptions (shadow-xl, zinc-50, etc.)
- [ ] Mega prompt is copyable
- [ ] Individual copy buttons work
- [ ] Clipboard contains correct prompts

### Error Handling
- [ ] Invalid URL → Shows validation error
- [ ] Unreachable URL → Shows "Couldn't load" error
- [ ] Timeout → Shows timeout error with retry

### Test URLs
- [ ] Test 5 generic sites → 3+ issues each
- [ ] Test 5 professional sites → 0-2 issues each
- [ ] Accuracy: 80%+ correct classification

### Mobile
- [ ] iPhone Safari → Layout works, buttons work
- [ ] Android Chrome → Layout works, buttons work
```

**Step 3: Commit**

```bash
git add test-urls.md TESTING.md
git commit -m "docs: add test URLs and testing checklist"
```

---

## Phase 9: Stripe Integration (Payment)

### Task 15: Setup Stripe

**Files:**
- Create: `app/api/checkout/route.ts`
- Create: `lib/stripe.ts`

**Step 1: Install Stripe**

Already installed in Task 1.

**Step 2: Create Stripe instance**

File: `lib/stripe.ts`
```typescript
import Stripe from 'stripe';

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-11-20.acacia',
});
```

**Step 3: Create checkout session API**

File: `app/api/checkout/route.ts`
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';

export async function POST(request: NextRequest) {
  try {
    const { url } = await request.json();

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price: process.env.STRIPE_PRICE_ID,
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/analysis?session_id={CHECKOUT_SESSION_ID}&url=${encodeURIComponent(url)}`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}`,
      metadata: {
        url,
      },
    });

    return NextResponse.json({ sessionId: session.id });
  } catch (error) {
    console.error('Checkout error:', error);
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    );
  }
}
```

**Step 4: Update main page to handle upgrade**

File: `app/page.tsx` (modify handleUpgrade function)
```typescript
const handleUpgrade = async () => {
  if (!result?.url) return;

  try {
    const response = await fetch('/api/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: result.url }),
    });

    const { sessionId } = await response.json();

    // Redirect to Stripe Checkout
    const stripe = await loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);
    await stripe?.redirectToCheckout({ sessionId });
  } catch (error) {
    console.error('Upgrade error:', error);
    toast.error('Failed to start checkout');
  }
};
```

**Step 5: Create analysis page for paid results**

File: `app/analysis/page.tsx`
```typescript
'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { ResultsDisplay } from '@/components/results-display';
import { AnalysisProgress } from '@/components/analysis-progress';
import { AnalysisResult } from '@/lib/types';

export default function AnalysisPage() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('session_id');
  const url = searchParams.get('url');

  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!sessionId || !url) {
      setIsLoading(false);
      return;
    }

    // Run paid analysis
    const analyze = async () => {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, tier: 'paid' }),
      });

      const data = await response.json();
      setResult(data);
      setIsLoading(false);
    };

    analyze();
  }, [sessionId, url]);

  if (isLoading) {
    return (
      <main className="min-h-screen bg-gradient-to-b from-white to-gray-50 pt-20">
        <AnalysisProgress stage="analyzing" />
      </main>
    );
  }

  if (!result) {
    return (
      <main className="min-h-screen bg-gradient-to-b from-white to-gray-50 pt-20">
        <div className="text-center">
          <h1 className="text-2xl font-bold">Something went wrong</h1>
          <a href="/" className="text-blue-600 underline mt-4 inline-block">
            Go back home
          </a>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-white to-gray-50 pt-20 px-4">
      <ResultsDisplay result={result} />
    </main>
  );
}
```

**Step 6: Commit**

```bash
git add lib/stripe.ts app/api/checkout/route.ts app/analysis/page.tsx app/page.tsx
git commit -m "feat: add Stripe payment integration"
```

---

## Phase 10: Documentation & Deploy Prep

### Task 16: Create README and Documentation

**Files:**
- Create: `README.md`
- Create: `CLAUDE.md`

**Step 1: Write README**

File: `README.md`
```markdown
# Design Analyzer

AI-powered tool that detects generic design patterns in websites and generates specific fix prompts for AI development tools (Cursor, v0, Lovable).

## Features

- **Free Tier**: Analyze any website URL and get 3 highest-impact issues
- **Paid Tier** ($19): Get all 5 issues + specific fix prompts + mega prompt
- **Pattern Detection**: Heavy shadows, default colors, layout issues, typography, accessibility
- **AI-Ready Prompts**: Copy-paste prompts that work with any AI dev tool

## Tech Stack

- Next.js 14 (App Router)
- TypeScript
- Tailwind CSS + shadcn/ui
- Playwright (screenshots + HTML extraction)
- Claude API (Sonnet 4 for vision analysis)
- Stripe (payments)
- Vercel (deployment)

## Setup

1. Clone and install:
```bash
git clone https://github.com/[username]/design-analyzer.git
cd design-analyzer
npm install
```

2. Set up environment variables:
```bash
cp .env.local.example .env.local
# Add your API keys to .env.local
```

3. Install Playwright browsers:
```bash
npx playwright install chromium
```

4. Run development server:
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Environment Variables

- `ANTHROPIC_API_KEY` - Claude API key
- `STRIPE_SECRET_KEY` - Stripe secret key
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` - Stripe publishable key
- `STRIPE_PRICE_ID` - Stripe price ID for $19 product
- `NEXT_PUBLIC_APP_URL` - App URL (http://localhost:3000 for dev)

## Testing

See `TESTING.md` for manual testing checklist.

Test URLs are in `test-urls.md`.

## Deployment

Deploy to Vercel:

```bash
vercel
```

Make sure to add all environment variables in Vercel dashboard.

## License

MIT
```

**Step 2: Create project CLAUDE.md**

File: `CLAUDE.md`
```markdown
# Design Analyzer - Project Context

## Project Overview

AI-powered tool that detects generic patterns in AI-generated websites and provides specific Tailwind class fixes.

**Target Users**: Developers using Cursor/v0/Lovable who want professional-looking sites
**MVP Goal**: Validate $19/analysis pricing with 30+ sales in 2 weeks
**Timeline**: 7 days to launch

## Technical Architecture

### Stack
- Next.js 14 (App Router)
- TypeScript
- Claude API (Sonnet 4) for vision analysis
- Playwright for screenshots + HTML parsing
- Tailwind CSS + shadcn/ui
- Stripe for payments
- Vercel deployment

### Core Flow
1. User pastes URL
2. Playwright captures screenshot + HTML
3. Claude vision AI analyzes screenshot for generic patterns
4. HTML parser extracts Tailwind classes
5. Generate specific fixes combining vision + HTML analysis
6. Display results with copy-paste prompts

### Freemium Model
- **Free**: 3 issues, natural language only (no code specifics, no prompts)
- **Paid ($19)**: 5 issues, specific code mentions, fix prompts, mega prompt

## Key Detection Patterns

1. **Heavy shadows** - shadow-xl/2xl overuse
2. **Default neutrals** - zinc/slate colors
3. **Centered layouts** - repetitive structure
4. **Weak typography** - poor hierarchy
5. **Low contrast** - accessibility issues
6. **Small fonts** - readability issues
7. **Red CTAs** - semantic color misuse
8. **Identical cards** - no variation
9. **Cramped spacing** - tight gaps

## Scoring System

Impact = Severity (0-10) × Location Weight
- Hero: 3x
- Above fold: 2x
- Below fold: 1x

Show top 3 (free) or top 5 (paid) by impact score.

## Known Issues

[To be filled during development]

## Fixed Issues

[To be filled as bugs are resolved]

## Learning & Patterns Discovered

[To be filled as you learn what works/doesn't work]
```

**Step 3: Commit**

```bash
git add README.md CLAUDE.md
git commit -m "docs: add README and project documentation"
```

---

## Phase 11: Linear Integration

### Task 17: Create Linear Issues

**Step 1: Install Linear CLI**

```bash
npm install -g @linear/cli
linear login
```

**Step 2: Create Linear project and issues**

```bash
# Create project
linear project create "Design Analyzer MVP"

# Create issues (run these one by one)
linear issue create \
  --title "Setup Next.js project with dependencies" \
  --description "Initialize Next.js 14, install Playwright, Claude SDK, Stripe, shadcn/ui" \
  --project "Design Analyzer MVP"

linear issue create \
  --title "Implement Playwright screenshot service" \
  --description "Capture full-page screenshots and extract HTML/Tailwind classes" \
  --project "Design Analyzer MVP"

linear issue create \
  --title "Implement Claude vision analysis" \
  --description "Send screenshots to Claude API and detect generic patterns" \
  --project "Design Analyzer MVP"

linear issue create \
  --title "Build prompt generation system" \
  --description "Generate specific fix prompts based on detected issues" \
  --project "Design Analyzer MVP"

linear issue create \
  --title "Create API routes" \
  --description "Build /api/analyze and /api/checkout endpoints" \
  --project "Design Analyzer MVP"

linear issue create \
  --title "Build frontend components" \
  --description "URLInput, AnalysisProgress, ResultsDisplay, IssueCard, CopyButton" \
  --project "Design Analyzer MVP"

linear issue create \
  --title "Implement Stripe payments" \
  --description "Stripe checkout for $19 payment and paid tier access" \
  --project "Design Analyzer MVP"

linear issue create \
  --title "Test with 42 URLs" \
  --description "Validate accuracy with 22 generic + 20 professional sites" \
  --project "Design Analyzer MVP"

linear issue create \
  --title "Deploy to Vercel" \
  --description "Production deployment with all env variables" \
  --project "Design Analyzer MVP"
```

**Step 3: Connect Linear to GitHub**

1. Go to Linear settings → Integrations
2. Connect GitHub repository
3. Enable auto-linking (commits with "LIN-XXX" will auto-link)

**Step 4: Document Linear workflow**

Add to `CLAUDE.md`:
```markdown
## Linear Workflow

- Issues are tracked in Linear project "Design Analyzer MVP"
- Commit format: `LIN-XXX: commit message`
- Issues auto-link to GitHub commits
- Mark issues done when complete
```

**Step 5: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: document Linear integration workflow"
```

---

## Summary & Next Steps

This implementation plan covers the complete MVP:

1. ✅ Project setup (Next.js, dependencies, structure)
2. ✅ Playwright screenshot service
3. ✅ Claude vision analysis engine
4. ✅ Prompt generation system
5. ✅ API routes (analyze, checkout)
6. ✅ Frontend components (URL input, progress, results)
7. ✅ Freemium model (free vs paid tiers)
8. ✅ Stripe payment integration
9. ✅ Testing strategy with 42 test URLs
10. ✅ Documentation (README, CLAUDE.md, TESTING.md)
11. ✅ Linear + GitHub integration

## Not Included in MVP (Post-Launch)

- Database persistence (Supabase)
- Screenshot upload fallback
- Advanced landing page (floating bubbles, pricing table, FAQ)
- Email receipts
- Usage analytics
- A/B testing

## Estimated Timeline

- Phase 1-2 (Setup + Playwright): 2 hours
- Phase 3-4 (Analysis + Prompts): 3 hours
- Phase 5-6 (API + Frontend): 4 hours
- Phase 7-8 (Landing + Testing): 2 hours
- Phase 9-10 (Stripe + Docs): 2 hours
- Phase 11 (Linear): 30 minutes

**Total: ~14 hours** (fits within 2 development sessions)

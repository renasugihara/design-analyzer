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

const LOCATION_WEIGHTS: Record<LocationWeight, number> = {
  hero: 3,
  'above-fold': 2,
  'below-fold': 1,
};

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

    const content = message.content[0];
    if (content.type !== 'text') {
      throw new Error('Unexpected response type');
    }

    const jsonMatch = content.text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      return [];
    }

    const claudeIssues: ClaudeIssue[] = JSON.parse(jsonMatch[0]);

    const issues = claudeIssues.map((issue, index) => {
      const impact = issue.severity * LOCATION_WEIGHTS[issue.location];

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

    issues.sort((a, b) => b.impact - a.impact);

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
      free: "Your site uses Tailwind's default neutral colors (zinc/slate), which is a telltale sign of AI-generated design.",
      paid: "Your site uses Tailwind's default zinc and slate colors heavily, which is a telltale sign of AI-generated design. Custom neutral palettes look more intentional.",
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

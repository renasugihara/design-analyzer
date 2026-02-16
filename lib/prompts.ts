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

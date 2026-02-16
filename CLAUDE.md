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

Impact = Severity (0-10) x Location Weight
- Hero: 3x
- Above fold: 2x
- Below fold: 1x

Show top 3 (free) or top 5 (paid) by impact score.

## Linear Workflow

- Project: "Design Analyzer MVP" in Galleon team
- Issues: GLN-57 through GLN-65
- Commit format: `GLN-XXX: commit message`
- Issues auto-link to GitHub commits
- Remaining: GLN-64 (Test with 42 URLs), GLN-65 (Deploy to Vercel)

## Known Issues

[To be filled during development]

## Fixed Issues

[To be filled as bugs are resolved]

## Learning & Patterns Discovered

[To be filled as you learn what works/doesn't work]

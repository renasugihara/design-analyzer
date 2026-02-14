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

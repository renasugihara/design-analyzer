// TODO: Implement Claude vision analysis (Task 5)
import { DetectedIssue } from './types';

export async function analyzeScreenshot(
  _screenshotBuffer: Buffer,
  _tier: 'free' | 'paid'
): Promise<DetectedIssue[]> {
  throw new Error('Not implemented - Task 5');
}

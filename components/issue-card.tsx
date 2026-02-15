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
          <span className="text-sm">Upgrade to get fix prompt</span>
        </div>
      )}
    </Card>
  );
}

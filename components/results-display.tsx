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
            Get All 5 Issues + Fix Prompts - $19
          </Button>
        </div>
      )}
    </div>
  );
}

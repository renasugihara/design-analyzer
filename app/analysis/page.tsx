'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { ResultsDisplay } from '@/components/results-display';
import { AnalysisProgress } from '@/components/analysis-progress';
import { AnalysisResult } from '@/lib/types';

function AnalysisContent() {
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

export default function AnalysisPage() {
  return (
    <Suspense fallback={
      <main className="min-h-screen bg-gradient-to-b from-white to-gray-50 pt-20">
        <AnalysisProgress stage="analyzing" />
      </main>
    }>
      <AnalysisContent />
    </Suspense>
  );
}

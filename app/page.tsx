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
      setStage('screenshot');

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

      setStage('generating');
      await new Promise(resolve => setTimeout(resolve, 500));

      setResult(data);
      setStage(null);
    } catch {
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

  const handleUpgrade = async () => {
    if (!result) return;

    // Temporary bypass: re-analyze as paid tier
    setIsAnalyzing(true);
    setStage('generating');

    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: result.url, tier: 'paid' }),
      });

      const data = await response.json();

      if (response.ok) {
        setResult(data);
      }
    } catch {
      // Keep existing result on error
    } finally {
      setStage(null);
      setIsAnalyzing(false);
    }
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
              {error.message}
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
    </main>
  );
}

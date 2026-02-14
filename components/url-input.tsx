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
        Try free analysis - No signup required
      </p>
    </form>
  );
}

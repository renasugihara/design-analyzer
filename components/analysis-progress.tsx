'use client';

interface AnalysisProgressProps {
  stage: 'screenshot' | 'analyzing' | 'generating' | null;
}

export function AnalysisProgress({ stage }: AnalysisProgressProps) {
  if (!stage) return null;

  const stages = [
    { id: 'screenshot', label: 'Capturing screenshot' },
    { id: 'analyzing', label: 'Analyzing design patterns' },
    { id: 'generating', label: 'Generating fixes' },
  ];

  const currentIndex = stages.findIndex((s) => s.id === stage);

  return (
    <div className="w-full max-w-md mx-auto py-8">
      <p className="text-center text-lg font-medium mb-4">
        Analyzing your site...
      </p>
      <div className="space-y-2">
        {stages.map((s, index) => (
          <div key={s.id} className="flex items-center gap-3">
            {index === currentIndex ? (
              <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
            ) : index < currentIndex ? (
              <div className="w-5 h-5 bg-green-600 rounded-full flex items-center justify-center text-white text-xs">
                &#10003;
              </div>
            ) : (
              <div className="w-5 h-5 border-2 border-gray-300 rounded-full" />
            )}
            <span className={index === currentIndex ? 'font-medium' : 'text-gray-600'}>
              {s.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

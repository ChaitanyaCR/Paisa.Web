'use client';

import { useAppState } from '@/components/app-state';

export function DataStatus() {
  const { loading, error, reload } = useAppState();
  if (loading)
    return (
      <div className="panel preview-note" role="status">
        Loading your data…
      </div>
    );
  if (error)
    return (
      <div className="panel form-validation" role="alert">
        <span>!</span>
        {error}
        <button className="text-link" onClick={reload}>
          Try again
        </button>
      </div>
    );
  return null;
}

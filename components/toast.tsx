'use client';

import { Check, X } from 'lucide-react';
import { useAppState } from '@/components/app-state';

export function Toast() {
  const { notice, dismissNotice } = useAppState();
  if (!notice) return null;

  return (
    <div className="toast" role="status">
      <Check size={17} />
      {notice}
      <button aria-label="Dismiss notification" onClick={dismissNotice}>
        <X size={15} />
      </button>
    </div>
  );
}

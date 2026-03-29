'use client';

import { useState, useEffect } from 'react';

/**
 * Shows a subtle banner when the user goes offline.
 * Auto-hides when connectivity returns.
 */
export function OfflineBanner() {
  const [isOffline, setIsOffline] = useState(false);

  useEffect(() => {
    const goOffline = () => setIsOffline(true);
    const goOnline = () => setIsOffline(false);

    // Check initial state
    if (!navigator.onLine) setIsOffline(true);

    window.addEventListener('offline', goOffline);
    window.addEventListener('online', goOnline);
    return () => {
      window.removeEventListener('offline', goOffline);
      window.removeEventListener('online', goOnline);
    };
  }, []);

  if (!isOffline) return null;

  return (
    <div className="fixed left-0 right-0 top-0 z-50 flex items-center justify-center bg-label/90 px-4 py-2 text-center backdrop-blur-sm">
      <p className="text-[13px] font-medium tracking-[0.002em] text-white">
        Je bent offline — sommige functies werken mogelijk niet
      </p>
    </div>
  );
}

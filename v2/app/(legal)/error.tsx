'use client';

import { useEffect } from 'react';
import Link from 'next/link';

export default function LegalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Legal page error:', error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4">
      <div className="text-center max-w-sm">
        <h2 className="text-[20px] font-semibold tracking-[-0.024em] text-label">
          Pagina kon niet geladen worden
        </h2>
        <p className="mt-2 text-[15px] leading-relaxed tracking-[-0.020em] text-label-secondary">
          Probeer het opnieuw of ga terug naar de homepagina.
        </p>
        <div className="mt-5 flex gap-3 justify-center">
          <button
            onClick={reset}
            className="inline-flex h-11 items-center justify-center rounded-pill bg-accent px-6 text-[15px] font-semibold text-white active:bg-accent-active transition-colors duration-fast"
          >
            Opnieuw
          </button>
          <Link
            href="/"
            className="inline-flex h-11 items-center justify-center rounded-pill bg-bg-secondary px-6 text-[15px] font-medium text-label-secondary transition-colors duration-fast"
          >
            Home
          </Link>
        </div>
      </div>
    </div>
  );
}

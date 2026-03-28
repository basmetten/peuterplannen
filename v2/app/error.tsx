'use client';

import { useEffect } from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Unhandled error:', error);
  }, [error]);

  return (
    <div className="flex min-h-dvh items-center justify-center px-4 bg-bg-primary">
      <div className="text-center max-w-sm">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-bg-secondary">
          <svg
            width="28"
            height="28"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-label-secondary"
          >
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
        </div>
        <h1 className="text-[22px] font-semibold tracking-[-0.026em] text-label">
          Er ging iets mis
        </h1>
        <p className="mt-2 text-[15px] leading-relaxed tracking-[-0.020em] text-label-secondary">
          We konden deze pagina niet laden. Probeer het opnieuw of ga terug naar de homepagina.
        </p>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <button
            onClick={reset}
            className="inline-flex h-11 items-center justify-center rounded-pill bg-accent px-6 text-[17px] font-semibold text-white active:bg-accent-active transition-colors duration-fast"
          >
            Probeer opnieuw
          </button>
          <a
            href="/"
            className="inline-flex h-11 items-center justify-center rounded-pill bg-bg-secondary px-6 text-[17px] font-semibold text-label transition-colors duration-fast"
          >
            Naar home
          </a>
        </div>
      </div>
    </div>
  );
}

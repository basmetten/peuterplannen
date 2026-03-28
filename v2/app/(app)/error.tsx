'use client';

import { useEffect } from 'react';

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('App error:', error);
  }, [error]);

  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center bg-bg-primary/95 px-6">
      <div className="text-center max-w-xs">
        <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-bg-secondary">
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-label-secondary"
          >
            <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
            <line x1="12" y1="9" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
        </div>
        <h2 className="text-[20px] font-semibold tracking-[-0.024em] text-label">
          Oeps, dat ging niet goed
        </h2>
        <p className="mt-2 text-[15px] leading-relaxed tracking-[-0.020em] text-label-secondary">
          Er is een fout opgetreden. Probeer de pagina opnieuw te laden.
        </p>
        <div className="mt-5 flex flex-col gap-3">
          <button
            onClick={reset}
            className="inline-flex h-11 w-full items-center justify-center rounded-pill bg-accent px-6 text-[17px] font-semibold text-white active:bg-accent-active transition-colors duration-fast"
          >
            Opnieuw laden
          </button>
          <a
            href="/"
            className="inline-flex h-11 w-full items-center justify-center rounded-pill bg-bg-secondary px-6 text-[15px] font-medium text-label-secondary transition-colors duration-fast"
          >
            Terug naar home
          </a>
        </div>
      </div>
    </div>
  );
}

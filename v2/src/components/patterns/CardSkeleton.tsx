'use client';

/**
 * Skeleton loading card matching LocationCard dimensions.
 * Shows shimmer animation while data loads.
 */
export function CardSkeleton() {
  return (
    <div className="flex w-full gap-3 rounded-card bg-bg-tertiary p-4 shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
      {/* Photo placeholder */}
      <div className="h-[72px] w-[72px] flex-shrink-0 animate-pulse rounded-photo bg-bg-secondary" />

      {/* Content placeholders */}
      <div className="flex min-w-0 flex-1 flex-col justify-center gap-2">
        {/* Name */}
        <div className="h-[18px] w-3/4 animate-pulse rounded bg-bg-secondary" />
        {/* Type badge + score */}
        <div className="flex items-center gap-2">
          <div className="h-[22px] w-16 animate-pulse rounded-badge bg-bg-secondary" />
          <div className="h-[16px] w-8 animate-pulse rounded bg-bg-secondary" />
        </div>
        {/* Highlight */}
        <div className="h-[16px] w-5/6 animate-pulse rounded bg-bg-secondary" />
      </div>
    </div>
  );
}

/**
 * Multiple skeleton cards for the browse sheet loading state.
 * Staggered opacity for a natural loading feel.
 */
export function CardListSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="flex flex-col gap-2 px-4 pb-4">
      {Array.from({ length: count }, (_, i) => (
        <div
          key={i}
          style={{
            opacity: 1 - i * 0.1,
            animationDelay: `${i * 80}ms`,
          }}
        >
          <CardSkeleton />
        </div>
      ))}
    </div>
  );
}

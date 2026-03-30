'use client';

import useEmblaCarousel from 'embla-carousel-react';
import { type ReactNode } from 'react';

interface HorizontalCardStripProps {
  children: ReactNode;
  className?: string;
}

export function HorizontalCardStrip({ children, className = '' }: HorizontalCardStripProps) {
  const [emblaRef] = useEmblaCarousel({
    align: 'start',
    containScroll: 'trimSnaps',
    dragFree: true,
  });

  return (
    <div className={`overflow-hidden ${className}`} ref={emblaRef}>
      <div className="flex gap-3">{children}</div>
    </div>
  );
}

'use client';

import { useState, useCallback } from 'react';
import { getResizedPhotoUrl, IMAGE_SIZES } from '@/lib/image';

type ImageSize = keyof typeof IMAGE_SIZES;

interface OptimizedImageProps {
  /** Raw photo URL from database (relative or absolute) */
  src: string | null | undefined;
  /** Preset size from IMAGE_SIZES */
  size: ImageSize;
  /** Alt text for accessibility */
  alt: string;
  /** Additional CSS classes */
  className?: string;
  /** Loading strategy — use "eager" for above-fold images */
  loading?: 'lazy' | 'eager';
}

/**
 * Optimized image component using Cloudflare Image Resizing.
 *
 * - Generates `/cdn-cgi/image/...` URLs for on-the-fly resizing
 * - Uses `format=auto` so Cloudflare serves WebP/AVIF based on Accept header
 * - Includes explicit width/height for CLS prevention
 * - Falls back to a warm gradient placeholder when src is null
 * - Subtle fade-in animation on load
 */
export function OptimizedImage({
  src,
  size,
  alt,
  className = '',
  loading = 'eager',
}: OptimizedImageProps) {
  const [loaded, setLoaded] = useState(false);
  const { width, height } = IMAGE_SIZES[size];
  const resizedUrl = getResizedPhotoUrl(src, size);

  const handleLoad = useCallback(() => setLoaded(true), []);

  if (!resizedUrl) {
    return (
      <div
        className={`bg-gradient-to-br from-[#F5E6DC] to-[#E8D5C4] ${className}`}
        role="img"
        aria-label={alt}
      />
    );
  }

  return (
    <img
      src={resizedUrl}
      alt={alt}
      width={width}
      height={height}
      loading={loading}
      decoding="async"
      onLoad={handleLoad}
      className={`transition-opacity duration-300 ${loaded ? 'opacity-100' : 'opacity-0'} ${className}`}
    />
  );
}

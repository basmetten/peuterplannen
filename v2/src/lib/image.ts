/**
 * R2 Photo URL utilities.
 *
 * Database stores relative paths: /images/locations/{region}/{slug}/hero.webp
 * R2 stores with key pattern:    {region}/{slug}/hero.webp
 * Public URL:                    {R2_PUBLIC_URL}/{region}/{slug}/hero.webp
 *
 * After migration, photo_url values are updated to full R2 URLs.
 * During transition, this helper converts both old relative paths and new URLs.
 */

const R2_PUBLIC_URL = process.env.NEXT_PUBLIC_R2_URL ?? '';
const LOCAL_PREFIX = '/images/locations/';

/**
 * Convert a photo_url from the database to a usable public URL.
 *
 * Handles:
 * - Full URLs (https://...) → pass through
 * - Relative paths (/images/locations/...) → R2 URL (if R2 configured)
 * - Null/undefined → null
 */
export function getPhotoUrl(
  photoUrl: string | null | undefined,
): string | null {
  if (!photoUrl) return null;

  // Already a full URL — pass through
  if (photoUrl.startsWith('http')) return photoUrl;

  // Relative path → R2 URL
  if (photoUrl.startsWith(LOCAL_PREFIX) && R2_PUBLIC_URL) {
    const key = photoUrl.slice(LOCAL_PREFIX.length);
    return `${R2_PUBLIC_URL}/${key}`;
  }

  // No R2 configured or unrecognized path
  return null;
}

/* ------------------------------------------------------------------ */
/*  Cloudflare Image Resizing (ready for Phase 4)                     */
/* ------------------------------------------------------------------ */

/** Image size presets for Cloudflare Image Resizing. */
export const IMAGE_SIZES = {
  /** LocationCard thumbnail (72×72 displayed, 2x for retina) */
  card: { width: 144, height: 144, fit: 'cover', quality: 80 },
  /** CarouselCard thumbnail (72×72 displayed, 2x for retina) */
  carousel: { width: 144, height: 144, fit: 'cover', quality: 80 },
  /** Detail hero (full width, ~4:3) */
  hero: { width: 800, height: 600, fit: 'cover', quality: 85 },
  /** OG / social sharing image */
  og: { width: 1200, height: 630, fit: 'cover', quality: 85 },
} as const;

type ImageSize = keyof typeof IMAGE_SIZES;

/**
 * Get a resized photo URL via Cloudflare Image Resizing.
 *
 * Requires Image Resizing enabled on the Cloudflare zone.
 * Falls back to the unresized URL if the source isn't an R2 URL.
 */
export function getResizedPhotoUrl(
  photoUrl: string | null | undefined,
  size: ImageSize,
): string | null {
  const url = getPhotoUrl(photoUrl);
  if (!url) return null;

  // Only apply resizing to R2 URLs
  if (!R2_PUBLIC_URL || !url.startsWith(R2_PUBLIC_URL)) return url;

  const { width, height, fit, quality } = IMAGE_SIZES[size];
  const key = url.slice(R2_PUBLIC_URL.length + 1); // strip domain + leading /
  return `${R2_PUBLIC_URL}/cdn-cgi/image/width=${width},height=${height},fit=${fit},quality=${quality},format=auto/${key}`;
}

/**
 * Custom image loader for next/image (Phase 4).
 *
 * Usage in next.config.ts:
 *   images: { loader: 'custom', loaderFile: './src/lib/image-loader.ts' }
 *
 * Or per-component:
 *   <Image loader={cloudflareLoader} src={url} width={400} height={300} />
 */
export function cloudflareLoader({
  src,
  width,
  quality,
}: {
  src: string;
  width: number;
  quality?: number;
}): string {
  // Only transform R2 URLs
  if (!R2_PUBLIC_URL || !src.startsWith(R2_PUBLIC_URL)) return src;

  const key = src.slice(R2_PUBLIC_URL.length + 1);
  const q = quality ?? 80;
  return `${R2_PUBLIC_URL}/cdn-cgi/image/width=${width},fit=cover,quality=${q},format=auto/${key}`;
}

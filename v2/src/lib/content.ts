import {
  REGION_EDITORIAL,
  TYPE_EDITORIAL,
  type EditorialContent,
} from '@/content/editorial';

export type { EditorialContent };

/** Get editorial content for a region hub page */
export function getRegionContent(regionSlug: string): EditorialContent | null {
  return REGION_EDITORIAL[regionSlug] ?? null;
}

/** Get editorial content for a type hub page */
export function getTypeContent(typeSlug: string): EditorialContent | null {
  return TYPE_EDITORIAL[typeSlug] ?? null;
}

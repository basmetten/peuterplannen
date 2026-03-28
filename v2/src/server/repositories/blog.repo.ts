import 'server-only';
import { BlogPostSchema, type BlogPost, type BlogPostMeta } from '@/domain/blog';
import postsData from '@/content/blog-posts.generated.json';

// ---------------------------------------------------------------------------
// Parse and validate all posts at module load (build time)
// ---------------------------------------------------------------------------

const ALL_POSTS: BlogPost[] = (postsData as unknown[]).map((raw) =>
  BlogPostSchema.parse(raw),
);

// Pre-build slug lookup for O(1) access
const SLUG_INDEX = new Map(ALL_POSTS.map((p) => [p.slug, p]));

// ---------------------------------------------------------------------------
// BlogRepository — read-only access to bundled blog posts
// ---------------------------------------------------------------------------

function stripBody(post: BlogPost): BlogPostMeta {
  const { body: _, ...meta } = post;
  return meta;
}

export const BlogRepository = {
  /** All posts sorted by date (newest first) */
  getAll(): BlogPostMeta[] {
    return ALL_POSTS.map(stripBody);
  },

  /** Single post by slug (with body for rendering) */
  getBySlug(slug: string): BlogPost | null {
    return SLUG_INDEX.get(slug) ?? null;
  },

  /** All slugs — for generateStaticParams */
  getAllSlugs(): string[] {
    return ALL_POSTS.map((p) => p.slug);
  },

  /** Posts filtered by tag */
  getByTag(tag: string): BlogPostMeta[] {
    return ALL_POSTS.filter((p) => p.tags.includes(tag)).map(stripBody);
  },

  /** Posts related to a region */
  getByRegion(regionSlug: string): BlogPostMeta[] {
    return ALL_POSTS.filter((p) => p.related_regions.includes(regionSlug)).map(stripBody);
  },

  /** Related posts for a given slug — same tags, excluding self */
  getRelated(slug: string, limit = 3): BlogPostMeta[] {
    const post = SLUG_INDEX.get(slug);
    if (!post) return [];

    const tagSet = new Set(post.tags);
    const scored = ALL_POSTS
      .filter((p) => p.slug !== slug)
      .map((p) => ({
        post: p,
        score:
          p.tags.filter((t) => tagSet.has(t)).length * 2 +
          p.related_regions.filter((r) => post.related_regions.includes(r)).length,
      }))
      .filter((s) => s.score > 0)
      .sort((a, b) => b.score - a.score);

    return scored.slice(0, limit).map((s) => stripBody(s.post));
  },

  /** Total count */
  count(): number {
    return ALL_POSTS.length;
  },
} as const;

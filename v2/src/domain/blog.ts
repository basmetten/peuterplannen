import { z } from 'zod';

// ---------------------------------------------------------------------------
// Blog post schema — validates frontmatter + body from bundled JSON
// ---------------------------------------------------------------------------

export const BlogPostSchema = z.object({
  slug: z.string().min(1),
  title: z.string().min(1),
  description: z.string(),
  date: z.string().nullable(), // ISO date string YYYY-MM-DD
  tags: z.array(z.string()),
  related_regions: z.array(z.string()),
  featured_image: z.string().nullable(),
  body: z.string(),
});

export type BlogPost = z.infer<typeof BlogPostSchema>;

/** Metadata subset — used for listing pages (no body) */
export type BlogPostMeta = Omit<BlogPost, 'body'>;

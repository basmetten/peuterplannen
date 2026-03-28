#!/usr/bin/env node
/**
 * bundle-posts.mjs — Reads /content/posts/*.md and generates
 * src/content/blog-posts.generated.json with frontmatter + raw markdown body.
 *
 * Run: node scripts/bundle-posts.mjs
 * Or automatically via: npm run prebuild
 *
 * This avoids fs.readFileSync at runtime — required for Cloudflare Pages.
 */

import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, basename } from 'node:path';
import matter from 'gray-matter';

const POSTS_DIR = join(import.meta.dirname, '..', '..', 'content', 'posts');
const OUTPUT_FILE = join(import.meta.dirname, '..', 'src', 'content', 'blog-posts.generated.json');

const files = readdirSync(POSTS_DIR)
  .filter((f) => f.endsWith('.md'))
  .sort();

console.log(`[bundle-posts] Found ${files.length} markdown files in ${POSTS_DIR}`);

const posts = files.map((file) => {
  const raw = readFileSync(join(POSTS_DIR, file), 'utf-8');
  const { data, content } = matter(raw);
  const slug = basename(file, '.md');

  return {
    slug,
    title: data.title ?? slug,
    description: data.description ?? '',
    date: typeof data.date === 'string' ? data.date : data.date?.toISOString?.()?.slice(0, 10) ?? null,
    tags: Array.isArray(data.tags) ? data.tags : [],
    related_regions: Array.isArray(data.related_regions) ? data.related_regions : [],
    featured_image: data.featured_image ?? null,
    body: content.trim(),
  };
});

// Sort by date descending (newest first)
posts.sort((a, b) => {
  if (!a.date && !b.date) return 0;
  if (!a.date) return 1;
  if (!b.date) return -1;
  return b.date.localeCompare(a.date);
});

writeFileSync(OUTPUT_FILE, JSON.stringify(posts, null, 2), 'utf-8');
console.log(`[bundle-posts] Wrote ${posts.length} posts to ${OUTPUT_FILE}`);

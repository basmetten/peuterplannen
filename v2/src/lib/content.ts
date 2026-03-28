import 'server-only';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

// ---------------------------------------------------------------------------
// Markdown content reader for SEO editorial blurbs
// Reads from /content/seo/regions/*.md and /content/seo/types/*.md
// ---------------------------------------------------------------------------

interface ContentFrontmatter {
  meta_title: string;
  meta_description: string;
  updated_at: string | null;
  editorial_label: string | null;
}

interface ContentSection {
  heading: string;
  body: string;
}

export interface EditorialContent {
  frontmatter: ContentFrontmatter;
  sections: ContentSection[];
}

const CONTENT_ROOT = join(process.cwd(), '..', 'content', 'seo');

/** Parse simple YAML frontmatter between --- markers */
function parseFrontmatter(raw: string): { frontmatter: Record<string, string>; body: string } {
  const match = raw.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!match) return { frontmatter: {}, body: raw };

  const fm: Record<string, string> = {};
  for (const line of match[1].split('\n')) {
    const colon = line.indexOf(':');
    if (colon < 0) continue;
    const key = line.slice(0, colon).trim();
    const value = line.slice(colon + 1).trim().replace(/^["']|["']$/g, '');
    if (key && value && !key.startsWith('-') && !key.startsWith(' ')) {
      fm[key] = value;
    }
  }
  return { frontmatter: fm, body: match[2].trim() };
}

/** Parse markdown body into heading+body sections */
function parseSections(body: string): ContentSection[] {
  const sections: ContentSection[] = [];
  const parts = body.split(/^## /m).filter(Boolean);
  for (const part of parts) {
    const newline = part.indexOf('\n');
    if (newline < 0) continue;
    sections.push({
      heading: part.slice(0, newline).trim(),
      body: part.slice(newline + 1).trim(),
    });
  }
  return sections;
}

/** Read editorial content for a region hub page */
export function getRegionContent(regionSlug: string): EditorialContent | null {
  const path = join(CONTENT_ROOT, 'regions', `${regionSlug}.md`);
  if (!existsSync(path)) return null;

  const raw = readFileSync(path, 'utf-8');
  const { frontmatter: fm, body } = parseFrontmatter(raw);
  return {
    frontmatter: {
      meta_title: fm.meta_title ?? '',
      meta_description: fm.meta_description ?? '',
      updated_at: fm.updated_at ?? null,
      editorial_label: fm.editorial_label ?? null,
    },
    sections: parseSections(body),
  };
}

/** Map type URL slugs to content file names (where they differ) */
const TYPE_CONTENT_FILE_MAP: Record<string, string> = {
  boerderijen: 'kinderboerderijen',
};

/** Read editorial content for a type hub page */
export function getTypeContent(typeSlug: string): EditorialContent | null {
  const fileName = TYPE_CONTENT_FILE_MAP[typeSlug] ?? typeSlug;
  const path = join(CONTENT_ROOT, 'types', `${fileName}.md`);
  if (!existsSync(path)) return null;

  const raw = readFileSync(path, 'utf-8');
  const { frontmatter: fm, body } = parseFrontmatter(raw);
  return {
    frontmatter: {
      meta_title: fm.meta_title ?? '',
      meta_description: fm.meta_description ?? '',
      updated_at: fm.updated_at ?? null,
      editorial_label: fm.editorial_label ?? null,
    },
    sections: parseSections(body),
  };
}

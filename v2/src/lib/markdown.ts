import 'server-only';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkRehype from 'remark-rehype';
import rehypeStringify from 'rehype-stringify';
import rehypeSlug from 'rehype-slug';
import rehypeAutolinkHeadings from 'rehype-autolink-headings';
import type { Root, Element } from 'hast';
import { visit } from 'unist-util-visit';

// ---------------------------------------------------------------------------
// Link rewriting plugin — converts old-style links to v2 routes
// ---------------------------------------------------------------------------

/**
 * Rewrites internal links from old URL format to v2 routes:
 * - /amsterdam.html → /amsterdam
 * - /speeltuinen.html → /speeltuinen
 * - /app.html?regio=Amsterdam → /amsterdam (lowercase)
 * - /amsterdam/artis/ → /amsterdam/artis (trailing slash removed)
 * - External links and anchors are left untouched.
 */
function rehypeRewriteLinks() {
  return (tree: Root) => {
    visit(tree, 'element', (node: Element) => {
      if (node.tagName !== 'a') return;
      const href = node.properties?.href;
      if (typeof href !== 'string') return;

      // Skip external links, anchors, mailto, tel
      if (href.startsWith('http') || href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:')) {
        return;
      }

      let rewritten = href;

      // /app.html?regio=Region → /region-slug
      const appMatch = rewritten.match(/^\/app\.html\?regio=([^&]+)/);
      if (appMatch) {
        rewritten = `/${appMatch[1].toLowerCase().replace(/\s+/g, '-')}`;
      }

      // /page.html → /page
      rewritten = rewritten.replace(/\.html$/, '');

      // Remove trailing slash (but keep root /)
      if (rewritten.length > 1 && rewritten.endsWith('/')) {
        rewritten = rewritten.slice(0, -1);
      }

      // /kinderboerderijen.html → /boerderijen (fix old plural slug)
      rewritten = rewritten.replace(/^\/kinderboerderijen$/, '/boerderijen');

      if (rewritten !== href) {
        node.properties = { ...node.properties, href: rewritten };
      }
    });
  };
}

// ---------------------------------------------------------------------------
// Markdown → HTML pipeline
// ---------------------------------------------------------------------------

const processor = unified()
  .use(remarkParse)
  .use(remarkRehype, { allowDangerousHtml: false })
  .use(rehypeSlug)
  .use(rehypeAutolinkHeadings, { behavior: 'wrap' })
  .use(rehypeRewriteLinks)
  .use(rehypeStringify);

/** Render markdown string to HTML string */
export async function renderMarkdown(markdown: string): Promise<string> {
  const result = await processor.process(markdown);
  return String(result);
}

import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkRehype from 'remark-rehype';
import rehypeStringify from 'rehype-stringify';

const processor = unified()
  .use(remarkParse)
  .use(remarkRehype, { allowDangerousHtml: false })
  .use(rehypeStringify);

/** Client-safe markdown → HTML (no server-only deps, no link rewriting) */
export async function renderMarkdownClient(markdown: string): Promise<string> {
  const result = await processor.process(markdown);
  return String(result);
}

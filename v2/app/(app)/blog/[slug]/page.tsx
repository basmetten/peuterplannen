import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import Link from 'next/link';

import { BlogRepository } from '@/server/repositories/blog.repo';
import { renderMarkdown } from '@/lib/markdown';
import { SITE_URL } from '@/lib/constants';
import { Breadcrumb } from '@/components/patterns/Breadcrumb';
import { StructuredData } from '@/components/patterns/StructuredData';
import { ContentShell } from '@/components/layout/ContentShell';

// ---------------------------------------------------------------------------
// SSG — revalidate every 24 hours
// ---------------------------------------------------------------------------

export const revalidate = 86400;

// ---------------------------------------------------------------------------
// Static params — all published blog posts
// ---------------------------------------------------------------------------

type Props = { params: Promise<{ slug: string }> };

export async function generateStaticParams() {
  return BlogRepository.getAllSlugs().map((slug) => ({ slug }));
}

// ---------------------------------------------------------------------------
// Metadata
// ---------------------------------------------------------------------------

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const post = BlogRepository.getBySlug(slug);
  if (!post) return {};

  const canonical = `${SITE_URL}/blog/${slug}`;

  return {
    title: post.title,
    description: post.description,
    alternates: { canonical },
    robots: { index: true, follow: true },
    openGraph: {
      title: post.title,
      description: post.description,
      url: canonical,
      siteName: 'PeuterPlannen',
      type: 'article',
      ...(post.featured_image ? { images: [{ url: post.featured_image }] } : {}),
      ...(post.date ? { publishedTime: post.date } : {}),
    },
  };
}

// ---------------------------------------------------------------------------
// Page component
// ---------------------------------------------------------------------------

export default async function BlogPostPage({ params }: Props) {
  const { slug } = await params;
  const post = BlogRepository.getBySlug(slug);
  if (!post) notFound();

  const html = await renderMarkdown(post.body);
  const related = BlogRepository.getRelated(slug, 3);
  const canonical = `${SITE_URL}/blog/${slug}`;

  // JSON-LD: BlogPosting + BreadcrumbList
  const structuredData = buildBlogStructuredData(post, canonical);

  return (
    <ContentShell>
      <StructuredData data={structuredData} />

      <article className="px-4 pb-8 pt-2">
        {/* Breadcrumb */}
        <Breadcrumb
          items={[
            { label: 'Home', href: '/' },
            { label: 'Blog', href: '/blog' },
            { label: post.title },
          ]}
        />

        {/* Header */}
        <header className="mb-6 mt-2">
          <h1 className="text-[22px] font-semibold leading-tight text-label">
            {post.title}
          </h1>

          {(post.date || post.tags.length > 0) && (
            <div className="mt-3 flex flex-wrap items-center gap-2 text-[13px] text-label-secondary">
              {post.date && (
                <time dateTime={post.date}>
                  {formatDate(post.date)}
                </time>
              )}
              {post.tags.length > 0 && (
                <>
                  <span className="text-label-tertiary">·</span>
                  <span>{estimateReadingTime(post.body)} min lezen</span>
                </>
              )}
            </div>
          )}
        </header>

        {/* Article body */}
        <div
          className="blog-content prose-sm"
          dangerouslySetInnerHTML={{ __html: html }}
        />

        {/* Tags */}
        {post.tags.length > 0 && (
          <div className="mt-8 flex flex-wrap gap-2">
            {post.tags.map((tag) => (
              <span
                key={tag}
                className="rounded-full bg-fill-tertiary px-3 py-1 text-[12px] text-label-secondary"
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* Related posts */}
        {related.length > 0 && (
          <section className="mt-10">
            <h2 className="mb-4 text-[16px] font-semibold text-label">
              Meer lezen
            </h2>
            <div className="flex flex-col gap-3">
              {related.map((r) => (
                <Link
                  key={r.slug}
                  href={`/blog/${r.slug}`}
                  className="group rounded-xl border border-separator bg-bg-primary p-4 transition-colors hover:bg-fill-tertiary"
                >
                  <p className="text-[15px] font-medium text-label group-hover:text-accent">
                    {r.title}
                  </p>
                  {r.description && (
                    <p className="mt-1 line-clamp-2 text-[13px] text-label-secondary">
                      {r.description}
                    </p>
                  )}
                  {r.date && (
                    <p className="mt-2 text-[12px] text-label-tertiary">
                      {formatDate(r.date)}
                    </p>
                  )}
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Back to blog */}
        <div className="mt-8">
          <Link
            href="/blog"
            className="text-[14px] font-medium text-accent hover:underline"
          >
            ← Alle artikelen
          </Link>
        </div>
      </article>
    </ContentShell>
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('nl-NL', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

function estimateReadingTime(text: string): number {
  const words = text.split(/\s+/).length;
  return Math.max(1, Math.round(words / 200));
}

function buildBlogStructuredData(
  post: { title: string; description: string; date: string | null; featured_image: string | null },
  canonical: string,
): Record<string, unknown> {
  const article: Record<string, unknown> = {
    '@type': 'BlogPosting',
    headline: post.title,
    description: post.description.slice(0, 300),
    url: canonical,
    publisher: {
      '@type': 'Organization',
      name: 'PeuterPlannen',
      url: SITE_URL,
    },
  };

  if (post.date) {
    article.datePublished = post.date;
  }
  if (post.featured_image) {
    article.image = post.featured_image;
  }

  const breadcrumbList = {
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: SITE_URL },
      { '@type': 'ListItem', position: 2, name: 'Blog', item: `${SITE_URL}/blog` },
      { '@type': 'ListItem', position: 3, name: post.title },
    ],
  };

  return {
    '@context': 'https://schema.org',
    '@graph': [article, breadcrumbList],
  };
}

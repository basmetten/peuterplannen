import type { Metadata } from 'next';
import Link from 'next/link';

import { BlogRepository } from '@/server/repositories/blog.repo';
import { SITE_URL } from '@/lib/constants';
import { Breadcrumb } from '@/components/patterns/Breadcrumb';
import { StructuredData } from '@/components/patterns/StructuredData';
import { ContentShell } from '@/components/layout/ContentShell';

// ---------------------------------------------------------------------------
// SSG — revalidate every 24 hours
// ---------------------------------------------------------------------------

export const revalidate = 86400;

// ---------------------------------------------------------------------------
// Metadata
// ---------------------------------------------------------------------------

const canonical = `${SITE_URL}/blog`;

export const metadata: Metadata = {
  title: 'Blog — Tips en gidsen voor uitjes met peuters',
  description:
    'Praktische artikelen over uitjes met peuters in Nederland. Van stadsgidsen tot seizoenstips — alles wat je moet weten voor een ontspannen dag met kleintjes.',
  alternates: { canonical },
  robots: { index: true, follow: true },
  openGraph: {
    title: 'Blog — PeuterPlannen',
    description:
      'Praktische artikelen over uitjes met peuters in Nederland.',
    url: canonical,
    siteName: 'PeuterPlannen',
    type: 'website',
  },
};

// ---------------------------------------------------------------------------
// Page component
// ---------------------------------------------------------------------------

export default function BlogIndexPage() {
  const posts = BlogRepository.getAll();

  const structuredData = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'CollectionPage',
        name: 'Blog — PeuterPlannen',
        description: 'Praktische artikelen over uitjes met peuters in Nederland.',
        url: canonical,
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Home', item: SITE_URL },
          { '@type': 'ListItem', position: 2, name: 'Blog' },
        ],
      },
    ],
  };

  return (
    <ContentShell>
      <StructuredData data={structuredData} />

      <div className="px-4 pb-8 pt-2">
        {/* Breadcrumb */}
        <Breadcrumb
          items={[
            { label: 'Home', href: '/' },
            { label: 'Blog' },
          ]}
        />

        {/* Header */}
        <header className="mb-6 mt-2">
          <h1 className="text-[22px] font-semibold leading-tight text-label">
            Blog
          </h1>
          <p className="mt-2 text-[14px] leading-relaxed text-label-secondary">
            Tips, gidsen en inspiratie voor uitjes met peuters in heel Nederland.
          </p>
        </header>

        {/* Post list */}
        <div className="flex flex-col gap-3">
          {posts.map((post) => (
            <Link
              key={post.slug}
              href={`/blog/${post.slug}`}
              className="group rounded-xl border border-separator bg-bg-primary p-4 transition-colors hover:bg-fill-tertiary"
            >
              <p className="text-[15px] font-medium leading-snug text-label group-hover:text-accent">
                {post.title}
              </p>
              {post.description && (
                <p className="mt-1.5 line-clamp-2 text-[13px] leading-relaxed text-label-secondary">
                  {post.description}
                </p>
              )}
              <div className="mt-2 flex items-center gap-2 text-[12px] text-label-tertiary">
                {post.date && (
                  <time dateTime={post.date}>
                    {formatDate(post.date)}
                  </time>
                )}
                {post.tags.length > 0 && (
                  <>
                    <span>·</span>
                    <span>{post.tags.slice(0, 3).join(', ')}</span>
                  </>
                )}
              </div>
            </Link>
          ))}
        </div>

        {/* Post count */}
        <p className="mt-6 text-center text-[13px] text-label-tertiary">
          {posts.length} artikelen
        </p>
      </div>
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

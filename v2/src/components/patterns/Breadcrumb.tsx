import Link from 'next/link';

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
}

/**
 * SEO-friendly breadcrumb navigation.
 * Used on all marketing pages. JSON-LD is handled separately by StructuredData.
 */
export function Breadcrumb({ items }: BreadcrumbProps) {
  return (
    <nav aria-label="Breadcrumb" className="py-3">
      <ol className="flex flex-wrap items-center gap-1 text-[13px] text-label-secondary">
        {items.map((item, i) => {
          const isLast = i === items.length - 1;
          return (
            <li key={i} className="flex items-center gap-1">
              {i > 0 && (
                <svg width="12" height="12" viewBox="0 0 12 12" className="text-label-tertiary" aria-hidden="true">
                  <path d="M4.5 2.5L8 6L4.5 9.5" stroke="currentColor" strokeWidth="1.2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
              {isLast || !item.href ? (
                <span className={isLast ? 'text-label' : ''}>{item.label}</span>
              ) : (
                <Link
                  href={item.href}
                  className="transition-colors hover:text-accent"
                >
                  {item.label}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

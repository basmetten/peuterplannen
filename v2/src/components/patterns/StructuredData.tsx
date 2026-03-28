interface StructuredDataProps {
  data: Record<string, unknown>;
}

/**
 * Renders a JSON-LD script tag for structured data.
 * Server component — no client JS needed.
 */
export function StructuredData({ data }: StructuredDataProps) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}

// ---------------------------------------------------------------------------
// Structured data builders
// ---------------------------------------------------------------------------

interface LocationStructuredDataInput {
  name: string;
  description: string;
  schemaType: string;
  canonicalUrl: string;
  imageUrl?: string | null;
  lat: number;
  lng: number;
  address?: string | null;
  city: string;
  website?: string | null;
  score?: number | null;
  priceFree?: boolean;
}

/** Build schema.org Place graph for a location detail page */
export function buildLocationStructuredData(
  input: LocationStructuredDataInput,
  breadcrumbItems: Array<{ name: string; url?: string }>,
): Record<string, unknown> {
  const place: Record<string, unknown> = {
    '@type': input.schemaType,
    name: input.name,
    description: input.description.slice(0, 300),
    url: input.canonicalUrl,
    geo: {
      '@type': 'GeoCoordinates',
      latitude: input.lat,
      longitude: input.lng,
    },
    containedInPlace: {
      '@type': 'City',
      name: input.city,
    },
    publicAccess: true,
  };

  if (input.imageUrl) {
    place.image = input.imageUrl;
  }
  if (input.address) {
    place.address = {
      '@type': 'PostalAddress',
      streetAddress: input.address,
      addressLocality: input.city,
      addressCountry: 'NL',
    };
  }
  if (input.website) {
    place.sameAs = input.website;
  }
  if (input.score != null) {
    place.aggregateRating = {
      '@type': 'AggregateRating',
      ratingValue: input.score.toFixed(1),
      bestRating: '10',
      worstRating: '0',
      ratingCount: 1,
    };
  }
  if (input.priceFree !== undefined) {
    place.isAccessibleForFree = input.priceFree;
  }

  const breadcrumbList = {
    '@type': 'BreadcrumbList',
    itemListElement: breadcrumbItems.map((item, i) => {
      const entry: Record<string, unknown> = {
        '@type': 'ListItem',
        position: i + 1,
        name: item.name,
      };
      if (item.url) entry.item = item.url;
      return entry;
    }),
  };

  return {
    '@context': 'https://schema.org',
    '@graph': [place, breadcrumbList],
  };
}

'use client';

import { useEffect } from 'react';

/**
 * Reports Core Web Vitals to GA4.
 *
 * Dynamically imports web-vitals to keep it out of the critical path.
 * Sends CLS, INP, LCP, FCP, TTFB as GA4 events.
 */
export function WebVitalsReporter() {
  useEffect(() => {
    import('web-vitals').then(({ onCLS, onINP, onLCP, onFCP, onTTFB }) => {
      const send = (metric: { name: string; value: number; id: string }) => {
        if (!window.gtag) return;
        window.gtag('event', metric.name, {
          value: Math.round(
            metric.name === 'CLS' ? metric.value * 1000 : metric.value,
          ),
          metric_id: metric.id,
          metric_value: metric.value,
          non_interaction: true,
        });
      };

      onCLS(send);
      onINP(send);
      onLCP(send);
      onFCP(send);
      onTTFB(send);
    });
  }, []);

  return null;
}

import type { NextConfig } from 'next';
import { resolve } from 'path';

const nextConfig: NextConfig = {
  // Turbopack root (v2 is nested inside the main repo)
  turbopack: {
    root: resolve(__dirname, '..'),
  },

  // Images from Supabase storage and local
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'piujsvgbfflrrvauzsxe.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },

  // Security headers
  headers: async () => [
    {
      source: '/(.*)',
      headers: [
        { key: 'X-Frame-Options', value: 'DENY' },
        { key: 'X-Content-Type-Options', value: 'nosniff' },
        { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
      ],
    },
  ],
};

export default nextConfig;

import type { NextConfig } from 'next';
import { resolve } from 'path';

const nextConfig: NextConfig = {
  // Note: strict mode disabled because MapLibre GL can't survive
  // the mount/unmount/remount cycle (WebGL context gets destroyed).
  // Works fine in production builds where strict mode doesn't double-mount.
  reactStrictMode: false,
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

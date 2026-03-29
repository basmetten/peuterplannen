import { NextResponse } from 'next/server';
import { LocationRepository } from '@/server/repositories/location.repo';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const locations = await LocationRepository.getAllSummaries();
    const response = NextResponse.json(locations);
    response.headers.set('Cache-Control', 'public, max-age=300, s-maxage=3600, stale-while-revalidate=60');
    response.headers.set('CDN-Cache-Control', 'public, max-age=3600');
    return response;
  } catch (error) {
    console.error('Failed to fetch locations:', error);
    return NextResponse.json({ error: 'Failed to fetch locations' }, { status: 500 });
  }
}

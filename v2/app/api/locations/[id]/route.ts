import { NextResponse } from 'next/server';
import { LocationRepository } from '@/server/repositories/location.repo';

export const dynamic = 'force-dynamic';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const numericId = Number(id);
  if (Number.isNaN(numericId)) {
    return NextResponse.json({ error: 'Invalid location ID' }, { status: 400 });
  }

  try {
    const location = await LocationRepository.getById(numericId);
    if (!location) {
      return NextResponse.json({ error: 'Location not found' }, { status: 404 });
    }
    const response = NextResponse.json(location);
    response.headers.set('Cache-Control', 'public, max-age=300, s-maxage=3600, stale-while-revalidate=60');
    response.headers.set('CDN-Cache-Control', 'public, max-age=3600');
    return response;
  } catch (error) {
    console.error('Failed to fetch location:', error);
    return NextResponse.json({ error: 'Failed to fetch location' }, { status: 500 });
  }
}

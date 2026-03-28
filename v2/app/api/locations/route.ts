import { NextResponse } from 'next/server';
import { LocationRepository } from '@/server/repositories/location.repo';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const locations = await LocationRepository.getAllSummaries();
    return NextResponse.json(locations);
  } catch (error) {
    console.error('Failed to fetch locations:', error);
    return NextResponse.json({ error: 'Failed to fetch locations' }, { status: 500 });
  }
}

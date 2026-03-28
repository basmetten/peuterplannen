import 'server-only';
import { supabase } from '@/lib/supabase';
import { LocationRowSchema, LocationSummarySchema } from '@/domain/schemas';
import { LOCATION_SUMMARY_COLUMNS, LOCATION_DETAIL_COLUMNS } from '@/lib/constants';
import type { Location, LocationSummary, MapViewport } from '@/domain/types';

export const LocationRepository = {
  /** Fetch all locations as summaries (for map markers + list) */
  async getAllSummaries(): Promise<LocationSummary[]> {
    const { data, error } = await supabase
      .from('locations')
      .select(LOCATION_SUMMARY_COLUMNS);

    if (error) throw new Error(`Failed to fetch locations: ${error.message}`);
    return data.map((row: unknown) => LocationSummarySchema.parse(row));
  },

  /** Fetch locations within a map viewport */
  async getByViewport(viewport: MapViewport): Promise<LocationSummary[]> {
    const { bounds } = viewport;
    const { data, error } = await supabase
      .from('locations')
      .select(LOCATION_SUMMARY_COLUMNS)
      .gte('lat', bounds.south)
      .lte('lat', bounds.north)
      .gte('lng', bounds.west)
      .lte('lng', bounds.east);

    if (error) throw new Error(`Failed to fetch by viewport: ${error.message}`);
    return data.map((row: unknown) => LocationSummarySchema.parse(row));
  },

  /** Fetch a single location by ID (full detail) */
  async getById(id: number): Promise<Location | null> {
    const { data, error } = await supabase
      .from('locations')
      .select(LOCATION_DETAIL_COLUMNS)
      .eq('id', id)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw new Error(`Failed to fetch location: ${error.message}`);
    }
    if (!data) return null;
    return LocationRowSchema.parse(data) as Location;
  },

  /** Fetch locations by region name (for region hub pages) */
  async getByRegion(regionName: string): Promise<LocationSummary[]> {
    const { data, error } = await supabase
      .from('locations')
      .select(LOCATION_SUMMARY_COLUMNS)
      .eq('region', regionName)
      .order('ai_suitability_score_10', { ascending: false, nullsFirst: false });

    if (error) throw new Error(`Failed to fetch by region: ${error.message}`);
    return data.map((row: unknown) => LocationSummarySchema.parse(row));
  },

  /** Fetch locations by type (for type hub pages) */
  async getByType(type: string): Promise<LocationSummary[]> {
    const { data, error } = await supabase
      .from('locations')
      .select(LOCATION_SUMMARY_COLUMNS)
      .eq('type', type)
      .order('ai_suitability_score_10', { ascending: false, nullsFirst: false });

    if (error) throw new Error(`Failed to fetch by type: ${error.message}`);
    return data.map((row: unknown) => LocationSummarySchema.parse(row));
  },

  /** Fetch a single location by region + slug (for detail pages) */
  async getBySlug(regionName: string, slug: string): Promise<Location | null> {
    const { data, error } = await supabase
      .from('locations')
      .select(LOCATION_DETAIL_COLUMNS)
      .eq('region', regionName)
      .eq('slug', slug)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw new Error(`Failed to fetch location by slug: ${error.message}`);
    }
    if (!data) return null;
    return LocationRowSchema.parse(data) as Location;
  },

  /** Fetch locations not excluded from sitemap (for SEO) */
  async getSeoIncluded(): Promise<Array<{ id: number; name: string; slug: string; region: string }>> {
    const { data, error } = await supabase
      .from('locations')
      .select('id, name, slug, region')
      .eq('seo_exclude_from_sitemap', false);

    if (error) throw new Error(`Failed to fetch SEO locations: ${error.message}`);
    return data;
  },

  /** Fetch nearby locations for a detail page — same region, prefer same type */
  async getNearby(
    locationId: number,
    regionName: string,
    locationType: string,
    limit = 6,
  ): Promise<LocationSummary[]> {
    const { data, error } = await supabase
      .from('locations')
      .select(LOCATION_SUMMARY_COLUMNS)
      .neq('id', locationId)
      .eq('region', regionName)
      .order('ai_suitability_score_10', { ascending: false, nullsFirst: false })
      .limit(limit * 3); // Fetch extra to allow type-preference sorting

    if (error) throw new Error(`Failed to fetch nearby: ${error.message}`);

    const parsed = data.map((row: unknown) => LocationSummarySchema.parse(row));

    // Sort: same type first, then by score (already sorted by score from DB)
    const sorted = parsed.sort((a, b) => {
      const aMatch = a.type === locationType ? 1 : 0;
      const bMatch = b.type === locationType ? 1 : 0;
      if (aMatch !== bMatch) return bMatch - aMatch;
      return (b.ai_suitability_score_10 ?? 0) - (a.ai_suitability_score_10 ?? 0);
    });

    return sorted.slice(0, limit);
  },

  /** Convert summaries to GeoJSON FeatureCollection */
  toGeoJSON(locations: LocationSummary[]) {
    return {
      type: 'FeatureCollection' as const,
      features: locations.map((loc) => ({
        type: 'Feature' as const,
        geometry: {
          type: 'Point' as const,
          coordinates: [loc.lng, loc.lat] as [number, number],
        },
        properties: loc,
      })),
    };
  },
};

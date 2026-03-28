import 'server-only';
import { supabase } from '@/lib/supabase';
import { RegionRowSchema } from '@/domain/schemas';
import type { Region } from '@/domain/types';

export const RegionRepository = {
  /** Fetch all active regions */
  async getAll(): Promise<Region[]> {
    const { data, error } = await supabase
      .from('regions')
      .select('*')
      .eq('is_active', true)
      .order('display_order', { ascending: true });

    if (error) throw new Error(`Failed to fetch regions: ${error.message}`);
    return data.map((row: unknown) => RegionRowSchema.parse(row));
  },

  /** Fetch a single region by slug */
  async getBySlug(slug: string): Promise<Region | null> {
    const { data, error } = await supabase
      .from('regions')
      .select('*')
      .eq('slug', slug)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw new Error(`Failed to fetch region: ${error.message}`);
    }
    if (!data) return null;
    return RegionRowSchema.parse(data);
  },

  /** Fetch regions by tier ('primary', 'standard', 'region') */
  async getByTier(tier: string): Promise<Region[]> {
    const { data, error } = await supabase
      .from('regions')
      .select('*')
      .eq('tier', tier)
      .eq('is_active', true)
      .order('display_order', { ascending: true });

    if (error) throw new Error(`Failed to fetch regions by tier: ${error.message}`);
    return data.map((row: unknown) => RegionRowSchema.parse(row));
  },
};

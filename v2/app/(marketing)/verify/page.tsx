import { LocationRepository } from '@/server/repositories/location.repo';
import { RegionRepository } from '@/server/repositories/region.repo';

export const metadata = {
  title: 'Verify — Stack Check',
};

export default async function VerifyPage() {
  const [locations, regions] = await Promise.all([
    LocationRepository.getAllSummaries(),
    RegionRepository.getAll(),
  ]);

  return (
    <div className="mx-auto max-w-2xl px-4 py-16">
      <h1 className="text-[28px] font-normal tracking-[-0.029em] text-label">
        Stack Verification
      </h1>

      <div className="mt-8 space-y-4">
        <div className="rounded-card border border-separator bg-bg-tertiary p-4">
          <p className="text-[13px] font-normal tracking-[0.002em] text-label-secondary">
            Locations
          </p>
          <p className="mt-1 text-[34px] font-bold tracking-[-0.031em] text-accent">
            {locations.length}
          </p>
        </div>

        <div className="rounded-card border border-separator bg-bg-tertiary p-4">
          <p className="text-[13px] font-normal tracking-[0.002em] text-label-secondary">
            Regions
          </p>
          <p className="mt-1 text-[34px] font-bold tracking-[-0.031em] text-accent">
            {regions.length}
          </p>
        </div>

        {locations.length > 0 && (
          <div className="rounded-card border border-separator bg-bg-tertiary p-4">
            <p className="text-[13px] font-normal tracking-[0.002em] text-label-secondary">
              First location (Zod-validated)
            </p>
            <p className="mt-1 text-[17px] font-semibold tracking-[-0.025em] text-label">
              {locations[0].name}
            </p>
            <p className="text-[15px] tracking-normal text-label-secondary">
              {locations[0].region} &middot; {locations[0].type}
              {locations[0].ai_suitability_score_10 != null && ` · Score: ${locations[0].ai_suitability_score_10}`}
            </p>
          </div>
        )}
      </div>

      <p className="mt-8 text-[12px] tracking-[0.01em] text-label-tertiary">
        All data fetched server-side via Supabase service key, validated with Zod.
      </p>
    </div>
  );
}

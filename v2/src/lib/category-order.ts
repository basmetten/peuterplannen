import type { LocationType } from '@/domain/enums';

/**
 * Returns category types sorted by relevance based on time of day.
 * Morning: pancake/farm first. Afternoon: play/swim. Evening: horeca/museum.
 * Speeltuin and Boerderij always rank high (most popular for toddlers).
 */
export function getSmartCategoryOrder(hour: number): LocationType[] {
  const base: LocationType[] = ['play', 'farm', 'nature', 'museum', 'swim', 'pancake', 'horeca', 'culture'];
  const boosts: Partial<Record<LocationType, number>> = {};

  if (hour < 11) {
    // Morning: breakfast/farm activities
    boosts.pancake = 3;
    boosts.farm = 2;
    boosts.nature = 1;
  } else if (hour < 16) {
    // Afternoon: active play
    boosts.play = 3;
    boosts.swim = 2;
    boosts.nature = 1;
  } else {
    // Evening: indoor/calm
    boosts.horeca = 3;
    boosts.museum = 2;
    boosts.culture = 1;
  }

  // Speeltuin and Boerderij always rank high (core toddler activities)
  boosts.play = (boosts.play ?? 0) + 2;
  boosts.farm = (boosts.farm ?? 0) + 1;

  return [...base].sort((a, b) => (boosts[b] ?? 0) - (boosts[a] ?? 0));
}

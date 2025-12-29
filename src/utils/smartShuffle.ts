/**
 * Smart Shuffle Algorithm for Fair Marketplace Lead Distribution
 * 
 * Ensures different users see different arrangements of products
 * while still prioritizing featured items.
 */

// Generate a session seed based on timestamp and random value
// This ensures each browsing session gets a unique shuffle
const getSessionSeed = (): number => {
  const stored = sessionStorage.getItem('marketplace_shuffle_seed');
  if (stored) {
    return parseInt(stored, 10);
  }
  const seed = Date.now() + Math.floor(Math.random() * 1000000);
  sessionStorage.setItem('marketplace_shuffle_seed', seed.toString());
  return seed;
};

// Seeded random number generator (Mulberry32)
const seededRandom = (seed: number) => {
  return () => {
    let t = seed += 0x6D2B79F5;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
};

// Fisher-Yates shuffle with seeded random
const shuffleWithSeed = <T>(array: T[], seed: number): T[] => {
  const result = [...array];
  const random = seededRandom(seed);
  
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  
  return result;
};

export interface ShuffleableItem {
  id: string;
  pharmacy_id: string;
  is_featured?: boolean | null;
  selling_price?: number | null;
  current_stock?: number;
  distance?: number;
}

export interface SmartShuffleOptions {
  prioritizeFeatured?: boolean;
  groupByPharmacy?: boolean;
  maxPerPharmacy?: number;
}

/**
 * Smart shuffle that ensures fair distribution of pharmacy visibility
 * while respecting business rules (featured items, etc.)
 */
export const smartShuffle = <T extends ShuffleableItem>(
  items: T[],
  options: SmartShuffleOptions = {}
): T[] => {
  const {
    prioritizeFeatured = true,
    groupByPharmacy = false,
    maxPerPharmacy = 3, // Limit items per pharmacy to spread visibility
  } = options;

  const seed = getSessionSeed();
  
  // Separate featured and non-featured items
  const featured = items.filter(item => item.is_featured);
  const nonFeatured = items.filter(item => !item.is_featured);
  
  // Shuffle featured items (still get priority but in random order)
  const shuffledFeatured = shuffleWithSeed(featured, seed);
  
  // For non-featured, we want to ensure fair pharmacy distribution
  // Group by pharmacy first
  const pharmacyGroups = new Map<string, T[]>();
  nonFeatured.forEach(item => {
    const group = pharmacyGroups.get(item.pharmacy_id) || [];
    group.push(item);
    pharmacyGroups.set(item.pharmacy_id, group);
  });
  
  // Shuffle items within each pharmacy group
  const shuffledGroups = new Map<string, T[]>();
  pharmacyGroups.forEach((group, pharmacyId) => {
    shuffledGroups.set(pharmacyId, shuffleWithSeed(group, seed + pharmacyId.charCodeAt(0)));
  });
  
  // Interleave items from different pharmacies for fair distribution
  // This ensures no single pharmacy dominates the top of the list
  const interleavedNonFeatured: T[] = [];
  const pharmacyIds = shuffleWithSeed(Array.from(shuffledGroups.keys()), seed);
  const pharmacyCounters = new Map<string, number>();
  
  let hasMore = true;
  let round = 0;
  
  while (hasMore) {
    hasMore = false;
    for (const pharmacyId of pharmacyIds) {
      const group = shuffledGroups.get(pharmacyId) || [];
      const counter = pharmacyCounters.get(pharmacyId) || 0;
      
      if (counter < group.length) {
        // Apply maxPerPharmacy limit if groupByPharmacy is enabled
        if (!groupByPharmacy || counter < maxPerPharmacy) {
          interleavedNonFeatured.push(group[counter]);
          pharmacyCounters.set(pharmacyId, counter + 1);
        }
        if (counter + 1 < group.length && (!groupByPharmacy || counter + 1 < maxPerPharmacy)) {
          hasMore = true;
        }
      }
    }
    round++;
    // Safety limit to prevent infinite loops
    if (round > 1000) break;
  }
  
  // Combine: featured first, then interleaved non-featured
  if (prioritizeFeatured) {
    return [...shuffledFeatured, ...interleavedNonFeatured];
  }
  
  // If not prioritizing featured, shuffle everything together
  // but still interleave for fair distribution
  return shuffleWithSeed([...shuffledFeatured, ...interleavedNonFeatured], seed);
};

/**
 * Reset the session shuffle seed (useful for testing or user refresh)
 */
export const resetShuffleSeed = (): void => {
  sessionStorage.removeItem('marketplace_shuffle_seed');
};

/**
 * Get current shuffle seed for debugging
 */
export const getCurrentShuffleSeed = (): number | null => {
  const stored = sessionStorage.getItem('marketplace_shuffle_seed');
  return stored ? parseInt(stored, 10) : null;
};

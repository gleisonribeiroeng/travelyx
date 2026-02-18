export interface CategorizableHotel {
  id: string;
  pricePerNight: { total: number };
  rating: number | null;
  reviewCount: number;
}

export interface CategorizedHotels<T extends CategorizableHotel = CategorizableHotel> {
  cheapest: T | null;
  bestRated: T | null;
  bestValue: T | null;
  all: T[];
}

function normalizeInverse(val: number, min: number, max: number): number {
  if (max === min) return 1.0;
  return 1 - (val - min) / (max - min);
}

function normalizeDirect(val: number, min: number, max: number): number {
  if (max === min) return 1.0;
  return (val - min) / (max - min);
}

export function categorizeHotels<T extends CategorizableHotel>(hotels: T[]): CategorizedHotels<T> {
  if (hotels.length === 0) {
    return { cheapest: null, bestRated: null, bestValue: null, all: [] };
  }

  const prices = hotels.map(h => h.pricePerNight.total);
  const ratings = hotels.map(h => h.rating ?? 0);
  const reviews = hotels.map(h => h.reviewCount);

  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);
  const minRating = Math.min(...ratings);
  const maxRating = Math.max(...ratings);
  const minReviews = Math.min(...reviews);
  const maxReviews = Math.max(...reviews);

  // Score each hotel
  const scored = hotels.map(h => ({
    hotel: h,
    score:
      normalizeInverse(h.pricePerNight.total, minPrice, maxPrice) * 0.40 +
      normalizeDirect(h.rating ?? 0, minRating, maxRating) * 0.35 +
      normalizeDirect(h.reviewCount, minReviews, maxReviews) * 0.25,
  }));

  scored.sort((a, b) => b.score - a.score);

  // Cheapest: prefer hotels with rating >= 4.0, fallback to absolute cheapest
  const wellRated = hotels.filter(h => h.rating !== null && h.rating >= 4.0);
  const cheapest = (wellRated.length > 0 ? wellRated : hotels).reduce((best, h) =>
    h.pricePerNight.total < best.pricePerNight.total ? h : best
  );

  // Best rated: prefer hotels with reviewCount >= 5, fallback to highest rating
  const enoughReviews = hotels.filter(h => h.reviewCount >= 5 && h.rating !== null);
  const ratingPool = enoughReviews.length > 0 ? enoughReviews : hotels;
  const bestRated = ratingPool.reduce((best, h) => {
    const hRating = h.rating ?? 0;
    const bestRating = best.rating ?? 0;
    return hRating > bestRating ? h : best;
  });

  const bestValue = scored[0].hotel;

  return {
    cheapest,
    bestRated,
    bestValue,
    all: scored.map(s => s.hotel),
  };
}

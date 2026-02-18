export interface CategorizableTour {
  id: string;
  price: { total: number };
  rating: number | null;
  reviewCount: number;
}

export interface CategorizedTours<T extends CategorizableTour = CategorizableTour> {
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

export function categorizeTours<T extends CategorizableTour>(tours: T[]): CategorizedTours<T> {
  if (tours.length === 0) {
    return { cheapest: null, bestRated: null, bestValue: null, all: [] };
  }

  const prices = tours.map(t => t.price.total);
  const ratings = tours.map(t => t.rating ?? 0);
  const reviews = tours.map(t => t.reviewCount);

  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);
  const minRating = Math.min(...ratings);
  const maxRating = Math.max(...ratings);
  const minReviews = Math.min(...reviews);
  const maxReviews = Math.max(...reviews);

  // Score each tour
  const scored = tours.map(t => ({
    tour: t,
    score:
      normalizeInverse(t.price.total, minPrice, maxPrice) * 0.40 +
      normalizeDirect(t.rating ?? 0, minRating, maxRating) * 0.35 +
      normalizeDirect(t.reviewCount, minReviews, maxReviews) * 0.25,
  }));

  scored.sort((a, b) => b.score - a.score);

  // Cheapest: prefer tours with rating >= 4.0, fallback to absolute cheapest
  const wellRated = tours.filter(t => t.rating !== null && t.rating >= 4.0);
  const cheapest = (wellRated.length > 0 ? wellRated : tours).reduce((best, t) =>
    t.price.total < best.price.total ? t : best
  );

  // Best rated: prefer tours with reviewCount >= 5, fallback to highest rating
  const enoughReviews = tours.filter(t => t.reviewCount >= 5 && t.rating !== null);
  const ratingPool = enoughReviews.length > 0 ? enoughReviews : tours;
  const bestRated = ratingPool.reduce((best, t) => {
    const tRating = t.rating ?? 0;
    const bestRating = best.rating ?? 0;
    return tRating > bestRating ? t : best;
  });

  const bestValue = scored[0].tour;

  return {
    cheapest,
    bestRated,
    bestValue,
    all: scored.map(s => s.tour),
  };
}

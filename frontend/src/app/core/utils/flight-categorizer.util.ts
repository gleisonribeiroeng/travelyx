export interface CategorizableFlight {
  id: string;
  price: { total: number };
  durationMinutes: number;
  stops: number;
}

export interface CategorizedFlights<T extends CategorizableFlight = CategorizableFlight> {
  cheapest: T | null;
  fastest: T | null;
  bestValue: T | null;
  all: T[];
}

function normalize(val: number, min: number, max: number): number {
  if (max === min) return 1.0;
  return 1 - (val - min) / (max - min);
}

export function categorizeFlights<T extends CategorizableFlight>(flights: T[]): CategorizedFlights<T> {
  if (flights.length === 0) {
    return { cheapest: null, fastest: null, bestValue: null, all: [] };
  }

  const prices = flights.map(f => f.price.total);
  const durations = flights.map(f => f.durationMinutes);
  const stops = flights.map(f => f.stops);

  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);
  const minDuration = Math.min(...durations);
  const maxDuration = Math.max(...durations);
  const minStops = Math.min(...stops);
  const maxStops = Math.max(...stops);

  const scored = flights.map(f => ({
    flight: f,
    score:
      normalize(f.price.total, minPrice, maxPrice) * 0.5 +
      normalize(f.durationMinutes, minDuration, maxDuration) * 0.3 +
      normalize(f.stops, minStops, maxStops) * 0.2,
  }));

  scored.sort((a, b) => b.score - a.score);

  const cheapest = flights.reduce((best, f) =>
    f.price.total < best.price.total ? f : best
  );
  const fastest = flights.reduce((best, f) =>
    f.durationMinutes < best.durationMinutes ? f : best
  );
  const bestValue = scored[0].flight;

  return {
    cheapest,
    fastest,
    bestValue,
    all: scored.map(s => s.flight),
  };
}

import { GeoLocation } from '../models/base.model';
import {
  Trip,
  ItineraryItem,
  Activity,
  Attraction,
  Stay,
} from '../models/trip.models';

// ---------------------------------------------------------------------------
// Geo cluster model
// ---------------------------------------------------------------------------

export interface GeoCluster {
  id: string;
  label: string;
  center: GeoLocation;
  items: ItineraryItem[];
  radius: number; // km
}

// ---------------------------------------------------------------------------
// Haversine distance
// ---------------------------------------------------------------------------

const EARTH_RADIUS_KM = 6371;

/** Convert degrees to radians. */
function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

/**
 * Calculate the great-circle distance in kilometres between two
 * WGS-84 points using the Haversine formula.
 */
export function haversineKm(a: GeoLocation, b: GeoLocation): number {
  const dLat = toRad(b.latitude - a.latitude);
  const dLon = toRad(b.longitude - a.longitude);

  const sinLat = Math.sin(dLat / 2);
  const sinLon = Math.sin(dLon / 2);

  const h =
    sinLat * sinLat +
    Math.cos(toRad(a.latitude)) * Math.cos(toRad(b.latitude)) * sinLon * sinLon;

  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(h));
}

// ---------------------------------------------------------------------------
// Location resolution
// ---------------------------------------------------------------------------

/**
 * Resolve the geographic location for an itinerary item by looking up
 * the referenced domain object in the trip.  Returns null when the item
 * type has no meaningful coordinate (e.g. flights, transports).
 */
export function resolveLocation(
  item: ItineraryItem,
  trip: Trip,
): GeoLocation | null {
  if (!item.refId) return null;

  switch (item.type) {
    case 'activity': {
      const activity = trip.activities.find((a: Activity) => a.id === item.refId);
      return activity?.location ?? null;
    }
    case 'attraction': {
      const attraction = trip.attractions.find(
        (a: Attraction) => a.id === item.refId,
      );
      return attraction?.location ?? null;
    }
    case 'stay': {
      const stay = trip.stays.find((s: Stay) => s.id === item.refId);
      return stay?.location ?? null;
    }
    default:
      return null;
  }
}

// ---------------------------------------------------------------------------
// Clustering helpers
// ---------------------------------------------------------------------------

/** Compute the centroid of a set of geo-locations. */
function centroid(points: GeoLocation[]): GeoLocation {
  if (points.length === 0) {
    return { latitude: 0, longitude: 0 };
  }

  let latSum = 0;
  let lonSum = 0;

  for (const p of points) {
    latSum += p.latitude;
    lonSum += p.longitude;
  }

  return {
    latitude: latSum / points.length,
    longitude: lonSum / points.length,
  };
}

/** Compute the maximum distance from a center to any point in the list. */
function maxRadiusKm(center: GeoLocation, points: GeoLocation[]): number {
  let max = 0;
  for (const p of points) {
    const d = haversineKm(center, p);
    if (d > max) max = d;
  }
  return max;
}

/**
 * Infer a human-readable label for a cluster.
 * Uses the most frequent label token among the items.
 */
function inferClusterLabel(
  items: ItineraryItem[],
  trip: Trip,
): string {
  // Gather descriptive names from referenced domain objects
  const names: string[] = [];

  for (const item of items) {
    if (!item.refId) {
      names.push(item.label);
      continue;
    }

    switch (item.type) {
      case 'activity': {
        const a = trip.activities.find((act) => act.id === item.refId);
        if (a?.city) names.push(a.city);
        break;
      }
      case 'attraction': {
        const a = trip.attractions.find((att) => att.id === item.refId);
        if (a?.city) names.push(a.city);
        break;
      }
      case 'stay': {
        const s = trip.stays.find((st) => st.id === item.refId);
        if (s) names.push(s.name);
        break;
      }
      default:
        names.push(item.label);
    }
  }

  if (names.length === 0) return 'Regiao';

  // Return the most frequent name
  const freq = new Map<string, number>();
  for (const n of names) {
    freq.set(n, (freq.get(n) ?? 0) + 1);
  }

  let bestName = names[0];
  let bestCount = 0;
  for (const [name, count] of freq) {
    if (count > bestCount) {
      bestCount = count;
      bestName = name;
    }
  }

  return bestName;
}

// ---------------------------------------------------------------------------
// Main clustering function
// ---------------------------------------------------------------------------

/**
 * Single-pass agglomerative clustering of itinerary items by geographic
 * proximity.  Items without resolvable locations are silently skipped.
 *
 * @param items       The itinerary items to cluster.
 * @param trip        The trip (used to resolve item locations).
 * @param thresholdKm Maximum distance to include a point in an existing
 *                    cluster (default 2 km).
 */
export function clusterItems(
  items: ItineraryItem[],
  trip: Trip,
  thresholdKm: number = 2,
): GeoCluster[] {
  // Resolve locations first; skip items without one
  const located: Array<{ item: ItineraryItem; loc: GeoLocation }> = [];

  for (const item of items) {
    const loc = resolveLocation(item, trip);
    if (loc) {
      located.push({ item, loc });
    }
  }

  if (located.length === 0) return [];

  // Single-pass agglomerative: assign each point to nearest cluster or create new
  const clusters: Array<{
    points: GeoLocation[];
    items: ItineraryItem[];
    center: GeoLocation;
  }> = [];

  for (const { item, loc } of located) {
    let bestCluster: (typeof clusters)[number] | null = null;
    let bestDist = Infinity;

    for (const cluster of clusters) {
      const dist = haversineKm(cluster.center, loc);
      if (dist < bestDist) {
        bestDist = dist;
        bestCluster = cluster;
      }
    }

    if (bestCluster && bestDist <= thresholdKm) {
      bestCluster.items.push(item);
      bestCluster.points.push(loc);
      bestCluster.center = centroid(bestCluster.points);
    } else {
      clusters.push({
        points: [loc],
        items: [item],
        center: { ...loc },
      });
    }
  }

  // Build output
  return clusters.map((cluster, index) => {
    const center = centroid(cluster.points);
    return {
      id: `cluster-${index + 1}`,
      label: inferClusterLabel(cluster.items, trip),
      center,
      items: cluster.items,
      radius: cluster.points.length === 1
        ? 0
        : Math.round(maxRadiusKm(center, cluster.points) * 100) / 100,
    };
  });
}

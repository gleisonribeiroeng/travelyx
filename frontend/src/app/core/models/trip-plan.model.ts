/**
 * Comprehensive trip planning model.
 * Captures all user preferences for personalized trip planning.
 */

export type TravelerProfile = 'solo' | 'couple' | 'family' | 'friends' | 'corporate';
export type TripObjective = 'rest' | 'adventure' | 'shopping' | 'gastronomy' | 'cultural' | 'religious' | 'nature' | 'nightlife';
export type TransportPreference = 'plane' | 'car' | 'bus' | 'train' | 'indifferent';
export type FlightPaymentMethod = 'cash' | 'miles' | 'mixed';
export type BreakfastPreference = 'yes' | 'no' | 'indifferent';

export interface TripPlan {
  destination: DestinationInfo;
  dates: TripDates;
  travelers: TravelerInfo;
  objectives: TripObjective[];
  transport: TransportInfo;
  accommodation: AccommodationInfo;
}

export interface DestinationInfo {
  city: string;
  country: string;
  region: string;
  // Auto-populated metadata
  currency: string;
  language: string;
  timezone: string;
  isHighSeason: boolean;
}

export interface TripDates {
  departure: string; // YYYY-MM-DD
  returnDate: string; // YYYY-MM-DD
  duration: number; // days
}

export interface TravelerInfo {
  adults: number;
  children: number;
  elderly: number;
  profile: TravelerProfile;
}

export interface TransportInfo {
  preference: TransportPreference;
  preferredAirlines: string[];
  paymentMethod: FlightPaymentMethod;
}

export interface AccommodationInfo {
  minStars: number;
  flexibleCancellation: boolean;
  breakfastIncluded: BreakfastPreference;
  proximityTo: string;
}

export interface LegalRequirements {
  passportRequired: boolean;
  visaRequired: boolean;
  visaType: string;
  insuranceRequired: boolean;
  vaccines: string[];
  passportMinValidity: string;
}

export interface SeasonInfo {
  isHighSeason: boolean;
  priceIncrease: string;
  crowdLevel: string;
  alternativeDates: string;
  avgTemperature: string;
  climate: string;
}

export interface DestinationMetadata {
  currency: string;
  language: string;
  timezone: string;
  highSeasonMonths: number[];
  legal: LegalRequirements;
  avgTempByMonth: Record<number, number>;
  climate: string;
}

/** Labels for UI display */
export const TRAVELER_PROFILE_OPTIONS: { value: TravelerProfile; label: string; icon: string }[] = [
  { value: 'solo', label: 'Solo', icon: 'person' },
  { value: 'couple', label: 'Casal', icon: 'favorite' },
  { value: 'family', label: 'Família', icon: 'family_restroom' },
  { value: 'friends', label: 'Amigos', icon: 'group' },
  { value: 'corporate', label: 'Corporativo', icon: 'business' },
];

export const TRIP_OBJECTIVE_OPTIONS: { value: TripObjective; label: string; icon: string }[] = [
  { value: 'rest', label: 'Descanso', icon: 'spa' },
  { value: 'adventure', label: 'Aventura', icon: 'terrain' },
  { value: 'shopping', label: 'Compras', icon: 'shopping_bag' },
  { value: 'gastronomy', label: 'Gastronômico', icon: 'restaurant' },
  { value: 'cultural', label: 'Cultural', icon: 'museum' },
  { value: 'religious', label: 'Religioso', icon: 'church' },
  { value: 'nature', label: 'Natureza', icon: 'park' },
  { value: 'nightlife', label: 'Vida Noturna', icon: 'nightlife' },
];

export const TRANSPORT_PREFERENCE_OPTIONS: { value: TransportPreference; label: string; icon: string }[] = [
  { value: 'plane', label: 'Avião', icon: 'flight' },
  { value: 'car', label: 'Carro', icon: 'directions_car' },
  { value: 'bus', label: 'Ônibus', icon: 'directions_bus' },
  { value: 'train', label: 'Trem', icon: 'train' },
  { value: 'indifferent', label: 'Indiferente', icon: 'swap_horiz' },
];

export const PAYMENT_METHOD_OPTIONS: { value: FlightPaymentMethod; label: string; icon: string }[] = [
  { value: 'cash', label: 'Dinheiro', icon: 'payments' },
  { value: 'miles', label: 'Milhas', icon: 'stars' },
  { value: 'mixed', label: 'Milhas + Dinheiro', icon: 'account_balance_wallet' },
];

export const POPULAR_AIRLINES: { code: string; name: string }[] = [
  { code: 'LA', name: 'LATAM Airlines' },
  { code: 'G3', name: 'GOL Linhas Aéreas' },
  { code: 'AD', name: 'Azul Linhas Aéreas' },
  { code: 'AA', name: 'American Airlines' },
  { code: 'DL', name: 'Delta Air Lines' },
  { code: 'UA', name: 'United Airlines' },
  { code: 'TP', name: 'TAP Air Portugal' },
  { code: 'AF', name: 'Air France' },
  { code: 'LH', name: 'Lufthansa' },
  { code: 'IB', name: 'Iberia' },
  { code: 'EK', name: 'Emirates' },
  { code: 'AV', name: 'Avianca' },
];

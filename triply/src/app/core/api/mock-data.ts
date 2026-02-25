import { Flight, Stay, CarRental, Transport, Activity, Attraction } from '../models/trip.models';
import { AirportOption } from './flight-api.service';
import { DestinationOption } from './hotel-api.service';
import { CarLocationOption } from './car-api.service';

// ─── Airports ──────────────────────────────────────────────────────────────────

export const MOCK_AIRPORTS: AirportOption[] = [
  { iataCode: 'GRU', name: 'Guarulhos International', cityName: 'São Paulo' },
  { iataCode: 'CGH', name: 'Congonhas', cityName: 'São Paulo' },
  { iataCode: 'GIG', name: 'Galeão - Tom Jobim', cityName: 'Rio de Janeiro' },
  { iataCode: 'BSB', name: 'Presidente Juscelino Kubitschek', cityName: 'Brasília' },
  { iataCode: 'CNF', name: 'Tancredo Neves / Confins', cityName: 'Belo Horizonte' },
  // Europe
  { iataCode: 'CDG', name: 'Charles de Gaulle', cityName: 'Paris' },
  { iataCode: 'ORY', name: 'Orly', cityName: 'Paris' },
  { iataCode: 'BRU', name: 'Brussels Airport', cityName: 'Bruxelas' },
  { iataCode: 'CRL', name: 'Brussels South Charleroi', cityName: 'Bruxelas' },
  { iataCode: 'LIS', name: 'Humberto Delgado', cityName: 'Lisboa' },
  { iataCode: 'FCO', name: 'Leonardo da Vinci - Fiumicino', cityName: 'Roma' },
  { iataCode: 'LHR', name: 'Heathrow', cityName: 'Londres' },
  { iataCode: 'AMS', name: 'Schiphol', cityName: 'Amsterdã' },
  { iataCode: 'MAD', name: 'Adolfo Suárez Madrid-Barajas', cityName: 'Madrid' },
];

// ─── Flights ───────────────────────────────────────────────────────────────────

export const MOCK_FLIGHTS: Flight[] = [
  // === GRU → CDG (São Paulo → Paris) ===
  {
    id: 'fl-001', source: 'mock', addedToItinerary: false,
    origin: 'GRU', destination: 'CDG',
    departureAt: '2026-03-10T22:15:00', arrivalAt: '2026-03-11T13:40:00',
    airline: 'Air France', flightNumber: 'AF 457', durationMinutes: 685, stops: 0,
    price: { total: 4250.00, currency: 'BRL' },
    link: { url: 'https://www.airfrance.com.br', provider: 'Air France' },
  },
  {
    id: 'fl-002', source: 'mock', addedToItinerary: false,
    origin: 'GRU', destination: 'CDG',
    departureAt: '2026-03-10T23:50:00', arrivalAt: '2026-03-11T15:20:00',
    airline: 'LATAM', flightNumber: 'LA 8084', durationMinutes: 690, stops: 0,
    price: { total: 3890.00, currency: 'BRL' },
    link: { url: 'https://www.latam.com', provider: 'LATAM' },
  },
  {
    id: 'fl-003', source: 'mock', addedToItinerary: false,
    origin: 'GRU', destination: 'CDG',
    departureAt: '2026-03-10T18:30:00', arrivalAt: '2026-03-11T14:00:00',
    airline: 'TAP', flightNumber: 'TP 82', durationMinutes: 810, stops: 1,
    price: { total: 3490.00, currency: 'BRL' },
    link: { url: 'https://www.flytap.com', provider: 'TAP Portugal' },
  },
  {
    id: 'fl-004', source: 'mock', addedToItinerary: false,
    origin: 'GRU', destination: 'CDG',
    departureAt: '2026-03-10T21:00:00', arrivalAt: '2026-03-11T16:45:00',
    airline: 'KLM', flightNumber: 'KL 792', durationMinutes: 765, stops: 1,
    price: { total: 3680.00, currency: 'BRL' },
    link: { url: 'https://www.klm.com', provider: 'KLM' },
  },
  // === CDG → BRU (Paris → Bruxelas) ===
  {
    id: 'fl-005', source: 'mock', addedToItinerary: false,
    origin: 'CDG', destination: 'BRU',
    departureAt: '2026-03-18T08:15:00', arrivalAt: '2026-03-18T09:30:00',
    airline: 'Air France', flightNumber: 'AF 3230', durationMinutes: 75, stops: 0,
    price: { total: 580.00, currency: 'BRL' },
    link: { url: 'https://www.airfrance.com.br', provider: 'Air France' },
  },
  {
    id: 'fl-006', source: 'mock', addedToItinerary: false,
    origin: 'CDG', destination: 'BRU',
    departureAt: '2026-03-18T12:40:00', arrivalAt: '2026-03-18T13:50:00',
    airline: 'Brussels Airlines', flightNumber: 'SN 3622', durationMinutes: 70, stops: 0,
    price: { total: 520.00, currency: 'BRL' },
    link: { url: 'https://www.brusselsairlines.com', provider: 'Brussels Airlines' },
  },
  {
    id: 'fl-007', source: 'mock', addedToItinerary: false,
    origin: 'CDG', destination: 'BRU',
    departureAt: '2026-03-18T17:20:00', arrivalAt: '2026-03-18T18:35:00',
    airline: 'Air France', flightNumber: 'AF 3238', durationMinutes: 75, stops: 0,
    price: { total: 640.00, currency: 'BRL' },
    link: { url: 'https://www.airfrance.com.br', provider: 'Air France' },
  },
  // === BRU → GRU (Bruxelas → São Paulo — volta) ===
  {
    id: 'fl-008', source: 'mock', addedToItinerary: false,
    origin: 'BRU', destination: 'GRU',
    departureAt: '2026-03-24T10:30:00', arrivalAt: '2026-03-24T18:45:00',
    airline: 'Brussels Airlines', flightNumber: 'SN 901', durationMinutes: 675, stops: 0,
    price: { total: 4100.00, currency: 'BRL' },
    link: { url: 'https://www.brusselsairlines.com', provider: 'Brussels Airlines' },
  },
  {
    id: 'fl-009', source: 'mock', addedToItinerary: false,
    origin: 'BRU', destination: 'GRU',
    departureAt: '2026-03-24T13:15:00', arrivalAt: '2026-03-24T22:30:00',
    airline: 'TAP', flightNumber: 'TP 645', durationMinutes: 795, stops: 1,
    price: { total: 3550.00, currency: 'BRL' },
    link: { url: 'https://www.flytap.com', provider: 'TAP Portugal' },
  },
  {
    id: 'fl-010', source: 'mock', addedToItinerary: false,
    origin: 'BRU', destination: 'GRU',
    departureAt: '2026-03-24T22:00:00', arrivalAt: '2026-03-25T06:15:00',
    airline: 'LATAM', flightNumber: 'LA 8085', durationMinutes: 695, stops: 1,
    price: { total: 3790.00, currency: 'BRL' },
    link: { url: 'https://www.latam.com', provider: 'LATAM' },
  },
];

// ─── Hotel Destinations ────────────────────────────────────────────────────────

export const MOCK_HOTEL_DESTINATIONS: DestinationOption[] = [
  { destId: 'fr-paris', name: 'Paris', label: 'Paris, França', searchType: 'CITY' },
  { destId: 'be-brussels', name: 'Bruxelas', label: 'Bruxelas, Bélgica', searchType: 'CITY' },
  { destId: 'br-sp', name: 'São Paulo', label: 'São Paulo, Brasil', searchType: 'CITY' },
  { destId: 'br-rj', name: 'Rio de Janeiro', label: 'Rio de Janeiro, Brasil', searchType: 'CITY' },
  { destId: 'pt-lis', name: 'Lisboa', label: 'Lisboa, Portugal', searchType: 'CITY' },
  { destId: 'nl-ams', name: 'Amsterdã', label: 'Amsterdã, Países Baixos', searchType: 'CITY' },
];

// ─── Hotels/Stays ──────────────────────────────────────────────────────────────

export const MOCK_STAYS: Stay[] = [
  // === Paris ===
  {
    id: 'ht-001', source: 'mock', addedToItinerary: false,
    name: 'Hôtel Le Marais',
    location: { latitude: 48.8566, longitude: 2.3522 },
    address: '12 Rue de Rivoli, 75004 Paris',
    checkIn: '2026-03-11', checkOut: '2026-03-18',
    pricePerNight: { total: 890.00, currency: 'BRL' },
    rating: 4.5, reviewCount: 624, photoUrl: 'https://picsum.photos/seed/paris-hotel1/800/600',
    images: [
      'https://picsum.photos/seed/paris-hotel1/800/600',
      'https://picsum.photos/seed/paris-hotel1b/800/600',
      'https://picsum.photos/seed/paris-hotel1c/800/600',
    ],
    link: { url: 'https://www.booking.com', provider: 'Booking.com' },
  },
  {
    id: 'ht-002', source: 'mock', addedToItinerary: false,
    name: 'Hôtel Plaza Athénée',
    location: { latitude: 48.8660, longitude: 2.3030 },
    address: '25 Avenue Montaigne, 75008 Paris',
    checkIn: '2026-03-11', checkOut: '2026-03-18',
    pricePerNight: { total: 4500.00, currency: 'BRL' },
    rating: 4.9, reviewCount: 1872, photoUrl: 'https://picsum.photos/seed/paris-hotel2/800/600',
    images: [
      'https://picsum.photos/seed/paris-hotel2/800/600',
      'https://picsum.photos/seed/paris-hotel2b/800/600',
      'https://picsum.photos/seed/paris-hotel2c/800/600',
    ],
    link: { url: 'https://www.booking.com', provider: 'Booking.com' },
  },
  {
    id: 'ht-003', source: 'mock', addedToItinerary: false,
    name: 'Ibis Paris Montmartre',
    location: { latitude: 48.8847, longitude: 2.3404 },
    address: '5 Rue Caulaincourt, 75018 Paris',
    checkIn: '2026-03-11', checkOut: '2026-03-18',
    pricePerNight: { total: 420.00, currency: 'BRL' },
    rating: 3.9, reviewCount: 1543, photoUrl: 'https://picsum.photos/seed/paris-hotel3/800/600',
    images: [
      'https://picsum.photos/seed/paris-hotel3/800/600',
      'https://picsum.photos/seed/paris-hotel3b/800/600',
      'https://picsum.photos/seed/paris-hotel3c/800/600',
    ],
    link: { url: 'https://www.booking.com', provider: 'Booking.com' },
  },
  {
    id: 'ht-004', source: 'mock', addedToItinerary: false,
    name: 'Novotel Paris Centre Tour Eiffel',
    location: { latitude: 48.8494, longitude: 2.2894 },
    address: '61 Quai de Grenelle, 75015 Paris',
    checkIn: '2026-03-11', checkOut: '2026-03-18',
    pricePerNight: { total: 750.00, currency: 'BRL' },
    rating: 4.2, reviewCount: 987, photoUrl: 'https://picsum.photos/seed/paris-hotel4/800/600',
    images: [
      'https://picsum.photos/seed/paris-hotel4/800/600',
      'https://picsum.photos/seed/paris-hotel4b/800/600',
      'https://picsum.photos/seed/paris-hotel4c/800/600',
    ],
    link: { url: 'https://www.booking.com', provider: 'Booking.com' },
  },
  // === Bruxelas ===
  {
    id: 'ht-005', source: 'mock', addedToItinerary: false,
    name: 'Hotel Amigo Brussels',
    location: { latitude: 50.8454, longitude: 4.3498 },
    address: 'Rue de l\'Amigo 1, 1000 Bruxelles',
    checkIn: '2026-03-18', checkOut: '2026-03-24',
    pricePerNight: { total: 1200.00, currency: 'BRL' },
    rating: 4.7, reviewCount: 832, photoUrl: 'https://picsum.photos/seed/bru-hotel1/800/600',
    images: [
      'https://picsum.photos/seed/bru-hotel1/800/600',
      'https://picsum.photos/seed/bru-hotel1b/800/600',
      'https://picsum.photos/seed/bru-hotel1c/800/600',
    ],
    link: { url: 'https://www.booking.com', provider: 'Booking.com' },
  },
  {
    id: 'ht-006', source: 'mock', addedToItinerary: false,
    name: 'NH Brussels Grand Place Arenberg',
    location: { latitude: 50.8489, longitude: 4.3572 },
    address: 'Rue d\'Assaut 15, 1000 Bruxelles',
    checkIn: '2026-03-18', checkOut: '2026-03-24',
    pricePerNight: { total: 650.00, currency: 'BRL' },
    rating: 4.3, reviewCount: 1245, photoUrl: 'https://picsum.photos/seed/bru-hotel2/800/600',
    images: [
      'https://picsum.photos/seed/bru-hotel2/800/600',
      'https://picsum.photos/seed/bru-hotel2b/800/600',
      'https://picsum.photos/seed/bru-hotel2c/800/600',
    ],
    link: { url: 'https://www.booking.com', provider: 'Booking.com' },
  },
  {
    id: 'ht-007', source: 'mock', addedToItinerary: false,
    name: 'Ibis Brussels Centre Gare du Midi',
    location: { latitude: 50.8366, longitude: 4.3370 },
    address: 'Rue d\'Angleterre 2, 1060 Bruxelles',
    checkIn: '2026-03-18', checkOut: '2026-03-24',
    pricePerNight: { total: 380.00, currency: 'BRL' },
    rating: 3.7, reviewCount: 2103, photoUrl: 'https://picsum.photos/seed/bru-hotel3/800/600',
    images: [
      'https://picsum.photos/seed/bru-hotel3/800/600',
      'https://picsum.photos/seed/bru-hotel3b/800/600',
      'https://picsum.photos/seed/bru-hotel3c/800/600',
    ],
    link: { url: 'https://www.booking.com', provider: 'Booking.com' },
  },
  {
    id: 'ht-008', source: 'mock', addedToItinerary: false,
    name: 'Steigenberger Wiltcher\'s Brussels',
    location: { latitude: 50.8370, longitude: 4.3595 },
    address: 'Avenue Louise 71, 1050 Bruxelles',
    checkIn: '2026-03-18', checkOut: '2026-03-24',
    pricePerNight: { total: 1580.00, currency: 'BRL' },
    rating: 4.6, reviewCount: 567, photoUrl: 'https://picsum.photos/seed/bru-hotel4/800/600',
    images: [
      'https://picsum.photos/seed/bru-hotel4/800/600',
      'https://picsum.photos/seed/bru-hotel4b/800/600',
      'https://picsum.photos/seed/bru-hotel4c/800/600',
    ],
    link: { url: 'https://www.booking.com', provider: 'Booking.com' },
  },
];

// ─── Car Locations ─────────────────────────────────────────────────────────────

export const MOCK_CAR_LOCATIONS: CarLocationOption[] = [
  { id: 'cl-01', name: 'Paris - Charles de Gaulle', label: 'Aeroporto CDG, Paris', cityId: 'paris-cdg', latitude: 49.0097, longitude: 2.5479 },
  { id: 'cl-02', name: 'Paris - Orly', label: 'Aeroporto Orly, Paris', cityId: 'paris-ory', latitude: 48.7262, longitude: 2.3652 },
  { id: 'cl-03', name: 'Paris - Gare du Nord', label: 'Gare du Nord, Paris', cityId: 'paris-gdn', latitude: 48.8809, longitude: 2.3553 },
  { id: 'cl-04', name: 'Bruxelas - Airport', label: 'Aeroporto de Bruxelas (BRU)', cityId: 'bru-apt', latitude: 50.9014, longitude: 4.4844 },
  { id: 'cl-05', name: 'Bruxelas - Gare du Midi', label: 'Gare du Midi, Bruxelas', cityId: 'bru-midi', latitude: 50.8366, longitude: 4.3370 },
  { id: 'cl-06', name: 'São Paulo - Guarulhos', label: 'Aeroporto de Guarulhos (GRU)', cityId: 'sp-gru', latitude: -23.4356, longitude: -46.4731 },
];

// ─── Car Rentals ───────────────────────────────────────────────────────────────

export const MOCK_CAR_RENTALS: CarRental[] = [
  // === Paris ===
  {
    id: 'cr-001', source: 'mock', addedToItinerary: false,
    vehicleType: 'Economy',
    pickUpLocation: 'Aeroporto CDG, Paris', dropOffLocation: 'Aeroporto CDG, Paris',
    pickUpAt: '2026-03-11T14:00:00', dropOffAt: '2026-03-18T10:00:00',
    price: { total: 1250.00, currency: 'BRL' },
    images: [
      'https://picsum.photos/seed/car-paris1/800/600',
      'https://picsum.photos/seed/car-paris1b/800/600',
    ],
    link: { url: 'https://www.europcar.com', provider: 'Europcar' },
  },
  {
    id: 'cr-002', source: 'mock', addedToItinerary: false,
    vehicleType: 'Compact',
    pickUpLocation: 'Aeroporto CDG, Paris', dropOffLocation: 'Gare du Midi, Bruxelas',
    pickUpAt: '2026-03-11T14:00:00', dropOffAt: '2026-03-18T10:00:00',
    price: { total: 1680.00, currency: 'BRL' },
    images: [
      'https://picsum.photos/seed/car-paris2/800/600',
      'https://picsum.photos/seed/car-paris2b/800/600',
    ],
    link: { url: 'https://www.hertz.com', provider: 'Hertz' },
  },
  {
    id: 'cr-003', source: 'mock', addedToItinerary: false,
    vehicleType: 'SUV',
    pickUpLocation: 'Aeroporto CDG, Paris', dropOffLocation: 'Aeroporto CDG, Paris',
    pickUpAt: '2026-03-11T14:00:00', dropOffAt: '2026-03-18T10:00:00',
    price: { total: 2350.00, currency: 'BRL' },
    images: [
      'https://picsum.photos/seed/car-paris3/800/600',
      'https://picsum.photos/seed/car-paris3b/800/600',
    ],
    link: { url: 'https://www.sixt.com', provider: 'Sixt' },
  },
  // === Bruxelas ===
  {
    id: 'cr-004', source: 'mock', addedToItinerary: false,
    vehicleType: 'Economy',
    pickUpLocation: 'Gare du Midi, Bruxelas', dropOffLocation: 'Aeroporto de Bruxelas (BRU)',
    pickUpAt: '2026-03-18T12:00:00', dropOffAt: '2026-03-24T08:00:00',
    price: { total: 980.00, currency: 'BRL' },
    images: [
      'https://picsum.photos/seed/car-bru1/800/600',
      'https://picsum.photos/seed/car-bru1b/800/600',
    ],
    link: { url: 'https://www.europcar.com', provider: 'Europcar' },
  },
  {
    id: 'cr-005', source: 'mock', addedToItinerary: false,
    vehicleType: 'Compact',
    pickUpLocation: 'Aeroporto de Bruxelas (BRU)', dropOffLocation: 'Aeroporto de Bruxelas (BRU)',
    pickUpAt: '2026-03-18T12:00:00', dropOffAt: '2026-03-24T08:00:00',
    price: { total: 1150.00, currency: 'BRL' },
    images: [
      'https://picsum.photos/seed/car-bru2/800/600',
      'https://picsum.photos/seed/car-bru2b/800/600',
    ],
    link: { url: 'https://www.avis.com', provider: 'Avis' },
  },
  {
    id: 'cr-006', source: 'mock', addedToItinerary: false,
    vehicleType: 'Premium',
    pickUpLocation: 'Aeroporto de Bruxelas (BRU)', dropOffLocation: 'Aeroporto de Bruxelas (BRU)',
    pickUpAt: '2026-03-18T12:00:00', dropOffAt: '2026-03-24T08:00:00',
    price: { total: 2890.00, currency: 'BRL' },
    images: [
      'https://picsum.photos/seed/car-bru3/800/600',
      'https://picsum.photos/seed/car-bru3b/800/600',
    ],
    link: { url: 'https://www.sixt.com', provider: 'Sixt' },
  },
];

// ─── Transport ─────────────────────────────────────────────────────────────────

export const MOCK_TRANSPORTS: Transport[] = [
  // === Paris → Bruxelas (trem) ===
  {
    id: 'tr-001', source: 'mock', addedToItinerary: false,
    mode: 'train', origin: 'Paris (Gare du Nord)', destination: 'Bruxelas (Gare du Midi)',
    departureAt: '2026-03-18T07:25:00', arrivalAt: '2026-03-18T08:47:00',
    durationMinutes: 82, price: { total: 450.00, currency: 'BRL' },
    link: { url: 'https://www.thalys.com', provider: 'Thalys' },
  },
  {
    id: 'tr-002', source: 'mock', addedToItinerary: false,
    mode: 'train', origin: 'Paris (Gare du Nord)', destination: 'Bruxelas (Gare du Midi)',
    departureAt: '2026-03-18T09:25:00', arrivalAt: '2026-03-18T10:47:00',
    durationMinutes: 82, price: { total: 380.00, currency: 'BRL' },
    link: { url: 'https://www.thalys.com', provider: 'Thalys' },
  },
  {
    id: 'tr-003', source: 'mock', addedToItinerary: false,
    mode: 'train', origin: 'Paris (Gare du Nord)', destination: 'Bruxelas (Gare du Midi)',
    departureAt: '2026-03-18T12:25:00', arrivalAt: '2026-03-18T13:47:00',
    durationMinutes: 82, price: { total: 320.00, currency: 'BRL' },
    link: { url: 'https://www.eurostar.com', provider: 'Eurostar' },
  },
  {
    id: 'tr-004', source: 'mock', addedToItinerary: false,
    mode: 'train', origin: 'Paris (Gare du Nord)', destination: 'Bruxelas (Gare du Midi)',
    departureAt: '2026-03-18T16:25:00', arrivalAt: '2026-03-18T17:47:00',
    durationMinutes: 82, price: { total: 520.00, currency: 'BRL' },
    link: { url: 'https://www.thalys.com', provider: 'Thalys' },
  },
  // === Bus Paris → Bruxelas ===
  {
    id: 'tr-005', source: 'mock', addedToItinerary: false,
    mode: 'bus', origin: 'Paris (Bercy Seine)', destination: 'Bruxelas (Gare du Nord)',
    departureAt: '2026-03-18T08:00:00', arrivalAt: '2026-03-18T12:15:00',
    durationMinutes: 255, price: { total: 95.00, currency: 'BRL' },
    link: { url: 'https://www.flixbus.com', provider: 'FlixBus' },
  },
  {
    id: 'tr-006', source: 'mock', addedToItinerary: false,
    mode: 'bus', origin: 'Paris (Bercy Seine)', destination: 'Bruxelas (Gare du Nord)',
    departureAt: '2026-03-18T14:30:00', arrivalAt: '2026-03-18T18:50:00',
    durationMinutes: 260, price: { total: 85.00, currency: 'BRL' },
    link: { url: 'https://www.blablacar.com', provider: 'BlaBlaCar Bus' },
  },
  // === Bruxelas → Bruges (bate-volta) ===
  {
    id: 'tr-007', source: 'mock', addedToItinerary: false,
    mode: 'train', origin: 'Bruxelas (Gare Centrale)', destination: 'Bruges',
    departureAt: '2026-03-20T08:30:00', arrivalAt: '2026-03-20T09:30:00',
    durationMinutes: 60, price: { total: 85.00, currency: 'BRL' },
    link: { url: 'https://www.belgiantrain.be', provider: 'SNCB' },
  },
  {
    id: 'tr-008', source: 'mock', addedToItinerary: false,
    mode: 'train', origin: 'Bruges', destination: 'Bruxelas (Gare Centrale)',
    departureAt: '2026-03-20T18:00:00', arrivalAt: '2026-03-20T19:00:00',
    durationMinutes: 60, price: { total: 85.00, currency: 'BRL' },
    link: { url: 'https://www.belgiantrain.be', provider: 'SNCB' },
  },
];

// ─── Tours/Activities ──────────────────────────────────────────────────────────

export const MOCK_ACTIVITIES: Activity[] = [
  // === Paris ===
  {
    id: 'ac-001', source: 'mock', addedToItinerary: false,
    name: 'Cruzeiro pelo Rio Sena ao Pôr do Sol',
    description: 'Navegue pelo Sena com vista da Torre Eiffel, Notre-Dame e Louvre iluminados.',
    location: { latitude: 48.8606, longitude: 2.2939 },
    city: 'Paris', durationMinutes: 90,
    rating: 4.8, reviewCount: 3421,
    price: { total: 180.00, currency: 'BRL' },
    images: [
      'https://picsum.photos/seed/tour-paris1/800/600',
      'https://picsum.photos/seed/tour-paris1b/800/600',
    ],
    link: { url: 'https://www.getyourguide.com', provider: 'GetYourGuide' },
  },
  {
    id: 'ac-002', source: 'mock', addedToItinerary: false,
    name: 'Tour Guiado pelo Museu do Louvre',
    description: 'Visita guiada de 3h pelos destaques do Louvre: Mona Lisa, Vênus de Milo e mais.',
    location: { latitude: 48.8606, longitude: 2.3376 },
    city: 'Paris', durationMinutes: 180,
    rating: 4.7, reviewCount: 5678,
    price: { total: 290.00, currency: 'BRL' },
    images: [
      'https://picsum.photos/seed/tour-paris2/800/600',
      'https://picsum.photos/seed/tour-paris2b/800/600',
    ],
    link: { url: 'https://www.viator.com', provider: 'Viator' },
  },
  {
    id: 'ac-003', source: 'mock', addedToItinerary: false,
    name: 'Tour Gastronômico em Montmartre',
    description: 'Degustação de queijos, vinhos, crepes e doces no bairro boêmio de Paris.',
    location: { latitude: 48.8867, longitude: 2.3431 },
    city: 'Paris', durationMinutes: 210,
    rating: 4.9, reviewCount: 1234,
    price: { total: 350.00, currency: 'BRL' },
    images: [
      'https://picsum.photos/seed/tour-paris3/800/600',
      'https://picsum.photos/seed/tour-paris3b/800/600',
    ],
    link: { url: 'https://www.getyourguide.com', provider: 'GetYourGuide' },
  },
  {
    id: 'ac-004', source: 'mock', addedToItinerary: false,
    name: 'Subida à Torre Eiffel com Acesso Prioritário',
    description: 'Acesso ao 2º andar e topo da Torre Eiffel, sem fila, com guia em português.',
    location: { latitude: 48.8584, longitude: 2.2945 },
    city: 'Paris', durationMinutes: 120,
    rating: 4.6, reviewCount: 8901,
    price: { total: 220.00, currency: 'BRL' },
    images: [
      'https://picsum.photos/seed/tour-paris4/800/600',
      'https://picsum.photos/seed/tour-paris4b/800/600',
    ],
    link: { url: 'https://www.viator.com', provider: 'Viator' },
  },
  // === Bruxelas ===
  {
    id: 'ac-005', source: 'mock', addedToItinerary: false,
    name: 'Tour de Chocolate Belga em Bruxelas',
    description: 'Visite chocolaterias artesanais, aprenda sobre a história do chocolate e deguste pralinês.',
    location: { latitude: 50.8466, longitude: 4.3528 },
    city: 'Bruxelas', durationMinutes: 150,
    rating: 4.8, reviewCount: 2345,
    price: { total: 250.00, currency: 'BRL' },
    images: [
      'https://picsum.photos/seed/tour-bru1/800/600',
      'https://picsum.photos/seed/tour-bru1b/800/600',
    ],
    link: { url: 'https://www.getyourguide.com', provider: 'GetYourGuide' },
  },
  {
    id: 'ac-006', source: 'mock', addedToItinerary: false,
    name: 'Tour de Cerveja Belga com Degustação',
    description: 'Conheça pubs históricos e cervejarias de Bruxelas, com degustação de 6 cervejas artesanais.',
    location: { latitude: 50.8482, longitude: 4.3547 },
    city: 'Bruxelas', durationMinutes: 180,
    rating: 4.7, reviewCount: 1567,
    price: { total: 280.00, currency: 'BRL' },
    images: [
      'https://picsum.photos/seed/tour-bru2/800/600',
      'https://picsum.photos/seed/tour-bru2b/800/600',
    ],
    link: { url: 'https://www.viator.com', provider: 'Viator' },
  },
  {
    id: 'ac-007', source: 'mock', addedToItinerary: false,
    name: 'Bate-volta a Bruges saindo de Bruxelas',
    description: 'Day trip guiado à cidade medieval de Bruges: canais, praça central e chocolate.',
    location: { latitude: 50.8503, longitude: 4.3517 },
    city: 'Bruxelas', durationMinutes: 540,
    rating: 4.6, reviewCount: 3210,
    price: { total: 320.00, currency: 'BRL' },
    images: [
      'https://picsum.photos/seed/tour-bru3/800/600',
      'https://picsum.photos/seed/tour-bru3b/800/600',
    ],
    link: { url: 'https://www.getyourguide.com', provider: 'GetYourGuide' },
  },
  {
    id: 'ac-008', source: 'mock', addedToItinerary: false,
    name: 'Walking Tour pela Grand-Place e Bairros Históricos',
    description: 'Caminhada guiada pela Grand-Place, Manneken Pis, Galeries Royales e bairro Sablon.',
    location: { latitude: 50.8467, longitude: 4.3525 },
    city: 'Bruxelas', durationMinutes: 150,
    rating: 4.5, reviewCount: 876,
    price: { total: 95.00, currency: 'BRL' },
    images: [
      'https://picsum.photos/seed/tour-bru4/800/600',
      'https://picsum.photos/seed/tour-bru4b/800/600',
    ],
    link: { url: 'https://www.viator.com', provider: 'Viator' },
  },
];

// ─── Attractions ───────────────────────────────────────────────────────────────

export const MOCK_ATTRACTIONS: Attraction[] = [
  // === Paris ===
  {
    id: 'at-001', source: 'mock', addedToItinerary: false,
    name: 'Torre Eiffel',
    description: 'O monumento mais icônico de Paris, com vista panorâmica de 360° da cidade.',
    location: { latitude: 48.8584, longitude: 2.2945 },
    city: 'Paris', category: 'Monumento',
    images: [
      'https://picsum.photos/seed/attr-paris1/800/600',
      'https://picsum.photos/seed/attr-paris1b/800/600',
    ],
    link: { url: 'https://www.toureiffel.paris', provider: 'Site Oficial' },
  },
  {
    id: 'at-002', source: 'mock', addedToItinerary: false,
    name: 'Museu do Louvre',
    description: 'O maior museu de arte do mundo, com a Mona Lisa, Vênus de Milo e 380.000 obras.',
    location: { latitude: 48.8606, longitude: 2.3376 },
    city: 'Paris', category: 'Museu',
    images: [
      'https://picsum.photos/seed/attr-paris2/800/600',
      'https://picsum.photos/seed/attr-paris2b/800/600',
    ],
    link: { url: 'https://www.louvre.fr', provider: 'Site Oficial' },
  },
  {
    id: 'at-003', source: 'mock', addedToItinerary: false,
    name: 'Catedral de Notre-Dame',
    description: 'Obra-prima da arquitetura gótica, em reconstrução após o incêndio de 2019.',
    location: { latitude: 48.8530, longitude: 2.3499 },
    city: 'Paris', category: 'Monumento',
    images: [
      'https://picsum.photos/seed/attr-paris3/800/600',
      'https://picsum.photos/seed/attr-paris3b/800/600',
    ],
    link: { url: 'https://www.notredamedeparis.fr', provider: 'Site Oficial' },
  },
  {
    id: 'at-004', source: 'mock', addedToItinerary: false,
    name: 'Arco do Triunfo',
    description: 'Monumento na Champs-Élysées com terraço panorâmico e vista para 12 avenidas.',
    location: { latitude: 48.8738, longitude: 2.2950 },
    city: 'Paris', category: 'Monumento',
    images: [
      'https://picsum.photos/seed/attr-paris4/800/600',
      'https://picsum.photos/seed/attr-paris4b/800/600',
    ],
    link: { url: 'https://www.paris-arc-de-triomphe.fr', provider: 'Site Oficial' },
  },
  {
    id: 'at-005', source: 'mock', addedToItinerary: false,
    name: 'Sacré-Cœur e Montmartre',
    description: 'Basílica no ponto mais alto de Paris, no bairro artístico de Montmartre.',
    location: { latitude: 48.8867, longitude: 2.3431 },
    city: 'Paris', category: 'Igreja',
    images: [
      'https://picsum.photos/seed/attr-paris5/800/600',
      'https://picsum.photos/seed/attr-paris5b/800/600',
    ],
    link: { url: 'https://www.sacre-coeur-montmartre.com', provider: 'Site Oficial' },
  },
  {
    id: 'at-006', source: 'mock', addedToItinerary: false,
    name: 'Museu d\'Orsay',
    description: 'Museu impressionista em antiga estação de trem, com obras de Monet, Van Gogh e Renoir.',
    location: { latitude: 48.8600, longitude: 2.3266 },
    city: 'Paris', category: 'Museu',
    images: [
      'https://picsum.photos/seed/attr-paris6/800/600',
      'https://picsum.photos/seed/attr-paris6b/800/600',
    ],
    link: { url: 'https://www.musee-orsay.fr', provider: 'Site Oficial' },
  },
  // === Bruxelas ===
  {
    id: 'at-007', source: 'mock', addedToItinerary: false,
    name: 'Grand-Place',
    description: 'Praça central de Bruxelas, Patrimônio UNESCO, com prefeitura gótica e casas barrocas.',
    location: { latitude: 50.8467, longitude: 4.3525 },
    city: 'Bruxelas', category: 'Praça',
    images: [
      'https://picsum.photos/seed/attr-bru1/800/600',
      'https://picsum.photos/seed/attr-bru1b/800/600',
    ],
    link: { url: 'https://visit.brussels', provider: 'Visit Brussels' },
  },
  {
    id: 'at-008', source: 'mock', addedToItinerary: false,
    name: 'Atomium',
    description: 'Estrutura de 102m em forma de átomo de ferro, ícone da Expo 58.',
    location: { latitude: 50.8948, longitude: 4.3418 },
    city: 'Bruxelas', category: 'Monumento',
    images: [
      'https://picsum.photos/seed/attr-bru2/800/600',
      'https://picsum.photos/seed/attr-bru2b/800/600',
    ],
    link: { url: 'https://www.atomium.be', provider: 'Site Oficial' },
  },
  {
    id: 'at-009', source: 'mock', addedToItinerary: false,
    name: 'Manneken Pis',
    description: 'Pequena estátua-fonte de bronze, símbolo irreverente de Bruxelas desde 1619.',
    location: { latitude: 50.8450, longitude: 4.3498 },
    city: 'Bruxelas', category: 'Monumento',
    images: [
      'https://picsum.photos/seed/attr-bru3/800/600',
      'https://picsum.photos/seed/attr-bru3b/800/600',
    ],
    link: null,
  },
  {
    id: 'at-010', source: 'mock', addedToItinerary: false,
    name: 'Museus Reais de Belas-Artes da Bélgica',
    description: 'Complexo de museus com obras de Bruegel, Rubens e Magritte.',
    location: { latitude: 50.8420, longitude: 4.3575 },
    city: 'Bruxelas', category: 'Museu',
    images: [
      'https://picsum.photos/seed/attr-bru4/800/600',
      'https://picsum.photos/seed/attr-bru4b/800/600',
    ],
    link: { url: 'https://www.fine-arts-museum.be', provider: 'Site Oficial' },
  },
  {
    id: 'at-011', source: 'mock', addedToItinerary: false,
    name: 'Mini-Europe',
    description: 'Parque com reproduções em miniatura dos monumentos mais famosos da Europa.',
    location: { latitude: 50.8952, longitude: 4.3396 },
    city: 'Bruxelas', category: 'Parque',
    images: [
      'https://picsum.photos/seed/attr-bru5/800/600',
      'https://picsum.photos/seed/attr-bru5b/800/600',
    ],
    link: { url: 'https://www.minieurope.com', provider: 'Site Oficial' },
  },
  {
    id: 'at-012', source: 'mock', addedToItinerary: false,
    name: 'Galeries Royales Saint-Hubert',
    description: 'Galeria comercial coberta de 1847, uma das mais antigas da Europa, com lojas e cafés.',
    location: { latitude: 50.8484, longitude: 4.3549 },
    city: 'Bruxelas', category: 'Histórico',
    images: [
      'https://picsum.photos/seed/attr-bru6/800/600',
      'https://picsum.photos/seed/attr-bru6b/800/600',
    ],
    link: null,
  },
];

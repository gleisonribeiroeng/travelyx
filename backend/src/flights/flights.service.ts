import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import {
  MOCK_SHOWCASE_DEALS,
  MOCK_SHOWCASE_POPULAR,
  MOCK_SHOWCASE_RECOMMENDED,
  DESTINATION_IMAGES,
} from '../common/mock-data';

@Injectable()
export class FlightsService {
  private readonly logger = new Logger(FlightsService.name);
  private readonly baseUrl = 'https://booking-com15.p.rapidapi.com';
  private readonly host = 'booking-com15.p.rapidapi.com';

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {}

  private getHeaders(): Record<string, string> {
    return {
      'X-RapidAPI-Key':
        this.configService.get<string>('FLIGHT_API_KEY') ||
        this.configService.get<string>('HOTEL_API_KEY')!,
      'X-RapidAPI-Host': this.host,
    };
  }

  private readonly travelpayoutsBaseUrl = 'https://api.travelpayouts.com';

  /**
   * Search flights via Booking.com + Travelpayouts (Aviasales/Kiwi) in parallel.
   * Merges results from both sources, deduplicates, and sorts.
   */
  async searchFlights(query: Record<string, string>): Promise<any> {
    const fromId = query['fromId'] || '';
    const toId = query['toId'] || '';
    const departDate = query['departureDate'] || query['departDate'] || '';
    const returnDate = query['returnDate'] || '';
    const adults = query['adults'] || '1';
    const currency = query['currency_code'] || 'BRL';

    if (!fromId || !toId || !departDate) {
      return { data: [] };
    }

    // Extract IATA codes from IDs like "GRU.AIRPORT"
    const fromIata = fromId.split('.')[0];
    const toIata = toId.split('.')[0];

    // Run both searches in parallel
    const [bookingResults, tpResults] = await Promise.all([
      this.searchBookingFlights(query, fromId, toId, departDate, returnDate, adults, currency),
      this.searchTravelpayoutsFlights(fromIata, toIata, departDate, returnDate, currency),
    ]);

    const allFlights = [...bookingResults, ...tpResults];

    // Deduplicate by similar route+time+price (within 5 min departure and same price range)
    const deduplicated = this.deduplicateFlights(allFlights);

    // Server-side sorting
    const sortBy = query['sort'] || 'price_asc';
    this.sortFlights(deduplicated, sortBy);

    this.logger.log(
      `Combined flights: ${deduplicated.length} results (Booking: ${bookingResults.length}, Travelpayouts: ${tpResults.length}, sorted: ${sortBy})`,
    );
    return { data: deduplicated };
  }

  /**
   * Search flights via Booking.com API (RapidAPI).
   */
  private async searchBookingFlights(
    query: Record<string, string>,
    fromId: string,
    toId: string,
    departDate: string,
    returnDate: string,
    adults: string,
    currency: string,
  ): Promise<any[]> {
    const normalizedFrom = fromId.includes('.') ? fromId : `${fromId}.AIRPORT`;
    const normalizedTo = toId.includes('.') ? toId : `${toId}.AIRPORT`;

    const params: Record<string, string> = {
      fromId: normalizedFrom,
      toId: normalizedTo,
      departDate,
      adults,
      cabinClass: query['cabinClass'] || 'ECONOMY',
      currency_code: currency,
      locale: query['locale'] || 'pt-br',
    };

    if (returnDate) {
      params['returnDate'] = returnDate;
    }

    this.logger.log(
      `Booking.com flight search: ${fromId} → ${toId} (${departDate}${returnDate ? ' / ' + returnDate : ''})`,
    );

    try {
      const { data } = await firstValueFrom(
        this.httpService.get(
          `${this.baseUrl}/api/v1/flights/searchFlights`,
          { params, headers: this.getHeaders() },
        ),
      );

      if (!data?.status || !data?.data?.flightOffers) {
        this.logger.warn(
          `Booking.com flights: no results — status=${data?.status}, message=${data?.message || 'N/A'}, keys=${Object.keys(data?.data || {}).join(',')}`,
        );
        return [];
      }

      const flights = data.data.flightOffers
        .map((offer: any, index: number) => this.mapFlightOffer(offer, index, normalizedFrom, normalizedTo, departDate, returnDate))
        .filter(Boolean);

      this.logger.log(`Booking.com flights: ${flights.length} results`);
      return flights;
    } catch (error: any) {
      const status = error?.response?.status;
      this.logger.error(
        `Booking.com flights error: ${error?.message} | HTTP ${status ?? 'N/A'}`,
      );
      return [];
    }
  }

  /**
   * Search flights via Travelpayouts (Aviasales) API.
   * Uses prices_for_dates endpoint which returns cached best prices from multiple sources (including Kiwi).
   */
  private async searchTravelpayoutsFlights(
    fromIata: string,
    toIata: string,
    departDate: string,
    returnDate: string,
    currency: string,
  ): Promise<any[]> {
    const token = this.configService.get<string>('TRAVELPAYOUTS_TOKEN');
    const marker = this.configService.get<string>('TRAVELPAYOUTS_MARKER');
    if (!token) {
      this.logger.debug('Travelpayouts token not configured — skipping');
      return [];
    }

    const params: Record<string, string> = {
      origin: fromIata,
      destination: toIata,
      departure_at: departDate,
      currency: currency.toLowerCase(),
      token,
      sorting: 'price',
      limit: '30',
      unique: 'false',
    };

    if (returnDate) {
      params['return_at'] = returnDate;
    }

    this.logger.log(
      `Travelpayouts flight search: ${fromIata} → ${toIata} (${departDate}${returnDate ? ' / ' + returnDate : ''})`,
    );

    try {
      const { data } = await firstValueFrom(
        this.httpService.get(
          `${this.travelpayoutsBaseUrl}/aviasales/v3/prices_for_dates`,
          { params },
        ),
      );

      if (!data?.success || !data?.data?.length) {
        this.logger.warn(
          `Travelpayouts flights: no results — success=${data?.success}`,
        );
        return [];
      }

      const flights = data.data
        .map((offer: any, index: number) =>
          this.mapTravelpayoutsOffer(offer, index, fromIata, toIata, currency, marker || ''),
        )
        .filter(Boolean);

      this.logger.log(`Travelpayouts flights: ${flights.length} results`);
      return flights;
    } catch (error: any) {
      const status = error?.response?.status;
      this.logger.error(
        `Travelpayouts flights error: ${error?.message} | HTTP ${status ?? 'N/A'}`,
      );
      return [];
    }
  }

  /**
   * Map a single Travelpayouts flight offer to the canonical Flight model.
   */
  private mapTravelpayoutsOffer(
    offer: any,
    index: number,
    fromIata: string,
    toIata: string,
    currency: string,
    marker: string,
  ): any {
    if (!offer) return null;

    const airlineCode = offer.airline || '';
    const flightNumber = offer.flight_number
      ? `${airlineCode}${offer.flight_number}`
      : '';
    const stops = offer.transfers ?? 0;
    const durationMinutes = offer.duration_to
      ? Math.round(offer.duration_to / 60)
      : 0;

    // Build departure/arrival datetimes from the date + departure_at time
    const departureAt = offer.departure_at || `${offer.depart_date || ''}T00:00:00`;
    const arrivalAt = offer.arrival_at || '';

    // Build Aviasales affiliate deep link (format: {origin}{DDMM}{dest}{DDMM}{pax})
    const fmtDate = (d: string) => {
      if (!d) return '';
      const [, mm, dd] = d.split('-');
      return `${dd}${mm}`;
    };
    const deepLink = `https://www.aviasales.com/search/${fromIata}${fmtDate(offer.depart_date)}${toIata}${fmtDate(offer.return_date)}1?marker=${marker}`;

    return {
      id: `tp-${Date.now()}-${index}`,
      source: 'kiwi',
      addedToItinerary: false,
      origin: offer.origin || fromIata,
      destination: offer.destination || toIata,
      departureAt,
      arrivalAt,
      airline: airlineCode,
      airlineCode,
      airlineLogo: airlineCode
        ? `https://pics.avs.io/120/120/${airlineCode}.png`
        : null,
      flightNumber,
      durationMinutes,
      stops,
      price: {
        total: Math.round((offer.price || 0) * 100) / 100,
        currency: currency.toUpperCase(),
      },
      link: {
        url: deepLink,
        provider: 'Kiwi.com',
      },
    };
  }

  /**
   * Remove near-duplicate flights across providers.
   * Two flights are considered duplicates if they have the same route,
   * similar departure time (within 5 minutes), and similar price (within 5%).
   * Keeps the cheapest version.
   */
  private deduplicateFlights(flights: any[]): any[] {
    const kept: any[] = [];

    for (const flight of flights) {
      const depTime = new Date(flight.departureAt).getTime();
      const isDupe = kept.some((k) => {
        if (k.origin !== flight.origin || k.destination !== flight.destination) return false;
        const kDepTime = new Date(k.departureAt).getTime();
        const timeDiff = Math.abs(depTime - kDepTime);
        if (timeDiff > 5 * 60 * 1000) return false; // > 5 min apart
        const priceDiff = Math.abs(k.price.total - flight.price.total) / Math.max(k.price.total, 1);
        return priceDiff < 0.05; // within 5% price
      });

      if (!isDupe) {
        kept.push(flight);
      } else {
        // Replace if this one is cheaper
        const dupeIndex = kept.findIndex((k) => {
          if (k.origin !== flight.origin || k.destination !== flight.destination) return false;
          const kDepTime = new Date(k.departureAt).getTime();
          const timeDiff = Math.abs(depTime - kDepTime);
          if (timeDiff > 5 * 60 * 1000) return false;
          const priceDiff = Math.abs(k.price.total - flight.price.total) / Math.max(k.price.total, 1);
          return priceDiff < 0.05 && flight.price.total < k.price.total;
        });
        if (dupeIndex >= 0) {
          kept[dupeIndex] = flight;
        }
      }
    }

    return kept;
  }

  /**
   * Map a single Booking.com flight offer to the canonical Flight model.
   */
  private mapFlightOffer(offer: any, index: number, searchFromId: string, searchToId: string, searchDepartDate: string, searchReturnDate: string): any {
    const outbound = offer.segments?.[0];
    if (!outbound) return null;

    const legs = outbound.legs || [];
    const firstLeg = legs[0] || {};
    const carrierData = firstLeg.carriersData?.[0] || {};
    const flightInfo = firstLeg.flightInfo || {};
    const carrierInfo = flightInfo.carrierInfo || {};

    const price = offer.priceBreakdown?.total || {};
    const totalPrice =
      (price.units || 0) + (price.nanos || 0) / 1_000_000_000;

    const airlineCode =
      carrierInfo.marketingCarrier ||
      carrierData.code ||
      firstLeg.carriers?.[0] ||
      '';

    const flightNumber = flightInfo.flightNumber
      ? `${airlineCode}${flightInfo.flightNumber}`
      : '';

    const depCode = outbound.departureAirport?.code || '';
    const arrCode = outbound.arrivalAirport?.code || '';
    const depDate = (outbound.departureTime || '').split('T')[0];

    return {
      id: `bkf-${Date.now()}-${index}`,
      source: 'booking',
      addedToItinerary: false,
      origin: depCode,
      destination: arrCode,
      departureAt: outbound.departureTime || '',
      arrivalAt: outbound.arrivalTime || '',
      airline: carrierData.name || airlineCode,
      airlineCode,
      airlineLogo:
        carrierData.logo ||
        (airlineCode
          ? `https://r-xx.bstatic.com/data/airlines_logo/${airlineCode}.png`
          : null),
      flightNumber,
      durationMinutes: Math.round((outbound.totalTime || 0) / 60),
      stops: Math.max(0, legs.length - 1),
      price: {
        total: Math.round(totalPrice * 100) / 100,
        currency: price.currencyCode || 'BRL',
      },
      link: {
        url: '',
        provider: 'manual',
      },
    };
  }

  private sortFlights(flights: any[], sortBy: string): void {
    switch (sortBy) {
      case 'price_asc':
        flights.sort((a, b) => (a.price?.total ?? 0) - (b.price?.total ?? 0));
        break;
      case 'price_desc':
        flights.sort((a, b) => (b.price?.total ?? 0) - (a.price?.total ?? 0));
        break;
      case 'duration_asc':
        flights.sort((a, b) => (a.durationMinutes ?? 0) - (b.durationMinutes ?? 0));
        break;
      case 'departure_asc':
        flights.sort((a, b) => (a.departureAt || '').localeCompare(b.departureAt || ''));
        break;
      case 'stops_asc':
        flights.sort((a, b) => (a.stops ?? 0) - (b.stops ?? 0));
        break;
      default:
        flights.sort((a, b) => (a.price?.total ?? 0) - (b.price?.total ?? 0));
    }
  }

  getShowcase() {
    const airlineCodeMap: Record<string, string> = {
      'LATAM': 'LA', 'GOL': 'G3', 'Azul': 'AD',
      'Air France': 'AF', 'TAP': 'TP', 'KLM': 'KL',
      'Brussels Airlines': 'SN', 'Lufthansa': 'LH',
      'American Airlines': 'AA', 'United': 'UA', 'Delta': 'DL',
      'Iberia': 'IB', 'Emirates': 'EK',
    };

    const enrich = (flights: any[]) =>
      flights.map((f) => {
        const code = f.airlineCode || airlineCodeMap[f.airline] || '';
        return {
          ...f,
          airlineCode: code,
          airlineLogo: code
            ? `https://pics.avs.io/120/120/${code}.png`
            : null,
          destinationImage: DESTINATION_IMAGES[f.destination]?.url ?? null,
        };
      });

    return {
      deals: enrich(MOCK_SHOWCASE_DEALS),
      popular: enrich(MOCK_SHOWCASE_POPULAR),
      recommended: enrich(MOCK_SHOWCASE_RECOMMENDED),
    };
  }

  /**
   * Map of popular tourist cities (without airports) → nearest airport.
   * Used as fallback when Booking.com API returns no airport results.
   */
  private readonly nearestAirportMap: Record<
    string,
    { code: string; airportName: string; city: string }
  > = {
    gramado: { code: 'POA', airportName: 'Salgado Filho International Airport', city: 'Porto Alegre' },
    canela: { code: 'POA', airportName: 'Salgado Filho International Airport', city: 'Porto Alegre' },
    'bento gonçalves': { code: 'POA', airportName: 'Salgado Filho International Airport', city: 'Porto Alegre' },
    garibaldi: { code: 'POA', airportName: 'Salgado Filho International Airport', city: 'Porto Alegre' },
    'campos do jordão': { code: 'VCP', airportName: 'Aeroporto de Viracopos', city: 'Campinas' },
    'monte verde': { code: 'VCP', airportName: 'Aeroporto de Viracopos', city: 'Campinas' },
    búzios: { code: 'GIG', airportName: 'Aeroporto do Galeão', city: 'Rio de Janeiro' },
    'armação dos búzios': { code: 'GIG', airportName: 'Aeroporto do Galeão', city: 'Rio de Janeiro' },
    paraty: { code: 'GIG', airportName: 'Aeroporto do Galeão', city: 'Rio de Janeiro' },
    'arraial do cabo': { code: 'GIG', airportName: 'Aeroporto do Galeão', city: 'Rio de Janeiro' },
    'ilha grande': { code: 'GIG', airportName: 'Aeroporto do Galeão', city: 'Rio de Janeiro' },
    bonito: { code: 'CGR', airportName: 'Aeroporto de Campo Grande', city: 'Campo Grande' },
    jericoacoara: { code: 'FOR', airportName: 'Aeroporto Pinto Martins', city: 'Fortaleza' },
    'chapada diamantina': { code: 'SSA', airportName: 'Aeroporto de Salvador', city: 'Salvador' },
    lençóis: { code: 'SSA', airportName: 'Aeroporto de Salvador', city: 'Salvador' },
    'praia do forte': { code: 'SSA', airportName: 'Aeroporto de Salvador', city: 'Salvador' },
    'morro de são paulo': { code: 'SSA', airportName: 'Aeroporto de Salvador', city: 'Salvador' },
    trancoso: { code: 'BPS', airportName: 'Aeroporto de Porto Seguro', city: 'Porto Seguro' },
    "arraial d'ajuda": { code: 'BPS', airportName: 'Aeroporto de Porto Seguro', city: 'Porto Seguro' },
    pirenópolis: { code: 'BSB', airportName: 'Aeroporto JK', city: 'Brasília' },
    'alter do chão': { code: 'STM', airportName: 'Aeroporto de Santarém', city: 'Santarém' },
    'são thomé das letras': { code: 'VCP', airportName: 'Aeroporto de Viracopos', city: 'Campinas' },
    'serra gaúcha': { code: 'POA', airportName: 'Salgado Filho International Airport', city: 'Porto Alegre' },
    'costa do sauípe': { code: 'SSA', airportName: 'Aeroporto de Salvador', city: 'Salvador' },
    itacaré: { code: 'IOS', airportName: 'Aeroporto de Ilhéus', city: 'Ilhéus' },
    guarujá: { code: 'GRU', airportName: 'Aeroporto de Guarulhos', city: 'São Paulo' },
    ubatuba: { code: 'GRU', airportName: 'Aeroporto de Guarulhos', city: 'São Paulo' },
    ilhabela: { code: 'GRU', airportName: 'Aeroporto de Guarulhos', city: 'São Paulo' },
    'são sebastião': { code: 'GRU', airportName: 'Aeroporto de Guarulhos', city: 'São Paulo' },
    penedo: { code: 'GIG', airportName: 'Aeroporto do Galeão', city: 'Rio de Janeiro' },
    petrópolis: { code: 'GIG', airportName: 'Aeroporto do Galeão', city: 'Rio de Janeiro' },
    teresópolis: { code: 'GIG', airportName: 'Aeroporto do Galeão', city: 'Rio de Janeiro' },
    tiradentes: { code: 'CNF', airportName: 'Aeroporto de Confins', city: 'Belo Horizonte' },
    'ouro preto': { code: 'CNF', airportName: 'Aeroporto de Confins', city: 'Belo Horizonte' },
    diamantina: { code: 'CNF', airportName: 'Aeroporto de Confins', city: 'Belo Horizonte' },
    capitólio: { code: 'CNF', airportName: 'Aeroporto de Confins', city: 'Belo Horizonte' },
    'fernando de noronha': { code: 'REC', airportName: 'Aeroporto do Recife', city: 'Recife' },
    pipa: { code: 'NAT', airportName: 'Aeroporto de Natal', city: 'Natal' },
    'praia da pipa': { code: 'NAT', airportName: 'Aeroporto de Natal', city: 'Natal' },
    'porto de galinhas': { code: 'REC', airportName: 'Aeroporto do Recife', city: 'Recife' },
    carneiros: { code: 'REC', airportName: 'Aeroporto do Recife', city: 'Recife' },
    'são miguel dos milagres': { code: 'MCZ', airportName: 'Aeroporto de Maceió', city: 'Maceió' },
    japaratinga: { code: 'MCZ', airportName: 'Aeroporto de Maceió', city: 'Maceió' },
    bariloche: { code: 'BRC', airportName: 'Aeropuerto de Bariloche', city: 'Bariloche' },
    mendoza: { code: 'MDZ', airportName: 'Aeropuerto de Mendoza', city: 'Mendoza' },
    'el calafate': { code: 'FTE', airportName: 'Aeropuerto El Calafate', city: 'El Calafate' },
    ushuaia: { code: 'USH', airportName: 'Aeropuerto de Ushuaia', city: 'Ushuaia' },
    pucón: { code: 'ZCO', airportName: 'Aeropuerto La Araucanía', city: 'Temuco' },
    'san pedro de atacama': { code: 'CJC', airportName: 'Aeropuerto El Loa', city: 'Calama' },
    'machu picchu': { code: 'CUZ', airportName: 'Aeropuerto Velasco Astete', city: 'Cusco' },
    cusco: { code: 'CUZ', airportName: 'Aeropuerto Velasco Astete', city: 'Cusco' },
  };

  /**
   * Find nearest airport from the hardcoded map.
   * Matches by prefix to handle partial typing (e.g. "gram" → "gramado").
   */
  private findNearestAirport(
    keyword: string,
  ): { code: string; airportName: string; city: string } | null {
    const lower = keyword.toLowerCase().trim();
    // Exact match first
    if (this.nearestAirportMap[lower]) return this.nearestAirportMap[lower];
    // Partial match: keyword is prefix of a city name
    for (const [city, airport] of Object.entries(this.nearestAirportMap)) {
      if (city.startsWith(lower) || lower.startsWith(city)) return airport;
    }
    return null;
  }

  /**
   * Search flight destinations via Booking.com API.
   * Falls back to nearest airport mapping for cities without airports.
   */
  async searchAirports(query: Record<string, string>): Promise<any> {
    const keyword = query['keyword'] || '';
    if (keyword.length < 2) {
      return { data: [] };
    }

    try {
      const { data } = await firstValueFrom(
        this.httpService.get(
          `${this.baseUrl}/api/v1/flights/searchDestination`,
          {
            params: { query: keyword, locale: query['locale'] || 'pt-br' },
            headers: this.getHeaders(),
          },
        ),
      );

      let mapped: any[] = [];

      if (data?.status && Array.isArray(data?.data)) {
        mapped = data.data
          .filter((item: any) => item.id)
          .map((item: any) => ({
            id: item.id || '',
            iataCode: item.code || '',
            name: item.name || '',
            cityName: item.cityName || item.name || '',
            type: item.type || (item.id?.includes('.AIRPORT') ? 'AIRPORT' : 'CITY'),
          }));
      }

      // Check if we have any AIRPORT results
      const hasAirport = mapped.some(
        (r: any) => r.iataCode && r.type === 'AIRPORT',
      );

      // If no airport results, try the nearest airport fallback
      if (!hasAirport) {
        const nearest = this.findNearestAirport(keyword);
        if (nearest) {
          this.logger.log(
            `No airport for "${keyword}" — suggesting nearest: ${nearest.code} (${nearest.city})`,
          );
          // Add nearest airport suggestion at the top
          mapped.unshift({
            id: `${nearest.code}.AIRPORT`,
            iataCode: nearest.code,
            name: `${nearest.airportName} (mais próximo)`,
            cityName: nearest.city,
            type: 'AIRPORT',
          });
        }
      }

      return { data: mapped };
    } catch (error: any) {
      this.logger.error(
        `Booking.com flight destination error: ${error?.message}`,
      );
      throw error;
    }
  }
}

import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import {
  MOCK_TOUR_SHOWCASE_MOST_BOOKED,
  MOCK_TOUR_SHOWCASE_MUST_DO,
  MOCK_TOUR_SHOWCASE_UNIQUE,
  CITY_IMAGES,
} from '../common/mock-data';

@Injectable()
export class ToursService {
  private readonly logger = new Logger(ToursService.name);

  /** Cache destination name → Viator numeric ID */
  private destinationCache = new Map<string, string>();

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Pick the best available Viator key.
   * Uses sandbox by default. Only uses prod when VIATOR_USE_PROD=true
   * (set this after the prod key is activated by Viator).
   */
  private getViatorConfig() {
    const useProd =
      this.configService.get<string>('VIATOR_USE_PROD') === 'true';

    const apiKey = useProd
      ? this.configService.get<string>('TOURS_API_KEY_PROD')
      : this.configService.get<string>('TOURS_API_KEY_SANDBOX');
    const baseUrl = useProd
      ? 'https://api.viator.com'
      : 'https://api.sandbox.viator.com';
    return { apiKey, baseUrl, isProd: useProd };
  }

  private getHeaders(apiKey: string): Record<string, string> {
    return {
      'exp-api-key': apiKey,
      Accept: 'application/json;version=2.0',
      'Content-Type': 'application/json',
      'Accept-Language': 'pt-BR',
    };
  }

  /**
   * Resolve a city name to a Viator destination numeric ID.
   * Uses the /partner/search/freetext endpoint.
   */
  private async resolveDestinationId(
    cityName: string,
    apiKey: string,
    baseUrl: string,
  ): Promise<string | null> {
    if (!cityName) return null;

    const cached = this.destinationCache.get(cityName.toLowerCase());
    if (cached) return cached;

    try {
      const { data } = await firstValueFrom(
        this.httpService.post(
          `${baseUrl}/partner/search/freetext`,
          {
            searchTerm: cityName,
            currency: 'BRL',
            searchTypes: [
              {
                searchType: 'DESTINATIONS',
                pagination: { offset: 0, limit: 3 },
              },
            ],
          },
          { headers: this.getHeaders(apiKey) },
        ),
      );

      const results = data?.destinations?.results || [];
      if (results.length === 0) {
        this.logger.warn(`Viator: No destination found for "${cityName}"`);
        return null;
      }

      const destId = String(results[0].id);
      this.destinationCache.set(cityName.toLowerCase(), destId);
      this.logger.log(
        `Viator: Resolved "${cityName}" → destination ID ${destId} (${results[0].name})`,
      );
      return destId;
    } catch (error: any) {
      this.logger.error(
        `Viator destination lookup error for "${cityName}": ${error?.message}`,
      );
      return null;
    }
  }

  getShowcase() {
    const enrich = (tours: any[]) =>
      tours.map((t) => ({
        ...t,
        cityImage: CITY_IMAGES[t.city]?.url ?? null,
      }));

    return {
      mostBooked: enrich(MOCK_TOUR_SHOWCASE_MOST_BOOKED),
      mustDo: enrich(MOCK_TOUR_SHOWCASE_MUST_DO),
      unique: enrich(MOCK_TOUR_SHOWCASE_UNIQUE),
    };
  }

  async searchTours(body: any): Promise<any> {
    const { apiKey, baseUrl } = this.getViatorConfig();

    if (!apiKey) {
      this.logger.warn('Viator API key not configured');
      return { products: [] };
    }

    // If the frontend sends a city name as destination, resolve it to numeric ID
    let destinationId = body?.filtering?.destination;
    if (destinationId && isNaN(Number(destinationId))) {
      const resolved = await this.resolveDestinationId(
        destinationId,
        apiKey,
        baseUrl,
      );
      if (!resolved) {
        this.logger.warn(
          `Could not resolve destination "${destinationId}"`,
        );
        return { products: [] };
      }
      destinationId = resolved;
    }

    // Build clean body — strip sorting (Viator sandbox rejects unknown sorts)
    const { sorting, ...bodyWithoutSorting } = body || {};
    const searchBody = {
      ...bodyWithoutSorting,
      filtering: {
        ...body?.filtering,
        destination: destinationId,
      },
      currency: body?.currency || 'BRL',
    };

    try {
      const { data } = await firstValueFrom(
        this.httpService.post(
          `${baseUrl}/partner/products/search`,
          searchBody,
          { headers: this.getHeaders(apiKey) },
        ),
      );

      const products =
        data?.products || data?.data?.products || data?.data || [];
      this.logger.log(`Viator: ${Array.isArray(products) ? products.length : 0} results`);
      return data;
    } catch (error: any) {
      const status = error?.response?.status;
      const errorBody = error?.response?.data;
      this.logger.error(
        `Viator API error: ${error?.message} | HTTP ${status ?? 'N/A'} | body: ${JSON.stringify(errorBody)?.substring(0, 500)}`,
      );
      return { products: [] };
    }
  }
}

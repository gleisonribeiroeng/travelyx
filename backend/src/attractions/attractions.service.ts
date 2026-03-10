import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { MOCK_ATTRACTIONS } from '../common/mock-data';

@Injectable()
export class AttractionsService {
  private readonly logger = new Logger(AttractionsService.name);

  /** Cache destination name → Viator numeric ID */
  private destinationCache = new Map<string, string>();

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {}

  private isMockMode(): boolean {
    return this.configService.get<string>('MOCK_MODE') === 'true';
  }

  private getViatorConfig() {
    const isProd =
      this.configService.get<string>('NODE_ENV') === 'production';
    const apiKey = isProd
      ? this.configService.get<string>('TOURS_API_KEY_PROD')
      : this.configService.get<string>('TOURS_API_KEY_SANDBOX');
    const baseUrl = isProd
      ? 'https://api.viator.com'
      : 'https://api.sandbox.viator.com';
    return { apiKey, baseUrl, isProd };
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
        this.logger.warn(
          `Viator: No destination found for "${cityName}"`,
        );
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

  async searchAttractions(body: any): Promise<any> {
    if (this.isMockMode()) {
      return { _mock: true, data: MOCK_ATTRACTIONS };
    }

    const { apiKey, baseUrl, isProd } = this.getViatorConfig();

    if (!apiKey) {
      this.logger.warn(
        `TOURS_API_KEY_${isProd ? 'PROD' : 'SANDBOX'} is not configured — returning mock data`,
      );
      return { _mock: true, data: MOCK_ATTRACTIONS };
    }

    // Resolve city name to numeric destination ID if needed
    let destinationId =
      body.filtering?.destination || body.destination;
    if (destinationId && isNaN(Number(destinationId))) {
      const resolved = await this.resolveDestinationId(
        destinationId,
        apiKey,
        baseUrl,
      );
      if (!resolved) {
        this.logger.warn(
          `Could not resolve destination "${destinationId}" — returning mock data`,
        );
        return { _mock: true, data: MOCK_ATTRACTIONS };
      }
      destinationId = resolved;
    }

    try {
      const viatorBody = {
        filtering: {
          destination: destinationId,
          tags: body.filtering?.tags || [21910, 21911, 21912],
          // 21910=Tickets & Passes, 21911=Attractions, 21912=Museums
        },
        currency: 'BRL',
        pagination: body.pagination || { offset: 0, limit: 20 },
      };

      const { data } = await firstValueFrom(
        this.httpService.post(
          `${baseUrl}/partner/products/search`,
          viatorBody,
          { headers: this.getHeaders(apiKey) },
        ),
      );

      const products =
        data?.products || data?.data?.products || data?.data || [];
      if (!Array.isArray(products) || products.length === 0) {
        this.logger.log(
          'Viator attractions: 0 results, falling back to mock',
        );
        return { _mock: true, data: MOCK_ATTRACTIONS };
      }

      this.logger.log(
        `Viator attractions: ${products.length} results`,
      );
      return data;
    } catch (error: any) {
      const status = error?.response?.status;
      const errorBody = error?.response?.data;
      this.logger.error(
        `Viator attractions API error: ${error?.message} | HTTP ${status ?? 'N/A'} | body: ${JSON.stringify(errorBody)?.substring(0, 500)}`,
      );
      return { _mock: true, data: MOCK_ATTRACTIONS };
    }
  }
}

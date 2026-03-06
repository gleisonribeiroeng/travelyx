import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import {
  MOCK_ACTIVITIES,
  MOCK_TOUR_SHOWCASE_MOST_BOOKED,
  MOCK_TOUR_SHOWCASE_MUST_DO,
  MOCK_TOUR_SHOWCASE_UNIQUE,
  CITY_IMAGES,
} from '../common/mock-data';

@Injectable()
export class ToursService {
  private readonly logger = new Logger(ToursService.name);

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {}

  private isMockMode(): boolean {
    return this.configService.get<string>('MOCK_MODE') === 'true';
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
    if (this.isMockMode()) {
      return { _mock: true, data: MOCK_ACTIVITIES };
    }

    const isProd = this.configService.get<string>('NODE_ENV') === 'production';
    const apiKey = isProd
      ? this.configService.get<string>('TOURS_API_KEY_PROD')
      : this.configService.get<string>('TOURS_API_KEY_SANDBOX');
    const baseUrl = isProd
      ? 'https://api.viator.com'
      : 'https://api.sandbox.viator.com';

    if (!apiKey) {
      this.logger.warn(`TOURS_API_KEY_${isProd ? 'PROD' : 'SANDBOX'} is not configured — returning mock data`);
      return { _mock: true, data: MOCK_ACTIVITIES };
    }

    try {
      const { data } = await firstValueFrom(
        this.httpService.post(`${baseUrl}/partner/products/search`, body, {
          headers: {
            'exp-api-key': apiKey,
            'Accept': 'application/json;version=2.0',
            'Content-Type': 'application/json',
            'Accept-Currency': 'BRL',
            'Accept-Language': 'pt',
          },
        }),
      );

      const products = data?.products || data?.data?.products || data?.data || [];
      if (!Array.isArray(products) || products.length === 0) {
        this.logger.log('Viator: 0 results, falling back to mock data');
        return { _mock: true, data: MOCK_ACTIVITIES };
      }

      this.logger.log(`Viator: ${products.length} results`);
      return data;
    } catch (error: any) {
      const status = error?.response?.status;
      const errorBody = error?.response?.data;
      this.logger.error(
        `Viator API error: ${error?.message} | HTTP ${status ?? 'N/A'} | body: ${JSON.stringify(errorBody)?.substring(0, 500)}`,
      );
      // Fallback to mock data so the frontend doesn't break
      return { _mock: true, data: MOCK_ACTIVITIES };
    }
  }
}

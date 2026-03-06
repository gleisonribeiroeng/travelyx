import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { MOCK_ATTRACTIONS } from '../common/mock-data';

@Injectable()
export class AttractionsService {
  private readonly logger = new Logger(AttractionsService.name);

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

    try {
      // Use Viator product search with attraction-specific tags
      const viatorBody = {
        filtering: {
          destination: body.filtering?.destination || body.destination,
          tags: body.filtering?.tags || [21910, 21911, 21912],
          // 21910=Tickets & Passes, 21911=Attractions, 21912=Museums
        },
        pagination: body.pagination || { offset: 0, limit: 20 },
        sorting: body.sorting || { sort: 'REVIEW_AVG_RATING_D' },
      };

      const { data } = await firstValueFrom(
        this.httpService.post(
          `${baseUrl}/partner/products/search`,
          viatorBody,
          {
            headers: {
              'exp-api-key': apiKey,
              Accept: 'application/json;version=2.0',
              'Content-Type': 'application/json',
              'Accept-Currency': 'BRL',
              'Accept-Language': 'pt',
            },
          },
        ),
      );

      const products =
        data?.products || data?.data?.products || data?.data || [];
      if (!Array.isArray(products) || products.length === 0) {
        this.logger.log('Viator attractions: 0 results, falling back to mock');
        return { _mock: true, data: MOCK_ATTRACTIONS };
      }

      this.logger.log(`Viator attractions: ${products.length} results`);
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

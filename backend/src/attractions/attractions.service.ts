import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { MOCK_ATTRACTIONS } from '../common/mock-data';

@Injectable()
export class AttractionsService {
  private readonly logger = new Logger(AttractionsService.name);
  private readonly baseUrl = 'https://api.opentripmap.com';

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {}

  private isMockMode(): boolean {
    return this.configService.get<string>('MOCK_MODE') === 'true';
  }

  private getApiKey(): string {
    return this.configService.get<string>('ATTRACTIONS_API_KEY') ?? '';
  }

  async geoname(query: Record<string, string>): Promise<any> {
    if (this.isMockMode()) {
      return { _mock: true, data: MOCK_ATTRACTIONS };
    }

    const { data } = await firstValueFrom(
      this.httpService.get(`${this.baseUrl}/0.1/en/places/geoname`, {
        params: { ...query, apikey: this.getApiKey() },
      }),
    );
    return data;
  }

  async radius(query: Record<string, string>): Promise<any> {
    if (this.isMockMode()) {
      return { _mock: true, data: MOCK_ATTRACTIONS };
    }

    const { data } = await firstValueFrom(
      this.httpService.get(`${this.baseUrl}/0.1/en/places/radius`, {
        params: { ...query, apikey: this.getApiKey() },
      }),
    );
    return data;
  }

  async placeDetails(xid: string): Promise<any> {
    if (this.isMockMode()) {
      const attraction = MOCK_ATTRACTIONS.find((a) => a.id === xid) || MOCK_ATTRACTIONS[0];
      return { _mock: true, data: attraction };
    }

    const { data } = await firstValueFrom(
      this.httpService.get(`${this.baseUrl}/0.1/en/places/xid/${xid}`, {
        params: { apikey: this.getApiKey() },
      }),
    );
    return data;
  }
}

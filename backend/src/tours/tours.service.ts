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
  private readonly baseUrl = 'https://api.viator.com';

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

    const apiKey = this.configService.get<string>('TOURS_API_KEY');
    const { data } = await firstValueFrom(
      this.httpService.post(`${this.baseUrl}/partner/products/search`, body, {
        headers: {
          'X-API-Key': apiKey ?? '',
          'Content-Type': 'application/json',
        },
      }),
    );
    return data;
  }
}

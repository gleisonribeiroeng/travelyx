import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { MOCK_CAR_LOCATIONS, MOCK_CAR_RENTALS } from '../common/mock-data';

@Injectable()
export class CarsService {
  private readonly logger = new Logger(CarsService.name);
  private readonly baseUrl = 'https://priceline-com-provider.p.rapidapi.com';
  private readonly host = 'priceline-com-provider.p.rapidapi.com';

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {}

  private isMockMode(): boolean {
    return this.configService.get<string>('MOCK_MODE') === 'true';
  }

  private getHeaders(): Record<string, string> {
    return {
      'X-RapidAPI-Key': this.configService.get<string>('CAR_RENTAL_API_KEY')!,
      'X-RapidAPI-Host': this.host,
    };
  }

  async autoComplete(query: Record<string, string>): Promise<any> {
    if (this.isMockMode()) {
      const kw = (query['string'] || '').toLowerCase();
      const filtered = MOCK_CAR_LOCATIONS.filter(
        (l) => l.name.toLowerCase().includes(kw) || l.label.toLowerCase().includes(kw),
      );
      return { _mock: true, data: filtered };
    }

    const { data } = await firstValueFrom(
      this.httpService.get(`${this.baseUrl}/v2/cars/autoComplete`, {
        params: query,
        headers: this.getHeaders(),
      }),
    );
    return data;
  }

  async searchCars(query: Record<string, string>): Promise<any> {
    if (this.isMockMode()) {
      return { _mock: true, data: MOCK_CAR_RENTALS };
    }

    const { data } = await firstValueFrom(
      this.httpService.get(`${this.baseUrl}/v2/cars/resultsRequest`, {
        params: query,
        headers: this.getHeaders(),
      }),
    );
    return data;
  }
}

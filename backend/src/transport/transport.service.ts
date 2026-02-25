import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { MOCK_TRANSPORTS } from '../common/mock-data';

@Injectable()
export class TransportService {
  private readonly logger = new Logger(TransportService.name);
  private readonly baseUrl = 'https://api.example.com';

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {}

  private isMockMode(): boolean {
    return this.configService.get<string>('MOCK_MODE') === 'true';
  }

  async searchTransport(query: Record<string, string>): Promise<any> {
    if (this.isMockMode()) {
      return { _mock: true, data: MOCK_TRANSPORTS };
    }

    const apiKey = this.configService.get<string>('TRANSPORT_API_KEY');
    const { data } = await firstValueFrom(
      this.httpService.get(`${this.baseUrl}/api/v1/transport/search`, {
        params: { ...query, currency: query['currency'] ?? 'BRL' },
        headers: { 'X-API-Key': apiKey ?? '' },
      }),
    );
    return data;
  }
}

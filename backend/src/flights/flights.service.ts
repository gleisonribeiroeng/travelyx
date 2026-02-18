import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import {
  MOCK_AIRPORTS,
  MOCK_FLIGHTS,
  MOCK_SHOWCASE_DEALS,
  MOCK_SHOWCASE_POPULAR,
  MOCK_SHOWCASE_RECOMMENDED,
  DESTINATION_IMAGES,
} from '../common/mock-data';

@Injectable()
export class FlightsService {
  private readonly logger = new Logger(FlightsService.name);
  private readonly baseUrl = 'https://api.amadeus.com';

  private cachedToken: string | null = null;
  private tokenExpiresAt = 0;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {}

  private isMockMode(): boolean {
    return this.configService.get<string>('MOCK_MODE') === 'true';
  }

  private async getAccessToken(): Promise<string> {
    if (this.cachedToken && this.tokenExpiresAt > Date.now()) {
      return this.cachedToken;
    }

    const clientId = this.configService.get<string>('AMADEUS_API_KEY');
    const clientSecret = this.configService.get<string>('AMADEUS_API_SECRET');

    const body = new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: clientId!,
      client_secret: clientSecret!,
    }).toString();

    this.logger.log('Requesting new Amadeus OAuth2 token...');

    const { data } = await firstValueFrom(
      this.httpService.post<{ access_token: string; expires_in: number }>(
        `${this.baseUrl}/v1/security/oauth2/token`,
        body,
        { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } },
      ),
    );

    this.cachedToken = data.access_token;
    this.tokenExpiresAt = Date.now() + (data.expires_in - 120) * 1000;

    this.logger.log('Amadeus token cached successfully');
    return data.access_token;
  }

  async searchFlights(query: Record<string, string>): Promise<any> {
    if (this.isMockMode()) {
      const origin = query['originLocationCode'];
      const dest = query['destinationLocationCode'];
      const filtered = MOCK_FLIGHTS.filter(
        (f) => f.origin === origin && f.destination === dest,
      );
      return { _mock: true, data: filtered.length > 0 ? filtered : MOCK_FLIGHTS };
    }

    const token = await this.getAccessToken();
    const { data } = await firstValueFrom(
      this.httpService.get(`${this.baseUrl}/v2/shopping/flight-offers`, {
        params: query,
        headers: { Authorization: `Bearer ${token}` },
      }),
    );
    return data;
  }

  getShowcase() {
    // In the future, this will call a real provider API with sorting/filtering.
    // For now, returns pre-curated mock data for each showcase section.
    const enrich = (flights: any[]) =>
      flights.map((f) => ({
        ...f,
        destinationImage: DESTINATION_IMAGES[f.destination]?.url ?? null,
      }));

    return {
      deals: enrich(MOCK_SHOWCASE_DEALS),
      popular: enrich(MOCK_SHOWCASE_POPULAR),
      recommended: enrich(MOCK_SHOWCASE_RECOMMENDED),
    };
  }

  async searchAirports(query: Record<string, string>): Promise<any> {
    if (this.isMockMode()) {
      const kw = (query['keyword'] || '').toLowerCase();
      const filtered = MOCK_AIRPORTS.filter(
        (a) =>
          a.name.toLowerCase().includes(kw) ||
          a.cityName.toLowerCase().includes(kw) ||
          a.iataCode.toLowerCase().includes(kw),
      );
      return { _mock: true, data: filtered };
    }

    const token = await this.getAccessToken();
    const { data } = await firstValueFrom(
      this.httpService.get(`${this.baseUrl}/v1/reference-data/locations`, {
        params: query,
        headers: { Authorization: `Bearer ${token}` },
      }),
    );
    return data;
  }
}

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

  /**
   * Build a QEEQ affiliate deep link via Travelpayouts tp.media redirect.
   * The link takes the user to QEEQ's car rental search with pre-filled params.
   */
  private buildQeeqAffiliateLink(
    pickupLocation?: string,
    pickupDate?: string,
    dropoffDate?: string,
  ): string {
    const marker = this.configService.get<string>('TRAVELPAYOUTS_MARKER') || '';

    // Build QEEQ search URL with available params
    const qeeqParams = new URLSearchParams();
    if (pickupLocation) qeeqParams.set('pick_up_location', pickupLocation);
    if (pickupDate) qeeqParams.set('pick_up_date', pickupDate);
    if (dropoffDate) qeeqParams.set('drop_off_date', dropoffDate);

    const qeeqUrl = qeeqParams.toString()
      ? `https://www.qeeq.com/car-rental?${qeeqParams.toString()}`
      : 'https://www.qeeq.com/car-rental';

    // Wrap in Travelpayouts affiliate redirect (QEEQ program)
    return `https://tp.media/r?marker=${marker}&p=5765&u=${encodeURIComponent(qeeqUrl)}`;
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
      // Enrich mock results with QEEQ affiliate links
      const enriched = MOCK_CAR_RENTALS.map((car) => ({
        ...car,
        link: {
          url: this.buildQeeqAffiliateLink(
            car.pickUpLocation,
            car.pickUpAt?.split('T')[0],
            car.dropOffAt?.split('T')[0],
          ),
          provider: 'QEEQ',
        },
      }));
      return { _mock: true, data: enriched };
    }

    try {
      const { data } = await firstValueFrom(
        this.httpService.get(`${this.baseUrl}/v2/cars/resultsRequest`, {
          params: query,
          headers: this.getHeaders(),
        }),
      );

      // If Priceline returns raw data, pass it through but
      // the frontend mapper will use QEEQ affiliate links
      if (data) {
        data._qeeqAffiliateBase = this.buildQeeqAffiliateLink(
          query['pickup_city_id'],
          query['pickup_date'],
          query['dropoff_date'],
        );
      }

      return data;
    } catch (error) {
      this.logger.error('Priceline API error', error?.message || error);
      return { _mock: true, data: [] };
    }
  }
}

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
   */
  private buildQeeqAffiliateLink(
    pickupLocation?: string,
    pickupDate?: string,
    dropoffDate?: string,
  ): string {
    const marker =
      this.configService.get<string>('TRAVELPAYOUTS_MARKER') || '';

    const qeeqParams = new URLSearchParams();
    if (pickupLocation) qeeqParams.set('pick_up_location', pickupLocation);
    if (pickupDate) qeeqParams.set('pick_up_date', pickupDate);
    if (dropoffDate) qeeqParams.set('drop_off_date', dropoffDate);

    const qeeqUrl = qeeqParams.toString()
      ? `https://www.qeeq.com/car-rental?${qeeqParams.toString()}`
      : 'https://www.qeeq.com/car-rental';

    return `https://tp.media/r?marker=${marker}&p=5765&u=${encodeURIComponent(qeeqUrl)}`;
  }

  private enrichWithQeeqLinks(
    cars: any[],
    pickupLocation?: string,
    pickupDate?: string,
    dropoffDate?: string,
  ): any[] {
    return cars.map((car) => ({
      ...car,
      link: {
        url: this.buildQeeqAffiliateLink(
          pickupLocation || car.pickUpLocation,
          pickupDate || car.pickUpAt?.split('T')[0],
          dropoffDate || car.dropOffAt?.split('T')[0],
        ),
        provider: 'QEEQ',
      },
    }));
  }

  async autoComplete(query: Record<string, string>): Promise<any> {
    if (this.isMockMode()) {
      const kw = (query['string'] || '').toLowerCase();
      const filtered = MOCK_CAR_LOCATIONS.filter(
        (l) =>
          l.name.toLowerCase().includes(kw) ||
          l.label.toLowerCase().includes(kw),
      );
      return { _mock: true, data: filtered };
    }

    try {
      const { data } = await firstValueFrom(
        this.httpService.get(`${this.baseUrl}/v2/cars/autoComplete`, {
          params: query,
          headers: this.getHeaders(),
        }),
      );
      return data;
    } catch (error: any) {
      this.logger.error(`Car autoComplete error: ${error?.message}`);
      const kw = (query['string'] || '').toLowerCase();
      const filtered = MOCK_CAR_LOCATIONS.filter(
        (l) =>
          l.name.toLowerCase().includes(kw) ||
          l.label.toLowerCase().includes(kw),
      );
      return { _mock: true, data: filtered };
    }
  }

  async searchCars(query: Record<string, string>): Promise<any> {
    const pickupLocation = query['pickup_city_id'];
    const pickupDate = query['pickup_date'];
    const dropoffDate = query['dropoff_date'];

    if (this.isMockMode()) {
      return {
        _mock: true,
        data: this.enrichWithQeeqLinks(
          MOCK_CAR_RENTALS,
          pickupLocation,
          pickupDate,
          dropoffDate,
        ),
      };
    }

    try {
      const { data } = await firstValueFrom(
        this.httpService.get(`${this.baseUrl}/v2/cars/resultsRequest`, {
          params: query,
          headers: this.getHeaders(),
        }),
      );

      const resultsList =
        data?.getCarResultsRequest?.results?.results_list || {};
      const cars = Object.values(resultsList);

      if (cars.length === 0) {
        this.logger.log(
          'Priceline: 0 car results, falling back to mock with QEEQ links',
        );
        return {
          _mock: true,
          data: this.enrichWithQeeqLinks(
            MOCK_CAR_RENTALS,
            pickupLocation,
            pickupDate,
            dropoffDate,
          ),
        };
      }

      this.logger.log(`Priceline: ${cars.length} car results`);
      // Attach QEEQ affiliate base link for the frontend mapper
      data._qeeqAffiliateBase = this.buildQeeqAffiliateLink(
        pickupLocation,
        pickupDate,
        dropoffDate,
      );
      return data;
    } catch (error: any) {
      this.logger.error(`Priceline car search error: ${error?.message}`);
      return {
        _mock: true,
        data: this.enrichWithQeeqLinks(
          MOCK_CAR_RENTALS,
          pickupLocation,
          pickupDate,
          dropoffDate,
        ),
      };
    }
  }
}

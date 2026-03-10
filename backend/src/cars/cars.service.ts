import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class CarsService {
  private readonly logger = new Logger(CarsService.name);
  private readonly baseUrl = 'https://priceline-com-provider.p.rapidapi.com';
  private readonly host = 'priceline-com-provider.p.rapidapi.com';

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {}

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

  async autoComplete(query: Record<string, string>): Promise<any> {
    try {
      const { data } = await firstValueFrom(
        this.httpService.get(`${this.baseUrl}/v2/cars/autoComplete`, {
          params: query,
          headers: this.getHeaders(),
        }),
      );

      const cityData =
        data?.getCarAutoComplete?.results?.city_data || {};
      const cities = Object.values(cityData);

      if (cities.length === 0) {
        this.logger.warn(`Priceline autoComplete: no results for "${query['string']}"`);
        return { data: [] };
      }

      const mapped = cities.map((city: any) => ({
        id: city.ppn_car_cityid || '',
        name: city.city || '',
        label: city.city
          ? `${city.city}, ${city.state_code ? city.state_code + ', ' : ''}${city.country || city.country_code || ''}`
          : '',
        cityId: city.ppn_car_cityid || '',
        latitude: parseFloat(city.latitude) || 0,
        longitude: parseFloat(city.longitude) || 0,
      }));

      this.logger.log(`Priceline autoComplete: ${mapped.length} results for "${query['string']}"`);
      return { data: mapped };
    } catch (error: any) {
      this.logger.error(`Car autoComplete error: ${error?.message}`);
      throw error;
    }
  }

  async searchCars(query: Record<string, string>): Promise<any> {
    const pickupLocation = query['pickup_city_id'];
    const pickupDate = query['pickup_date'];
    const dropoffDate = query['dropoff_date'];

    try {
      const { data } = await firstValueFrom(
        this.httpService.get(`${this.baseUrl}/v2/cars/resultsRequest`, {
          params: query,
          headers: this.getHeaders(),
        }),
      );

      const resultsList =
        data?.getCarResultsRequest?.results?.results_list || {};
      const rawCars = Object.values(resultsList) as any[];

      if (rawCars.length === 0) {
        const errorMsg = data?.getCarResultsRequest?.error?.status || '';
        this.logger.warn(`Priceline car search: 0 results. ${errorMsg}`);
        return { data: [] };
      }

      const qeeqLink = this.buildQeeqAffiliateLink(
        pickupLocation,
        pickupDate,
        dropoffDate,
      );

      const mapped = rawCars
        .map((raw: any, index: number) => this.mapPricelineCar(raw, index, query, qeeqLink))
        .filter(Boolean);

      this.logger.log(`Priceline car search: ${mapped.length} results`);
      return { data: mapped };
    } catch (error: any) {
      this.logger.error(`Priceline car search error: ${error?.message}`);
      throw error;
    }
  }

  /**
   * Map a Priceline car result to our canonical CarRental model (server-side mapping).
   */
  private mapPricelineCar(
    raw: any,
    index: number,
    query: Record<string, string>,
    qeeqLink: string,
  ): any {
    const car = raw.car || {};
    const price = raw.price_details?.display || {};
    const partner = raw.partner || {};
    const pickup = raw.pickup || {};
    const dropoff = raw.dropoff || {};

    const totalPrice = parseFloat(price.total_price || price.price || '0');
    const currency = price.currency || 'USD';

    const pickupDate = query['pickup_date'] || '';
    const dropoffDate = query['dropoff_date'] || '';
    const pickupTime = query['pickup_time'] || '10:00';
    const dropoffTime = query['dropoff_time'] || '10:00';

    return {
      id: `pcl-${Date.now()}-${index}`,
      source: 'carRental',
      addedToItinerary: false,
      vehicleType: car.description || car.type_name || car.example || 'Unknown',
      pickUpLocation: pickup.location || '',
      dropOffLocation: dropoff.location || pickup.location || '',
      pickUpAt: this.toIsoDateTime(pickupDate, pickupTime),
      dropOffAt: this.toIsoDateTime(dropoffDate, dropoffTime),
      price: {
        total: Math.round(totalPrice * 100) / 100,
        currency,
      },
      images: [car.imageURL, car.images?.SIZE335X180].filter(
        (u: any): u is string => !!u,
      ),
      link: {
        url: qeeqLink,
        provider: 'QEEQ',
      },
      partner: {
        name: partner.name || 'Priceline',
        logo: partner.logo || null,
      },
      details: {
        passengers: car.passengers || null,
        doors: car.doors || null,
        bags: car.bags || null,
        transmission: car.transmission || null,
        airConditioning: car.air_conditioning === 'true',
        freeCancellation: car.free_cancellation === true,
        mileage: car.mileage === true ? 'Unlimited' : null,
        rentalDays: raw.num_rental_days || null,
      },
    };
  }

  /**
   * Convert MM/DD/YYYY + HH:MM to ISO 8601 datetime string.
   */
  private toIsoDateTime(date: string, time: string): string {
    const parts = date.split('/');
    if (parts.length !== 3) return '';
    const [month, day, year] = parts;
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}T${time}:00`;
  }
}

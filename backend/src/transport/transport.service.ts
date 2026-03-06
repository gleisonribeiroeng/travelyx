import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MOCK_TRANSPORTS } from '../common/mock-data';

@Injectable()
export class TransportService {
  private readonly logger = new Logger(TransportService.name);

  constructor(private readonly configService: ConfigService) {}

  private isMockMode(): boolean {
    return this.configService.get<string>('MOCK_MODE') === 'true';
  }

  /**
   * Build a Kiwi.com affiliate deep link for transport via Travelpayouts.
   * Kiwi supports bus, train and ferry searches.
   */
  private buildKiwiTransportLink(
    origin: string,
    destination: string,
    departureDate?: string,
  ): string {
    const marker =
      this.configService.get<string>('TRAVELPAYOUTS_MARKER') || '';

    const kiwiParams = new URLSearchParams();
    kiwiParams.set('from', origin);
    kiwiParams.set('to', destination);
    if (departureDate) kiwiParams.set('departure', departureDate);
    kiwiParams.set('transport', 'bus,train,ferry');
    kiwiParams.set('currency', 'BRL');
    kiwiParams.set('lang', 'pt');

    const kiwiUrl = `https://www.kiwi.com/deep?${kiwiParams.toString()}`;

    return `https://c111.travelpayouts.com/click?shmarker=${marker}&promo_id=3791&source_type=customlink&type=click&custom_url=${encodeURIComponent(kiwiUrl)}`;
  }

  async searchTransport(query: Record<string, string>): Promise<any> {
    const origin = query['origin'] || '';
    const destination = query['destination'] || '';
    const departureDate = query['date'] || '';

    // Enrich mock data with Kiwi.com affiliate links
    const enriched = MOCK_TRANSPORTS.map((t) => ({
      ...t,
      origin: origin || t.origin,
      destination: destination || t.destination,
      link: {
        url: this.buildKiwiTransportLink(
          origin || t.origin,
          destination || t.destination,
          departureDate || t.departureAt?.split('T')[0],
        ),
        provider: 'Kiwi.com',
      },
    }));

    this.logger.log(
      `Transport search: ${origin} → ${destination} (${departureDate}) — returning mock + Kiwi links`,
    );

    return { _mock: true, data: enriched };
  }
}

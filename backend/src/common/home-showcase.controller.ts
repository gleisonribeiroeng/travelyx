import { Controller, Get } from '@nestjs/common';
import {
  CITY_IMAGES,
  MOCK_SHOWCASE_DEALS,
  MOCK_HOTEL_SHOWCASE_BEST_PRICES,
  MOCK_HOTEL_SHOWCASE_TOP_RATED,
  MOCK_TOUR_SHOWCASE_MOST_BOOKED,
  DESTINATION_IMAGES,
} from './mock-data';

const FEATURED_DESTINATIONS = [
  { city: 'Rio de Janeiro', tag: 'Praia', flightFrom: 189 },
  { city: 'Fernando de Noronha', tag: 'Aventura', flightFrom: 890 },
  { city: 'Lisboa', tag: 'Internacional', flightFrom: 2490 },
];

@Controller('home')
export class HomeShowcaseController {
  @Get('showcase')
  getShowcase() {
    const destinations = FEATURED_DESTINATIONS.map((d) => ({
      ...d,
      image: CITY_IMAGES[d.city]?.url ?? null,
    }));

    const enrichFlights = (flights: any[]) =>
      flights.map((f) => ({
        ...f,
        destinationImage: DESTINATION_IMAGES[f.destination]?.url ?? null,
      }));

    const enrichHotels = (hotels: any[]) =>
      hotels.map((h) => ({
        ...h,
        cityImage: CITY_IMAGES[h.city]?.url ?? null,
      }));

    const enrichTours = (tours: any[]) =>
      tours.map((t) => ({
        ...t,
        cityImage: CITY_IMAGES[t.city]?.url ?? null,
      }));

    return {
      destinations,
      dealFlights: enrichFlights(MOCK_SHOWCASE_DEALS.slice(0, 3)),
      dealHotels: enrichHotels(MOCK_HOTEL_SHOWCASE_BEST_PRICES.slice(0, 3)),
      topHotels: enrichHotels(MOCK_HOTEL_SHOWCASE_TOP_RATED.slice(0, 3)),
      popularTours: enrichTours(MOCK_TOUR_SHOWCASE_MOST_BOOKED.slice(0, 3)),
      stats: {
        destinations: 45,
        tripsPlanned: 1200,
        reviews: 890,
      },
    };
  }
}

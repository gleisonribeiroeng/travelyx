/**
 * Generic contract for all feature mappers that transform external API
 * responses into internal canonical domain models.
 *
 * Usage example:
 *   @Injectable({ providedIn: 'root' })
 *   export class FlightsMapper implements Mapper<AmadeusFlightOffersResponse, FlightOffer[]> {
 *     mapResponse(raw: AmadeusFlightOffersResponse): FlightOffer[] { ... }
 *   }
 */
export interface Mapper<TExternal, TInternal> {
  /**
   * Transform a raw external API response into a typed internal domain model.
   * @param raw The external response shape as returned by the API
   * @returns The normalised internal representation
   */
  mapResponse(raw: TExternal): TInternal;
}

/**
 * Convenience function-type alias for simple one-off mappings that do not
 * warrant a full class implementation.
 *
 * Usage example:
 *   const mapAirport: MapperFn<AirportDto, Airport> = (dto) => ({ ... });
 */
export type MapperFn<TExternal, TInternal> = (raw: TExternal) => TInternal;

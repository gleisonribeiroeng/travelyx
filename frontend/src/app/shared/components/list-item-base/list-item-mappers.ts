import {
  ListItemConfig,
  ListItemTag,
  ListItemAction,
  ListItemInfoLine,
} from './list-item-base.model';
import {
  Stay,
  Flight,
  CarRental,
  Transport,
  Activity,
  Attraction,
  DocumentItem,
  Trip,
  TripStatus,
} from '../../../core/models/trip.models';

// ── Helpers ──

function formatDuration(minutes: number | null): string {
  if (!minutes) return '';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}min`;
  return m > 0 ? `${h}h ${m}min` : `${h}h`;
}

function formatDateTime(iso: string): string {
  if (!iso) return '';
  const date = iso.split('T')[0];
  const time = iso.split('T')[1]?.substring(0, 5);
  return time ? `${date} ${time}` : date;
}

function addAction(isAdded: boolean, isLoading?: boolean): ListItemAction {
  if (isAdded) return { type: 'added', label: 'Adicionado', icon: 'check' };
  if (isLoading) return { type: 'loading', label: '' };
  return { type: 'add', label: 'Adicionar', icon: 'add' };
}

function viewDetailAction(): ListItemAction {
  return { type: 'view', label: 'Ver detalhes' };
}

// ── Stay (Hotel) ──

export type HotelTagType = 'cheapest' | 'bestRated' | 'bestValue';

export function stayToListItem(
  hotel: Stay,
  opts: { isAdded: boolean; tag?: HotelTagType | null; isLoading?: boolean },
): ListItemConfig {
  const tags: ListItemTag[] = [];
  if (opts.tag === 'bestValue') tags.push({ label: 'Melhor custo-benefício', variant: 'value' });
  if (opts.tag === 'cheapest') tags.push({ label: 'Melhor preço', variant: 'cheap' });
  if (opts.tag === 'bestRated') tags.push({ label: 'Mais bem avaliado', variant: 'rated' });

  const images = hotel.images?.length ? hotel.images : hotel.photoUrl ? [hotel.photoUrl] : [];

  return {
    id: hotel.id,
    images,
    placeholderIcon: 'hotel',
    title: hotel.name,
    infoLines: [
      { icon: 'location_on', text: hotel.address },
      { icon: 'date_range', text: `${hotel.checkIn} — ${hotel.checkOut}` },
    ],
    rating: { value: hotel.rating, reviewCount: hotel.reviewCount },
    price: {
      amount: hotel.pricePerNight.total,
      currency: hotel.pricePerNight.currency,
      label: '/noite',
    },
    primaryAction: addAction(opts.isAdded, opts.isLoading),
    secondaryAction: viewDetailAction(),
    tags,
    isAdded: opts.isAdded,
  };
}

// ── Flight ──

export type FlightTagType = 'cheapest' | 'fastest' | 'bestValue';

export function flightToListItem(
  flight: Flight,
  opts: { isAdded: boolean; tag?: FlightTagType | null; isLoading?: boolean },
): ListItemConfig {
  const tags: ListItemTag[] = [];
  if (opts.tag === 'bestValue') tags.push({ label: 'Melhor custo-benefício', variant: 'value' });
  if (opts.tag === 'cheapest') tags.push({ label: 'Mais barato', variant: 'cheap' });
  if (opts.tag === 'fastest') tags.push({ label: 'Mais rápido', variant: 'fast' });

  const depTime = flight.departureAt?.split('T')[1]?.substring(0, 5) ?? '';
  const arrTime = flight.arrivalAt?.split('T')[1]?.substring(0, 5) ?? '';
  const stopsText = flight.stops === 0 ? 'Direto' : `${flight.stops} parada${flight.stops > 1 ? 's' : ''}`;
  const duration = formatDuration(flight.durationMinutes);

  let scheduleText: string;
  if (depTime && arrTime && duration) {
    scheduleText = `${depTime} — ${arrTime} (${duration})`;
  } else if (depTime && arrTime) {
    scheduleText = `${depTime} — ${arrTime}`;
  } else if (depTime && duration) {
    scheduleText = `${depTime} (${duration})`;
  } else if (depTime) {
    scheduleText = `Partida: ${depTime}`;
  } else {
    scheduleText = formatDateTime(flight.departureAt) || 'Ver horários no provedor';
  }

  return {
    id: flight.id,
    images: flight.airlineLogo ? [flight.airlineLogo] : [],
    logoImage: !!flight.airlineLogo,
    placeholderIcon: 'flight',
    title: `${flight.origin} → ${flight.destination}`,
    infoLines: [
      { icon: 'airlines', text: `${flight.airline} ${flight.flightNumber}` },
      { icon: 'schedule', text: scheduleText },
      { icon: 'connecting_airports', text: stopsText },
    ],
    price: {
      amount: flight.price.total,
      currency: flight.price.currency,
    },
    primaryAction: addAction(opts.isAdded, opts.isLoading),
    secondaryAction: viewDetailAction(),
    tags,
    isAdded: opts.isAdded,
  };
}

// ── Car Rental ──

export function carToListItem(
  car: CarRental,
  opts: { isAdded: boolean; isLoading?: boolean },
): ListItemConfig {
  const images = car.images?.length ? car.images : [];

  return {
    id: car.id,
    images,
    placeholderIcon: 'directions_car',
    title: car.vehicleType,
    infoLines: [
      { icon: 'location_on', text: car.pickUpLocation },
      { icon: 'login', text: `Retirada: ${formatDateTime(car.pickUpAt)}` },
      { icon: 'logout', text: `Devolução: ${formatDateTime(car.dropOffAt)}` },
    ],
    price: {
      amount: car.price.total,
      currency: car.price.currency,
      label: '/total',
    },
    primaryAction: addAction(opts.isAdded, opts.isLoading),
    secondaryAction: viewDetailAction(),
    isAdded: opts.isAdded,
  };
}

// ── Activity (Tour) ──

export type TourTagType = 'cheapest' | 'bestRated' | 'bestValue';

export function activityToListItem(
  tour: Activity,
  opts: { isAdded: boolean; tag?: TourTagType | null; isLoading?: boolean },
): ListItemConfig {
  const tags: ListItemTag[] = [];
  if (opts.tag === 'bestValue') tags.push({ label: 'Melhor custo-benefício', variant: 'value' });
  if (opts.tag === 'cheapest') tags.push({ label: 'Melhor preço', variant: 'cheap' });
  if (opts.tag === 'bestRated') tags.push({ label: 'Mais bem avaliado', variant: 'rated' });

  const images = tour.images?.length ? tour.images : [];

  const infoLines: ListItemInfoLine[] = [
    { icon: 'location_on', text: tour.city },
  ];
  if (tour.durationMinutes) {
    infoLines.push({ icon: 'schedule', text: formatDuration(tour.durationMinutes) });
  }

  return {
    id: tour.id,
    images,
    placeholderIcon: 'tour',
    title: tour.name,
    infoLines,
    rating: { value: tour.rating, reviewCount: tour.reviewCount },
    description: tour.description?.length > 120
      ? tour.description.substring(0, 120) + '...'
      : tour.description,
    price: {
      amount: tour.price.total,
      currency: tour.price.currency,
      label: '/pessoa',
    },
    primaryAction: addAction(opts.isAdded, opts.isLoading),
    secondaryAction: viewDetailAction(),
    tags,
    isAdded: opts.isAdded,
  };
}

// ── Attraction ──

export function attractionToListItem(
  attr: Attraction,
  opts: { isAdded: boolean; isLoading?: boolean },
): ListItemConfig {
  const images = attr.images?.length ? attr.images : [];

  const infoLines: ListItemInfoLine[] = [];
  if (attr.category) {
    infoLines.push({ text: attr.category, chip: true });
  }
  infoLines.push({ icon: 'location_on', text: attr.city });

  return {
    id: attr.id,
    images,
    placeholderIcon: 'museum',
    title: attr.name,
    infoLines,
    description: attr.description?.length > 120
      ? attr.description.substring(0, 120) + '...'
      : attr.description,
    primaryAction: addAction(opts.isAdded, opts.isLoading),
    secondaryAction: viewDetailAction(),
    isAdded: opts.isAdded,
  };
}

// ── Transport ──

const TRANSPORT_ICONS: Record<string, string> = {
  bus: 'directions_bus',
  train: 'train',
  ferry: 'directions_boat',
  other: 'commute',
};

export function transportToListItem(
  t: Transport,
  opts: { isAdded: boolean; isLoading?: boolean },
): ListItemConfig {
  const modeName = t.mode.charAt(0).toUpperCase() + t.mode.slice(1);

  return {
    id: t.id,
    placeholderIcon: TRANSPORT_ICONS[t.mode] || 'commute',
    title: `${t.origin} → ${t.destination}`,
    infoLines: [
      { icon: TRANSPORT_ICONS[t.mode] || 'commute', text: modeName },
      { icon: 'schedule', text: formatDuration(t.durationMinutes) },
      { icon: 'login', text: `Partida: ${formatDateTime(t.departureAt)}` },
      { icon: 'logout', text: `Chegada: ${formatDateTime(t.arrivalAt)}` },
    ],
    price: {
      amount: t.price.total,
      currency: t.price.currency,
      label: '/pessoa',
    },
    primaryAction: addAction(opts.isAdded, opts.isLoading),
    secondaryAction: viewDetailAction(),
    isAdded: opts.isAdded,
  };
}

// ── Document ──

const DOC_ICONS: Record<string, string> = {
  passport: 'badge',
  visa: 'verified',
  'boarding-pass': 'flight',
  'hotel-confirmation': 'hotel',
  'car-confirmation': 'directions_car',
  insurance: 'health_and_safety',
  ticket: 'confirmation_number',
  other: 'description',
};

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function documentToListItem(doc: DocumentItem): ListItemConfig {
  const infoLines: ListItemInfoLine[] = [
    { text: doc.category.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()), chip: true },
    { icon: 'insert_drive_file', text: `${doc.fileName} · ${formatFileSize(doc.sizeBytes)}` },
  ];
  if (doc.expiresAt) {
    infoLines.push({ icon: 'event', text: `Expira: ${doc.expiresAt}` });
  }

  return {
    id: doc.id,
    placeholderIcon: DOC_ICONS[doc.category] || 'description',
    title: doc.label,
    infoLines,
    primaryAction: { type: 'remove', label: 'Excluir', icon: 'delete' },
  };
}

// ── Trip ──

const TRIP_STATUS_TAGS: Record<TripStatus, ListItemTag> = {
  planejamento: { label: 'Planejamento', variant: 'category' },
  ativa: { label: 'Ativa', variant: 'value' },
  concluida: { label: 'Concluída', variant: 'cheap' },
};

export function tripToListItem(trip: Trip): ListItemConfig {
  return {
    id: trip.id,
    images: trip.coverImage ? [trip.coverImage] : undefined,
    placeholderIcon: 'luggage',
    title: trip.name || 'Viagem sem nome',
    infoLines: [
      { icon: 'location_on', text: trip.destination || 'Destino não definido' },
      { icon: 'date_range', text: trip.dates.start && trip.dates.end
          ? `${trip.dates.start} — ${trip.dates.end}`
          : '—' },
    ],
    tags: [TRIP_STATUS_TAGS[trip.status]],
    iconActions: [
      { id: 'edit', icon: 'edit', tooltip: 'Editar viagem' },
      { id: 'cover', icon: 'add_photo_alternate', tooltip: 'Imagem de capa' },
    ],
    primaryAction: { type: 'view', label: 'Abrir', icon: 'open_in_new' },
    secondaryAction: { type: 'remove', label: 'Excluir', icon: 'delete' },
  };
}

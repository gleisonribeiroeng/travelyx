import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';

export interface DayWeather {
  date: string;
  tempMin: number;
  tempMax: number;
  code: number; // WMO weather code
  icon: string; // Material icon name
  label: string;
}

const WMO_ICONS: Record<number, { icon: string; label: string }> = {
  0: { icon: 'wb_sunny', label: 'Limpo' },
  1: { icon: 'wb_sunny', label: 'Limpo' },
  2: { icon: 'cloud', label: 'Parcial nublado' },
  3: { icon: 'cloud', label: 'Nublado' },
  45: { icon: 'foggy', label: 'Neblina' },
  48: { icon: 'foggy', label: 'Neblina' },
  51: { icon: 'grain', label: 'Garoa leve' },
  53: { icon: 'grain', label: 'Garoa' },
  55: { icon: 'grain', label: 'Garoa forte' },
  61: { icon: 'water_drop', label: 'Chuva leve' },
  63: { icon: 'water_drop', label: 'Chuva' },
  65: { icon: 'water_drop', label: 'Chuva forte' },
  71: { icon: 'ac_unit', label: 'Neve leve' },
  73: { icon: 'ac_unit', label: 'Neve' },
  75: { icon: 'ac_unit', label: 'Neve forte' },
  80: { icon: 'thunderstorm', label: 'Pancadas' },
  81: { icon: 'thunderstorm', label: 'Pancadas' },
  82: { icon: 'thunderstorm', label: 'Pancadas fortes' },
  95: { icon: 'thunderstorm', label: 'Tempestade' },
  96: { icon: 'thunderstorm', label: 'Tempestade + granizo' },
  99: { icon: 'thunderstorm', label: 'Tempestade + granizo' },
};

function getWeatherInfo(code: number): { icon: string; label: string } {
  return WMO_ICONS[code] ?? { icon: 'cloud', label: 'Nublado' };
}

@Injectable({ providedIn: 'root' })
export class WeatherService {
  private readonly http = inject(HttpClient);
  readonly forecast = signal<DayWeather[]>([]);
  readonly loading = signal(false);
  private lastKey = '';

  /**
   * Fetch weather forecast from Open-Meteo (free, no API key).
   * Requires destination coordinates.
   */
  fetchForecast(lat: number, lng: number, startDate: string, endDate: string): void {
    const key = `${lat},${lng},${startDate},${endDate}`;
    if (key === this.lastKey && this.forecast().length > 0) return;
    this.lastKey = key;

    // Open-Meteo only forecasts ~16 days ahead; for dates further out, skip silently
    const today = new Date();
    const start = new Date(startDate + 'T00:00:00');
    const diffDays = Math.ceil((start.getTime() - today.getTime()) / 86400000);
    if (diffDays > 16) {
      this.forecast.set([]);
      return;
    }

    this.loading.set(true);
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&daily=temperature_2m_max,temperature_2m_min,weather_code&start_date=${startDate}&end_date=${endDate}&timezone=auto`;

    this.http.get<any>(url).subscribe({
      next: (data) => {
        const days: DayWeather[] = [];
        const daily = data?.daily;
        if (daily?.time) {
          for (let i = 0; i < daily.time.length; i++) {
            const info = getWeatherInfo(daily.weather_code?.[i] ?? 3);
            days.push({
              date: daily.time[i],
              tempMin: Math.round(daily.temperature_2m_min?.[i] ?? 0),
              tempMax: Math.round(daily.temperature_2m_max?.[i] ?? 0),
              code: daily.weather_code?.[i] ?? 3,
              icon: info.icon,
              label: info.label,
            });
          }
        }
        this.forecast.set(days);
        this.loading.set(false);
      },
      error: () => {
        this.forecast.set([]);
        this.loading.set(false);
      },
    });
  }

  getForDate(date: string): DayWeather | null {
    return this.forecast().find(d => d.date === date) ?? null;
  }
}

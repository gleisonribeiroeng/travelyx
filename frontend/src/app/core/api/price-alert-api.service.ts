import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface PriceAlert {
  id: string;
  type: 'flight' | 'hotel';
  label: string;
  searchParams: string;
  targetPrice: number;
  currentPrice: number;
  lowestPrice: number | null;
  currency: string;
  active: boolean;
  triggeredAt: string | null;
  lastCheckedAt: string | null;
  createdAt: string;
}

export interface CreatePriceAlertDto {
  type: 'flight' | 'hotel';
  label: string;
  searchParams: Record<string, any>;
  currentPrice: number;
  targetPrice: number;
  currency: string;
}

@Injectable({ providedIn: 'root' })
export class PriceAlertApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiBaseUrl}/api/price-alerts`;

  getAlerts(): Observable<PriceAlert[]> {
    return this.http.get<PriceAlert[]>(this.baseUrl);
  }

  createAlert(data: CreatePriceAlertDto): Observable<PriceAlert> {
    return this.http.post<PriceAlert>(this.baseUrl, data);
  }

  deleteAlert(id: string): Observable<any> {
    return this.http.delete(`${this.baseUrl}/${id}`);
  }

  toggleAlert(id: string): Observable<PriceAlert> {
    return this.http.patch<PriceAlert>(`${this.baseUrl}/${id}/toggle`, {});
  }

  getHistory(id: string): Observable<PriceAlertHistory> {
    return this.http.get<PriceAlertHistory>(`${this.baseUrl}/${id}/history`);
  }
}

export interface PriceHistoryPoint {
  price: number;
  recordedAt: string;
}

export interface PriceAlertHistory {
  alert: {
    id: string;
    label: string;
    type: string;
    currentPrice: number;
    lowestPrice: number | null;
    targetPrice: number;
    currency: string;
    createdAt: string;
  };
  history: PriceHistoryPoint[];
}

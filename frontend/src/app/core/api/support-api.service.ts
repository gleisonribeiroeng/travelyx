import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { BaseApiService } from './base-api.service';

@Injectable({ providedIn: 'root' })
export class SupportApiService extends BaseApiService {
  constructor() {
    super('support');
  }

  sendMessage(message: string, page?: string): Observable<{ success: boolean; message: any }> {
    return this.post<{ success: boolean; message: any }>('/messages', { message, page });
  }

  getHistory(): Observable<{ messages: any[] }> {
    return this.get<{ messages: any[] }>('/messages');
  }
}

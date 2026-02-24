import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AttachmentMeta } from '../models/trip.models';

export interface AttachmentData extends AttachmentMeta {
  data: string; // base64
}

@Injectable({ providedIn: 'root' })
export class AttachmentService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiBaseUrl;

  upload(tripId: string, itemId: string, file: File): Observable<AttachmentMeta> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<AttachmentMeta>(
      `${this.baseUrl}/api/trips/${tripId}/items/${itemId}/attachment`,
      formData
    );
  }

  get(tripId: string, itemId: string): Observable<AttachmentData> {
    return this.http.get<AttachmentData>(
      `${this.baseUrl}/api/trips/${tripId}/items/${itemId}/attachment`
    );
  }

  remove(tripId: string, itemId: string): Observable<{ deleted: boolean }> {
    return this.http.delete<{ deleted: boolean }>(
      `${this.baseUrl}/api/trips/${tripId}/items/${itemId}/attachment`
    );
  }
}

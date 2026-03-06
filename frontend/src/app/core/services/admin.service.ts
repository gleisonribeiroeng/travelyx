import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { Observable } from 'rxjs';

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  picture: string;
  role: 'USER' | 'ADMIN';
  isActive: boolean;
  createdAt: string;
  _count: { trips: number };
}

@Injectable({ providedIn: 'root' })
export class AdminService {
  private readonly apiUrl = `${environment.apiBaseUrl}/api/admin`;

  constructor(private readonly http: HttpClient) {}

  getUsers(): Observable<AdminUser[]> {
    return this.http.get<AdminUser[]>(`${this.apiUrl}/users`);
  }

  updateRole(userId: string, role: 'USER' | 'ADMIN'): Observable<{ id: string; role: string }> {
    return this.http.patch<{ id: string; role: string }>(`${this.apiUrl}/users/${userId}/role`, { role });
  }

  toggleActive(userId: string, isActive: boolean): Observable<{ id: string; isActive: boolean }> {
    return this.http.patch<{ id: string; isActive: boolean }>(`${this.apiUrl}/users/${userId}/activate`, { isActive });
  }
}

import { Injectable, signal, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { TripPoll } from '../models/collaboration.models';

@Injectable({ providedIn: 'root' })
export class PollsService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiBaseUrl}/api`;

  // ── Core state ──
  private readonly _polls = signal<TripPoll[]>([]);

  // ── Public readonly ──
  readonly polls = this._polls.asReadonly();

  // ---------------------------------------------------------------------------
  // Load polls
  // ---------------------------------------------------------------------------

  loadPolls(tripId: string): void {
    this.http
      .get<TripPoll[]>(`${this.baseUrl}/trips/${tripId}/polls`)
      .subscribe({
        next: (data) => this._polls.set(data),
      });
  }

  // ---------------------------------------------------------------------------
  // Create poll
  // ---------------------------------------------------------------------------

  createPoll(tripId: string, question: string, options: string[]): Observable<TripPoll> {
    return this.http
      .post<TripPoll>(`${this.baseUrl}/trips/${tripId}/polls`, { question, options })
      .pipe(
        tap((poll) => {
          this._polls.update((list) => [poll, ...list]);
        }),
      );
  }

  // ---------------------------------------------------------------------------
  // Vote
  // ---------------------------------------------------------------------------

  vote(tripId: string, pollId: string, optionId: string): Observable<TripPoll> {
    return this.http
      .post<TripPoll>(
        `${this.baseUrl}/trips/${tripId}/polls/${pollId}/vote`,
        { optionId },
      )
      .pipe(
        tap((updated) => {
          this._polls.update((list) =>
            list.map((p) => (p.id === updated.id ? updated : p)),
          );
        }),
      );
  }

  // ---------------------------------------------------------------------------
  // Close poll
  // ---------------------------------------------------------------------------

  closePoll(tripId: string, pollId: string): Observable<TripPoll> {
    return this.http
      .put<TripPoll>(`${this.baseUrl}/trips/${tripId}/polls/${pollId}/close`, {})
      .pipe(
        tap((updated) => {
          this._polls.update((list) =>
            list.map((p) => (p.id === updated.id ? updated : p)),
          );
        }),
      );
  }

  // ---------------------------------------------------------------------------
  // Reset
  // ---------------------------------------------------------------------------

  reset(): void {
    this._polls.set([]);
  }
}

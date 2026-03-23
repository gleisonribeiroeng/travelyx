import { Injectable, signal, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { TripComment } from '../models/collaboration.models';

@Injectable({ providedIn: 'root' })
export class CommentsService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiBaseUrl}/api`;

  // ── Core state ──
  private readonly _comments = signal<TripComment[]>([]);

  // ── Public readonly ──
  readonly comments = this._comments.asReadonly();

  // ---------------------------------------------------------------------------
  // Load comments
  // ---------------------------------------------------------------------------

  loadComments(tripId: string, targetType?: string, targetId?: string): void {
    const params: Record<string, string> = {};
    if (targetType) params['targetType'] = targetType;
    if (targetId) params['targetId'] = targetId;

    this.http
      .get<TripComment[]>(`${this.baseUrl}/trips/${tripId}/comments`, { params })
      .subscribe({
        next: (data) => this._comments.set(data),
      });
  }

  // ---------------------------------------------------------------------------
  // Add comment
  // ---------------------------------------------------------------------------

  addComment(
    tripId: string,
    targetType: string,
    targetId: string,
    content: string,
    parentId?: string,
  ): Observable<TripComment> {
    return this.http
      .post<TripComment>(`${this.baseUrl}/trips/${tripId}/comments`, {
        targetType,
        targetId,
        content,
        parentId,
      })
      .pipe(
        tap((comment) => {
          if (parentId) {
            // Add as reply to the parent
            this._comments.update((list) =>
              list.map((c) =>
                c.id === parentId
                  ? { ...c, replies: [...(c.replies ?? []), comment] }
                  : c,
              ),
            );
          } else {
            this._comments.update((list) => [comment, ...list]);
          }
        }),
      );
  }

  // ---------------------------------------------------------------------------
  // Toggle reaction
  // ---------------------------------------------------------------------------

  toggleReaction(tripId: string, commentId: string, emoji: string): Observable<TripComment> {
    return this.http
      .put<TripComment>(
        `${this.baseUrl}/trips/${tripId}/comments/${commentId}/reactions`,
        { emoji },
      )
      .pipe(
        tap((updated) => {
          this._comments.update((list) =>
            list.map((c) => (c.id === updated.id ? updated : c)),
          );
        }),
      );
  }

  // ---------------------------------------------------------------------------
  // Remove comment
  // ---------------------------------------------------------------------------

  removeComment(tripId: string, commentId: string): Observable<void> {
    return this.http
      .delete<void>(`${this.baseUrl}/trips/${tripId}/comments/${commentId}`)
      .pipe(
        tap(() => {
          this._comments.update((list) => list.filter((c) => c.id !== commentId));
        }),
      );
  }

  // ---------------------------------------------------------------------------
  // Helper: filter comments for a specific target
  // ---------------------------------------------------------------------------

  commentsForTarget(targetType: string, targetId: string): TripComment[] {
    return this._comments().filter(
      (c) => c.targetType === targetType && c.targetId === targetId,
    );
  }

  // ---------------------------------------------------------------------------
  // Reset
  // ---------------------------------------------------------------------------

  reset(): void {
    this._comments.set([]);
  }
}

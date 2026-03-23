import { Injectable, signal, computed, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { AuthService } from './auth.service';
import { PlanService } from './plan.service';
import {
  Collaborator,
  CollaboratorRole,
  TripInvite,
} from '../models/collaboration.models';

@Injectable({ providedIn: 'root' })
export class CollaborationService {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);
  private readonly planService = inject(PlanService);
  private readonly baseUrl = `${environment.apiBaseUrl}/api`;

  // ── Core state ──
  private readonly _collaborators = signal<Collaborator[]>([]);
  private readonly _pendingInvites = signal<TripInvite[]>([]);
  private readonly _myRole = signal<CollaboratorRole | null>(null);

  // ── Public readonly ──
  readonly collaborators = this._collaborators.asReadonly();
  readonly pendingInvites = this._pendingInvites.asReadonly();
  readonly myRole = this._myRole.asReadonly();

  // ── Computed ──
  readonly isOwner = computed(() => this._myRole() === 'OWNER');
  readonly canEdit = computed(() => ['OWNER', 'EDITOR'].includes(this._myRole() ?? ''));
  readonly isViewer = computed(() => this._myRole() === 'VIEWER');
  readonly collaboratorCount = computed(() => this._collaborators().length);

  // ---------------------------------------------------------------------------
  // Load collaborators for a trip
  // ---------------------------------------------------------------------------

  loadCollaborators(tripId: string): void {
    this.http.get<Collaborator[]>(`${this.baseUrl}/trips/${tripId}/collaborators`).subscribe({
      next: (collabs) => {
        this._collaborators.set(collabs);

        // Determine my role from the collaborators list
        const user = this.auth.user();
        if (user) {
          const me = collabs.find(c => c.email === user.email);
          this._myRole.set(me?.role ?? null);
        }
      },
    });
  }

  // ---------------------------------------------------------------------------
  // Invite a collaborator
  // ---------------------------------------------------------------------------

  invite(tripId: string, email: string, role: CollaboratorRole): Observable<TripInvite> {
    return this.http.post<TripInvite>(`${this.baseUrl}/trips/${tripId}/invites`, { email, role });
  }

  // ---------------------------------------------------------------------------
  // Remove a collaborator
  // ---------------------------------------------------------------------------

  removeCollaborator(tripId: string, collabId: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/trips/${tripId}/collaborators/${collabId}`).pipe(
      tap(() => {
        this._collaborators.update(list => list.filter(c => c.id !== collabId));
      })
    );
  }

  // ---------------------------------------------------------------------------
  // Change a collaborator's role
  // ---------------------------------------------------------------------------

  changeRole(tripId: string, collabId: string, role: CollaboratorRole): Observable<Collaborator> {
    return this.http.patch<Collaborator>(
      `${this.baseUrl}/trips/${tripId}/collaborators/${collabId}`,
      { role }
    ).pipe(
      tap((updated) => {
        this._collaborators.update(list =>
          list.map(c => c.id === updated.id ? updated : c)
        );
      })
    );
  }

  // ---------------------------------------------------------------------------
  // Load pending invites for the current user
  // ---------------------------------------------------------------------------

  loadPendingInvites(): void {
    this.http.get<TripInvite[]>(`${this.baseUrl}/invites/pending`).subscribe({
      next: (invites) => this._pendingInvites.set(invites),
    });
  }

  // ---------------------------------------------------------------------------
  // Accept an invite
  // ---------------------------------------------------------------------------

  acceptInvite(token: string): Observable<any> {
    return this.http.post(`${this.baseUrl}/invites/${token}/accept`, {}).pipe(
      tap(() => {
        this._pendingInvites.update(list => list.filter(i => i.token !== token));
      })
    );
  }

  // ---------------------------------------------------------------------------
  // Reject an invite
  // ---------------------------------------------------------------------------

  rejectInvite(token: string): Observable<any> {
    return this.http.post(`${this.baseUrl}/invites/${token}/reject`, {}).pipe(
      tap(() => {
        this._pendingInvites.update(list => list.filter(i => i.token !== token));
      })
    );
  }

  // ---------------------------------------------------------------------------
  // Toggle public share link
  // ---------------------------------------------------------------------------

  toggleShareLink(tripId: string): Observable<{ publicSlug: string | null }> {
    return this.http.post<{ publicSlug: string | null }>(
      `${this.baseUrl}/trips/${tripId}/share-link/toggle`,
      {}
    );
  }

  // ---------------------------------------------------------------------------
  // Set my role (used when loading trip data)
  // ---------------------------------------------------------------------------

  setMyRole(role: CollaboratorRole | null): void {
    this._myRole.set(role);
  }

  // ---------------------------------------------------------------------------
  // Reset all state
  // ---------------------------------------------------------------------------

  reset(): void {
    this._collaborators.set([]);
    this._pendingInvites.set([]);
    this._myRole.set(null);
  }
}

import { Injectable, inject } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';

/**
 * Safe wrapper around the browser localStorage API.
 *
 * All operations are wrapped in try/catch so that:
 * - QuotaExceededError surfaces a visible snackbar warning (the only visible failure).
 * - All other errors (e.g. SecurityError in private browsing) are swallowed silently
 *   so the app continues with in-memory state only.
 */
@Injectable({ providedIn: 'root' })
export class LocalStorageService {
  private readonly snackBar = inject(MatSnackBar);

  /**
   * Retrieve and deserialize a stored value.
   * Returns null if the key is missing or the stored JSON is corrupt.
   */
  get<T>(key: string): T | null {
    try {
      const raw = localStorage.getItem(key);
      if (raw === null) {
        return null;
      }
      return JSON.parse(raw) as T;
    } catch {
      return null;
    }
  }

  /**
   * Serialize and persist a value.
   * Shows a snackbar warning if the storage quota is exceeded.
   * Other errors are silently swallowed.
   */
  set(key: string, value: unknown): void {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (err) {
      if (this.isQuotaExceededError(err)) {
        this.snackBar.open(
          'Storage full — your trip could not be saved. Please remove some items.',
          'Dismiss',
          {
            duration: 8000,
            panelClass: 'snack-warning',
          }
        );
      }
      // Non-quota errors are silently ignored; app continues with in-memory state.
    }
  }

  /**
   * Remove a single key from storage.
   * Errors are ignored.
   */
  remove(key: string): void {
    try {
      localStorage.removeItem(key);
    } catch {
      // Silently ignored.
    }
  }

  /**
   * Clear all keys from storage.
   * Errors are ignored.
   */
  clear(): void {
    try {
      localStorage.clear();
    } catch {
      // Silently ignored.
    }
  }

  /**
   * Cross-browser QuotaExceededError detection.
   *
   * Covers:
   * - Chrome/Safari: DOMException with code 22
   * - Firefox: DOMException with code 1014
   * - All modern browsers: name 'QuotaExceededError'
   * - Firefox legacy: name 'NS_ERROR_DOM_QUOTA_REACHED'
   */
  private isQuotaExceededError(err: unknown): boolean {
    return (
      err instanceof DOMException &&
      (err.code === 22 ||
        err.code === 1014 ||
        err.name === 'QuotaExceededError' ||
        err.name === 'NS_ERROR_DOM_QUOTA_REACHED')
    );
  }
}

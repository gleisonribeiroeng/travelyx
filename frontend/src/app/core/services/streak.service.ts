import { Injectable, signal, computed } from '@angular/core';

const STORAGE_KEY = 'travelyx_streak';

interface StreakData {
  currentStreak: number;
  lastActiveDate: string; // YYYY-MM-DD
  longestStreak: number;
}

@Injectable({ providedIn: 'root' })
export class StreakService {
  private readonly _data = signal<StreakData>(this.load());

  readonly currentStreak = computed(() => this._data().currentStreak);
  readonly longestStreak = computed(() => this._data().longestStreak);
  readonly isActiveToday = computed(() => this._data().lastActiveDate === this.today());

  /** Call this whenever the user performs a planning action */
  recordActivity(): void {
    const data = this._data();
    const today = this.today();

    if (data.lastActiveDate === today) return; // Already recorded today

    const yesterday = this.dateString(new Date(Date.now() - 86400000));
    let newStreak: number;

    if (data.lastActiveDate === yesterday) {
      newStreak = data.currentStreak + 1;
    } else {
      newStreak = 1;
    }

    const newData: StreakData = {
      currentStreak: newStreak,
      lastActiveDate: today,
      longestStreak: Math.max(data.longestStreak, newStreak),
    };

    this._data.set(newData);
    this.save(newData);
  }

  /** Get streak emoji based on count */
  getStreakEmoji(): string {
    const s = this.currentStreak();
    if (s >= 30) return '💎';
    if (s >= 14) return '⚡';
    if (s >= 7) return '🔥';
    if (s >= 3) return '✨';
    return '🌱';
  }

  private today(): string {
    return this.dateString(new Date());
  }

  private dateString(d: Date): string {
    return d.toISOString().split('T')[0];
  }

  private load(): StreakData {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) return { currentStreak: 0, lastActiveDate: '', longestStreak: 0 };

      const data: StreakData = JSON.parse(stored);
      // Check if streak is still valid (not broken)
      const today = this.dateString(new Date());
      const yesterday = this.dateString(new Date(Date.now() - 86400000));

      if (data.lastActiveDate !== today && data.lastActiveDate !== yesterday) {
        // Streak broken
        return { currentStreak: 0, lastActiveDate: data.lastActiveDate, longestStreak: data.longestStreak };
      }

      return data;
    } catch {
      return { currentStreak: 0, lastActiveDate: '', longestStreak: 0 };
    }
  }

  private save(data: StreakData): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }
}

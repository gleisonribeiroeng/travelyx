import { Injectable, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';

export type Lang = 'pt' | 'en';

const STORAGE_KEY = 'triply_lang';
const SUPPORTED: Lang[] = ['pt', 'en'];

@Injectable({ providedIn: 'root' })
export class TranslationService {
  private readonly _lang = signal<Lang>(this.detectLanguage());
  private readonly _translations = signal<Record<string, string>>({});
  private loaded = new Set<Lang>();

  readonly lang = this._lang.asReadonly();
  readonly isEn = computed(() => this._lang() === 'en');
  readonly isPt = computed(() => this._lang() === 'pt');

  constructor(private readonly http: HttpClient) {
    this.loadTranslations(this._lang());
  }

  /** Get translated string by key. Supports {{placeholder}} interpolation. */
  t(key: string, params?: Record<string, string | number>): string {
    const val = this._translations()[key];
    if (!val) return key; // fallback to key itself
    if (!params) return val;
    return Object.entries(params).reduce(
      (str, [k, v]) => str.replace(new RegExp(`{{${k}}}`, 'g'), String(v)),
      val,
    );
  }

  /** Switch language */
  setLang(lang: Lang): void {
    if (this._lang() === lang) return;
    this._lang.set(lang);
    localStorage.setItem(STORAGE_KEY, lang);
    this.loadTranslations(lang);
  }

  /** Toggle between pt/en */
  toggle(): void {
    this.setLang(this._lang() === 'pt' ? 'en' : 'pt');
  }

  private detectLanguage(): Lang {
    // 1. Check localStorage
    const saved = localStorage.getItem(STORAGE_KEY) as Lang | null;
    if (saved && SUPPORTED.includes(saved)) return saved;

    // 2. Check browser language
    const browserLang = (navigator.language || '').split('-')[0].toLowerCase();
    if (browserLang === 'en') return 'en';

    // 3. Default to Portuguese
    return 'pt';
  }

  private loadTranslations(lang: Lang): void {
    if (this.loaded.has(lang)) return;
    this.http.get<Record<string, string>>(`assets/i18n/${lang}.json`).subscribe({
      next: (data) => {
        this._translations.set(data);
        this.loaded.add(lang);
      },
      error: () => {
        console.warn(`[i18n] Failed to load ${lang}.json`);
      },
    });
  }
}

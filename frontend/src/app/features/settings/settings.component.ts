import { Component, inject } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatDividerModule } from '@angular/material/divider';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatSelectModule } from '@angular/material/select';
import { FormsModule } from '@angular/forms';
import { TranslationService } from '../../core/i18n/translation.service';
import { TranslatePipe } from '../../core/i18n/translate.pipe';
import { AuthService } from '../../core/services/auth.service';

interface SettingToggle {
  key: string;
  label: string;
  description: string;
  icon: string;
  value: boolean;
}

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [
    MatCardModule, MatIconModule, MatButtonModule,
    MatDividerModule, MatSlideToggleModule, MatSelectModule,
    FormsModule, TranslatePipe,
  ],
  templateUrl: './settings.component.html',
  styleUrl: './settings.component.scss',
})
export class SettingsComponent {
  protected readonly i18n = inject(TranslationService);
  protected readonly auth = inject(AuthService);
  language = this.i18n.lang();

  notifications: SettingToggle[] = [
    {
      key: 'notify_trip',
      label: this.i18n.t('settings.notifyTrip'),
      description: this.i18n.t('settings.notifyTripDesc'),
      icon: 'flight_takeoff',
      value: this.loadBool('triply_notify_trip', true),
    },
    {
      key: 'notify_price',
      label: this.i18n.t('settings.notifyPrice'),
      description: this.i18n.t('settings.notifyPriceDesc'),
      icon: 'price_change',
      value: this.loadBool('triply_notify_price', true),
    },
    {
      key: 'notify_email',
      label: this.i18n.t('settings.notifyEmail'),
      description: this.i18n.t('settings.notifyEmailDesc'),
      icon: 'email',
      value: this.loadBool('triply_notify_email', false),
    },
  ];

  display: SettingToggle[] = [
    {
      key: 'compact_mode',
      label: this.i18n.t('settings.compactMode'),
      description: this.i18n.t('settings.compactModeDesc'),
      icon: 'view_compact',
      value: this.loadBool('triply_compact_mode', false),
    },
    {
      key: 'travelyx_theme',
      label: 'Tema escuro',
      description: 'Ativa o modo escuro em toda a plataforma',
      icon: 'dark_mode',
      value: this.loadBool('travelyx_theme', false),
    },
  ];

  goBack(): void {
    window.history.back();
  }

  onLanguageChange(lang: 'pt' | 'en'): void {
    this.language = lang;
    this.i18n.setLang(lang);
  }

  onToggle(setting: SettingToggle): void {
    localStorage.setItem(setting.key, String(setting.value));
    if (setting.key === 'travelyx_theme') {
      document.documentElement.classList.toggle('dark', setting.value);
    }
  }

  clearCache(): void {
    const token = localStorage.getItem('triply_token');
    const user = localStorage.getItem('triply_user');
    localStorage.clear();
    if (token) localStorage.setItem('triply_token', token);
    if (user) localStorage.setItem('triply_user', user);
    window.location.reload();
  }

  private loadPref(key: string, fallback: string): string {
    return localStorage.getItem(key) || fallback;
  }

  private loadBool(key: string, fallback: boolean): boolean {
    const v = localStorage.getItem(key);
    if (v === null) return fallback;
    return v === 'true';
  }
}

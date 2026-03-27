import { Injectable, inject } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';
import { DOCUMENT } from '@angular/common';

export interface SeoConfig {
  title: string;
  description: string;
  url?: string;
  image?: string;
  keywords?: string;
  jsonLd?: Record<string, any>;
}

const DEFAULTS: SeoConfig = {
  title: 'Travelyx - Planeje sua viagem com inteligência',
  description:
    'Travelyx - Planeje sua viagem completa: voos, hotéis, aluguel de carros e roteiros personalizados. Organize tudo em um só lugar.',
  url: 'https://travelyx.com.br',
  image: 'https://travelyx.com.br/assets/dashboard.png',
  keywords:
    'viagem, voos, hotéis, aluguel de carros, roteiro de viagem, planejamento de viagem, travelyx',
};

@Injectable({ providedIn: 'root' })
export class SeoService {
  private readonly meta = inject(Meta);
  private readonly titleService = inject(Title);
  private readonly doc = inject(DOCUMENT);
  private jsonLdElement: HTMLScriptElement | null = null;

  update(cfg: Partial<SeoConfig>): void {
    const c = { ...DEFAULTS, ...cfg };

    this.titleService.setTitle(c.title);
    this.meta.updateTag({ name: 'description', content: c.description });
    if (c.keywords) {
      this.meta.updateTag({ name: 'keywords', content: c.keywords });
    }

    this.meta.updateTag({ property: 'og:title', content: c.title });
    this.meta.updateTag({ property: 'og:description', content: c.description });
    if (c.url) {
      this.meta.updateTag({ property: 'og:url', content: c.url });
    }
    if (c.image) {
      this.meta.updateTag({ property: 'og:image', content: c.image });
    }

    // Twitter Card
    this.meta.updateTag({ name: 'twitter:card', content: 'summary_large_image' });
    this.meta.updateTag({ name: 'twitter:title', content: c.title });
    this.meta.updateTag({ name: 'twitter:description', content: c.description });
    if (c.image) {
      this.meta.updateTag({ name: 'twitter:image', content: c.image });
    }

    // Canonical
    const link: HTMLLinkElement =
      this.doc.querySelector('link[rel="canonical"]') ||
      this.doc.createElement('link');
    link.setAttribute('rel', 'canonical');
    link.setAttribute('href', c.url || DEFAULTS.url!);
    if (!link.parentElement) {
      this.doc.head.appendChild(link);
    }

    // JSON-LD structured data
    if (c.jsonLd) {
      this.setJsonLd(c.jsonLd);
    }
  }

  setJsonLd(data: Record<string, any>): void {
    if (this.jsonLdElement) {
      this.jsonLdElement.textContent = JSON.stringify(data);
    } else {
      const script = this.doc.createElement('script');
      script.type = 'application/ld+json';
      script.id = 'dynamic-jsonld';
      script.textContent = JSON.stringify(data);
      this.doc.head.appendChild(script);
      this.jsonLdElement = script;
    }
  }

  removeJsonLd(): void {
    if (this.jsonLdElement?.parentElement) {
      this.jsonLdElement.parentElement.removeChild(this.jsonLdElement);
      this.jsonLdElement = null;
    }
  }

  reset(): void {
    this.removeJsonLd();
    this.update(DEFAULTS);
  }
}

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface UnsplashPhoto {
  url: string;
  thumbUrl: string;
  photographer: string;
  photographerUrl: string;
}

@Injectable()
export class UnsplashService {
  private readonly logger = new Logger(UnsplashService.name);
  private readonly accessKey: string;
  private readonly cache = new Map<string, { data: UnsplashPhoto | null; ts: number }>();
  private readonly CACHE_TTL = 1000 * 60 * 60; // 1 hour

  constructor(private readonly config: ConfigService) {
    this.accessKey = this.config.get<string>('UNSPLASH_ACCESS_KEY', '');
  }

  async searchDestinationImage(query: string): Promise<UnsplashPhoto | null> {
    if (!query?.trim() || !this.accessKey || this.accessKey === 'YOUR_UNSPLASH_ACCESS_KEY_HERE') {
      return null;
    }

    const cacheKey = query.toLowerCase().trim();
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.ts < this.CACHE_TTL) {
      return cached.data;
    }

    try {
      const searchQuery = `${query} travel landscape`;
      const url = `https://api.unsplash.com/search/photos?query=${encodeURIComponent(searchQuery)}&per_page=1&orientation=landscape&content_filter=high`;

      const response = await fetch(url, {
        headers: {
          Authorization: `Client-ID ${this.accessKey}`,
        },
      });

      if (!response.ok) {
        this.logger.warn(`Unsplash API error: ${response.status}`);
        return null;
      }

      const data = await response.json();
      if (!data.results?.length) {
        this.cache.set(cacheKey, { data: null, ts: Date.now() });
        return null;
      }

      const photo = data.results[0];
      const result: UnsplashPhoto = {
        url: photo.urls.regular,
        thumbUrl: photo.urls.small,
        photographer: photo.user.name,
        photographerUrl: photo.user.links.html,
      };

      this.cache.set(cacheKey, { data: result, ts: Date.now() });
      return result;
    } catch (err) {
      this.logger.error(`Unsplash search failed for "${query}":`, err);
      return null;
    }
  }
}

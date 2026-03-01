import { Component, computed, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MATERIAL_IMPORTS } from '../../../core/material.exports';
import { ListItemConfig } from './list-item-base.model';
import { renderStars, formatRating } from '../../../core/utils/rating.util';

@Component({
  selector: 'app-list-item-base',
  standalone: true,
  imports: [MATERIAL_IMPORTS, CommonModule],
  templateUrl: './list-item-base.component.html',
  styleUrl: './list-item-base.component.scss',
})
export class ListItemBaseComponent {
  readonly config = input.required<ListItemConfig>();

  readonly primaryClick = output<string>();
  readonly secondaryClick = output<string>();
  readonly cardClick = output<string>();
  readonly iconActionClick = output<{ itemId: string; actionId: string }>();

  readonly imageIndex = signal(0);

  readonly allImages = computed(() => this.config().images ?? []);

  readonly currentImage = computed(() => {
    const imgs = this.allImages();
    if (imgs.length === 0) return null;
    return imgs[this.imageIndex()] ?? imgs[0];
  });

  readonly hasMultipleImages = computed(() => this.allImages().length > 1);

  readonly renderStars = renderStars;
  readonly formatRating = formatRating;

  prevImage(event: Event): void {
    event.stopPropagation();
    const imgs = this.allImages();
    if (imgs.length <= 1) return;
    this.imageIndex.update(i => i === 0 ? imgs.length - 1 : i - 1);
  }

  nextImage(event: Event): void {
    event.stopPropagation();
    const imgs = this.allImages();
    if (imgs.length <= 1) return;
    this.imageIndex.update(i => (i + 1) % imgs.length);
  }

  onCardClick(): void {
    this.cardClick.emit(this.config().id);
  }

  onPrimaryClick(event: Event): void {
    event.stopPropagation();
    this.primaryClick.emit(this.config().id);
  }

  onSecondaryClick(event: Event): void {
    event.stopPropagation();
    this.secondaryClick.emit(this.config().id);
  }

  onIconAction(event: Event, actionId: string): void {
    event.stopPropagation();
    this.iconActionClick.emit({ itemId: this.config().id, actionId });
  }
}

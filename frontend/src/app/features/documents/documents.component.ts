import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MATERIAL_IMPORTS } from '../../core/material.exports';
import { TranslatePipe } from '../../core/i18n/translate.pipe';
import { TranslationService } from '../../core/i18n/translation.service';
import { TripStateService } from '../../core/services/trip-state.service';
import { DocumentItem, ItineraryItemType } from '../../core/models/trip.models';
import { NotificationService } from '../../core/services/notification.service';
import { ListItemBaseComponent } from '../../shared/components/list-item-base/list-item-base.component';
import { documentToListItem } from '../../shared/components/list-item-base/list-item-mappers';

type DocCategory = DocumentItem['category'];

@Component({
  selector: 'app-documents',
  standalone: true,
  imports: [MATERIAL_IMPORTS, CommonModule, FormsModule, ListItemBaseComponent, TranslatePipe],
  templateUrl: './documents.component.html',
  styleUrl: './documents.component.scss',
})
export class DocumentsComponent {
  protected readonly tripState = inject(TripStateService);
  private readonly notify = inject(NotificationService);
  private readonly i18n = inject(TranslationService);

  private readonly _documents = signal<DocumentItem[]>([]);
  readonly documents = this._documents.asReadonly();
  readonly filterCategory = signal<DocCategory | ''>('');
  readonly showUploadForm = signal(false);
  readonly previewDoc = signal<DocumentItem | null>(null);

  // Form
  uploadLabel = '';
  uploadCategory: DocCategory = 'other';
  uploadExpiresAt = '';
  uploadFile: File | null = null;

  get categories(): { value: DocCategory; label: string; icon: string }[] {
    return [
      { value: 'passport', label: this.i18n.t('docs.catPassport'), icon: 'badge' },
      { value: 'visa', label: this.i18n.t('docs.catVisa'), icon: 'fact_check' },
      { value: 'boarding-pass', label: this.i18n.t('docs.catBoardingPass'), icon: 'airplane_ticket' },
      { value: 'hotel-confirmation', label: this.i18n.t('docs.catHotelConfirmation'), icon: 'hotel' },
      { value: 'car-confirmation', label: this.i18n.t('docs.catCarConfirmation'), icon: 'directions_car' },
      { value: 'insurance', label: this.i18n.t('docs.catInsurance'), icon: 'health_and_safety' },
      { value: 'ticket', label: this.i18n.t('docs.catTicket'), icon: 'confirmation_number' },
      { value: 'other', label: this.i18n.t('docs.catOther'), icon: 'description' },
    ];
  }

  readonly filteredDocs = computed(() => {
    const filter = this.filterCategory();
    const docs = this._documents();
    if (!filter) return docs;
    return docs.filter(d => d.category === filter);
  });

  readonly expiringDocs = computed(() => {
    const now = new Date();
    const limit = new Date();
    limit.setDate(limit.getDate() + 30);
    return this._documents().filter(d =>
      d.expiresAt && new Date(d.expiresAt) <= limit && new Date(d.expiresAt) >= now
    );
  });

  getCategoryIcon(cat: string): string {
    return this.categories.find(c => c.value === cat)?.icon || 'description';
  }

  getCategoryLabel(cat: string): string {
    return this.categories.find(c => c.value === cat)?.label || cat;
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files?.length) {
      const file = input.files[0];
      if (file.size > 10 * 1024 * 1024) {
        this.notify.error(this.i18n.t('docs.fileTooLarge'));
        return;
      }
      this.uploadFile = file;
      if (!this.uploadLabel) {
        this.uploadLabel = file.name.replace(/\.[^.]+$/, '');
      }
    }
  }

  upload(): void {
    if (!this.uploadFile || !this.uploadLabel) return;
    const reader = new FileReader();
    reader.onload = () => {
      const doc: DocumentItem = {
        id: crypto.randomUUID(),
        tripId: this.tripState.trip().id,
        category: this.uploadCategory,
        label: this.uploadLabel,
        fileName: this.uploadFile!.name,
        mimeType: this.uploadFile!.type,
        sizeBytes: this.uploadFile!.size,
        linkedItemId: null,
        linkedItemType: null,
        uploadedAt: new Date().toISOString(),
        expiresAt: this.uploadExpiresAt || null,
      };
      this._documents.update(docs => [...docs, doc]);
      this.notify.success(this.i18n.t('notify.documentUploaded'));
      this.resetForm();
    };
    reader.readAsDataURL(this.uploadFile);
  }

  removeDoc(id: string): void {
    this._documents.update(docs => docs.filter(d => d.id !== id));
    if (this.previewDoc()?.id === id) this.previewDoc.set(null);
  }

  private resetForm(): void {
    this.uploadLabel = '';
    this.uploadCategory = 'other';
    this.uploadExpiresAt = '';
    this.uploadFile = null;
    this.showUploadForm.set(false);
  }

  formatSize(bytes: number): string {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  }

  formatDate(dateStr: string): string {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  isExpiringSoon(doc: DocumentItem): boolean {
    if (!doc.expiresAt) return false;
    const limit = new Date();
    limit.setDate(limit.getDate() + 30);
    return new Date(doc.expiresAt) <= limit;
  }

  toListItem(doc: DocumentItem) {
    return documentToListItem(doc);
  }

  deleteDoc(id: string): void {
    this.removeDoc(id);
  }
}

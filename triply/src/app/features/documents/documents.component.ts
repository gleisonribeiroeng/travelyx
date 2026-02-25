import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MATERIAL_IMPORTS } from '../../core/material.exports';
import { TripStateService } from '../../core/services/trip-state.service';
import { DocumentItem, ItineraryItemType } from '../../core/models/trip.models';
import { NotificationService } from '../../core/services/notification.service';

type DocCategory = DocumentItem['category'];

@Component({
  selector: 'app-documents',
  standalone: true,
  imports: [MATERIAL_IMPORTS, CommonModule, FormsModule],
  templateUrl: './documents.component.html',
  styleUrl: './documents.component.scss',
})
export class DocumentsComponent {
  protected readonly tripState = inject(TripStateService);
  private readonly notify = inject(NotificationService);

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

  readonly categories: { value: DocCategory; label: string; icon: string }[] = [
    { value: 'passport', label: 'Passaporte', icon: 'badge' },
    { value: 'visa', label: 'Visto', icon: 'fact_check' },
    { value: 'boarding-pass', label: 'Cartão de Embarque', icon: 'airplane_ticket' },
    { value: 'hotel-confirmation', label: 'Reserva Hotel', icon: 'hotel' },
    { value: 'car-confirmation', label: 'Reserva Carro', icon: 'directions_car' },
    { value: 'insurance', label: 'Seguro Viagem', icon: 'health_and_safety' },
    { value: 'ticket', label: 'Ingresso', icon: 'confirmation_number' },
    { value: 'other', label: 'Outro', icon: 'description' },
  ];

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
        this.notify.error('Arquivo muito grande. Máximo 10MB.');
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
      this.notify.success('Documento enviado!');
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
}

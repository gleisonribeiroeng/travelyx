import { Component, inject, signal, ElementRef, ViewChild } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MATERIAL_IMPORTS } from '../../../core/material.exports';
import { AttachmentService, AttachmentData } from '../../../core/services/attachment.service';
import { AttachmentMeta } from '../../../core/models/trip.models';
import { NotificationService } from '../../../core/services/notification.service';

export interface AttachmentDialogData {
  tripId: string;
  itemId: string;
  existingAttachment: AttachmentMeta | null;
}

export interface AttachmentDialogResult {
  action: 'uploaded' | 'removed' | 'cancelled';
  attachment?: AttachmentMeta | null;
}

const ALLOWED_TYPES = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];
const MAX_SIZE = 5 * 1024 * 1024; // 5MB

@Component({
  selector: 'app-attachment-dialog',
  standalone: true,
  imports: [MATERIAL_IMPORTS],
  template: `
    <h2 mat-dialog-title>Comprovante</h2>
    <mat-dialog-content>

      @if (isLoading()) {
        <div class="loading-container">
          <mat-spinner diameter="40"></mat-spinner>
          <p>{{ loadingMessage() }}</p>
        </div>
      } @else if (existingAttachment()) {
        <!-- Existing attachment view -->
        <div class="attachment-info">
          <mat-icon class="file-icon">{{ getFileIcon(existingAttachment()!.mimeType) }}</mat-icon>
          <div class="file-details">
            <span class="file-name">{{ existingAttachment()!.fileName }}</span>
            <span class="file-meta">{{ formatSize(existingAttachment()!.sizeBytes) }} &middot; {{ formatDate(existingAttachment()!.createdAt) }}</span>
          </div>
        </div>
        <div class="attachment-actions">
          <button mat-stroked-button (click)="viewAttachment()">
            <mat-icon>visibility</mat-icon> Visualizar
          </button>
          <button mat-stroked-button (click)="downloadAttachment()">
            <mat-icon>download</mat-icon> Baixar
          </button>
          <button mat-stroked-button (click)="triggerReplace()">
            <mat-icon>swap_horiz</mat-icon> Substituir
          </button>
          <button mat-stroked-button color="warn" (click)="removeAttachment()">
            <mat-icon>delete</mat-icon> Remover
          </button>
        </div>
      } @else {
        <!-- Upload zone -->
        <div class="drop-zone"
             [class.drag-over]="isDragOver()"
             (dragover)="onDragOver($event)"
             (dragleave)="onDragLeave($event)"
             (drop)="onDrop($event)"
             (click)="fileInput.click()">
          @if (selectedFile()) {
            <mat-icon class="file-icon">{{ getFileIcon(selectedFile()!.type) }}</mat-icon>
            <span class="file-name">{{ selectedFile()!.name }}</span>
            <span class="file-meta">{{ formatSize(selectedFile()!.size) }}</span>
            <button mat-raised-button color="primary" (click)="uploadFile($event)">
              <mat-icon>cloud_upload</mat-icon> Enviar
            </button>
          } @else {
            <mat-icon class="upload-icon">cloud_upload</mat-icon>
            <p>Arraste o comprovante aqui ou clique para selecionar</p>
            <span class="file-meta">PDF, JPG, PNG ou WEBP (max. 5MB)</span>
          }
        </div>
      }

      @if (errorMessage()) {
        <p class="error-message">{{ errorMessage() }}</p>
      }

      <input #fileInput type="file" hidden
             accept=".pdf,.jpg,.jpeg,.png,.webp"
             (change)="onFileSelected($event)">
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button (click)="close()">Fechar</button>
    </mat-dialog-actions>
  `,
  styles: [`
    :host {
      display: block;
    }

    .loading-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 12px;
      padding: 24px;

      p { color: var(--triply-text-secondary, #666); }
    }

    .drop-zone {
      border: 2px dashed var(--triply-border, #d1d5db);
      border-radius: 12px;
      padding: 32px 16px;
      text-align: center;
      cursor: pointer;
      transition: all 0.2s;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 8px;
      min-height: 160px;
      justify-content: center;

      &:hover, &.drag-over {
        border-color: var(--triply-primary, #3b82f6);
        background-color: rgba(59, 130, 246, 0.04);
      }

      .upload-icon {
        font-size: 48px;
        width: 48px;
        height: 48px;
        color: var(--triply-text-tertiary, #9ca3af);
      }

      p {
        color: var(--triply-text-secondary, #666);
        margin: 0;
      }
    }

    .attachment-info {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 16px;
      background: var(--triply-surface, #f9fafb);
      border-radius: 8px;
      margin-bottom: 16px;

      .file-icon {
        font-size: 32px;
        width: 32px;
        height: 32px;
        color: var(--triply-primary, #3b82f6);
      }

      .file-details {
        display: flex;
        flex-direction: column;
        gap: 2px;
      }
    }

    .file-name {
      font-weight: 600;
      font-size: 0.9rem;
      word-break: break-all;
    }

    .file-meta {
      font-size: 0.8rem;
      color: var(--triply-text-tertiary, #9ca3af);
    }

    .file-icon {
      font-size: 32px;
      width: 32px;
      height: 32px;
      color: var(--triply-primary, #3b82f6);
    }

    .attachment-actions {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;

      button {
        flex: 1;
        min-width: 120px;

        mat-icon {
          margin-right: 4px;
          font-size: 18px;
          width: 18px;
          height: 18px;
        }
      }
    }

    .error-message {
      color: #dc2626;
      font-size: 0.85rem;
      margin-top: 8px;
    }

    @media (max-width: 599px) {
      .attachment-actions {
        flex-direction: column;

        button {
          width: 100%;
        }
      }
    }
  `],
})
export class AttachmentDialogComponent {
  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;

  private readonly dialogRef = inject(MatDialogRef<AttachmentDialogComponent>);
  private readonly data: AttachmentDialogData = inject(MAT_DIALOG_DATA);
  private readonly attachmentService = inject(AttachmentService);
  private readonly notify = inject(NotificationService);

  readonly isLoading = signal(false);
  readonly loadingMessage = signal('');
  readonly isDragOver = signal(false);
  readonly selectedFile = signal<File | null>(null);
  readonly existingAttachment = signal<AttachmentMeta | null>(this.data.existingAttachment);
  readonly errorMessage = signal<string | null>(null);

  private cachedData: AttachmentData | null = null;

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver.set(true);
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver.set(false);
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver.set(false);
    const files = event.dataTransfer?.files;
    if (files && files.length > 0) {
      this.validateAndSetFile(files[0]);
    }
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.validateAndSetFile(input.files[0]);
      input.value = '';
    }
  }

  private validateAndSetFile(file: File): void {
    this.errorMessage.set(null);
    if (!ALLOWED_TYPES.includes(file.type)) {
      this.errorMessage.set('Tipo de arquivo nao suportado. Use PDF, JPG, PNG ou WEBP.');
      return;
    }
    if (file.size > MAX_SIZE) {
      this.errorMessage.set('Arquivo muito grande. Maximo 5MB.');
      return;
    }
    this.selectedFile.set(file);
  }

  uploadFile(event?: Event): void {
    event?.stopPropagation();
    const file = this.selectedFile();
    if (!file) return;

    this.isLoading.set(true);
    this.loadingMessage.set('Enviando comprovante...');
    this.errorMessage.set(null);

    this.attachmentService.upload(this.data.tripId, this.data.itemId, file).subscribe({
      next: (meta) => {
        this.isLoading.set(false);
        this.existingAttachment.set(meta);
        this.selectedFile.set(null);
        this.notify.success('Comprovante enviado');
        this.dialogRef.close({ action: 'uploaded', attachment: meta } as AttachmentDialogResult);
      },
      error: () => {
        this.isLoading.set(false);
        this.errorMessage.set('Erro ao enviar comprovante. Tente novamente.');
      },
    });
  }

  viewAttachment(): void {
    this.isLoading.set(true);
    this.loadingMessage.set('Carregando comprovante...');

    this.attachmentService.get(this.data.tripId, this.data.itemId).subscribe({
      next: (data) => {
        this.isLoading.set(false);
        this.cachedData = data;
        const byteString = atob(data.data);
        const ab = new ArrayBuffer(byteString.length);
        const ia = new Uint8Array(ab);
        for (let i = 0; i < byteString.length; i++) {
          ia[i] = byteString.charCodeAt(i);
        }
        const blob = new Blob([ab], { type: data.mimeType });
        const url = URL.createObjectURL(blob);
        window.open(url, '_blank');
        setTimeout(() => URL.revokeObjectURL(url), 60000);
      },
      error: () => {
        this.isLoading.set(false);
        this.errorMessage.set('Erro ao carregar comprovante.');
      },
    });
  }

  downloadAttachment(): void {
    const doDownload = (data: AttachmentData) => {
      const byteString = atob(data.data);
      const ab = new ArrayBuffer(byteString.length);
      const ia = new Uint8Array(ab);
      for (let i = 0; i < byteString.length; i++) {
        ia[i] = byteString.charCodeAt(i);
      }
      const blob = new Blob([ab], { type: data.mimeType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = data.fileName;
      a.click();
      URL.revokeObjectURL(url);
    };

    if (this.cachedData) {
      doDownload(this.cachedData);
      return;
    }

    this.isLoading.set(true);
    this.loadingMessage.set('Baixando comprovante...');

    this.attachmentService.get(this.data.tripId, this.data.itemId).subscribe({
      next: (data) => {
        this.isLoading.set(false);
        this.cachedData = data;
        doDownload(data);
      },
      error: () => {
        this.isLoading.set(false);
        this.errorMessage.set('Erro ao baixar comprovante.');
      },
    });
  }

  triggerReplace(): void {
    this.existingAttachment.set(null);
    this.selectedFile.set(null);
    this.cachedData = null;
  }

  removeAttachment(): void {
    this.isLoading.set(true);
    this.loadingMessage.set('Removendo comprovante...');

    this.attachmentService.remove(this.data.tripId, this.data.itemId).subscribe({
      next: () => {
        this.isLoading.set(false);
        this.notify.success('Comprovante removido');
        this.dialogRef.close({ action: 'removed', attachment: null } as AttachmentDialogResult);
      },
      error: () => {
        this.isLoading.set(false);
        this.errorMessage.set('Erro ao remover comprovante.');
      },
    });
  }

  close(): void {
    this.dialogRef.close({ action: 'cancelled' } as AttachmentDialogResult);
  }

  getFileIcon(mimeType: string): string {
    if (mimeType === 'application/pdf') return 'picture_as_pdf';
    if (mimeType.startsWith('image/')) return 'image';
    return 'attach_file';
  }

  formatSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  formatDate(isoDate: string): string {
    const d = new Date(isoDate);
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
  }
}

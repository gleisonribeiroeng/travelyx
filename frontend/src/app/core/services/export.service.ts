import { Injectable, inject } from '@angular/core';
import { TripStateService } from './trip-state.service';
import { TranslationService } from '../i18n/translation.service';

@Injectable({ providedIn: 'root' })
export class ExportService {
  private readonly tripState = inject(TripStateService);
  private readonly i18n = inject(TranslationService);

  private getTypeLabel(type: string): string {
    const map: Record<string, string> = {
      flight: 'export.typeFlight', stay: 'export.typeHotel', 'car-rental': 'export.typeCar',
      transport: 'export.typeTransport', activity: 'export.typeActivity', custom: 'export.typeCustom',
    };
    return this.i18n.t(map[type] || type);
  }

  private formatDuration(minutes: number | null): string {
    if (!minutes) return '';
    if (minutes < 60) return `${minutes}min`;
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return m > 0 ? `${h}h${m}min` : `${h}h`;
  }

  private formatDate(dateStr: string): string {
    if (!dateStr) return '';
    const [y, m, d] = dateStr.split('-');
    return `${d}/${m}/${y}`;
  }

  private getRows() {
    const trip = this.tripState.trip();
    const items = [...trip.itineraryItems].sort((a, b) => {
      const dc = a.date.localeCompare(b.date);
      if (dc !== 0) return dc;
      return (a.timeSlot || '').localeCompare(b.timeSlot || '');
    });

    return items.map(item => ({
      date: this.formatDate(item.date),
      time: item.timeSlot || '',
      type: this.getTypeLabel(item.type),
      name: item.label,
      duration: this.formatDuration(item.durationMinutes),
      notes: item.notes || '',
      paid: item.isPaid ? this.i18n.t('export.yes') : this.i18n.t('export.no'),
    }));
  }

  async exportToPdf(): Promise<void> {
    const { default: jsPDF } = await import('jspdf');
    const { default: autoTable } = await import('jspdf-autotable');

    const trip = this.tripState.trip();
    const doc = new jsPDF({ orientation: 'landscape' });

    doc.setFontSize(18);
    doc.setTextColor(79, 70, 229);
    doc.text(trip.name || 'Travelyx', 14, 18);

    doc.setFontSize(10);
    doc.setTextColor(100);
    const subtitle = [
      trip.destination ? `${this.i18n.t('export.destination')}: ${trip.destination}` : '',
      trip.dates.start ? `${this.formatDate(trip.dates.start)} - ${this.formatDate(trip.dates.end)}` : '',
    ].filter(Boolean).join('  |  ');
    doc.text(subtitle, 14, 26);

    const rows = this.getRows();
    const headers = [
      this.i18n.t('export.date'),
      this.i18n.t('export.time'),
      this.i18n.t('export.type'),
      this.i18n.t('export.activity'),
      this.i18n.t('export.duration'),
      this.i18n.t('export.notes'),
      this.i18n.t('export.paid'),
    ];

    autoTable(doc, {
      head: [headers],
      body: rows.map(r => [r.date, r.time, r.type, r.name, r.duration, r.notes, r.paid]),
      startY: 32,
      theme: 'grid',
      headStyles: { fillColor: [79, 70, 229], textColor: 255, fontStyle: 'bold', fontSize: 9 },
      bodyStyles: { fontSize: 8 },
      alternateRowStyles: { fillColor: [245, 243, 255] },
      columnStyles: {
        0: { cellWidth: 22 }, 1: { cellWidth: 18 }, 2: { cellWidth: 25 },
        3: { cellWidth: 60 }, 4: { cellWidth: 20 }, 5: { cellWidth: 80 }, 6: { cellWidth: 15 },
      },
      didDrawPage: () => {
        doc.setFontSize(7);
        doc.setTextColor(150);
        doc.text(
          `${this.i18n.t('export.footer')} — ${new Date().toLocaleDateString()}`,
          14, doc.internal.pageSize.height - 8,
        );
      },
    });

    const filename = `${(trip.name || 'trip').replace(/\s+/g, '-').toLowerCase()}-${this.i18n.t('export.itinerary')}.pdf`;
    doc.save(filename);
  }

  async exportToExcel(): Promise<void> {
    const XLSX = await import('xlsx');
    const { saveAs } = await import('file-saver');

    const trip = this.tripState.trip();
    const rows = this.getRows();

    const headers = [
      this.i18n.t('export.date'),
      this.i18n.t('export.time'),
      this.i18n.t('export.type'),
      this.i18n.t('export.activity'),
      this.i18n.t('export.duration'),
      this.i18n.t('export.notes'),
      this.i18n.t('export.paid'),
    ];

    const wsData = [
      [trip.name || 'Trip'],
      [trip.destination ? `${this.i18n.t('export.destination')}: ${trip.destination}` : '',
       trip.dates.start ? `${this.formatDate(trip.dates.start)} - ${this.formatDate(trip.dates.end)}` : ''],
      [],
      headers,
      ...rows.map(r => [r.date, r.time, r.type, r.name, r.duration, r.notes, r.paid]),
    ];

    const ws = XLSX.utils.aoa_to_sheet(wsData);
    ws['!cols'] = [{ wch: 12 }, { wch: 10 }, { wch: 15 }, { wch: 40 }, { wch: 12 }, { wch: 50 }, { wch: 8 }];
    ws['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 6 } }];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, this.i18n.t('export.itinerary'));

    const buf = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([buf], { type: 'application/octet-stream' });
    const filename = `${(trip.name || 'trip').replace(/\s+/g, '-').toLowerCase()}-${this.i18n.t('export.itinerary')}.xlsx`;
    saveAs(blob, filename);
  }
}

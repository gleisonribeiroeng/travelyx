import { Injectable, inject } from '@angular/core';
import { TripStateService } from './trip-state.service';
import { TranslationService } from '../i18n/translation.service';
import { BudgetService } from './budget.service';

@Injectable({ providedIn: 'root' })
export class ExportService {
  private readonly tripState = inject(TripStateService);
  private readonly i18n = inject(TranslationService);
  private readonly budget = inject(BudgetService);

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

  private formatDateLong(dateStr: string): string {
    if (!dateStr) return '';
    const date = new Date(dateStr + 'T00:00:00');
    return date.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' });
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

  /** Basic PDF export (free) */
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

  /** Beautiful PDF export (Pro) - Travel book style with sections by day */
  async exportToBeautifulPdf(): Promise<void> {
    const { default: jsPDF } = await import('jspdf');
    const { default: autoTable } = await import('jspdf-autotable');

    const trip = this.tripState.trip();
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const w = doc.internal.pageSize.getWidth();
    const h = doc.internal.pageSize.getHeight();

    // ── Cover Page ──
    // Purple gradient header
    doc.setFillColor(108, 92, 231);
    doc.rect(0, 0, w, 120, 'F');
    doc.setFillColor(124, 77, 255);
    doc.rect(0, 90, w, 30, 'F');

    // Trip name
    doc.setFontSize(32);
    doc.setTextColor(255, 255, 255);
    doc.text(trip.name || trip.destination || 'Minha Viagem', w / 2, 45, { align: 'center' });

    // Destination
    if (trip.destination) {
      doc.setFontSize(16);
      doc.setTextColor(220, 220, 255);
      doc.text(trip.destination, w / 2, 60, { align: 'center' });
    }

    // Dates
    if (trip.dates.start && trip.dates.end) {
      doc.setFontSize(12);
      doc.setTextColor(200, 200, 255);
      doc.text(`${this.formatDate(trip.dates.start)} — ${this.formatDate(trip.dates.end)}`, w / 2, 75, { align: 'center' });

      const start = new Date(trip.dates.start);
      const end = new Date(trip.dates.end);
      const days = Math.ceil((end.getTime() - start.getTime()) / 86400000);
      doc.text(`${days} ${days === 1 ? 'dia' : 'dias'}`, w / 2, 85, { align: 'center' });
    }

    // Summary stats below the header
    let y = 140;
    doc.setFontSize(11);
    doc.setTextColor(80);

    const summaryItems = [
      { icon: 'Voos', count: trip.flights.length },
      { icon: 'Hospedagens', count: trip.stays.length },
      { icon: 'Carros', count: trip.carRentals.length },
      { icon: 'Atividades', count: trip.activities.length + trip.attractions.length },
      { icon: 'Transportes', count: trip.transports.length },
    ].filter(s => s.count > 0);

    if (summaryItems.length > 0) {
      doc.setFontSize(14);
      doc.setTextColor(108, 92, 231);
      doc.text('Resumo da Viagem', w / 2, y, { align: 'center' });
      y += 12;

      doc.setFontSize(10);
      doc.setTextColor(80);
      const summaryText = summaryItems.map(s => `${s.count} ${s.icon}`).join('   •   ');
      doc.text(summaryText, w / 2, y, { align: 'center' });
      y += 8;

      // Budget summary
      const budgetSummary = this.budget.summary();
      if (budgetSummary.totalPlanned > 0) {
        doc.setFontSize(10);
        doc.text(`Orçamento estimado: ${trip.currency} ${budgetSummary.totalPlanned.toFixed(2)}`, w / 2, y + 4, { align: 'center' });
      }
    }

    // Travelers
    if (trip.travelers > 1) {
      y += 16;
      doc.setFontSize(10);
      doc.text(`${trip.travelers} viajantes`, w / 2, y, { align: 'center' });
    }

    // ── Flight Details Page ──
    if (trip.flights.length > 0) {
      doc.addPage();
      y = 20;
      doc.setFontSize(18);
      doc.setTextColor(108, 92, 231);
      doc.text('Voos', 14, y);
      y += 10;

      const flightRows = trip.flights.map(f => [
        f.flightNumber,
        `${f.origin} → ${f.destination}`,
        f.airline,
        this.formatDate(f.departureAt.split('T')[0]),
        f.departureAt.split('T')[1]?.substring(0, 5) || '',
        this.formatDuration(f.durationMinutes),
        `${f.price.currency} ${f.price.total.toFixed(2)}`,
      ]);

      autoTable(doc, {
        head: [['Voo', 'Rota', 'Cia', 'Data', 'Horário', 'Duração', 'Preço']],
        body: flightRows,
        startY: y,
        theme: 'striped',
        headStyles: { fillColor: [108, 92, 231], textColor: 255, fontStyle: 'bold', fontSize: 9 },
        bodyStyles: { fontSize: 8.5, textColor: [50, 50, 50] },
        alternateRowStyles: { fillColor: [248, 246, 255] },
      });
    }

    // ── Accommodation Details Page ──
    if (trip.stays.length > 0) {
      doc.addPage();
      y = 20;
      doc.setFontSize(18);
      doc.setTextColor(108, 92, 231);
      doc.text('Hospedagem', 14, y);
      y += 10;

      const stayRows = trip.stays.map(s => [
        s.name,
        s.address || '',
        `${this.formatDate(s.checkIn)} — ${this.formatDate(s.checkOut)}`,
        s.rating ? `${s.rating}/5` : '-',
        `${s.pricePerNight.currency} ${s.pricePerNight.total.toFixed(2)}/noite`,
      ]);

      autoTable(doc, {
        head: [['Hotel', 'Endereço', 'Check-in/out', 'Avaliação', 'Preço']],
        body: stayRows,
        startY: y,
        theme: 'striped',
        headStyles: { fillColor: [108, 92, 231], textColor: 255, fontStyle: 'bold', fontSize: 9 },
        bodyStyles: { fontSize: 8.5, textColor: [50, 50, 50] },
        alternateRowStyles: { fillColor: [248, 246, 255] },
      });
    }

    // ── Day-by-Day Itinerary ──
    const items = [...trip.itineraryItems].sort((a, b) => {
      const dc = a.date.localeCompare(b.date);
      if (dc !== 0) return dc;
      return (a.timeSlot || '').localeCompare(b.timeSlot || '');
    });

    if (items.length > 0) {
      const dayGroups = new Map<string, typeof items>();
      for (const item of items) {
        const list = dayGroups.get(item.date) ?? [];
        list.push(item);
        dayGroups.set(item.date, list);
      }

      doc.addPage();
      y = 20;
      doc.setFontSize(18);
      doc.setTextColor(108, 92, 231);
      doc.text('Roteiro Dia a Dia', 14, y);
      y += 12;

      let dayNum = 0;
      for (const [date, dayItems] of dayGroups) {
        dayNum++;

        // Check if we need a new page
        if (y > h - 50) {
          doc.addPage();
          y = 20;
        }

        // Day header
        doc.setFillColor(248, 246, 255);
        doc.roundedRect(14, y - 5, w - 28, 12, 3, 3, 'F');
        doc.setFontSize(12);
        doc.setTextColor(108, 92, 231);
        doc.text(`Dia ${dayNum}`, 18, y + 3);
        doc.setFontSize(9);
        doc.setTextColor(120);
        doc.text(this.formatDateLong(date), 50, y + 3);
        y += 14;

        // Items for this day
        for (const item of dayItems) {
          if (y > h - 25) {
            doc.addPage();
            y = 20;
          }

          // Time
          doc.setFontSize(9);
          doc.setTextColor(108, 92, 231);
          doc.text(item.timeSlot || '—', 18, y);

          // Type indicator
          const typeColors: Record<string, [number, number, number]> = {
            flight: [66, 153, 225], stay: [108, 92, 231], 'car-rental': [246, 173, 85],
            transport: [72, 187, 120], activity: [237, 100, 166], attraction: [159, 122, 234],
            custom: [108, 92, 231],
          };
          const color = typeColors[item.type] || [108, 92, 231];
          doc.setFillColor(...color);
          doc.circle(38, y - 1.5, 1.5, 'F');

          // Label
          doc.setFontSize(10);
          doc.setTextColor(30, 30, 46);
          doc.text(item.label, 44, y);

          // Duration
          if (item.durationMinutes) {
            doc.setFontSize(8);
            doc.setTextColor(150);
            doc.text(this.formatDuration(item.durationMinutes), w - 30, y);
          }

          // Notes
          if (item.notes) {
            y += 5;
            doc.setFontSize(8);
            doc.setTextColor(130);
            const lines = doc.splitTextToSize(item.notes, w - 64);
            doc.text(lines.slice(0, 2), 44, y);
            y += lines.slice(0, 2).length * 4;
          }

          y += 7;
        }

        y += 4;
      }
    }

    // ── Footer on every page ──
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(7);
      doc.setTextColor(180);
      doc.text(`Travelyx — ${trip.name || trip.destination} — ${new Date().toLocaleDateString('pt-BR')}`, 14, h - 8);
      doc.text(`${i}/${pageCount}`, w - 20, h - 8);
    }

    const filename = `${(trip.name || 'trip').replace(/\s+/g, '-').toLowerCase()}-travel-book.pdf`;
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

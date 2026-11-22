import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { Absence, Surgery } from '@/types';
import { ABSENCE_HEAD, REPORT_HEAD, absenceRows, reportRow, sortReport, statusCounts } from './reports';

export interface PdfTable { title: string; subtitle?: string; head: string[]; body: (string | number)[][]; filename: string; hospital?: string }

const NAVY: [number, number, number] = [11, 59, 92];
const TEAL: [number, number, number] = [0, 168, 154];
const LGPD = 'Documento confidencial — contém dados pessoais protegidos pela LGPD (Lei 13.709/2018). Uso restrito; não compartilhe nem armazene fora dos sistemas do hospital.';

export interface ReportBranding { systemName: string; hospitalName: string; logo?: string; govLogo?: string }

function imgType(dataUrl: string): 'PNG' | 'JPEG' | 'WEBP' { return /^data:image\/jpe?g/i.test(dataUrl) ? 'JPEG' : /^data:image\/webp/i.test(dataUrl) ? 'WEBP' : 'PNG'; }

function header(doc: jsPDF, b: ReportBranding, title: string, lines: string[]): number {
  if (b.logo) { try { doc.addImage(b.logo, imgType(b.logo), 14, 10, 20, 20); } catch { /* imagem inválida: segue sem logo */ } }
  if (b.govLogo) { try { doc.addImage(b.govLogo, imgType(b.govLogo), 38, 10, 20, 20); } catch { /* idem */ } }
  doc.setFillColor(...NAVY); doc.rect(0, 0, 297, 8, 'F');
  doc.setFont('helvetica', 'bold'); doc.setFontSize(14); doc.setTextColor(...NAVY); doc.text(`${b.systemName} - Gestão de Centro Cirúrgico`, 148, 17, { align: 'center' });
  doc.setFont('helvetica', 'normal'); doc.setFontSize(10); doc.setTextColor(...TEAL); doc.text(b.hospitalName, 148, 23, { align: 'center' });
  doc.setFont('helvetica', 'bold'); doc.setFontSize(12); doc.setTextColor(...NAVY); doc.text(title, 148, 30, { align: 'center' });
  doc.setDrawColor(...TEAL); doc.setLineWidth(0.8); doc.line(14, 33, 283, 33);
  doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(100, 116, 139);
  let y = 38;
  for (const l of lines) { const w = doc.splitTextToSize(l, 269) as string[]; doc.text(w, 14, y); y += 4 * w.length; }
  return y;
}

function footers(doc: jsPDF, systemName: string) {
  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i); doc.setFontSize(7); doc.setTextColor(120, 130, 145);
    const h = doc.internal.pageSize.getHeight();
    doc.text(LGPD, 148, h - 12, { align: 'center', maxWidth: 270 });
    doc.text(`${systemName} - Página ${i}/${pages}`, 148, h - 7, { align: 'center' });
  }
}

const STATUS_COLORS: Record<string, [number, number, number]> = {
  Aguardando: [245, 158, 11], 'Em Preparação': [124, 92, 252], 'Em Andamento': [47, 111, 237], Recuperação: [14, 165, 164],
  Finalizada: [22, 163, 74], Suspensa: [100, 116, 139], Cancelada: [229, 72, 77]
};

/** Relatório de cirurgias — mesmo layout do sistema original (16 colunas, resumo por status, status coloridos). */
export function exportSurgeryReportPdf(b: ReportBranding, title: string, data: Surgery[], filtersText: string, filename: string): void {
  const doc = new jsPDF({ orientation: 'landscape' });
  const counts = statusCounts(data);
  let y = header(doc, b, title, [`Gerado em: ${new Date().toLocaleString('pt-BR')} | Total: ${data.length}`, ...(filtersText ? [filtersText] : [])]);
  let x = 14;
  for (const c of counts) {
    const t = `${c.label}: ${c.count}`;
    doc.setFontSize(6.5); doc.setFont('helvetica', 'bold');
    const w = Math.max(28, doc.getTextWidth(t) + 5);
    doc.setFillColor(241, 245, 249); doc.roundedRect(x, y - 1, w, 7, 1.5, 1.5, 'F'); doc.setTextColor(51, 65, 85); doc.text(t, x + 2, y + 3.5);
    x += w + 3;
  }
  autoTable(doc, {
    startY: counts.length ? y + 9 : y + 2, head: [REPORT_HEAD], body: sortReport(data).map(reportRow), theme: 'grid',
    styles: { fontSize: 6.5, cellPadding: 1.5, overflow: 'linebreak', valign: 'middle', lineColor: [226, 232, 240], lineWidth: 0.15 },
    headStyles: { fillColor: NAVY, textColor: 255, fontStyle: 'bold', fontSize: 6.5, halign: 'center' }, alternateRowStyles: { fillColor: [248, 250, 252] }, margin: { bottom: 18 },
    columnStyles: { 0: { cellWidth: 7, halign: 'center' }, 1: { cellWidth: 15, halign: 'center' }, 2: { cellWidth: 10, halign: 'center' }, 3: { cellWidth: 22 }, 4: { cellWidth: 7, halign: 'center' },
      5: { cellWidth: 29 }, 6: { cellWidth: 24 }, 7: { cellWidth: 22 }, 8: { cellWidth: 20 }, 9: { cellWidth: 18 }, 10: { cellWidth: 13, halign: 'center' }, 11: { cellWidth: 17 },
      12: { cellWidth: 10, halign: 'center' }, 13: { cellWidth: 9, halign: 'center' }, 14: { cellWidth: 18, halign: 'center' }, 15: { cellWidth: 20 } },
    didParseCell(d) {
      if (d.section === 'body' && d.column.index === 14) { const c = STATUS_COLORS[String(d.cell.raw)]; if (c) d.cell.styles.textColor = c; d.cell.styles.fontStyle = 'bold'; }
    }
  });
  footers(doc, b.systemName);
  doc.save(filename);
}

export function exportAbsencesPdf(b: ReportBranding, title: string, data: Absence[], filename: string): void {
  const doc = new jsPDF({ orientation: 'landscape' });
  const y = header(doc, b, title, [`Gerado em: ${new Date().toLocaleString('pt-BR')} | Total: ${data.length}`]);
  autoTable(doc, { startY: y + 2, head: [ABSENCE_HEAD], body: absenceRows(data), theme: 'grid', margin: { bottom: 18 },
    styles: { fontSize: 8, cellPadding: 2, overflow: 'linebreak', valign: 'middle', lineColor: [226, 232, 240], lineWidth: 0.15 },
    headStyles: { fillColor: NAVY, textColor: 255, fontStyle: 'bold', fontSize: 8, halign: 'center' }, alternateRowStyles: { fillColor: [248, 250, 252] } });
  footers(doc, b.systemName);
  doc.save(filename);
}

/** PDF genérico de tabela (mantido para usos simples). */
export function exportTablePdf(t: PdfTable): void {
  const doc = new jsPDF({ orientation: 'landscape' });
  const y = header(doc, { systemName: 'ExaGestão', hospitalName: t.hospital ?? '' }, t.title, t.subtitle ? [t.subtitle] : []);
  autoTable(doc, { head: [t.head], body: t.body, startY: y + 2, styles: { fontSize: 8 }, headStyles: { fillColor: NAVY }, margin: { bottom: 18 } });
  footers(doc, 'ExaGestão');
  doc.save(t.filename);
}


import PDFDocument from "pdfkit/js/pdfkit.standalone";
import { APP_TIME_ZONE } from "@/lib/timezone";

export interface CalendarPdfEvent {
  programName: string;
  divisionName: string;
  scheduleType: string;
  scheduleTime: string | null;
}

export interface CalendarPdfInput {
  monthStart: Date;
  eventsByDate: Record<string, CalendarPdfEvent[]>;
  generatedBy: string;
  generatedAt: Date;
}

type TableColumn<T> = {
  label: string;
  width: number;
  align?: "left" | "center" | "right";
  value: (row: T) => string;
};

const PAGE_WIDTH = 595.28;
const PAGE_HEIGHT = 841.89;
const MARGIN = 40;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;

// TEAL THEME COLORS
const COLOR_PRIMARY = "#0d9488"; // Teal 600
const COLOR_PRIMARY_DARK = "#0f766e"; // Teal 700
const COLOR_TEXT_DARK = "#111827"; // Gray 900
const COLOR_TEXT_MUTED = "#4b5563"; // Gray 600
const COLOR_BORDER = "#e5e7eb"; // Gray 200

export async function renderCalendarPdf({
  monthStart,
  eventsByDate,
  generatedBy,
  generatedAt,
}: CalendarPdfInput) {
  const doc = new PDFDocument({
    size: "A4",
    margin: MARGIN,
    bufferPages: true,
    info: {
      Title: `Kalender Program Kerja ${formatMonthId(monthStart)}`,
      Author: generatedBy,
      Subject: "Kalender Program Kerja Bulanan",
    },
  });

  const chunks: Buffer[] = [];
  doc.on("data", (chunk: Buffer) => chunks.push(chunk));
  const done = new Promise<Buffer>((resolve) => {
    doc.on("end", () => resolve(Buffer.concat(chunks)));
  });

  drawHeader(doc, monthStart, generatedAt);
  drawEventsTable(doc, eventsByDate);
  drawSignature(doc, generatedBy);
  addPageNumbers(doc);
  
  doc.end();

  return done;
}

function drawHeader(
  doc: PDFKit.PDFDocument,
  monthStart: Date,
  generatedAt: Date
) {
  doc
    .font("Helvetica-Bold")
    .fontSize(18)
    .fillColor(COLOR_PRIMARY_DARK)
    .text("JADWAL PROGRAM KERJA & AGENDA", MARGIN, 36, {
      align: "center",
      width: CONTENT_WIDTH,
    })
    .fontSize(12)
    .fillColor(COLOR_TEXT_DARK)
    .text("PONDOK PESANTREN DARUL FALAH", {
      align: "center",
      width: CONTENT_WIDTH,
    });

  doc.moveDown(0.6);

  const yLine = doc.y;
  doc.moveTo(MARGIN, yLine).lineTo(PAGE_WIDTH - MARGIN, yLine).lineWidth(2).strokeColor(COLOR_PRIMARY).stroke();
  doc.moveTo(MARGIN, yLine + 3).lineTo(PAGE_WIDTH - MARGIN, yLine + 3).lineWidth(0.5).strokeColor(COLOR_PRIMARY).stroke();

  doc.y = yLine + 18;

  doc
    .font("Helvetica-Bold")
    .fontSize(10)
    .fillColor(COLOR_TEXT_DARK)
    .text(`Bulan Laporan: `, MARGIN, doc.y, { continued: true })
    .font("Helvetica")
    .fillColor(COLOR_PRIMARY_DARK)
    .text(`${formatMonthId(monthStart)}`)
    
    .font("Helvetica-Bold")
    .fillColor(COLOR_TEXT_DARK)
    .text(`Dicetak pada: `, MARGIN, doc.y + 4, { continued: true })
    .font("Helvetica")
    .fillColor(COLOR_TEXT_MUTED)
    .text(`${formatDateTimeId(generatedAt)} WIB`);

  doc.y += 24;
}

function drawEventsTable(
  doc: PDFKit.PDFDocument,
  eventsByDate: Record<string, CalendarPdfEvent[]>
) {
  const dates = Object.keys(eventsByDate).sort();

  if (dates.length === 0) {
    doc
      .font("Helvetica-Oblique")
      .fontSize(11)
      .fillColor(COLOR_TEXT_MUTED)
      .text("Tidak ada program kerja atau agenda yang terjadwal pada bulan ini.", MARGIN, doc.y, {
        width: CONTENT_WIDTH,
        align: "center",
      });
    return;
  }

  const columns: TableColumn<CalendarPdfEvent & { dateStr: string; isFirstInDate: boolean; index: number }>[] = [
    { label: "Tanggal", width: 85, value: (row) => row.isFirstInDate ? formatSimpleDateId(new Date(row.dateStr)) : "" },
    { label: "Agenda / Program", width: 200, value: (row) => row.programName },
    { label: "Divisi", width: 130, value: (row) => row.divisionName },
    { label: "Waktu / Tipe", width: 100, value: (row) => {
        const typeLabel = row.scheduleType === "AGENDA" ? "Agenda" : (row.scheduleType === "MONTHLY" ? "Bulanan" : "Khusus");
        return row.scheduleTime ? `${row.scheduleTime} WIB` : typeLabel;
      }
    },
  ];

  const rowHeight = 28;
  drawTableHeader(doc, columns, rowHeight);

  let globalRowIndex = 0;

  dates.forEach((dateStr) => {
    const events = eventsByDate[dateStr];
    
    events.forEach((event, idx) => {
      const movedToNewPage = ensureSpace(doc, rowHeight);
      if (movedToNewPage) {
        drawTableHeader(doc, columns, rowHeight);
      }

      let x = MARGIN;
      const y = doc.y;

      // Alternating row colors
      if (globalRowIndex % 2 === 1) {
        doc.rect(x, y, CONTENT_WIDTH, rowHeight).fill("#f9fafb");
      }
      
      doc.lineWidth(0.5).strokeColor(COLOR_BORDER);
      doc.moveTo(MARGIN, y + rowHeight).lineTo(PAGE_WIDTH - MARGIN, y + rowHeight).stroke();

      const rowData = {
        ...event,
        dateStr,
        isFirstInDate: idx === 0,
        index: idx,
      };

      columns.forEach((column) => {
        const cellValue = column.value(rowData);
        if (cellValue) {
          doc
            .font(column.label === "Tanggal" && rowData.isFirstInDate ? "Helvetica-Bold" : "Helvetica")
            .fontSize(9.5)
            .fillColor(
              column.label === "Agenda / Program" ? COLOR_PRIMARY_DARK : 
              column.label === "Tanggal" ? COLOR_TEXT_DARK : COLOR_TEXT_MUTED
            )
            .text(cellValue, x + 8, y + 9, {
              width: column.width - 16,
              height: rowHeight - 9,
              align: column.align ?? "left",
              ellipsis: true,
              lineBreak: false,
            });
        }
        
        doc.y = y;
        x += column.width;
      });

      doc.y = y + rowHeight;
      globalRowIndex++;
    });
  });

  doc.y += 15;
}

function drawTableHeader<T>(
  doc: PDFKit.PDFDocument,
  columns: TableColumn<T>[],
  rowHeight: number
) {
  ensureSpace(doc, rowHeight + 10);
  let x = MARGIN;
  const y = doc.y;

  doc.rect(x, y, CONTENT_WIDTH, rowHeight).fillAndStroke(COLOR_PRIMARY, COLOR_PRIMARY);
  
  columns.forEach((column) => {
    doc
      .font("Helvetica-Bold")
      .fontSize(10)
      .fillColor("#ffffff")
      .text(column.label, x + 8, y + 8, {
        width: column.width - 16,
        height: rowHeight - 8,
        align: column.align ?? "left",
        lineBreak: false,
      });
    doc.y = y;
    x += column.width;
  });
  doc.y = y + rowHeight;
}

function drawSignature(
  doc: PDFKit.PDFDocument,
  generatedBy: string
) {
  ensureSpace(doc, 100);
  const y = doc.y + 30;
  
  doc
    .font("Helvetica")
    .fontSize(10)
    .fillColor(COLOR_TEXT_DARK)
    .text("Mengetahui,", MARGIN + 330, y)
    .font("Helvetica-Bold")
    .text("Pengurus / Admin", MARGIN + 330, y + 16)
    
    .font("Helvetica-Bold")
    .fillColor(COLOR_PRIMARY_DARK)
    .text(generatedBy, MARGIN + 330, y + 92, {
      width: 170,
    });
    
  doc.moveTo(MARGIN + 330, y + 88).lineTo(MARGIN + 500, y + 88).lineWidth(1).strokeColor(COLOR_BORDER).stroke();
}

function formatMonthId(date: Date) {
  return new Intl.DateTimeFormat("id-ID", {
    month: "long",
    year: "numeric",
    timeZone: APP_TIME_ZONE,
  }).format(date);
}

function formatSimpleDateId(date: Date) {
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    timeZone: APP_TIME_ZONE,
  }).format(date);
}

function formatDateTimeId(date: Date) {
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: APP_TIME_ZONE,
  })
    .format(date)
    .replace(".", ":");
}

function addPageNumbers(doc: PDFKit.PDFDocument) {
  const range = doc.bufferedPageRange();
  const footerY = PAGE_HEIGHT - 28;

  for (let i = range.start; i < range.start + range.count; i++) {
    doc.switchToPage(i);
    const originalBottomMargin = doc.page.margins.bottom;
    doc.page.margins.bottom = 0;
    doc
      .font("Helvetica")
      .fontSize(8)
      .fillColor(COLOR_TEXT_MUTED)
      .text(`Halaman ${i - range.start + 1} dari ${range.count}`, MARGIN, footerY, {
        width: CONTENT_WIDTH,
        height: 10,
        align: "right",
        lineBreak: false,
      });
    doc.page.margins.bottom = originalBottomMargin;
  }
}

function ensureSpace(doc: PDFKit.PDFDocument, neededHeight: number) {
  if (doc.y + neededHeight > PAGE_HEIGHT - MARGIN) {
    doc.addPage();
    doc.y = MARGIN;
    return true;
  }
  return false;
}
